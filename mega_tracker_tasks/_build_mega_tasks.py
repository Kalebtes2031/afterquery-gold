# -*- coding: utf-8 -*-
"""Build four mega-tracker AfterQuery Gold task bundles from _staging."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STAGING = ROOT / "_staging"
BASE = "0b40f7e7515a05dbcadff4942d353af4ef02954f"
REPO_URL = "https://github.com/dawit2119/mega-tracker"
DOCKER = "us-docker.pkg.dev/afterquery-compute/compute-images/gold-repo-mega-tracker:v1"

P2P_IDS = json.loads((ROOT / "_shared_p2p_ids.json").read_text(encoding="utf-8"))
P2P_META = json.loads((ROOT / "_shared_p2p_meta.json").read_text(encoding="utf-8"))
P2P_FILES = P2P_META["files"]

TASKS = [
    {
        "id": "sale-cancel-policy",
        "title": "Sale Cancel Policy",
        "description": "Pure sale-order cancel eligibility and inventory/payment reversal preview without DB access.",
        "category": "feature",
        "sol": [
            "src/modules/sales/domain/SaleCancelTypes.ts",
            "src/modules/sales/domain/SaleCancelRules.ts",
            "src/modules/sales/domain/SaleCancelReversal.ts",
            "src/modules/sales/domain/SaleCancelPolicy.ts",
            "src/modules/sales/domain/index.ts",
        ],
        "f2p": [
            "src/gold_tests/sale_cancel_evaluate.test.ts",
            "src/gold_tests/sale_cancel_reversal.test.ts",
            "src/gold_tests/sale_cancel_edges.test.ts",
            "src/gold_tests/sale_cancel_matrix.test.ts",
        ],
    },
    {
        "id": "inventory-transfer-wac-fix",
        "title": "Inventory Transfer WAC Fix",
        "description": "Fix branch-transfer WAC drift with a pure transfer cost engine and audit helpers.",
        "category": "bug",
        "sol": [
            "src/modules/inventory/domain/TransferWacTypes.ts",
            "src/modules/inventory/domain/TransferWacMath.ts",
            "src/modules/inventory/domain/TransferWacAudit.ts",
            "src/modules/inventory/domain/TransferWacEngine.ts",
            "src/modules/inventory/domain/index.ts",
        ],
        "f2p": [
            "src/gold_tests/transfer_wac_apply.test.ts",
            "src/gold_tests/transfer_wac_audit.test.ts",
            "src/gold_tests/transfer_wac_edges.test.ts",
            "src/gold_tests/transfer_wac_barrel.test.ts",
        ],
    },
    {
        "id": "partner-loan-settlement",
        "title": "Partner Loan Settlement",
        "description": "Pure FIFO/largest-first allocator for settling open partner loan legs with overpay leftover.",
        "category": "enhancement",
        "sol": [
            "src/modules/finance/domain/LoanSettlementTypes.ts",
            "src/modules/finance/domain/LoanSettlementOrdering.ts",
            "src/modules/finance/domain/LoanSettlementMath.ts",
            "src/modules/finance/domain/LoanSettlementAllocator.ts",
            "src/modules/finance/domain/index.ts",
        ],
        "f2p": [
            "src/gold_tests/loan_settlement_allocate.test.ts",
            "src/gold_tests/loan_settlement_preview.test.ts",
            "src/gold_tests/loan_settlement_matrix.test.ts",
            "src/gold_tests/loan_settlement_barrel.test.ts",
        ],
    },
    {
        "id": "fulfillment-remaining-guard",
        "title": "Fulfillment Remaining Guard",
        "description": "Pure remaining-qty guard for partial ship/receive with validation and consistency audit.",
        "category": "feature",
        "sol": [
            "src/shared/domain/fulfillment/FulfillmentTypes.ts",
            "src/shared/domain/fulfillment/FulfillmentMath.ts",
            "src/shared/domain/fulfillment/FulfillmentAudit.ts",
            "src/shared/domain/fulfillment/index.ts",
            "src/modules/sales/domain/FulfillmentRemainingGuard.ts",
            "src/modules/sales/domain/index.ts",
        ],
        "f2p": [
            "src/gold_tests/fulfillment_remaining_core.test.ts",
            "src/gold_tests/fulfillment_remaining_audit.test.ts",
            "src/gold_tests/fulfillment_remaining_matrix.test.ts",
            "src/gold_tests/fulfillment_remaining_barrel.test.ts",
            "src/gold_tests/fulfillment_remaining_extra.test.ts",
        ],
    },
]


def unix(text: str) -> bytes:
    return text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


def read_unix(path: Path) -> str:
    return path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")


def git_diff(staging_root: Path, paths: list[str]) -> str:
    chunks: list[str] = []
    for rel in paths:
        content = read_unix(staging_root / rel)
        if not content.endswith("\n"):
            content += "\n"
        lines = content.splitlines()
        header = [
            f"diff --git a/{rel} b/{rel}",
            "new file mode 100644",
            "index 0000000..1111111",
            "--- /dev/null",
            f"+++ b/{rel}",
            f"@@ -0,0 +1,{len(lines)} @@",
        ]
        body = [f"+{line}" for line in lines]
        chunks.append("\n".join(header + body) + "\n")
    return "".join(chunks)


def added(patch: str) -> int:
    return sum(1 for line in patch.splitlines() if line.startswith("+") and not line.startswith("+++"))


def extract_ids(staging_root: Path, paths: list[str]) -> list[str]:
    ids: list[str] = []
    describe_re = re.compile(r"""^\s*describe\(\s*["']([^"']+)["']""")
    it_re = re.compile(r"""^\s*it\(\s*["']([^"']+)["']""")
    for rel in paths:
        text = read_unix(staging_root / rel)
        stack: list[tuple[int, str]] = []
        for line in text.splitlines():
            m = describe_re.match(line)
            if m:
                indent = len(line) - len(line.lstrip(" "))
                while stack and stack[-1][0] >= indent:
                    stack.pop()
                stack.append((indent, m.group(1)))
                continue
            m = it_re.match(line)
            if m and stack:
                ids.append(" > ".join([s[1] for s in stack] + [m.group(1)]))
    return ids


def word_count(path: Path) -> int:
    body = read_unix(path).replace(
        "IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.",
        "",
    )
    return len(body.split())


def make_test_sh(f2p_rel: list[str]) -> str:
    p2p_paths = " \\\n    ".join(P2P_FILES)
    f2p_paths = " \\\n    ".join(f2p_rel)
    return f"""#!/bin/bash
# Verifier entrypoint (canonical frame). Patching and grading live in
# tests/grader.py; this script owns the task-specific part: run the suites,
# write machine-readable reports under /logs/verifier/, and apply any report
# fixups before grading. Edit ONLY between the RUN TESTS markers.
set -uo pipefail
trap 'if [ ! -f /logs/verifier/reward.json ] && [ ! -f /logs/verifier/reward.txt ]; then mkdir -p /logs/verifier; echo -1 > /logs/verifier/reward.txt; fi' EXIT
log() {{ echo "[verifier] $*"; }}
cd /app || {{ mkdir -p /logs/verifier; exit 6; }}

python3 /tests/grader.py prepare || exit $?
[ -f /logs/verifier/reward.json ] && exit 0   # model.patch didn't apply -> graded 0

# Canonical raw-output log: send every suite's combined stdout+stderr here
# (use run_log, or pipe through tee -a "$RUN_LOG" when feeding a reporter) so
# the reason a test failed is never lost. Never silence a test run.
export RUN_LOG=/logs/verifier/run.log
: > "$RUN_LOG" 2>/dev/null || true
run_log() {{ echo "+ $*" >> "$RUN_LOG" 2>/dev/null; "$@" 2>&1 | tee -a "$RUN_LOG"; return "${{PIPESTATUS[0]}}"; }}

# >>> RUN TESTS (task-specific) <<<
set +e
mkdir -p /logs/verifier
rm -f /logs/verifier/base_ctrf.json /logs/verifier/new_ctrf.json \\
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
      try {{
        const resolved = require.resolve("jest-ctrf-json-reporter", {{ paths: ["/opt/ctrf"] }});
        if (!resolved.startsWith("/opt/ctrf/")) process.exit(2);
        process.stdout.write(resolved);
      }} catch (_) {{ process.exit(1); }}
    ' 2>/dev/null || true
  )"
fi

TRUSTED_CONFIG=/tmp/mega-tracker-gold-jest.config.cjs
cat > "$TRUSTED_CONFIG" <<'JEST_CONFIG'
module.exports = {{
  rootDir: "/app",
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleFileExtensions: ["ts", "js", "json"],
  testTimeout: 30000,
  restoreMocks: true,
  clearMocks: true,
}};
JEST_CONFIG

run_jest_json() {{
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
  run_log $JEST_BIN \\
    --config "$TRUSTED_CONFIG" \\
    --runInBand \\
    --forceExit \\
    --json \\
    --outputFile="$json_path" \\
    "${{reporters[@]}}" \\
    --runTestsByPath \\
    "$@"
}}

run_jest_json /logs/verifier/existing_jest.json \\
    {p2p_paths}
P2P_EXIT=$?

run_jest_json /logs/verifier/feature_jest.json \\
    {f2p_paths}
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
        return {{}}


def assertion_name(assertion):
    ancestors = [str(x).strip() for x in assertion.get('ancestorTitles', []) if str(x).strip()]
    title = str(assertion.get('title') or assertion.get('name') or '').strip()
    if title:
        return ' > '.join([*ancestors, title]) if ancestors else title
    return str(assertion.get('fullName') or '').strip()


def collect_assertions(payload):
    found = {{}}
    for file_result in payload.get('testResults', []) or []:
        for assertion in file_result.get('assertionResults', []) or []:
            name = assertion_name(assertion)
            if not name:
                continue
            raw_status = str(assertion.get('status', 'failed'))
            if raw_status == 'passed':
                status = 'passed'
            elif raw_status in {{'pending', 'skipped', 'todo'}}:
                status = 'skipped'
            else:
                status = 'failed'
            failures = assertion.get('failureMessages') or []
            found[name] = {{
                'name': name,
                'status': status,
                'duration': int(assertion.get('duration') or 0),
                'message': '\\n'.join(str(x) for x in failures) if failures else '',
            }}
    return found


def write_ctrf(jest_path, ids, output_path):
    assertions = collect_assertions(load_jest(jest_path))
    tests = []
    for raw_id in ids:
        test_id = str(raw_id).strip()
        entry = assertions.get(test_id)
        if entry is None:
            entry = {{
                'name': test_id,
                'status': 'failed',
                'duration': 0,
                'message': 'Configured test was missing from the Jest JSON report; see run.log',
            }}
        tests.append(entry)

    passed = sum(t['status'] == 'passed' for t in tests)
    failed = sum(t['status'] == 'failed' for t in tests)
    skipped = sum(t['status'] == 'skipped' for t in tests)
    report = {{
        'reportFormat': 'CTRF',
        'specVersion': '1.0.0',
        'results': {{
            'tool': {{'name': 'jest'}},
            'summary': {{
                'tests': len(tests),
                'passed': passed,
                'failed': failed,
                'pending': 0,
                'skipped': skipped,
                'other': 0,
                'start': 0,
                'stop': 0,
            }},
            'tests': tests,
        }},
    }}
    Path(output_path).write_text(json.dumps(report, indent=2) + '\\n')


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
  case "${{_rl##*/}}" in *convert*.log|ctrf*.log|junit*.log) continue ;; esac
  _seen="$_seen $_rl"
  echo "===== raw suite output: ${{_rl##*/}} ====="
  cat "$_rl"
done 2>/dev/null
echo "===== grade ====="

python3 /tests/grader.py grade
log "reward.json=$(cat /logs/verifier/reward.json 2>/dev/null)"

# Uniform top level: keep only the canonical artifacts in /logs/verifier and
# move every framework-native report/log under reports/.
mkdir -p /logs/verifier/reports 2>/dev/null
for _f in /logs/verifier/*; do
  case "${{_f##*/}}" in
    reward.json|reward.txt|ctrf.json|run.log|test-stdout.txt|reports) continue ;;
  esac
  [ -f "$_f" ] && mv -f "$_f" /logs/verifier/reports/ 2>/dev/null
done
"""


def make_task_toml(task: dict) -> str:
    return f"""schema_version = "1.1"
artifacts = ["/logs/artifacts/model.patch"]

[task]
name = "mega-tracker/{task['id']}"

[metadata]
task_id = "{task['id']}"
display_title = "{task['title']}"
display_description = "{task['description']}"
category = "{task['category']}"
language = "typescript"
repository_url = "{REPO_URL}"
base_commit_hash = "{BASE}"

[agent]
timeout_sec = 5400

[verifier]
environment_mode = "separate"
timeout_sec = 1800

[verifier.environment]
build_timeout_sec = 1800
cpus = 2
memory_mb = 8192
storage_mb = 20480
allow_internet = false

[environment]
build_timeout_sec = 1800
docker_image = "{DOCKER}"
os = "linux"
cpus = 2
memory_mb = 8192
storage_mb = 20480
gpus = 0
allow_internet = false
"""


def make_verify() -> str:
    return read_unix(ROOT.parent / "ours_backend_tasks" / "channel-join-passes" / "verify_bundle.py")


def build_one(task: dict) -> dict:
    task_id = task["id"]
    staging_root = STAGING / task_id
    dest = ROOT / task_id
    (dest / "solution").mkdir(parents=True, exist_ok=True)
    (dest / "tests").mkdir(parents=True, exist_ok=True)

    instruction_text = read_unix(staging_root / "instruction.md")
    (dest / "instruction.md").write_bytes(unix(instruction_text))

    sol_patch = git_diff(staging_root, task["sol"])
    test_patch = git_diff(staging_root, task["f2p"])
    (dest / "solution" / "solution.patch").write_bytes(unix(sol_patch))
    (dest / "tests" / "test.patch").write_bytes(unix(test_patch))

    f2p_ids = extract_ids(staging_root, task["f2p"])
    config = {
        "base_commit": BASE,
        "f2p_node_ids": f2p_ids,
        "p2p_node_ids": P2P_IDS,
        "grade": {
            "format": "ctrf",
            "node_id": "name",
            "tool_label": "jest-json-ctrf",
            "reports": ["/logs/verifier/base_ctrf.json", "/logs/verifier/new_ctrf.json"],
        },
    }
    (dest / "tests" / "config.json").write_bytes(unix(json.dumps(config, indent=2) + "\n"))
    (dest / "tests" / "test.sh").write_bytes(unix(make_test_sh(task["f2p"])))
    (dest / "task.toml").write_bytes(unix(make_task_toml(task)))
    (dest / "verify_bundle.py").write_bytes(unix(make_verify()))

    metrics = {
        "id": task_id,
        "category": task["category"],
        "sol": added(sol_patch),
        "test": added(test_patch),
        "f2p": len(f2p_ids),
        "p2p": len(P2P_IDS),
        "words": word_count(dest / "instruction.md"),
        "sol_files": sol_patch.count("diff --git"),
        "test_files": test_patch.count("diff --git"),
    }

    submit = f"""# {task_id} — Submit bundle

New mega-tracker task (Jest, pure domain modules).

## Paste

| Field | File |
|---|---|
| Instruction | `instruction.md` |
| Solution | `solution/solution.patch` |
| Tests | `tests/test.patch` |
| Config | `tests/config.json` |
| test.sh | `tests/test.sh` |

## Verified metrics

| Check | Value | Floor |
|---|---|---|
| base_commit | `{BASE}` | platform |
| Solution +lines | {metrics['sol']} | ≥ 459 |
| Solution files | {metrics['sol_files']} | ≥ 4 |
| Test +lines | {metrics['test']} | ≥ 596 |
| Test files | {metrics['test_files']} | ≥ 2 |
| F2P / P2P | {metrics['f2p']} / {metrics['p2p']} | ≥ 20 / ≥ 50 |
| Instruction words | {metrics['words']} | 100–300 |
| Category | `{task['category']}` | feature/bug/enhancement |

```bash
python mega_tracker_tasks/{task_id}/verify_bundle.py
```

Note: docker image `{DOCKER}` is a placeholder until the env is published.
"""
    (dest / "SUBMIT.md").write_bytes(unix(submit))
    (dest / "error.txt").write_bytes(unix("READY — bundle not yet submitted\n"))
    return metrics


def main() -> None:
    if len(P2P_IDS) < 50:
        raise SystemExit(f"need ≥50 p2p ids, have {len(P2P_IDS)}")
    rows = [build_one(task) for task in TASKS]
    print("task_id\tcategory\tsol\ttest\tf2p\tp2p\twords\tsol_files\ttest_files")
    for row in rows:
        print(
            f"{row['id']}\t{row['category']}\t{row['sol']}\t{row['test']}\t{row['f2p']}\t{row['p2p']}\t{row['words']}\t{row['sol_files']}\t{row['test_files']}"
        )


if __name__ == "__main__":
    main()
