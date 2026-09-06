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
rm -f /logs/verifier/base_ctrf.json /logs/verifier/new_ctrf.json \
      /logs/verifier/existing_vitest.json /logs/verifier/feature_vitest.json

TRUSTED_CONFIG=/app/.gold-vitest.config.ts
TRUSTED_SETUP=/app/.gold-vitest.setup.ts

cat > "$TRUSTED_CONFIG" <<'VITEST_CONFIG'
export default {
  resolve: {
    alias: {
      "@": "/app/src",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["/app/.gold-vitest.setup.ts"],
  },
};
VITEST_CONFIG

cat > "$TRUSTED_SETUP" <<'VITEST_SETUP'
import "@testing-library/jest-dom";
VITEST_SETUP

# The published environment may expose Vitest as a project binary, a PATH
# binary, or an npm-local executable. Resolve it without installing anything.
declare -a VITEST_CMD
VITEST_CMD=()

if command -v vitest >/dev/null 2>&1; then
  VITEST_CMD=("$(command -v vitest)")
elif [ -x /app/node_modules/.bin/vitest ]; then
  VITEST_CMD=(/app/node_modules/.bin/vitest)
elif command -v npx >/dev/null 2>&1 && npx --no-install vitest --version >>"$RUN_LOG" 2>&1; then
  VITEST_CMD=(npx --no-install vitest)
elif command -v node >/dev/null 2>&1; then
  _vitest_pkg="$(node -e 'try { console.log(require.resolve("vitest/package.json", { paths: ["/app"] })) } catch (_) {}' 2>/dev/null || true)"
  if [ -n "$_vitest_pkg" ]; then
    _vitest_dir="${_vitest_pkg%/package.json}"
    if [ -f "$_vitest_dir/vitest.mjs" ]; then
      VITEST_CMD=(node "$_vitest_dir/vitest.mjs")
    fi
  fi
fi

if [ "${#VITEST_CMD[@]}" -eq 0 ] && command -v npm >/dev/null 2>&1; then
  _global_root="$(npm root -g 2>/dev/null || true)"
  if [ -n "$_global_root" ] && [ -f "$_global_root/vitest/vitest.mjs" ]; then
    VITEST_CMD=(node "$_global_root/vitest/vitest.mjs")
  fi
fi

if [ "${#VITEST_CMD[@]}" -eq 0 ]; then
  echo "[verifier] ERROR: Vitest is not available in the published environment" | tee -a "$RUN_LOG"
else
  echo "[verifier] vitest command: ${VITEST_CMD[*]}" | tee -a "$RUN_LOG"
  "${VITEST_CMD[@]}" --version 2>&1 | tee -a "$RUN_LOG"
fi

run_selection() {
  local json_path="$1"
  shift

  if [ "${#VITEST_CMD[@]}" -eq 0 ]; then
    return 127
  fi

  # Use an isolated verifier config so repository-controlled Vite settings
  # cannot suppress or redirect the held-out selections.
  run_log "${VITEST_CMD[@]}" run --config "$TRUSTED_CONFIG" "$@" \
    --reporter=verbose --reporter=json --outputFile.json="$json_path"
}

run_selection /logs/verifier/existing_vitest.json \
  src/components/Button.test.tsx \
  tests/service_details_regression.test.ts \
  tests/utils_regression.test.ts

run_selection /logs/verifier/feature_vitest.json \
  tests/notification_template_normalizer.test.ts \
  tests/notification_message_renderer.test.ts \
  tests/notification_whatsapp_batch.test.ts \
  tests/notification_public_api.test.ts

python3 - <<'PY_CTRF'
import json
from pathlib import Path

config = json.loads(Path('/tests/config.json').read_text())


def load_vitest(path):
    try:
        return json.loads(Path(path).read_text())
    except Exception:
        return {}


def collect_assertions(payload):
    found = {}
    for file_result in payload.get('testResults', []) or []:
        for assertion in file_result.get('assertionResults', []) or []:
            name = assertion.get('title') or assertion.get('name')
            if not name:
                continue
            raw_status = assertion.get('status', 'failed')
            if raw_status == 'passed':
                status = 'passed'
            elif raw_status in {'pending', 'skipped', 'todo'}:
                status = 'skipped'
            else:
                status = 'failed'
            failures = assertion.get('failureMessages') or []
            found[str(name).strip()] = {
                'name': str(name).strip(),
                'status': status,
                'duration': int(assertion.get('duration') or 0),
                'message': '\n'.join(str(x) for x in failures) if failures else '',
            }
    return found


def write_ctrf(vitest_path, ids, output_path):
    assertions = collect_assertions(load_vitest(vitest_path))
    tests = []
    for raw_id in ids:
        test_id = str(raw_id).strip()
        entry = assertions.get(test_id)
        if entry is None:
            entry = {
                'name': test_id,
                'status': 'failed',
                'duration': 0,
                'message': 'Configured test was missing from the Vitest JSON report',
            }
        tests.append(entry)

    passed = sum(t['status'] == 'passed' for t in tests)
    failed = sum(t['status'] == 'failed' for t in tests)
    skipped = sum(t['status'] == 'skipped' for t in tests)
    ctrf = {
        'reportFormat': 'CTRF',
        'specVersion': '1.0.0',
        'results': {
            'tool': {'name': 'vitest'},
            'summary': {
                'tests': len(tests),
                'passed': passed,
                'failed': failed,
                'pending': 0,
                'skipped': skipped,
                'other': 0,
                'start': 0,
                'stop': 0,
            },
            'tests': tests,
        },
    }
    Path(output_path).write_text(json.dumps(ctrf, indent=2) + '\n')


write_ctrf('/logs/verifier/existing_vitest.json', config['p2p_node_ids'], '/logs/verifier/base_ctrf.json')
write_ctrf('/logs/verifier/feature_vitest.json', config['f2p_node_ids'], '/logs/verifier/new_ctrf.json')
PY_CTRF

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
