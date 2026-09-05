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

rm -f /logs/verifier/base.xml /logs/verifier/new.xml \
      /logs/verifier/base_run.log /logs/verifier/new_run.log
export CARGO_TERM_COLOR=never

run_suite() {
  local suite_log="$1"
  shift
  echo "+ $*" | tee -a "$RUN_LOG" "$suite_log"
  "$@" 2>&1 | tee -a "$RUN_LOG" "$suite_log"
  return "${PIPESTATUS[0]}"
}

write_junit() {
  python3 - "$1" "$2" <<'PY'
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

src, dst = sys.argv[1], sys.argv[2]
ansi = re.compile(r"\x1b\[[0-9;]*m")
line_re = re.compile(r"^test (.+?) \.\.\. (ok|FAILED|ignored)$")
rank = {"passed": 0, "skipped": 1, "failed": 2}
results = {}

for raw in Path(src).read_text(errors="replace").splitlines():
    line = ansi.sub("", raw).strip()
    match = line_re.match(line)
    if not match:
        continue
    name, raw_status = match.groups()
    status = {"ok": "passed", "ignored": "skipped", "FAILED": "failed"}[raw_status]
    previous = results.get(name)
    if previous is None or rank[status] > rank[previous]:
        results[name] = status

root = ET.Element("testsuites")
suite = ET.SubElement(root, "testsuite", name="cargo-test", tests=str(len(results)))
failures = 0
skipped = 0
for name, status in results.items():
    case = ET.SubElement(suite, "testcase", name=name, classname="")
    if status == "failed":
        failures += 1
        ET.SubElement(case, "failure", message="cargo test reported failure")
    elif status == "skipped":
        skipped += 1
        ET.SubElement(case, "skipped")
suite.set("failures", str(failures))
suite.set("skipped", str(skipped))
ET.ElementTree(root).write(dst, encoding="unicode", xml_declaration=True)
PY
}

BASE_RUN=/logs/verifier/base_run.log
NEW_RUN=/logs/verifier/new_run.log
: > "$BASE_RUN"
: > "$NEW_RUN"

# P2P: the complete pre-existing library and integration suite.
run_suite "$BASE_RUN" cargo test --lib
run_suite "$BASE_RUN" cargo test --test cli
run_suite "$BASE_RUN" cargo test --test context_data
run_suite "$BASE_RUN" cargo test --test diagnostics
run_suite "$BASE_RUN" cargo test --test filter_library
run_suite "$BASE_RUN" cargo test --test inheritance
run_suite "$BASE_RUN" cargo test --test rendering
write_junit "$BASE_RUN" /logs/verifier/base.xml

# F2P: held-out cycle behavior only.
run_suite "$NEW_RUN" cargo test --test cycles
run_suite "$NEW_RUN" cargo test --test cycle_parse_and_outline
write_junit "$NEW_RUN" /logs/verifier/new.xml

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
