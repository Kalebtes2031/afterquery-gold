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

rm -f /logs/verifier/base.xml /logs/verifier/new.xml

# Verifier-only nextest profile (must not live in test.patch — test files only).
mkdir -p .config
cat > .config/nextest.toml <<'EOF'
[profile.ci]
retries = 0
fail-fast = false

[profile.ci.junit]
path = "junit.xml"
EOF

normalize_junit() {
  python3 - "$1" "$2" <<'PY'
import sys
import xml.etree.ElementTree as ET

# Integration test binaries use bare function names in cargo/nextest listings.
INTEGRATION_BINS = {
    "cli",
    "context_data",
    "diagnostics",
    "filter_library",
    "inheritance",
    "macros",
    "rendering",
    "super_stack",
    "super_parse_and_outline",
}


def node_id(name, classname):
    name = (name or "").strip()
    classname = (classname or "").strip()
    if not name:
        return None
    if "::" in name:
        return name
    if classname:
        last = classname.split("::")[-1]
        if last in INTEGRATION_BINS:
            return name
        if "::" in classname:
            return f"{classname}::{name}"
    return name


src, dst = sys.argv[1], sys.argv[2]
try:
    root = ET.parse(src).getroot()
except Exception:
    root = ET.Element("testsuites")
for tc in root.iter("testcase"):
    nid = node_id(tc.attrib.get("name"), tc.attrib.get("classname"))
    if not nid:
        continue
    tc.set("name", nid)
    tc.set("classname", "")
ET.ElementTree(root).write(dst, encoding="unicode", xml_declaration=True)
PY
}

copy_junit_report() {
  local src="$1"
  local dst="$2"
  if [ -f "$src" ]; then
    normalize_junit "$src" "$dst"
    return 0
  fi
  echo "JUnit report missing: $src" | tee -a "$RUN_LOG"
  return 1
}

# P2P: library tests plus every integration file except the held-out super suites.
run_log cargo nextest run --profile ci \
  --lib \
  --test cli \
  --test context_data \
  --test diagnostics \
  --test filter_library \
  --test inheritance \
  --test macros \
  --test rendering
copy_junit_report target/nextest/ci/junit.xml /logs/verifier/base.xml

# F2P: held-out super() integration tests only.
run_log cargo nextest run --profile ci \
  --test super_stack \
  --test super_parse_and_outline
copy_junit_report target/nextest/ci/junit.xml /logs/verifier/new.xml

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
