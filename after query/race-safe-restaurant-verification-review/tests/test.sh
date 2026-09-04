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

mkdir -p /logs/verifier
chown root:root /logs/verifier || exit 6
chmod 700 /logs/verifier || exit 6
rm -f \
  /logs/verifier/base_ctrf.json \
  /logs/verifier/new_ctrf.json \
  /logs/verifier/base_ctrf.json.capturing \
  /logs/verifier/new_ctrf.json.capturing

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
      if (!resolved.startsWith("/opt/ctrf/")) process.exit(2);
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

# Seal CTRF capture: the reporter's default path (./ctrf/ctrf-report.json
# relative to CWD) is pre-created as a root-owned FIFO. A root reader drains
# that single write into /logs/verifier before anything user-writable can be
# rewritten by an import-time process.exit hook.
CTRF_READER_PID=""

start_ctrf_capture() {
  local runner_dir="$1"
  local final_path="$2"
  local capture_dir="$runner_dir/ctrf"
  local capture_pipe="$capture_dir/ctrf-report.json"

  rm -rf "$capture_dir"
  mkdir -p "$capture_dir" || exit 6
  chown root:root "$capture_dir" || exit 6
  chmod 711 "$capture_dir" || exit 6

  mkfifo "$capture_pipe" || exit 6
  chown root:root "$capture_pipe" || exit 6
  chmod 622 "$capture_pipe" || exit 6

  rm -f "$final_path" "$final_path.capturing"
  (
    if timeout 300 cat "$capture_pipe" > "$final_path.capturing" 2>/dev/null
    then
      mv -f "$final_path.capturing" "$final_path"
    fi
  ) &
  CTRF_READER_PID=$!
}

finish_ctrf_capture() {
  local final_path="$1"
  local label="$2"

  wait "$CTRF_READER_PID" 2>/dev/null
  CTRF_READER_PID=""

  if [ ! -f "$final_path" ]; then
    echo "$label CTRF report was not produced" | tee -a "$RUN_LOG"
    exit 6
  fi

  chown root:root "$final_path" || exit 6
  chmod 0444 "$final_path" || exit 6
}

require_normal_jest_exit() {
  local exit_code="$1"
  local label="$2"

  if [ "$exit_code" != "0" ] && [ "$exit_code" != "1" ]; then
    echo "$label Jest run exited abnormally ($exit_code) - not grading a run that didn't finish on its own" \
      | tee -a "$RUN_LOG"
    exit 6
  fi
}

MIGRATE_USER=rateeat_rsrv_migrate
BASE_TEST_USER=rateeat_rsrv_base
NEW_TEST_USER=rateeat_rsrv_new

ensure_user "$MIGRATE_USER"
ensure_user "$BASE_TEST_USER"
ensure_user "$NEW_TEST_USER"

MIGRATE_HOME=/tmp/rateeat-rsrv-migrate
BASE_RUNNER=/tmp/rateeat-rsrv-base-runner
NEW_RUNNER=/tmp/rateeat-rsrv-new-runner

rm -rf "$MIGRATE_HOME" "$BASE_RUNNER" "$NEW_RUNNER"

install -d -o "$MIGRATE_USER" -g "$MIGRATE_USER" -m 0700 "$MIGRATE_HOME"
install -d -o "$BASE_TEST_USER" -g "$BASE_TEST_USER" -m 0700 "$BASE_RUNNER"
install -d -o "$NEW_TEST_USER" -g "$NEW_TEST_USER" -m 0700 "$NEW_RUNNER"

DB_USER=rateeat_rsrv_db
DB_PASSWORD=gold-candidate-restaurant-review-db-pw

service postgresql start 2>&1 | tee -a "$RUN_LOG"

runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d postgres <<SQL \
  2>&1 | tee -a "$RUN_LOG"
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'
  ) THEN
    CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASSWORD';
  ELSE
    ALTER ROLE $DB_USER PASSWORD '$DB_PASSWORD';
  END IF;
END
\$\$;
SQL

prepare_database() {
  local database="$1"

  runuser -u postgres -- dropdb --if-exists "$database" \
    2>&1 | tee -a "$RUN_LOG"

  runuser -u postgres -- createdb \
    -O "$DB_USER" \
    "$database" \
    2>&1 | tee -a "$RUN_LOG"

  runuser -u postgres -- psql \
    -v ON_ERROR_STOP=1 \
    -d "$database" \
    -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" \
    2>&1 | tee -a "$RUN_LOG"
}

run_migrations() {
  local database="$1"

  timeout --signal=TERM --kill-after=5s 240 \
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
      JWT_SECRET=gold-rsrv-test-secret \
      SLACK_WEBHOOK_URL=https://hooks.slack.com/services/test/test/test \
      npm --prefix /app/rateeat_backend run migrate \
      2>&1 | tee -a "$RUN_LOG"

  local migrate_exit=${PIPESTATUS[0]}

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

cat > /tmp/rateeat-rsrv-verifier-jest.config.cjs <<'JEST_CONFIG'
module.exports = {
  rootDir: "/app/rateeat_backend",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/__tests__/unit/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
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
  setupFiles: ["dotenv/config"]
};
JEST_CONFIG

chown root:root /tmp/rateeat-rsrv-verifier-jest.config.cjs
chmod 0444 /tmp/rateeat-rsrv-verifier-jest.config.cjs

# -------------------------
# Existing regression suite
# -------------------------

BASE_DB=rateeat_gold_rsrv_base_test

prepare_database "$BASE_DB"
run_migrations "$BASE_DB"

start_ctrf_capture "$BASE_RUNNER" /logs/verifier/base_ctrf.json

(
  cd "$BASE_RUNNER" || exit 6

  timeout --signal=TERM --kill-after=10s 360 \
    runuser -u "$BASE_TEST_USER" -- env \
      HOME="$BASE_RUNNER" \
      PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
      NODE_PATH="/app/rateeat_backend/node_modules" \
      NODE_ENV=test \
      TEST_PG_USER="$DB_USER" \
      TEST_PG_PASSWORD="$DB_PASSWORD" \
      TEST_PG_DATABASE="$BASE_DB" \
      TEST_PG_HOST=127.0.0.1 \
      TEST_PG_PORT=5432 \
      JWT_SECRET=gold-rsrv-test-secret \
      SLACK_WEBHOOK_URL=https://hooks.slack.com/services/test/test/test \
      "$JEST_BIN" \
        --config /tmp/rateeat-rsrv-verifier-jest.config.cjs \
        --no-cache \
        --runInBand \
        --forceExit \
        --testPathIgnorePatterns='candidate_restaurant_review_(behavior|auth)\.test\.ts$' \
        --reporters=default \
        --reporters="$CTRF_REPORTER"
) 2>&1 | tee -a "$RUN_LOG"

BASE_JEST_EXIT=${PIPESTATUS[0]}

require_normal_jest_exit "$BASE_JEST_EXIT" "Existing-suite"
kill_user_processes "$BASE_TEST_USER" || exit 6
finish_ctrf_capture /logs/verifier/base_ctrf.json "Existing-suite"

rm -rf "$BASE_RUNNER/ctrf"

runuser -u postgres -- dropdb --if-exists "$BASE_DB" \
  2>&1 | tee -a "$RUN_LOG"

# -------------------------
# Held-out moderation suite
# -------------------------

NEW_DB=rateeat_gold_rsrv_new_test

prepare_database "$NEW_DB"
run_migrations "$NEW_DB"

start_ctrf_capture "$NEW_RUNNER" /logs/verifier/new_ctrf.json

(
  cd "$NEW_RUNNER" || exit 6

  timeout --signal=TERM --kill-after=10s 300 \
    runuser -u "$NEW_TEST_USER" -- env \
      HOME="$NEW_RUNNER" \
      PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
      NODE_PATH="/app/rateeat_backend/node_modules" \
      NODE_ENV=test \
      TEST_PG_USER="$DB_USER" \
      TEST_PG_PASSWORD="$DB_PASSWORD" \
      TEST_PG_DATABASE="$NEW_DB" \
      TEST_PG_HOST=127.0.0.1 \
      TEST_PG_PORT=5432 \
      JWT_SECRET=gold-rsrv-test-secret \
      SLACK_WEBHOOK_URL=https://hooks.slack.com/services/test/test/test \
      "$JEST_BIN" \
        --config /tmp/rateeat-rsrv-verifier-jest.config.cjs \
        --no-cache \
        --runInBand \
        --forceExit \
        --runTestsByPath \
          /app/rateeat_backend/src/__tests__/unit/candidate_restaurant_review_behavior.test.ts \
          /app/rateeat_backend/src/__tests__/unit/candidate_restaurant_review_auth.test.ts \
        --reporters=default \
        --reporters="$CTRF_REPORTER"
) 2>&1 | tee -a "$RUN_LOG"

NEW_JEST_EXIT=${PIPESTATUS[0]}

require_normal_jest_exit "$NEW_JEST_EXIT" "Held-out-suite"
kill_user_processes "$NEW_TEST_USER" || exit 6
finish_ctrf_capture /logs/verifier/new_ctrf.json "Held-out-suite"

rm -rf "$NEW_RUNNER/ctrf"

runuser -u postgres -- dropdb --if-exists "$NEW_DB" \
  2>&1 | tee -a "$RUN_LOG"

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

echo "existing suite exit: $BASE_JEST_EXIT" | tee -a "$RUN_LOG"
echo "held-out suite exit: $NEW_JEST_EXIT" | tee -a "$RUN_LOG"

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
