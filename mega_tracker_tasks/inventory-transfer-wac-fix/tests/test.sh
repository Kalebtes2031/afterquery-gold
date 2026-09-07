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
      /logs/verifier/existing_jest.json /logs/verifier/feature_jest.json

JEST_BIN=""
if [ -x /app/node_modules/.bin/jest ]; then
  JEST_BIN=/app/node_modules/.bin/jest
elif command -v jest >/dev/null 2>&1; then
  JEST_BIN="$(command -v jest)"
elif command -v npx >/dev/null 2>&1; then
  JEST_BIN="npx --no-install jest"
fi

if [ -z "$JEST_BIN" ]; then
  echo "[verifier] ERROR: Jest is unavailable in the published environment" | tee -a "$RUN_LOG"
fi

CTRF_REPORTER=""
if [ -d /opt/ctrf ]; then
  CTRF_REPORTER="$(
    node -e '
      try {
        const resolved = require.resolve("jest-ctrf-json-reporter", { paths: ["/opt/ctrf"] });
        if (!resolved.startsWith("/opt/ctrf/")) process.exit(2);
        process.stdout.write(resolved);
      } catch (_) { process.exit(1); }
    ' 2>/dev/null || true
  )"
fi

TRUSTED_CONFIG=/tmp/mega-tracker-gold-jest.config.cjs
cat > "$TRUSTED_CONFIG" <<'JEST_CONFIG'
module.exports = {
  rootDir: "/app",
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleFileExtensions: ["ts", "js", "json"],
  testTimeout: 30000,
  restoreMocks: true,
  clearMocks: true,
};
JEST_CONFIG

run_jest_json() {
  local json_path="$1"
  shift
  if [ -z "$JEST_BIN" ]; then
    return 127
  fi
  # Prefer trusted CTRF reporter when present; always also emit Jest JSON for conversion.
  local -a reporters=(--reporters=default --reporters=json)
  if [ -n "$CTRF_REPORTER" ]; then
    reporters+=(--reporters="$CTRF_REPORTER")
  fi
  run_log $JEST_BIN \
    --config "$TRUSTED_CONFIG" \
    --runInBand \
    --forceExit \
    --json \
    --outputFile="$json_path" \
    "${reporters[@]}" \
    --runTestsByPath \
    "$@"
}

run_jest_json /logs/verifier/existing_jest.json \
    src/modules/accounts/domain/__tests__/Account.test.ts \
    src/modules/accounts/domain/__tests__/Account.getters.test.ts \
    src/modules/branches/domain/__tests__/Branch.test.ts \
    src/shared/infrastructure/pagination/__tests__/CursorPager.test.ts \
    src/modules/inventory/domain/__tests__/Product.test.ts \
    src/modules/finance/domain/__tests__/FinanceDomain.test.ts \
    src/modules/partners/domain/__tests__/Partner.test.ts \
    src/modules/sales/domain/__tests__/SaleOrder.test.ts \
    src/modules/purchases/domain/__tests__/PurchaseOrder.test.ts \
    src/modules/inventory/domain/__tests__/InventoryMovementService.test.ts \
    src/modules/inventory/domain/__tests__/Valuation.test.ts \
    src/modules/inventory/domain/__tests__/InventoryBalanceService.test.ts \
    src/modules/company/domain/__tests__/Company.test.ts \
    src/modules/employees/domain/__tests__/Employee.test.ts \
    src/modules/expenses/domain/__tests__/Expense.test.ts \
    src/modules/roles/domain/__tests__/RoleDomain.test.ts
P2P_EXIT=$?

run_jest_json /logs/verifier/feature_jest.json \
    src/gold_tests/transfer_wac_apply.test.ts \
    src/gold_tests/transfer_wac_audit.test.ts \
    src/gold_tests/transfer_wac_edges.test.ts \
    src/gold_tests/transfer_wac_barrel.test.ts
F2P_EXIT=$?

echo "[verifier] p2p_exit=$P2P_EXIT f2p_exit=$F2P_EXIT" | tee -a "$RUN_LOG"

python3 - <<'PY_CTRF'
import json
from pathlib import Path

config = json.loads(Path('/tests/config.json').read_text())


def load_jest(path):
    try:
        return json.loads(Path(path).read_text())
    except Exception:
        return {}


def assertion_name(assertion):
    ancestors = [str(x).strip() for x in assertion.get('ancestorTitles', []) if str(x).strip()]
    title = str(assertion.get('title') or assertion.get('name') or '').strip()
    if title:
        return ' > '.join([*ancestors, title]) if ancestors else title
    return str(assertion.get('fullName') or '').strip()


def collect_assertions(payload):
    found = {}
    for file_result in payload.get('testResults', []) or []:
        for assertion in file_result.get('assertionResults', []) or []:
            name = assertion_name(assertion)
            if not name:
                continue
            raw_status = str(assertion.get('status', 'failed'))
            if raw_status == 'passed':
                status = 'passed'
            elif raw_status in {'pending', 'skipped', 'todo'}:
                status = 'skipped'
            else:
                status = 'failed'
            failures = assertion.get('failureMessages') or []
            found[name] = {
                'name': name,
                'status': status,
                'duration': int(assertion.get('duration') or 0),
                'message': '\n'.join(str(x) for x in failures) if failures else '',
            }
    return found


def write_ctrf(jest_path, ids, output_path):
    assertions = collect_assertions(load_jest(jest_path))
    tests = []
    for raw_id in ids:
        test_id = str(raw_id).strip()
        entry = assertions.get(test_id)
        if entry is None:
            entry = {
                'name': test_id,
                'status': 'failed',
                'duration': 0,
                'message': 'Configured test was missing from the Jest JSON report; see run.log',
            }
        tests.append(entry)

    passed = sum(t['status'] == 'passed' for t in tests)
    failed = sum(t['status'] == 'failed' for t in tests)
    skipped = sum(t['status'] == 'skipped' for t in tests)
    report = {
        'reportFormat': 'CTRF',
        'specVersion': '1.0.0',
        'results': {
            'tool': {'name': 'jest'},
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
    Path(output_path).write_text(json.dumps(report, indent=2) + '\n')


write_ctrf('/logs/verifier/existing_jest.json', config['p2p_node_ids'], '/logs/verifier/base_ctrf.json')
write_ctrf('/logs/verifier/feature_jest.json', config['f2p_node_ids'], '/logs/verifier/new_ctrf.json')
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
