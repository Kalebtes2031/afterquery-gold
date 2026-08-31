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

cd /app/rateeat_backend || exit 6
mkdir -p /logs/verifier

JEST_BIN="/app/rateeat_backend/node_modules/.bin/jest"
if [ ! -x "$JEST_BIN" ]; then
  echo "Jest binary not found at $JEST_BIN" | tee -a "$RUN_LOG"
  exit 6
fi

# Resolve the reporter from the trusted installation before any repository
# controlled Node process is allowed to run.
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
  echo "Trusted CTRF reporter could not be resolved from /opt/ctrf" \
    | tee -a "$RUN_LOG"
  exit 6
fi

export NODE_PATH="/app/rateeat_backend/node_modules"

# Repository code must never run as root. In particular, migrations and Jest
# execute as this user so they cannot rewrite the trusted reporter in /opt/ctrf.
RUNNER_USER="rateeat_verifier"
RUNNER_DIR="/tmp/rateeat-gold-task2-runner"

if ! command -v runuser >/dev/null 2>&1; then
  echo "runuser is unavailable" | tee -a "$RUN_LOG"
  exit 6
fi

if ! id "$RUNNER_USER" >/dev/null 2>&1; then
  useradd \
    --system \
    --no-create-home \
    --shell /usr/sbin/nologin \
    "$RUNNER_USER" >> "$RUN_LOG" 2>&1

  if [ $? -ne 0 ]; then
    echo "Could not create verifier user" | tee -a "$RUN_LOG"
    exit 6
  fi
fi

rm -rf "$RUNNER_DIR"
mkdir -p "$RUNNER_DIR" "$RUNNER_DIR/.npm" || exit 6
chown -R "$RUNNER_USER":"$RUNNER_USER" "$RUNNER_DIR" || exit 6

# Ensure the trusted reporter is owned by root and is not writable by the
# unprivileged process.
chown -R root:root /opt/ctrf >> "$RUN_LOG" 2>&1 || exit 6
chmod -R go-w /opt/ctrf >> "$RUN_LOG" 2>&1 || exit 6

ctrf_digest() {
  find /opt/ctrf -type f -print0 2>/dev/null \
    | sort -z \
    | xargs -0 sha256sum 2>/dev/null \
    | sha256sum \
    | awk '{print $1}'
}

CTRF_DIGEST_BEFORE="$(ctrf_digest)"

if [ -z "$CTRF_DIGEST_BEFORE" ]; then
  echo "Could not fingerprint trusted CTRF reporter" | tee -a "$RUN_LOG"
  exit 6
fi

DB_NAME="rateeat_gold_task2_test"
DB_PASSWORD="gold-sponsored-listing-db-password"

service postgresql start >> "$RUN_LOG" 2>&1 || {
  echo "Failed to start PostgreSQL" | tee -a "$RUN_LOG"
  exit 6
}

for _ in $(seq 1 30); do
  if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  echo "PostgreSQL did not become ready" | tee -a "$RUN_LOG"
  exit 6
fi

su postgres -c \
  "psql -v ON_ERROR_STOP=1 -c \"ALTER USER postgres WITH PASSWORD '$DB_PASSWORD';\"" \
  >> "$RUN_LOG" 2>&1 || exit 6

su postgres -c "dropdb --if-exists '$DB_NAME'" \
  >> "$RUN_LOG" 2>&1 || exit 6

su postgres -c "createdb '$DB_NAME'" \
  >> "$RUN_LOG" 2>&1 || exit 6

su postgres -c \
  "psql -v ON_ERROR_STOP=1 -d '$DB_NAME' -c 'CREATE EXTENSION IF NOT EXISTS pg_trgm;'" \
  >> "$RUN_LOG" 2>&1 || exit 6

export NODE_ENV=development
export DEVELOPMENT_PG_USER=postgres
export DEVELOPMENT_PG_PASSWORD="$DB_PASSWORD"
export DEVELOPMENT_PG_DATABASE="$DB_NAME"
export DEVELOPMENT_PG_HOST=127.0.0.1
export DEVELOPMENT_PG_PORT=5432
export JWT_SECRET="${JWT_SECRET:-gold-sponsored-listing-test-secret}"
export SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-https://hooks.slack.com/services/test/test/test}"

# Run repository-controlled migrations without root privileges.
run_log runuser -u "$RUNNER_USER" -- env \
  HOME="$RUNNER_DIR" \
  NPM_CONFIG_CACHE="$RUNNER_DIR/.npm" \
  PATH="$PATH" \
  NODE_PATH="$NODE_PATH" \
  NODE_ENV="$NODE_ENV" \
  DEVELOPMENT_PG_USER="$DEVELOPMENT_PG_USER" \
  DEVELOPMENT_PG_PASSWORD="$DEVELOPMENT_PG_PASSWORD" \
  DEVELOPMENT_PG_DATABASE="$DEVELOPMENT_PG_DATABASE" \
  DEVELOPMENT_PG_HOST="$DEVELOPMENT_PG_HOST" \
  DEVELOPMENT_PG_PORT="$DEVELOPMENT_PG_PORT" \
  JWT_SECRET="$JWT_SECRET" \
  SLACK_WEBHOOK_URL="$SLACK_WEBHOOK_URL" \
  npm --prefix /app/rateeat_backend run migrate

MIGRATE_EXIT=$?

if [ "$MIGRATE_EXIT" -ne 0 ]; then
  echo "Database migrations failed" | tee -a "$RUN_LOG"
  exit 6
fi

if [ "$(ctrf_digest)" != "$CTRF_DIGEST_BEFORE" ]; then
  echo "Trusted CTRF reporter changed during migration" | tee -a "$RUN_LOG"
  exit 6
fi

cat > /tmp/rateeat-sponsored-verifier-jest.config.cjs <<'JEST_CONFIG'
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

chmod 644 /tmp/rateeat-sponsored-verifier-jest.config.cjs

# Existing repository tests — P2P.
rm -rf "$RUNNER_DIR/ctrf"

(
  cd "$RUNNER_DIR" || exit 6

  timeout --signal=TERM --kill-after=10s 300 \
    runuser -u "$RUNNER_USER" -- env \
    HOME="$RUNNER_DIR" \
    NPM_CONFIG_CACHE="$RUNNER_DIR/.npm" \
    PATH="$PATH" \
    NODE_PATH="$NODE_PATH" \
    NODE_ENV="$NODE_ENV" \
    DEVELOPMENT_PG_USER="$DEVELOPMENT_PG_USER" \
    DEVELOPMENT_PG_PASSWORD="$DEVELOPMENT_PG_PASSWORD" \
    DEVELOPMENT_PG_DATABASE="$DEVELOPMENT_PG_DATABASE" \
    DEVELOPMENT_PG_HOST="$DEVELOPMENT_PG_HOST" \
    DEVELOPMENT_PG_PORT="$DEVELOPMENT_PG_PORT" \
    JWT_SECRET="$JWT_SECRET" \
    SLACK_WEBHOOK_URL="$SLACK_WEBHOOK_URL" \
    "$JEST_BIN" \
    --config /tmp/rateeat-sponsored-verifier-jest.config.cjs \
    --no-cache \
    --runInBand \
    --forceExit \
    --testPathIgnorePatterns='sponsored_listing_(schedule|impression)_behavior\.test\.ts$' \
    --reporters=default \
    --reporters="$CTRF_REPORTER"
) 2>&1 | tee -a "$RUN_LOG"

BASE_JEST_EXIT=${PIPESTATUS[0]}

if [ "$(ctrf_digest)" != "$CTRF_DIGEST_BEFORE" ]; then
  echo "Trusted CTRF reporter changed during existing tests" | tee -a "$RUN_LOG"
  exit 6
fi

if [ -f "$RUNNER_DIR/ctrf/ctrf-report.json" ]; then
  mv "$RUNNER_DIR/ctrf/ctrf-report.json" /logs/verifier/base_ctrf.json
else
  echo "Existing-suite CTRF report was not produced" | tee -a "$RUN_LOG"
  exit 6
fi

# Sponsored-listing task tests.
rm -rf "$RUNNER_DIR/ctrf"

(
  cd "$RUNNER_DIR" || exit 6

  timeout --signal=TERM --kill-after=10s 180 \
    runuser -u "$RUNNER_USER" -- env \
    HOME="$RUNNER_DIR" \
    NPM_CONFIG_CACHE="$RUNNER_DIR/.npm" \
    PATH="$PATH" \
    NODE_PATH="$NODE_PATH" \
    NODE_ENV="$NODE_ENV" \
    DEVELOPMENT_PG_USER="$DEVELOPMENT_PG_USER" \
    DEVELOPMENT_PG_PASSWORD="$DEVELOPMENT_PG_PASSWORD" \
    DEVELOPMENT_PG_DATABASE="$DEVELOPMENT_PG_DATABASE" \
    DEVELOPMENT_PG_HOST="$DEVELOPMENT_PG_HOST" \
    DEVELOPMENT_PG_PORT="$DEVELOPMENT_PG_PORT" \
    JWT_SECRET="$JWT_SECRET" \
    SLACK_WEBHOOK_URL="$SLACK_WEBHOOK_URL" \
    "$JEST_BIN" \
    --config /tmp/rateeat-sponsored-verifier-jest.config.cjs \
    --no-cache \
    --runInBand \
    --forceExit \
    --runTestsByPath \
    /app/rateeat_backend/src/__tests__/unit/sponsored_listing_schedule_behavior.test.ts \
    /app/rateeat_backend/src/__tests__/unit/sponsored_listing_impression_behavior.test.ts \
    --reporters=default \
    --reporters="$CTRF_REPORTER"
) 2>&1 | tee -a "$RUN_LOG"

NEW_JEST_EXIT=${PIPESTATUS[0]}

if [ "$(ctrf_digest)" != "$CTRF_DIGEST_BEFORE" ]; then
  echo "Trusted CTRF reporter changed during held-out tests" | tee -a "$RUN_LOG"
  exit 6
fi

if [ -f "$RUNNER_DIR/ctrf/ctrf-report.json" ]; then
  mv "$RUNNER_DIR/ctrf/ctrf-report.json" /logs/verifier/new_ctrf.json
else
  echo "Held-out CTRF report was not produced" | tee -a "$RUN_LOG"
  exit 6
fi

echo "existing suite exit: $BASE_JEST_EXIT" | tee -a "$RUN_LOG"
echo "sponsored-listing suite exit: $NEW_JEST_EXIT" | tee -a "$RUN_LOG"

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