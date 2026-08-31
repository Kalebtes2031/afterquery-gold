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
export NODE_PATH="/opt/ctrf/node_modules:/app/rateeat_backend/node_modules"
set +e

cd /app/rateeat_backend || exit 6

JEST_BIN="/app/rateeat_backend/node_modules/.bin/jest"
if [ ! -x "$JEST_BIN" ]; then
  echo "Jest binary not found at $JEST_BIN" | tee -a "$RUN_LOG"
  exit 6
fi
# CTRF exporter
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
    } catch (error) {
      process.exit(1);
    }
  '
)"

if [ -z "$CTRF_REPORTER" ] || [[ "$CTRF_REPORTER" != /opt/ctrf/* ]]; then
  echo "Trusted CTRF reporter could not be resolved from /opt/ctrf" \
    | tee -a "$RUN_LOG"
  exit 6
fi

log "using trusted CTRF reporter: $CTRF_REPORTER"
# ---------------------------------------------------------------------------
# PostgreSQL setup
# ---------------------------------------------------------------------------

log "starting PostgreSQL"

timeout --kill-after=5s 30s service postgresql start \
  2>&1 | tee -a "$RUN_LOG"

PG_START_STATUS="${PIPESTATUS[0]}"
if [ "$PG_START_STATUS" -ne 0 ]; then
  echo "PostgreSQL start failed: $PG_START_STATUS" | tee -a "$RUN_LOG"
  exit 6
fi

log "waiting for PostgreSQL"

POSTGRES_READY=0
for _attempt in $(seq 1 30); do
  if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    POSTGRES_READY=1
    break
  fi
  sleep 1
done

if [ "$POSTGRES_READY" -ne 1 ]; then
  echo "PostgreSQL did not become ready" | tee -a "$RUN_LOG"
  exit 6
fi

DB_NAME="rateeat_gold_task1_test"
DB_PASSWORD="gold-verifier-postgres-password"

# Configure postgres TCP authentication.
log "configuring PostgreSQL user"

timeout --kill-after=5s 30s \
  su postgres -c \
  "psql -v ON_ERROR_STOP=1 -d postgres -c \"ALTER USER postgres WITH PASSWORD '$DB_PASSWORD';\"" \
  2>&1 | tee -a "$RUN_LOG"

PG_USER_STATUS="${PIPESTATUS[0]}"
if [ "$PG_USER_STATUS" -ne 0 ]; then
  echo "PostgreSQL user setup failed: $PG_USER_STATUS" | tee -a "$RUN_LOG"
  exit 6
fi

# Always run against a clean database.
log "recreating test database"

timeout --kill-after=5s 30s \
  su postgres -c "dropdb --if-exists '$DB_NAME'" \
  2>&1 | tee -a "$RUN_LOG"

DROP_STATUS="${PIPESTATUS[0]}"
if [ "$DROP_STATUS" -ne 0 ]; then
  echo "Failed to drop test database: $DROP_STATUS" | tee -a "$RUN_LOG"
  exit 6
fi

timeout --kill-after=5s 30s \
  su postgres -c "createdb '$DB_NAME'" \
  2>&1 | tee -a "$RUN_LOG"

CREATE_STATUS="${PIPESTATUS[0]}"
if [ "$CREATE_STATUS" -ne 0 ]; then
  echo "Failed to create test database: $CREATE_STATUS" | tee -a "$RUN_LOG"
  exit 6
fi

# Existing RateEat migrations require pg_trgm.
log "enabling pg_trgm"

timeout --kill-after=5s 30s \
  su postgres -c \
  "psql -v ON_ERROR_STOP=1 -d '$DB_NAME' -c 'CREATE EXTENSION IF NOT EXISTS pg_trgm;'" \
  2>&1 | tee -a "$RUN_LOG"

EXT_STATUS="${PIPESTATUS[0]}"
if [ "$EXT_STATUS" -ne 0 ]; then
  echo "Failed to enable pg_trgm: $EXT_STATUS" | tee -a "$RUN_LOG"
  exit 6
fi

# ---------------------------------------------------------------------------
# Application environment
# ---------------------------------------------------------------------------

export NODE_ENV=development
export DEVELOPMENT_PG_USER=postgres
export DEVELOPMENT_PG_PASSWORD="$DB_PASSWORD"
export DEVELOPMENT_PG_DATABASE="$DB_NAME"
export DEVELOPMENT_PG_HOST=127.0.0.1
export DEVELOPMENT_PG_PORT=5432

export JWT_SECRET=gold-test-secret
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/test/test/test"

# ---------------------------------------------------------------------------
# Migrations
# ---------------------------------------------------------------------------

log "running database migrations"

timeout --kill-after=10s 180s npm run migrate \
  2>&1 | tee -a "$RUN_LOG"

MIGRATE_STATUS="${PIPESTATUS[0]}"
echo "[verifier] migration status=$MIGRATE_STATUS" | tee -a "$RUN_LOG"

if [ "$MIGRATE_STATUS" -ne 0 ]; then
  echo "Database migrations failed" | tee -a "$RUN_LOG"
  exit 6
fi

# ---------------------------------------------------------------------------
# Verifier-owned Jest configuration
# ---------------------------------------------------------------------------

cat > /tmp/rateeat-verifier-jest.config.cjs <<'JEST_CONFIG'
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

# ---------------------------------------------------------------------------
# Existing repository tests — P2P
# ---------------------------------------------------------------------------

log "running P2P suite"

rm -rf ctrf

timeout --kill-after=10s 300s \
  "$JEST_BIN" \
  --config /tmp/rateeat-verifier-jest.config.cjs \
  --no-cache \
  --runInBand \
  --forceExit \
  --testPathIgnorePatterns='order_(idempotency|atomicity)_(behavior|real_db)\.test\.ts$' \
  --reporters=default \
  --reporters="$CTRF_REPORTER" \
  2>&1 | tee -a "$RUN_LOG"

P2P_STATUS="${PIPESTATUS[0]}"
echo "[verifier] P2P Jest status=$P2P_STATUS" | tee -a "$RUN_LOG"

if [ -f ctrf/ctrf-report.json ]; then
  mv ctrf/ctrf-report.json /logs/verifier/base_ctrf.json
  echo "[verifier] base CTRF report written" | tee -a "$RUN_LOG"
else
  echo "[verifier] ERROR: P2P CTRF report missing" | tee -a "$RUN_LOG"
fi

# ---------------------------------------------------------------------------
# Held-out real PostgreSQL tests — F2P
# ---------------------------------------------------------------------------

log "running F2P suite"

rm -rf ctrf

timeout --kill-after=10s 300s \
  "$JEST_BIN" \
  --config /tmp/rateeat-verifier-jest.config.cjs \
  --no-cache \
  --runInBand \
  --forceExit \
  --runTestsByPath \
  src/__tests__/unit/order_idempotency_real_db.test.ts \
  src/__tests__/unit/order_atomicity_real_db.test.ts \
  --reporters=default \
  --reporters="$CTRF_REPORTER" \
  2>&1 | tee -a "$RUN_LOG"

F2P_STATUS="${PIPESTATUS[0]}"
echo "[verifier] F2P Jest status=$F2P_STATUS" | tee -a "$RUN_LOG"

if [ -f ctrf/ctrf-report.json ]; then
  mv ctrf/ctrf-report.json /logs/verifier/new_ctrf.json
  echo "[verifier] new CTRF report written" | tee -a "$RUN_LOG"
else
  echo "[verifier] ERROR: F2P CTRF report missing" | tee -a "$RUN_LOG"
fi

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