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

mkdir -p /logs/verifier
rm -f /logs/verifier/base_ctrf.json /logs/verifier/new_ctrf.json

JEST_BIN="/app/rateeat_backend/node_modules/.bin/jest"
if [ ! -x "$JEST_BIN" ]; then
  JEST_BIN="npx jest"
fi

CTRF_REPORTER="$(
  node -e '
    try {
      const resolved = require.resolve(
        "jest-ctrf-json-reporter",
        { paths: ["/opt/ctrf", "/app/rateeat_backend/node_modules"] }
      );
      if (!resolved.startsWith("/opt/ctrf/")) process.exit(2);
      process.stdout.write(resolved);
    } catch (_) {
      try {
        process.stdout.write(require.resolve("jest-ctrf-json-reporter"));
      } catch (e) {
        process.stdout.write("jest-ctrf-json-reporter");
      }
    }
  '
)"

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
    "^.+\.tsx?$": [
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

# 1. Existing repository tests (P2P)
rm -rf ctrf

timeout --kill-after=10s 300s \
  "$JEST_BIN" \
  --config /tmp/rateeat-verifier-jest.config.cjs \
  --no-cache \
  --runInBand \
  --forceExit \
  --testPathIgnorePatterns='candidate_item_review_.*verification.*\.test\.ts$' \
  --reporters=default \
  --reporters="$CTRF_REPORTER" \
  2>&1 | tee -a "$RUN_LOG"

if [ -f ctrf/ctrf-report.json ]; then
  cp ctrf/ctrf-report.json /logs/verifier/base_ctrf.json
fi

# 2. Held-out tests (F2P)
rm -rf ctrf

timeout --kill-after=10s 300s \
  "$JEST_BIN" \
  --config /tmp/rateeat-verifier-jest.config.cjs \
  --no-cache \
  --runInBand \
  --forceExit \
  --runTestsByPath \
  src/__tests__/unit/candidate_item_review_verification_auth.test.ts \
  src/__tests__/unit/candidate_item_review_verification_behavior.test.ts \
  src/__tests__/unit/candidate_item_review_batch_verification_behavior.test.ts \
  src/__tests__/unit/candidate_item_review_verification_audit.test.ts \
  --reporters=default \
  --reporters="$CTRF_REPORTER" \
  2>&1 | tee -a "$RUN_LOG"

if [ -f ctrf/ctrf-report.json ]; then
  cp ctrf/ctrf-report.json /logs/verifier/new_ctrf.json
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
# move every framework-native report/log under reports/.
mkdir -p /logs/verifier/reports 2>/dev/null
for _f in /logs/verifier/*; do
  case "${_f##*/}" in
    reward.json|reward.txt|ctrf.json|run.log|test-stdout.txt|reports) continue ;;
  esac
  [ -f "$_f" ] && mv -f "$_f" /logs/verifier/reports/ 2>/dev/null
done