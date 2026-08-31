#!/bin/bash
# Verifier entrypoint (canonical frame). Patching and grading live in
# tests/grader.py; this script owns the task-specific part: run the suites,
# write machine-readable reports under /logs/verifier/, and apply any report
# fixups before grading. Edit ONLY between the RUN TESTS markers.
set -uo pipefail
trap 'if [ ! -f /logs/verifier/reward.json ] && [ ! -f /logs/verifier/reward.txt ]; then mkdir -p /logs/verifier; echo -1 > /logs/verifier/reward.txt; fi' EXIT
log() { echo "[verifier] $*"; }
cd /app || { mkdir -p /logs/verifier; exit 6; }

python3 /tests/grader.py prepare || exit $?
[ -f /logs/verifier/reward.json ] && exit 0   # model.patch didn't apply -> graded 0

# Canonical raw-output log: send every suite's combined stdout+stderr here
# (use run_log, or pipe through tee -a "$RUN_LOG" when feeding a reporter) so
# the reason a test failed is never lost. Never silence a test run.
export RUN_LOG=/logs/verifier/run.log
: > "$RUN_LOG" 2>/dev/null || true
run_log() { echo "+ $*" >> "$RUN_LOG" 2>/dev/null; "$@" 2>&1 | tee -a "$RUN_LOG"; return "${PIPESTATUS[0]}"; }

# >>> RUN TESTS (task-specific) <<<
set +e

install -d -o root -g root -m 0755 /logs/verifier

rm -f \
  /logs/verifier/base_ctrf.json \
  /logs/verifier/new_ctrf.json

JEST_BIN="/app/rateeat_backend/node_modules/.bin/jest"

if [ ! -x "$JEST_BIN" ]; then
  echo "Jest binary not found at $JEST_BIN" | tee -a "$RUN_LOG"
  exit 6
fi

CTRF_REPORTER="$(
  node -e '
try {
  const resolved = require.resolve(
    "jest-ctrf-json-reporter",
    { paths: ["/opt/ctrf"] }
  );

  if (!resolved.startsWith("/opt/ctrf/")) {
    process.exit(2);
  }

  process.stdout.write(resolved);
} catch (_) {
  process.exit(1);
}
'
)"

if [ -z "$CTRF_REPORTER" ] || [[ "$CTRF_REPORTER" != /opt/ctrf/* ]]; then
  echo "Trusted CTRF reporter could not be resolved" | tee -a "$RUN_LOG"
  exit 6
fi

chown -R root:root /opt/ctrf 2>/dev/null || true
chmod -R a-w /opt/ctrf 2>/dev/null || true

CTRF_DIGEST_BEFORE="$(
  find /opt/ctrf -type f -print0 \
    | sort -z \
    | xargs -0 sha256sum \
    | sha256sum \
    | awk '{print $1}'
)"

ensure_user() {
  local username="$1"

  if ! id -u "$username" >/dev/null 2>&1; then
    useradd \
      --system \
      --no-create-home \
      --shell /usr/sbin/nologin \
      "$username"
  fi
}

kill_user_processes() {
  local username="$1"

  pkill -KILL -u "$username" >/dev/null 2>&1 || true

  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if ! pgrep -u "$username" >/dev/null 2>&1; then
      return 0
    fi

    sleep 0.1
  done

  echo "Processes belonging to $username survived cleanup" \
    | tee -a "$RUN_LOG"

  return 1
}

MIGRATE_USER=rateeat_vote_migrate
BASE_TEST_USER=rateeat_vote_regression
NEW_TEST_USER=rateeat_vote_behavior

ensure_user "$MIGRATE_USER" || exit 6
ensure_user "$BASE_TEST_USER" || exit 6
ensure_user "$NEW_TEST_USER" || exit 6

MIGRATE_HOME=/tmp/rateeat-vote-migrate
BASE_RUNNER=/tmp/rateeat-vote-regression-runner
NEW_RUNNER=/tmp/rateeat-vote-behavior-runner

rm -rf \
  "$MIGRATE_HOME" \
  "$BASE_RUNNER" \
  "$NEW_RUNNER"

install \
  -d \
  -o "$MIGRATE_USER" \
  -g "$MIGRATE_USER" \
  -m 0700 \
  "$MIGRATE_HOME" || exit 6

install \
  -d \
  -o "$BASE_TEST_USER" \
  -g "$BASE_TEST_USER" \
  -m 0700 \
  "$BASE_RUNNER" || exit 6

install \
  -d \
  -o "$NEW_TEST_USER" \
  -g "$NEW_TEST_USER" \
  -m 0700 \
  "$NEW_RUNNER" || exit 6

DB_USER=rateeat_vote_db
DB_PASSWORD=rateeat-review-vote-db-password

cd /app || exit 6

service postgresql start 2>&1 | tee -a "$RUN_LOG"
PG_START_EXIT=${PIPESTATUS[0]}

if [ "$PG_START_EXIT" -ne 0 ]; then
  echo "PostgreSQL failed to start" | tee -a "$RUN_LOG"
  exit 6
fi

runuser -u postgres -- psql \
  -v ON_ERROR_STOP=1 \
  -d postgres <<SQL 2>&1 | tee -a "$RUN_LOG"
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = '$DB_USER'
  ) THEN
    CREATE ROLE $DB_USER
      LOGIN
      PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER ROLE $DB_USER
      PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;
SQL

ROLE_SETUP_EXIT=${PIPESTATUS[0]}

if [ "$ROLE_SETUP_EXIT" -ne 0 ]; then
  echo "Database role setup failed" | tee -a "$RUN_LOG"
  exit 6
fi

prepare_database() {
  local database="$1"

  cd /app || return 1

  runuser -u postgres -- \
    dropdb --if-exists "$database" \
    2>&1 | tee -a "$RUN_LOG"

  local drop_exit=${PIPESTATUS[0]}

  if [ "$drop_exit" -ne 0 ]; then
    echo "Could not drop database $database" \
      | tee -a "$RUN_LOG"
    return 1
  fi

  runuser -u postgres -- \
    createdb -O "$DB_USER" "$database" \
    2>&1 | tee -a "$RUN_LOG"

  local create_exit=${PIPESTATUS[0]}

  if [ "$create_exit" -ne 0 ]; then
    echo "Could not create database $database" \
      | tee -a "$RUN_LOG"
    return 1
  fi

  runuser -u postgres -- psql \
    -v ON_ERROR_STOP=1 \
    -d "$database" \
    -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" \
    2>&1 | tee -a "$RUN_LOG"

  local extension_exit=${PIPESTATUS[0]}

  if [ "$extension_exit" -ne 0 ]; then
    echo "Could not enable pg_trgm in $database" \
      | tee -a "$RUN_LOG"
    return 1
  fi

  return 0
}

run_migrations() {
  local database="$1"

  cd /app || exit 6

  timeout \
    --signal=TERM \
    --kill-after=5s \
    240 \
    runuser -u "$MIGRATE_USER" -- env \
      HOME="$MIGRATE_HOME" \
      NPM_CONFIG_CACHE="$MIGRATE_HOME/.npm" \
      PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
      NODE_PATH="/app/rateeat_backend/node_modules" \
      NODE_ENV=development \
      DEVELOPMENT_PG_USER="$DB_USER" \
      DEVELOPMENT_PG_PASSWORD="$DB_PASSWORD" \
      DEVELOPMENT_PG_DATABASE="$database" \
      DEVELOPMENT_PG_HOST=127.0.0.1 \
      DEVELOPMENT_PG_PORT=5432 \
      JWT_SECRET=review-vote-test-secret \
      SLACK_WEBHOOK_URL=https://hooks.slack.com/services/test/test/test \
      npm --prefix /app/rateeat_backend run migrate \
      2>&1 | tee -a "$RUN_LOG"

  local migrate_exit=${PIPESTATUS[0]}

  cd /app || exit 6

  kill_user_processes "$MIGRATE_USER" || exit 6

  if [ "$migrate_exit" -ne 0 ]; then
    echo "Database migration failed with exit $migrate_exit" \
      | tee -a "$RUN_LOG"
    exit 6
  fi

  local digest_after

  digest_after="$(
    find /opt/ctrf -type f -print0 \
      | sort -z \
      | xargs -0 sha256sum \
      | sha256sum \
      | awk '{print $1}'
  )"

  if [ "$CTRF_DIGEST_BEFORE" != "$digest_after" ]; then
    echo "Trusted CTRF reporter changed during migration" \
      | tee -a "$RUN_LOG"
    exit 6
  fi
}

cat > /tmp/rateeat-review-vote-jest.config.cjs <<'JEST_CONFIG'
module.exports = {
  rootDir: "/app/rateeat_backend",

  testEnvironment: "node",

  testMatch: [
    "<rootDir>/src/__tests__/unit/**/*.test.ts"
  ],

  moduleFileExtensions: [
    "ts",
    "js",
    "json"
  ],

  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          target: "es2016",
          module: "commonjs",
          rootDir: "/app/rateeat_backend/src",
          esModuleInterop: true,
          forceConsistentCasingInFileNames: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          resolveJsonModule: true,
          sourceMap: true
        }
      }
    ]
  },

  testTimeout: 30000,

  resetMocks: true,
  restoreMocks: true,
  clearMocks: true,

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1"
  },

  setupFiles: [
    "dotenv/config"
  ]
};
JEST_CONFIG

chown root:root \
  /tmp/rateeat-review-vote-jest.config.cjs

chmod 0444 \
  /tmp/rateeat-review-vote-jest.config.cjs

# ------------------------------------------------------------
# Regression tests
# ------------------------------------------------------------

REGRESSION_DB=rateeat_review_vote_regression_test

prepare_database "$REGRESSION_DB" || exit 6
run_migrations "$REGRESSION_DB"

cd "$BASE_RUNNER" || exit 6
rm -rf ctrf

timeout \
  --signal=TERM \
  --kill-after=10s \
  360 \
  runuser -u "$BASE_TEST_USER" -- env \
    HOME="$BASE_RUNNER" \
    PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    NODE_PATH="/app/rateeat_backend/node_modules" \
    NODE_ENV=development \
    DEVELOPMENT_PG_USER="$DB_USER" \
    DEVELOPMENT_PG_PASSWORD="$DB_PASSWORD" \
    DEVELOPMENT_PG_DATABASE="$REGRESSION_DB" \
    DEVELOPMENT_PG_HOST=127.0.0.1 \
    DEVELOPMENT_PG_PORT=5432 \
    JWT_SECRET=review-vote-test-secret \
    SLACK_WEBHOOK_URL=https://hooks.slack.com/services/test/test/test \
    "$JEST_BIN" \
      --config /tmp/rateeat-review-vote-jest.config.cjs \
      --no-cache \
      --runInBand \
      --forceExit \
      --testPathIgnorePatterns='review_vote_(item|restaurant)_consistency_behavior\.test\.ts$' \
      --reporters=default \
      --reporters="$CTRF_REPORTER" \
      2>&1 | tee -a "$RUN_LOG"

BASE_JEST_EXIT=${PIPESTATUS[0]}

cd /app || exit 6

kill_user_processes "$BASE_TEST_USER" || exit 6

BASE_SOURCE="$BASE_RUNNER/ctrf/ctrf-report.json"

if [ ! -f "$BASE_SOURCE" ]; then
  echo "Regression CTRF report was not produced" \
    | tee -a "$RUN_LOG"
  exit 6
fi

install \
  -o root \
  -g root \
  -m 0444 \
  "$BASE_SOURCE" \
  /logs/verifier/base_ctrf.json || exit 6

rm -rf "$BASE_RUNNER/ctrf"

runuser -u postgres -- \
  dropdb --if-exists "$REGRESSION_DB" \
  2>&1 | tee -a "$RUN_LOG"

# ------------------------------------------------------------
# Task-specific review-vote tests
# ------------------------------------------------------------

BEHAVIOR_DB=rateeat_review_vote_behavior_test

prepare_database "$BEHAVIOR_DB" || exit 6
run_migrations "$BEHAVIOR_DB"

cd "$NEW_RUNNER" || exit 6
rm -rf ctrf

timeout \
  --signal=TERM \
  --kill-after=10s \
  360 \
  runuser -u "$NEW_TEST_USER" -- env \
    HOME="$NEW_RUNNER" \
    PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    NODE_PATH="/app/rateeat_backend/node_modules" \
    NODE_ENV=development \
    DEVELOPMENT_PG_USER="$DB_USER" \
    DEVELOPMENT_PG_PASSWORD="$DB_PASSWORD" \
    DEVELOPMENT_PG_DATABASE="$BEHAVIOR_DB" \
    DEVELOPMENT_PG_HOST=127.0.0.1 \
    DEVELOPMENT_PG_PORT=5432 \
    JWT_SECRET=review-vote-test-secret \
    SLACK_WEBHOOK_URL=https://hooks.slack.com/services/test/test/test \
    "$JEST_BIN" \
      --config /tmp/rateeat-review-vote-jest.config.cjs \
      --no-cache \
      --runInBand \
      --forceExit \
      --runTestsByPath \
        /app/rateeat_backend/src/__tests__/unit/review_vote_item_consistency_behavior.test.ts \
        /app/rateeat_backend/src/__tests__/unit/review_vote_restaurant_consistency_behavior.test.ts \
      --reporters=default \
      --reporters="$CTRF_REPORTER" \
      2>&1 | tee -a "$RUN_LOG"

NEW_JEST_EXIT=${PIPESTATUS[0]}

cd /app || exit 6

kill_user_processes "$NEW_TEST_USER" || exit 6

NEW_SOURCE="$NEW_RUNNER/ctrf/ctrf-report.json"

if [ ! -f "$NEW_SOURCE" ]; then
  echo "Review-vote CTRF report was not produced" \
    | tee -a "$RUN_LOG"
  exit 6
fi

install \
  -o root \
  -g root \
  -m 0444 \
  "$NEW_SOURCE" \
  /logs/verifier/new_ctrf.json || exit 6

rm -rf "$NEW_RUNNER/ctrf"

runuser -u postgres -- \
  dropdb --if-exists "$BEHAVIOR_DB" \
  2>&1 | tee -a "$RUN_LOG"

# ------------------------------------------------------------
# Verify trusted reporter was not modified
# ------------------------------------------------------------

CTRF_DIGEST_AFTER="$(
  find /opt/ctrf -type f -print0 \
    | sort -z \
    | xargs -0 sha256sum \
    | sha256sum \
    | awk '{print $1}'
)"

if [ "$CTRF_DIGEST_BEFORE" != "$CTRF_DIGEST_AFTER" ]; then
  echo "Trusted CTRF reporter changed while tests were running" \
    | tee -a "$RUN_LOG"
  exit 6
fi

if [ -f /logs/verifier/base_ctrf.json ]; then
  chown root:root /logs/verifier/base_ctrf.json
  chmod 0444 /logs/verifier/base_ctrf.json
fi

if [ -f /logs/verifier/new_ctrf.json ]; then
  chown root:root /logs/verifier/new_ctrf.json
  chmod 0444 /logs/verifier/new_ctrf.json
fi

echo "regression suite exit: $BASE_JEST_EXIT" \
  | tee -a "$RUN_LOG"

echo "review-vote suite exit: $NEW_JEST_EXIT" \
  | tee -a "$RUN_LOG"

set -e
# >>> END RUN TESTS <<<

# Surface raw suite output into stdout (the harness captures it) so failures
# stay debuggable even when a framework report omits the reason.
_seen=""
for _rl in "$RUN_LOG" /logs/verifier/*_run.log /logs/verifier/*-run.log /logs/verifier/*.log /logs/verifier/*.out; do
  [ -f "$_rl" ] && [ -s "$_rl" ] || continue
  case " $_seen " in *" $_rl "*) continue ;; esac
  case "${_rl##*/}" in *convert*.log|ctrf*.log|junit*.log) continue ;; esac
  _seen="$_seen $_rl"
  echo "===== raw suite output: ${_rl##*/} ====="
  cat "$_rl"
done 2>/dev/null
echo "===== grade ====="

python3 /tests/grader.py grade
log "reward.json=$(cat /logs/verifier/reward.json 2>/dev/null)"

# Uniform top level: keep only the canonical artifacts in /logs/verifier and
# move every framework-native report/log under reports/.
mkdir -p /logs/verifier/reports 2>/dev/null
for _f in /logs/verifier/*; do
  case "${_f##*/}" in
    reward.json|reward.txt|ctrf.json|run.log|test-stdout.txt|reports) continue ;;
  esac
  [ -f "$_f" ] && mv -f "$_f" /logs/verifier/reports/ 2>/dev/null
done