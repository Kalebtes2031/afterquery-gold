from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(r"C:\Users\A Y U B COMPUTERS\afterquery-gold")
REPO = ROOT / "_ours_zip" / "ours"
TASKS = ROOT / "ours_backend_tasks"
BASE = "519bfd8ee87e3aef50ed6584a364ef081f398d1c"

HOLD_SOL = [
    "packages/backend/src/services/nickname_hold_types.ts",
    "packages/backend/src/services/nickname_hold_utils.ts",
    "packages/backend/src/services/nickname_hold_store.ts",
    "packages/backend/src/services/nickname_hold_policy.ts",
    "packages/backend/src/services/nickname_hold_service.ts",
    "packages/backend/src/services/nickname_holds.ts",
]
HOLD_F2P = [
    "packages/backend/src/gold_tests/hold_claim_behavior.test.ts",
    "packages/backend/src/gold_tests/hold_confirm_release_behavior.test.ts",
    "packages/backend/src/gold_tests/hold_list_and_races.test.ts",
    "packages/backend/src/gold_tests/hold_edge_behavior.test.ts",
]
TIMEOUT_SOL = [
    "packages/backend/src/services/timeout_ledger_types.ts",
    "packages/backend/src/services/timeout_ledger_utils.ts",
    "packages/backend/src/services/timeout_ledger_store.ts",
    "packages/backend/src/services/timeout_ledger_policy.ts",
    "packages/backend/src/services/timeout_ledger_service.ts",
    "packages/backend/src/services/timeouts.ts",
]
TIMEOUT_F2P = [
    "packages/backend/src/gold_tests/timeout_apply_behavior.test.ts",
    "packages/backend/src/gold_tests/timeout_lift_and_lookup.test.ts",
    "packages/backend/src/gold_tests/timeout_list_and_sweep.test.ts",
    "packages/backend/src/gold_tests/timeout_edge_behavior.test.ts",
]
P2P_TESTS = [
    "packages/backend/src/gold_tests/p2p_constants_compat.test.ts",
    "packages/backend/src/gold_tests/p2p_input_validation_compat.test.ts",
    "packages/backend/src/gold_tests/p2p_env_utils_compat.test.ts",
    "packages/backend/src/gold_tests/p2p_gif_compat.test.ts",
]

HOLD_F2P_IDS = [
    "Nickname hold claims > creates a held reservation for a free nickname",
    "Nickname hold claims > stores the nickname in lowercase after trimming",
    "Nickname hold claims > refreshes the expiry when the same holder claims again",
    "Nickname hold claims > rejects a second holder while the hold is still live",
    "Nickname hold claims > lets a new holder take an expired reservation",
    "Nickname hold claims > defaults a missing ttl to forty five seconds",
    "Nickname hold claims > uses the default ttl when the requested ttl is not finite",
    "Nickname hold claims > truncates a fractional ttl toward zero before clamping",
    "Nickname hold claims > clamps a ttl below the minimum to five seconds",
    "Nickname hold claims > clamps a ttl above the maximum to one hundred twenty seconds",
    "Nickname hold claims > rejects a nickname that fails the shared nickname rules",
    "Nickname hold claims > rejects a blank holder id",
    "Nickname hold claims > keeps the holder id case as supplied after trimming",
    "Nickname hold claims > supports the claimNicknameHold convenience function",
    "Nickname hold confirm and release > confirms a live hold into an eighteen hundred second lease",
    "Nickname hold confirm and release > refreshes the confirmed lease when the same holder confirms again",
    "Nickname hold confirm and release > does not let another holder confirm a live reservation",
    "Nickname hold confirm and release > reports expired when confirm runs after the hold lapses",
    "Nickname hold confirm and release > reports not_found when confirming a nickname that was never held",
    "Nickname hold confirm and release > releases a live hold for the current holder",
    "Nickname hold confirm and release > does not let another holder release a live reservation",
    "Nickname hold confirm and release > treats an expired hold as gone when releasing",
    "Nickname hold confirm and release > reports not_found when releasing a missing nickname",
    "Nickname hold confirm and release > rejects confirm and release for an invalid nickname",
    "Nickname hold confirm and release > supports the confirm and release convenience functions",
    "Nickname hold reads and races > returns the public hold view for a live reservation",
    "Nickname hold reads and races > returns null for a missing or expired hold",
    "Nickname hold reads and races > returns null when get is asked for an invalid nickname",
    "Nickname hold reads and races > lists live holds sorted by nickname and skips expired rows",
    "Nickname hold reads and races > filters the hold list by holder id",
    "Nickname hold reads and races > never reports a negative remaining time",
    "Nickname hold reads and races > lets exactly one holder win when two claim a free nickname together",
    "Nickname hold reads and races > keeps remainingSeconds as a floored whole number",
    "Nickname hold reads and races > supports the read convenience functions",
    "Nickname hold extra edges > accepts a nickname with hyphen period and underscore",
    "Nickname hold extra edges > normalizes a decomposed accent before storing the nickname",
    "Nickname hold extra edges > clamps a negative ttl up to five seconds",
    "Nickname hold extra edges > rejects confirm when the holder id is blank",
    "Nickname hold extra edges > rejects release when the holder id is blank",
    "Nickname hold extra edges > returns an empty list when nothing is held",
    "Nickname hold extra edges > returns no holds when the holder filter is blank",
    "Nickname hold extra edges > treats a confirmed hold as live until the eighteen hundred second lease ends",
]

TIMEOUT_F2P_IDS = [
    "Channel timeout apply > applies a new timeout with the default duration",
    "Channel timeout apply > stores the nickname in lowercase and keeps the channel id case",
    "Channel timeout apply > extends a live timeout when the new expiry is later",
    "Channel timeout apply > keeps the existing row when the new expiry is not later",
    "Channel timeout apply > applies again after the previous timeout has expired",
    "Channel timeout apply > uses the default duration when seconds is missing or not finite",
    "Channel timeout apply > truncates a fractional duration before clamping",
    "Channel timeout apply > clamps a duration below the minimum to ten seconds",
    "Channel timeout apply > clamps a duration above the maximum to one day",
    "Channel timeout apply > drops a blank reason and trims a long reason to eighty characters",
    "Channel timeout apply > rejects an empty channel id",
    "Channel timeout apply > rejects a nickname that fails the shared nickname rules",
    "Channel timeout apply > rejects a blank moderator id",
    "Channel timeout apply > supports the applyChannelTimeout convenience function",
    "Channel timeout lift and lookup > lifts a live timeout even when another moderator asks",
    "Channel timeout lift and lookup > reports not_found when lifting a missing timeout",
    "Channel timeout lift and lookup > treats an expired timeout as gone when lifting",
    "Channel timeout lift and lookup > rejects lift for invalid channel nickname or moderator",
    "Channel timeout lift and lookup > reports a live timeout through isTimedOut",
    "Channel timeout lift and lookup > reports not timed out for missing expired or invalid lookups",
    "Channel timeout lift and lookup > returns only a live record from getTimeout",
    "Channel timeout lift and lookup > supports the lookup convenience functions",
    "Channel timeout lists and sweep > lists live timeouts for a channel sorted by nickname",
    "Channel timeout lists and sweep > includes stored expired rows only when asked",
    "Channel timeout lists and sweep > returns an empty list for an invalid channel id",
    "Channel timeout lists and sweep > lists timed out channels in lexical order",
    "Channel timeout lists and sweep > counts live timeouts for one channel or across every channel",
    "Channel timeout lists and sweep > sweeps expired rows for one channel and reports that channel",
    "Channel timeout lists and sweep > sweeps expired rows across every channel when no channel is given",
    "Channel timeout lists and sweep > returns a zero sweep for an invalid channel selection",
    "Channel timeout lists and sweep > floors remaining time and never goes negative",
    "Channel timeout lists and sweep > supports the list and sweep convenience functions",
    "Channel timeout extra edges > keeps colons inside a trimmed channel id",
    "Channel timeout extra edges > trims a reason before storing it",
    "Channel timeout extra edges > clamps a negative duration up to ten seconds",
    "Channel timeout extra edges > keeps the live row when the new expiry is exactly the same",
    "Channel timeout extra edges > does not count an expired row after it has been swept",
    "Channel timeout extra edges > returns null from getTimeout for an invalid nickname",
    "Channel timeout extra edges > does not treat a lifted user as timed out",
    "Channel timeout extra edges > can construct the ledger through createChannelTimeoutLedger",
]

P2P_IDS = [
    "Existing chat constants > keeps HEART mapped to HEART",
    "Existing chat constants > keeps HANDS_UP mapped to HANDS_UP",
    "Existing chat constants > keeps FIRE mapped to FIRE",
    "Existing chat constants > keeps MUSIC mapped to MUSIC",
    "Existing chat constants > keeps SURPRISED mapped to SURPRISED",
    "Existing chat constants > keeps exactly five supported reaction keys",
    "Existing chat constants > keeps reaction values unique",
    "Existing chat constants > keeps TEMPORARY mapped to temporary",
    "Existing chat constants > keeps REGULAR mapped to regular",
    "Existing chat constants > keeps ARTIST mapped to artist",
    "Existing chat constants > keeps ADMIN mapped to admin",
    "Existing chat constants > keeps MODERATOR mapped to moderator",
    "Existing chat constants > keeps ANONYMOUS mapped to anonymous",
    "Existing chat constants > keeps exactly six user types",
    "Existing chat constants > keeps user type values unique",
    "Existing chat constants > keeps every user type value lowercase",
    "Existing chat constants > keeps OWNER mapped to owner",
    "Existing chat constants > keeps VIEWER mapped to viewer",
    "Existing chat constants > keeps exactly two channel roles",
    "Existing chat constants > keeps channel role values unique",
    "Existing chat constants > keeps channel role keys uppercase",
    "isValidNickname > accepts a three character latin nickname",
    "isValidNickname > accepts exactly twenty four characters",
    "isValidNickname > rejects two character nicknames",
    "isValidNickname > rejects twenty five character nicknames",
    "isValidNickname > rejects the empty string",
    "isValidNickname > accepts digits",
    "isValidNickname > accepts non-latin letters",
    "isValidNickname > accepts accented letters",
    "isValidNickname > normalizes decomposed combining marks before validating",
    "isValidNickname > accepts the period character",
    "isValidNickname > accepts the underscore character",
    "isValidNickname > accepts the hyphen character",
    "isValidNickname > rejects spaces",
    "isValidNickname > rejects emoji",
    "isValidNickname > rejects punctuation such as exclamation marks",
    "isValidNickname > rejects the at sign",
    "isValidNickname > rejects forward slashes",
    "isValidNickname > rejects leading and trailing whitespace around a valid core",
    "invalidNicknameMessage > is a non-empty string",
    "invalidNicknameMessage > mentions the allowed length range",
    "checkEnvVar > returns the raw value when the variable is set",
    "checkEnvVar > returns values that contain spaces unchanged",
    "checkEnvVar > returns numeric-looking values as strings",
    "checkEnvVar > returns the default when the variable is missing",
    "checkEnvVar > returns the default when the variable is an empty string",
    "checkEnvVar > returns an empty-string default rather than throwing",
    "checkEnvVar > prefers the real value over the default when both exist",
    "checkEnvVar > throws when the variable is missing and no default is given",
    "checkEnvVar > throws when the variable is an empty string and no default is given",
    "checkEnvVar > throws an Error instance",
    "resolveGifByUrl > throws for an unsupported provider host",
    "resolveGifByUrl > throws for a malformed url",
    "resolveGifByUrl > throws when a Giphy page url has no extractable id",
    "resolveGifByUrl > resolves a direct Giphy .gif url without a network call",
    "resolveGifByUrl > resolves a direct Tenor .gif url without a network call",
]


def unix_bytes(text: str) -> bytes:
    return text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


def added_lines(patch: str) -> int:
    return sum(1 for line in patch.splitlines() if line.startswith("+") and not line.startswith("+++"))


def word_count(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    body = text.replace("IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.", "")
    return len(body.split())


def git_diff(paths: list[str]) -> str:
    result = subprocess.run(
        ["git", "-C", str(REPO), "diff", "--no-index", "--no-color", "--", "nul", paths[0]],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    # We'll build new-file diffs ourselves for reliability on Windows.
    chunks: list[str] = []
    for rel in paths:
        abs_path = REPO / rel
        content = abs_path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")
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


def write_config(path: Path, f2p: list[str]) -> None:
    payload = {
        "base_commit": BASE,
        "f2p_node_ids": f2p,
        "p2p_node_ids": P2P_IDS,
        "grade": {
            "format": "ctrf",
            "node_id": "name",
            "tool_label": "vitest-json-ctrf",
            "reports": [
                "/logs/verifier/base_ctrf.json",
                "/logs/verifier/new_ctrf.json",
            ],
        },
    }
    path.write_bytes(unix_bytes(json.dumps(payload, indent=2) + "\n"))


def test_sh(p2p_files: list[str], f2p_files: list[str], config_name: str) -> str:
    p2p = " \\\n  ".join(p2p_files)
    f2p = " \\\n  ".join(f2p_files)
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
      /logs/verifier/existing_vitest.json /logs/verifier/feature_vitest.json

TRUSTED_CONFIG=/tmp/{config_name}
cat > "$TRUSTED_CONFIG" <<'VITEST_CONFIG'
export default {{
  resolve: {{
    alias: {{
      "#ours/backend": "/app/packages/backend/src",
      "#ours/shared": "/app/packages/shared/src",
    }},
  }},
  test: {{
    environment: "node",
    clearMocks: true,
    restoreMocks: true,
  }},
}};
VITEST_CONFIG

declare -a VITEST_CMD
VITEST_CMD=()
if command -v vitest >/dev/null 2>&1; then
  VITEST_CMD=("$(command -v vitest)")
elif [ -x /app/node_modules/.bin/vitest ]; then
  VITEST_CMD=(/app/node_modules/.bin/vitest)
elif [ -x /app/packages/backend/node_modules/.bin/vitest ]; then
  VITEST_CMD=(/app/packages/backend/node_modules/.bin/vitest)
elif command -v npx >/dev/null 2>&1 && npx --no-install vitest --version >>"$RUN_LOG" 2>&1; then
  VITEST_CMD=(npx --no-install vitest)
elif command -v npm >/dev/null 2>&1; then
  _global_root="$(npm root -g 2>/dev/null || true)"
  if [ -n "$_global_root" ] && [ -f "$_global_root/vitest/vitest.mjs" ]; then
    VITEST_CMD=(node "$_global_root/vitest/vitest.mjs")
  fi
fi

if [ "${{#VITEST_CMD[@]}}" -eq 0 ]; then
  echo "[verifier] ERROR: Vitest is unavailable in the published environment" | tee -a "$RUN_LOG"
else
  echo "[verifier] vitest command: ${{VITEST_CMD[*]}}" | tee -a "$RUN_LOG"
  "${{VITEST_CMD[@]}}" --version 2>&1 | tee -a "$RUN_LOG"
fi

run_selection() {{
  local json_path="$1"
  shift
  if [ "${{#VITEST_CMD[@]}}" -eq 0 ]; then
    return 127
  fi
  run_log "${{VITEST_CMD[@]}}" run \\
    --root /app/packages/backend \\
    --config "$TRUSTED_CONFIG" \\
    --reporter=verbose \\
    --reporter=json \\
    --outputFile="$json_path" \\
    "$@"
}}

run_selection /logs/verifier/existing_vitest.json \\
  {p2p}
P2P_EXIT=$?

run_selection /logs/verifier/feature_vitest.json \\
  {f2p}
F2P_EXIT=$?

echo "[verifier] p2p_exit=$P2P_EXIT f2p_exit=$F2P_EXIT" | tee -a "$RUN_LOG"

python3 - <<'PY_CTRF'
import json
from pathlib import Path

config = json.loads(Path('/tests/config.json').read_text())


def load_vitest(path):
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


def write_ctrf(vitest_path, ids, output_path):
    assertions = collect_assertions(load_vitest(vitest_path))
    tests = []
    for raw_id in ids:
        test_id = str(raw_id).strip()
        entry = assertions.get(test_id)
        if entry is None:
            entry = {{
                'name': test_id,
                'status': 'failed',
                'duration': 0,
                'message': 'Configured test was missing from the Vitest JSON report; see run.log',
            }}
        tests.append(entry)

    passed = sum(t['status'] == 'passed' for t in tests)
    failed = sum(t['status'] == 'failed' for t in tests)
    skipped = sum(t['status'] == 'skipped' for t in tests)
    report = {{
        'reportFormat': 'CTRF',
        'specVersion': '1.0.0',
        'results': {{
            'tool': {{'name': 'vitest'}},
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


def write_task_toml(path: Path, task_id: str, title: str, description: str) -> None:
    text = f"""schema_version = "1.1"
artifacts = ["/logs/artifacts/model.patch"]

[task]
name = "ours/{task_id}"

[metadata]
task_id = "{task_id}"
display_title = "{title}"
display_description = "{description}"
category = "enhancement"
language = "typescript"
repository_url = "https://github.com/dawit2119/ours_backend"
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
docker_image = "us-docker.pkg.dev/afterquery-compute/compute-images/gold-repo-ours-backend-jnkmji:v1"
os = "linux"
cpus = 2
memory_mb = 8192
storage_mb = 20480
gpus = 0
allow_internet = false
"""
    path.write_bytes(unix_bytes(text))


def write_verify(path: Path, sol_files: int, test_files: int) -> None:
    text = f"""from pathlib import Path

root = Path(__file__).resolve().parent
instruction = (root / "instruction.md").read_bytes()
solution = (root / "solution" / "solution.patch").read_bytes()
tests = (root / "tests" / "test.patch").read_bytes()
config = (root / "tests" / "config.json").read_bytes()
script = (root / "tests" / "test.sh").read_bytes()

for name, raw in {{
    "instruction.md": instruction,
    "solution.patch": solution,
    "test.patch": tests,
    "config.json": config,
    "test.sh": script,
}}.items():
    if raw.startswith(b"\\xef\\xbb\\xbf"):
        raise SystemExit(f"FAIL: {{name}} has a BOM")
    if b"\\r" in raw:
        raise SystemExit(f"FAIL: {{name}} contains Windows CRLF")

sol_lines = sum(1 for line in solution.splitlines() if line.startswith(b"+") and not line.startswith(b"+++"))
test_lines = sum(1 for line in tests.splitlines() if line.startswith(b"+") and not line.startswith(b"+++"))
sol_files = sum(1 for line in solution.splitlines() if line.startswith(b"diff --git"))
test_file_count = sum(1 for line in tests.splitlines() if line.startswith(b"diff --git"))
words = len(
    (root / "instruction.md")
    .read_text(encoding="utf-8")
    .replace(
        "IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.",
        "",
    )
    .split()
)

print(f"OK: solution.patch +lines = {{sol_lines}} files = {{sol_files}}")
print(f"OK: test.patch +lines = {{test_lines}} files = {{test_file_count}}")
print(f"OK: instruction words = {{words}}")

if sol_lines < 459:
    raise SystemExit("FAIL: solution added lines below 459")
if sol_files < 4:
    raise SystemExit("FAIL: solution file count below 4")
if test_lines < 596:
    raise SystemExit("FAIL: test added lines below 596")
if test_file_count < 2:
    raise SystemExit("FAIL: test file count below 2")
if words < 100 or words > 300:
    raise SystemExit("FAIL: instruction word count out of range")
if not (root / "instruction.md").read_text(encoding="utf-8").rstrip().endswith(
    "IMPORTANT: Please work on this in a new branch from main and commit everything when you are done."
):
    raise SystemExit("FAIL: instruction missing mandatory last line")

print("All pre-submit checks passed. Safe to paste to platform.")
"""
    path.write_bytes(unix_bytes(text))


def bundle(task_id: str, title: str, description: str, sol_paths: list[str], test_paths: list[str], f2p_ids: list[str], f2p_rel: list[str], config_name: str) -> None:
    dest = TASKS / task_id
    (dest / "solution").mkdir(parents=True, exist_ok=True)
    (dest / "tests").mkdir(parents=True, exist_ok=True)

    sol_patch = git_diff(sol_paths)
    test_patch = git_diff(test_paths)
    (dest / "solution" / "solution.patch").write_bytes(unix_bytes(sol_patch))
    (dest / "tests" / "test.patch").write_bytes(unix_bytes(test_patch))
    write_config(dest / "tests" / "config.json", f2p_ids)
    (dest / "tests" / "test.sh").write_bytes(
        unix_bytes(
            test_sh(
                [path.split("packages/backend/")[1] for path in P2P_TESTS],
                [path.split("packages/backend/")[1] for path in f2p_rel],
                config_name,
            )
        )
    )
    write_task_toml(dest / "task.toml", task_id, title, description)
    write_verify(dest / "verify_bundle.py", len(sol_paths), len(test_paths))

    instr = dest / "instruction.md"
    instr.write_bytes(unix_bytes(instr.read_text(encoding="utf-8")))

    submit = f"""# {task_id} — Submit bundle

New ours_backend task. Disjoint from reaction-timeline-integrity and reconcile-channel-presence.

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
| Solution +lines | {added_lines(sol_patch)} | ≥ 459 |
| Test +lines | {added_lines(test_patch)} | ≥ 596 |
| F2P / P2P | {len(f2p_ids)} / {len(P2P_IDS)} | ≥ 20 / ≥ 50 |
| Instruction words | {word_count(instr)} | 100–300 |

```bash
python ours_backend_tasks/{task_id}/verify_bundle.py
```
"""
    (dest / "SUBMIT.md").write_bytes(unix_bytes(submit))
    (dest / "error.txt").write_bytes(unix_bytes("READY — bundle not yet submitted\n"))
    print(task_id, "sol", added_lines(sol_patch), "test", added_lines(test_patch), "words", word_count(instr), "f2p", len(f2p_ids), "p2p", len(P2P_IDS))


if __name__ == "__main__":
    bundle(
        "nickname-hold-leases",
        "Hold Nickname Leases",
        "Reserve a nickname with a short hold, confirm it into a longer lease, or let it expire without join collisions.",
        HOLD_SOL,
        HOLD_F2P + P2P_TESTS,
        HOLD_F2P_IDS,
        HOLD_F2P,
        "gold-nickname-holds-vitest.config.ts",
    )
    bundle(
        "channel-timeout-ledger",
        "Channel Timeout Ledger",
        "Apply, extend, lift, and sweep channel timeouts without touching presence or reaction indexes.",
        TIMEOUT_SOL,
        TIMEOUT_F2P + P2P_TESTS,
        TIMEOUT_F2P_IDS,
        TIMEOUT_F2P,
        "gold-timeout-ledger-vitest.config.ts",
    )
