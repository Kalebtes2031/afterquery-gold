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
mkdir -p /logs/verifier/p2p-node /logs/verifier/f2p-node
rm -f /logs/verifier/base_ctrf.json /logs/verifier/new_ctrf.json
rm -f /logs/verifier/p2p-node/*.json /logs/verifier/f2p-node/*.json

NODE_BIN="$(command -v node 2>/dev/null)"
if [ -z "$NODE_BIN" ]; then
  echo "[verifier] ERROR: node is unavailable" | tee -a "$RUN_LOG"
fi

run_node_file() {
  local output="$1"
  local file="$2"
  if [ -z "$NODE_BIN" ]; then
    return 127
  fi
  GOLD_RESULT_FILE="$output" run_log "$NODE_BIN" \
    --no-warnings \
    --experimental-strip-types \
    --experimental-test-module-mocks \
    "$file"
}

run_node_file /logs/verifier/p2p-node/01.json /app/packages/backend/src/gold_tests/p2p_constants_compat.test.ts
P2P_1=$?
run_node_file /logs/verifier/p2p-node/02.json /app/packages/backend/src/gold_tests/p2p_input_validation_compat.test.ts
P2P_2=$?
run_node_file /logs/verifier/p2p-node/03.json /app/packages/backend/src/gold_tests/p2p_env_utils_compat.test.ts
P2P_3=$?

run_node_file /logs/verifier/p2p-node/04.json /app/packages/backend/src/gold_tests/p2p_reaction_operations_compat.test.ts
P2P_4=$?

run_node_file /logs/verifier/f2p-node/01.json /app/packages/backend/src/gold_tests/reaction_timeline_behavior.test.ts
F2P_1=$?
run_node_file /logs/verifier/f2p-node/02.json /app/packages/backend/src/gold_tests/reaction_audit_behavior.test.ts
F2P_2=$?
run_node_file /logs/verifier/f2p-node/03.json /app/packages/backend/src/gold_tests/reaction_repair_behavior.test.ts
F2P_3=$?

echo "[verifier] node exits p2p=$P2P_1,$P2P_2,$P2P_3,$P2P_4 f2p=$F2P_1,$F2P_2,$F2P_3" | tee -a "$RUN_LOG"

python3 - <<'PY_CTRF'
import json
from pathlib import Path

cfg = json.loads(Path('/tests/config.json').read_text())


def load_rows(directory):
    found = {}
    for path in sorted(Path(directory).glob('*.json')):
        try:
            rows = json.loads(path.read_text())
        except Exception:
            continue
        if not isinstance(rows, list):
            continue
        for row in rows:
            if not isinstance(row, dict):
                continue
            name = str(row.get('name') or '').strip()
            if not name:
                continue
            status = str(row.get('status') or 'failed').lower()
            if status not in {'passed', 'failed', 'skipped'}:
                status = 'failed'
            candidate = {
                'name': name,
                'status': status,
                'duration': int(row.get('duration') or 0),
            }
            message = str(row.get('message') or '').strip()
            if message:
                candidate['message'] = message
            current = found.get(name)
            rank = {'passed': 0, 'skipped': 1, 'failed': 2}
            if current is None or rank[candidate['status']] > rank[current['status']]:
                found[name] = candidate
    return found


def write_ctrf(directory, ids, output):
    found = load_rows(directory)
    tests = []
    for raw in ids:
        name = str(raw).strip()
        row = found.get(name)
        if row is None:
            row = {
                'name': name,
                'status': 'failed',
                'duration': 0,
                'message': 'Configured test was missing from the Node test results',
            }
        tests.append(row)
    passed = sum(row['status'] == 'passed' for row in tests)
    failed = sum(row['status'] == 'failed' for row in tests)
    skipped = sum(row['status'] == 'skipped' for row in tests)
    report = {
        'reportFormat': 'CTRF',
        'specVersion': '1.0.0',
        'results': {
            'tool': {'name': 'node'},
            'summary': {
                'tests': len(tests),
                'passed': passed,
                'failed': failed,
                'skipped': skipped,
                'pending': 0,
                'other': 0,
            },
            'tests': tests,
        },
    }
    Path(output).write_text(json.dumps(report, indent=2) + '\n')


write_ctrf('/logs/verifier/p2p-node', cfg['p2p_node_ids'], '/logs/verifier/base_ctrf.json')
write_ctrf('/logs/verifier/f2p-node', cfg['f2p_node_ids'], '/logs/verifier/new_ctrf.json')
PY_CTRF
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
