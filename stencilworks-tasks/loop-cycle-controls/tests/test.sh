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

export RUN_LOG=/logs/verifier/run.log
: > "$RUN_LOG" 2>/dev/null || true
run_log() { echo "+ $*" >> "$RUN_LOG" 2>/dev/null; "$@" 2>&1 | tee -a "$RUN_LOG"; return "${PIPESTATUS[0]}"; }

# >>> RUN TESTS (task-specific) <<<
set +e

install -d -o root -g root -m 0755 /logs/verifier

rm -f \
  /logs/verifier/base_ctrf.json \
  /logs/verifier/new_ctrf.json

export CARGO_HOME=/tmp/stencilworks-cargo
export CARGO_TARGET_DIR=/tmp/stencilworks-target
mkdir -p "$CARGO_HOME" "$CARGO_TARGET_DIR"

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
  echo "Trusted CTRF reporter could not be resolved" | tee -a "$RUN_LOG"
  exit 6
fi

CTRF_DIGEST_BEFORE="$(
  find /opt/ctrf -type file -print0 \
    | sort -z \
    | xargs -0 sha256sum \
    | sha256sum \
    | awk '{print $1}'
)"

run_cargo_suite() {
  local label="$1"
  shift
  local runner_dir="/tmp/stencilworks-${label}"
  rm -rf "$runner_dir/ctrf"
  mkdir -p "$runner_dir/ctrf"
  export CTRF_REPORTER_OUTPUT="$runner_dir/ctrf/ctrf-report.json"

  timeout \
    --signal=TERM \
    --kill-after=30s \
    900 \
    cargo test \
      --no-fail-fast \
      "$@" \
      2>&1 | tee -a "$RUN_LOG"

  local exit_code=${PIPESTATUS[0]}

  if [ ! -f "$CTRF_REPORTER_OUTPUT" ]; then
    echo "CTRF report missing for ${label}" | tee -a "$RUN_LOG"
    return 6
  fi

  echo "$runner_dir/ctrf/ctrf-report.json"
  return "$exit_code"
}

# P2P: library tests plus every integration file except the held-out cycle suites.
BASE_SOURCE="$(
  run_cargo_suite regression \
    --lib \
    --test cli \
    --test context_data \
    --test diagnostics \
    --test filter_library \
    --test inheritance \
    --test macros \
    --test rendering
)"
BASE_EXIT=$?

install \
  -o root \
  -g root \
  -m 0444 \
  "$BASE_SOURCE" \
  /logs/verifier/base_ctrf.json || exit 6

# F2P: held-out cycle integration tests only.
NEW_SOURCE="$(
  run_cargo_suite behavior \
    --test cycles \
    --test cycle_parse_and_outline
)"
NEW_EXIT=$?

install \
  -o root \
  -g root \
  -m 0444 \
  "$NEW_SOURCE" \
  /logs/verifier/new_ctrf.json || exit 6

CTRF_DIGEST_AFTER="$(
  find /opt/ctrf -type file -print0 \
    | sort -z \
    | xargs -0 sha256sum \
    | sha256sum \
    | awk '{print $1}'
)"

if [ "$CTRF_DIGEST_BEFORE" != "$CTRF_DIGEST_AFTER" ]; then
  echo "Trusted CTRF reporter changed while tests were running" \
    | tee -a "$RUN_LOG"
  exit 6
fi

echo "regression suite exit: $BASE_EXIT" | tee -a "$RUN_LOG"
echo "cycle suite exit: $NEW_EXIT" | tee -a "$RUN_LOG"

set -e
# >>> END RUN TESTS <<<

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

mkdir -p /logs/verifier/reports 2>/dev/null
for _f in /logs/verifier/*; do
  case "${_f##*/}" in
    reward.json|reward.txt|ctrf.json|run.log|test-stdout.txt|reports) continue ;;
  esac
  [ -f "$_f" ] && mv -f "$_f" /logs/verifier/reports/ 2>/dev/null
done
