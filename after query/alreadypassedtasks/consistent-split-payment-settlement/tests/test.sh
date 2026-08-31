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

cd /app/rateeat_backend || exit 6
mkdir -p /logs/verifier

JEST_BIN="/app/rateeat_backend/node_modules/.bin/jest"
if [ ! -x "$JEST_BIN" ]; then
  echo "Jest binary not found at $JEST_BIN" | tee -a "$RUN_LOG"
  exit 6
fi

# Resolve the reporter from the trusted installation before any repository
# controlled Node process is allowed to run.
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
  echo "Trusted CTRF reporter could not be resolved from /opt/ctrf" \
    | tee -a "$RUN_LOG"
  exit 6
fi

export NODE_PATH="/app/rateeat_backend/node_modules"

# Repository code must never run as root. In particular, migrations execute
# as this user so they cannot rewrite the trusted reporter in /opt/ctrf.
RUNNER_USER="rateeat_split_verifier"
RUNNER_DIR="/tmp/rateeat-split-runner"

# A second, more restrictive user, used for exactly one thing: running the
# held-out (F2P) Jest invocation - see its own section below. Kept separate
# from $RUNNER_USER (which runs migrations and the harness server - i.e.
# repository/solution code) specifically so the held-out test SOURCE files
# can be locked to this user alone (see the chmod block below) without also
# handing that same read access to whatever a submitted solution.patch runs.
# This separation only became possible once the held-out suite stopped
# sharing a process with repository code at all (see its section below) -
# before that, the same process needed both "run repository code" and "read
# the hidden tests to compile them", which made the two inseparable no
# matter which user ran it.
RUNNER_USER_TESTS="rateeat_split_test_runner"
RUNNER_DIR_TESTS="/tmp/rateeat-split-test-runner"

if ! command -v runuser >/dev/null 2>&1; then
  echo "runuser is unavailable" | tee -a "$RUN_LOG"
  exit 6
fi

if ! id "$RUNNER_USER" >/dev/null 2>&1; then
  useradd \
    --system \
    --no-create-home \
    --shell /usr/sbin/nologin \
    "$RUNNER_USER" >> "$RUN_LOG" 2>&1

  if [ $? -ne 0 ]; then
    echo "Could not create verifier user" | tee -a "$RUN_LOG"
    exit 6
  fi
fi

if ! id "$RUNNER_USER_TESTS" >/dev/null 2>&1; then
  useradd \
    --system \
    --no-create-home \
    --shell /usr/sbin/nologin \
    "$RUNNER_USER_TESTS" >> "$RUN_LOG" 2>&1

  if [ $? -ne 0 ]; then
    echo "Could not create test-runner user" | tee -a "$RUN_LOG"
    exit 6
  fi
fi

# /tests/config.json lists every test id this run is graded against. Left
# world-readable, repository-controlled code (running as $RUNNER_USER, same
# as everything below) could read it at runtime, learn the exact expected
# names without ever seeing test.patch, and use them to fabricate a
# passing-looking CTRF report of its own instead of actually running the
# hidden tests. Deny it before any repository-controlled process starts;
# root (this script, and the grader.py invocations before and after it)
# is unaffected by removing "other" permissions.
if [ -f /tests/config.json ]; then
  chown root:root /tests/config.json >> "$RUN_LOG" 2>&1 || exit 6
  chmod 600 /tests/config.json >> "$RUN_LOG" 2>&1 || exit 6
fi

# Same reasoning for /tests/test.patch: by the time this script runs,
# grader.py's own prepare step has already applied it (as root, before any
# repository-controlled process starts) - nothing below ever needs to read
# it again. Left world-readable, repository-controlled code could read the
# hidden test source directly and hand-craft a report that matches its
# exact assertions without actually satisfying them.
if [ -f /tests/test.patch ]; then
  chown root:root /tests/test.patch >> "$RUN_LOG" 2>&1 || exit 6
  chmod 600 /tests/test.patch >> "$RUN_LOG" 2>&1 || exit 6
fi

# grader.py's own prepare step (already run, as root, before this script's
# own body starts) applies test.patch straight into ordinary files under
# /app/rateeat_backend/src/__tests__/unit/ - at whatever mode git apply
# leaves them (world-readable). Protecting test.patch itself (above) stops
# nothing once the test SOURCE it produced is sitting right there, still
# readable: repository code running as $RUNNER_USER (migrations, the
# harness server - see below) could open these files directly and read the
# exact hidden assertions/fixture logic without ever touching test.patch.
#
# Lock them to $RUNNER_USER_TESTS alone - the one user that ever
# legitimately needs to read them (to compile/run them as the held-out
# suite - see its own section below) - before $RUNNER_USER's very first
# process (migrations, next) ever starts, so there is no window where
# repository code could have read them. Ownership (not group membership) is
# what does the work here - same owner-only pattern as /tests/config.json
# and /tests/test.patch above, deliberately not resting on whether this
# system's useradd happens to create a same-named group for the new user by
# default: $RUNNER_USER_TESTS is the sole owner, and 600 grants nothing to
# group or "other" regardless. $RUNNER_USER (which is what runs every piece
# of repository/solution code - migrations, and the harness server that
# loads the real split-bill route) is left with no access at all.
HIDDEN_TEST_FILES="
  /app/rateeat_backend/src/__tests__/unit/split_payment_endpoint.test.ts
  /app/rateeat_backend/src/__tests__/unit/split_payment_transaction.test.ts
  /app/rateeat_backend/src/__tests__/unit/split_payment_test_support.ts
"
for _htf in $HIDDEN_TEST_FILES; do
  if [ -f "$_htf" ]; then
    chown "$RUNNER_USER_TESTS" "$_htf" >> "$RUN_LOG" 2>&1 || exit 6
    chmod 600 "$_htf" >> "$RUN_LOG" 2>&1 || exit 6
  fi
done

# Likewise, /logs/verifier holds every report this run produces, including
# the existing-suite's report by the time the held-out suite runs. Nothing
# repository-controlled needs to read (or write) anything here directly -
# only root, via the reader this script starts, ever does - so deny it
# entirely rather than leaving it at whatever mkdir's default mode is.
mkdir -p /logs/verifier
chown root:root /logs/verifier >> "$RUN_LOG" 2>&1 || exit 6
chmod 700 /logs/verifier >> "$RUN_LOG" 2>&1 || exit 6

# Every runuser invocation below hands repository-controlled code (migrations,
# the app under test, anything a submitted diff can reach) a real process
# running as $RUNNER_USER. That code can spawn a detached background process
# which outlives the runuser command that started it — ordinary process
# supervision (the parent exiting, `timeout` firing) does not touch a
# detached child. Left alone, such a process could sit and poll for the CTRF
# report this script is about to trust, then rewrite it the moment the
# trusted reporter produces it, before this script gets to move/read it.
# Forcefully reap every process owned by $RUNNER_USER and confirm none
# remain before this script ever moves or reads a file that user could have
# written. Call this after every runuser invocation (migrations, each Jest
# run) and before touching that invocation's report.
#
# Every helper below takes the target username as its one optional
# argument, defaulting to $RUNNER_USER so every call site that predates
# $RUNNER_USER_TESTS keeps working unchanged; the held-out suite's own
# section (below) calls these with "$RUNNER_USER_TESTS" explicitly instead.
runner_pids() {
  local user="${1:-$RUNNER_USER}"
  if command -v pgrep >/dev/null 2>&1; then
    pgrep -u "$user" 2>/dev/null
  else
    # Portable fallback if procps isn't present in the image.
    ps -u "$user" -o pid= 2>/dev/null
  fi
}

kill_runner_pids() {
  local user="${1:-$RUNNER_USER}"
  if command -v pkill >/dev/null 2>&1; then
    pkill -KILL -u "$user" >/dev/null 2>&1 || true
  else
    local pid
    for pid in $(runner_pids "$user"); do
      kill -KILL "$pid" >/dev/null 2>&1 || true
    done
  fi
}

reap_runner_user() {
  local user="${1:-$RUNNER_USER}"
  local waited=0
  kill_runner_pids "$user"
  while [ -n "$(runner_pids "$user")" ]; do
    waited=$((waited + 1))
    if [ "$waited" -ge 25 ]; then
      break
    fi
    sleep 0.2
    kill_runner_pids "$user"
  done
  if [ -n "$(runner_pids "$user")" ]; then
    echo "Could not reap all processes owned by $user" \
      | tee -a "$RUN_LOG"
    exit 6
  fi
}

# Pure-bash TCP readiness check (no dependency on curl/nc being present in
# the verifier image) - used to wait for the held-out suite's own real HTTP
# server (see the "Split-payment task tests" section below) to start
# accepting connections before pointing the held-out Jest run at it.
wait_for_split_server() {
  local port="$1"
  local attempt
  for attempt in $(seq 1 30); do
    if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
      exec 3>&- 3<&- 2>/dev/null
      return 0
    fi
    sleep 1
  done
  return 1
}

# Reaping (above) closes off further tampering once we get to it, but it
# cannot undo damage a still-running process already did: the trusted CTRF
# reporter's write to disk and this script's own later `mv` of that file are
# two separate moments, and a process that has been running the whole time
# (planted during migration, or - for the existing-suite run below, which
# still imports the repository's `app` directly - at the top of the Jest run
# itself, before that file's own tests even register) can sit and poll for
# the report to appear, then rewrite it in between those two moments.
# Reaping afterwards can't restore what it already overwrote.
#
# So the report never lands anywhere $RUNNER_USER can write a second time.
# Its exact output path (Jest's CTRF reporter always writes to
# <outputDir>/<outputFile>, defaulting to ./ctrf/ctrf-report.json relative
# to CWD - unchanged here) is pre-created, before Jest ever runs, as a named
# pipe owned by root: $RUNNER_USER can open it for writing (that's all the
# reporter's own plain `fs.writeFileSync` needs - it doesn't delete or
# rename anything first), but the containing directory denies it list/
# create/delete, so it can neither read back, replace, nor remove that pipe.
# A root-owned reader is already blocked on the other end before Jest even
# starts, so the reporter's one and only write goes straight through to the
# reader, which persists it to the real output path itself - nothing
# reaches disk under $RUNNER_USER's own name for a later process to alter.
CTRF_CAPTURE_DIR="$RUNNER_DIR/ctrf"
CTRF_CAPTURE_PIPE="$CTRF_CAPTURE_DIR/ctrf-report.json"
CTRF_READER_PID=""

start_ctrf_capture() {
  rm -rf "$CTRF_CAPTURE_DIR"
  mkdir -p "$CTRF_CAPTURE_DIR" || exit 6
  chown root:root "$CTRF_CAPTURE_DIR" || exit 6
  # Owner (root) gets rwx; everyone else gets only traverse (x) - enough to
  # open the one pipe inside by its exact, already-known name, but not to
  # list, create, delete, or rename anything in this directory.
  chmod 711 "$CTRF_CAPTURE_DIR" || exit 6

  mkfifo "$CTRF_CAPTURE_PIPE" || exit 6
  chown root:root "$CTRF_CAPTURE_PIPE" || exit 6
  # Owner (root) can read and write; everyone else can only write.
  chmod 622 "$CTRF_CAPTURE_PIPE" || exit 6

  local final_path="$1"
  rm -f "$final_path" "$final_path.capturing"
  (
    if timeout 300 cat "$CTRF_CAPTURE_PIPE" > "$final_path.capturing" 2>/dev/null
    then
      mv -f "$final_path.capturing" "$final_path"
    fi
  ) &
  CTRF_READER_PID=$!
}

finish_ctrf_capture() {
  local final_path="$1"
  local label="$2"
  wait "$CTRF_READER_PID" 2>/dev/null
  if [ ! -f "$final_path" ]; then
    echo "$label CTRF report was not produced" | tee -a "$RUN_LOG"
    exit 6
  fi
}

# A normal Jest run - whatever the outcome of the tests it ran - always
# exits 0 (everything passed) or 1 (something failed). Anything else here
# means `timeout` had to step in and kill the process (exit 124, or another
# non-0/1 code depending on how it was signaled) rather than Jest finishing
# on its own. That specifically covers the case where repository-controlled
# code has already fed a fabricated report through the single-reader FIFO
# capture above (see start_ctrf_capture): the trusted reporter's own later,
# genuine write finds no reader left and blocks until this script's outer
# `timeout` forcibly kills the run. Whatever got captured under those
# circumstances must never reach grading - fail closed instead.
#
# Exit code 0/1 alone isn't the whole story, though. For the existing-suite
# run below, repository code loaded by Jest (via `import app`, before that
# file's own tests ever register) runs as the same OS user as Jest itself,
# so it can write straight to the same FIFO the trusted reporter will use and
# then call `process.exit(0)` itself, before a single real test has run -
# producing a "normal" exit code around a report that was never actually
# produced by running anything. (The held-out suite below no longer imports
# `app` at all - see its own section for why that same attack has nowhere
# left to run from there.) A genuine compile-and-run of either suite (ts-jest
# cold compile, Postgres round trips, the real test bodies) takes
# meaningfully longer than an instant fabricate-and-exit; require a minimum
# elapsed time as a second, independent signal on top of the exit code,
# cheap defense-in-depth even where process separation is already the
# primary guard.
require_normal_jest_exit() {
  local exit_code="$1"
  local label="$2"
  local started_at="$3"
  local min_elapsed_sec="${4:-5}"
  if [ "$exit_code" != "0" ] && [ "$exit_code" != "1" ]; then
    echo "$label Jest run exited abnormally ($exit_code) - not grading a run that didn't finish on its own" \
      | tee -a "$RUN_LOG"
    exit 6
  fi
  local elapsed=$(( $(date +%s) - started_at ))
  if [ "$elapsed" -lt "$min_elapsed_sec" ]; then
    echo "$label Jest run finished in ${elapsed}s - too fast for a genuine run of this suite; not grading it" \
      | tee -a "$RUN_LOG"
    exit 6
  fi
}

# Belt-and-suspenders on top of the held-out suite's own process separation
# (see its section below): even though no repository code shares a process
# with that Jest run any more, independently confirm its own fixture setup
# actually happened, rather than resting entirely on that architectural
# argument. Every one of the held-out suite's tests calls this task's own
# createSplitGroup/createParticipant test-support helpers - which insert
# directly into split_groups/split_participants (pre-existing repository
# tables the base application already defines, not anything the reference
# solution introduces) - to arrange its scenario, strictly before it ever
# calls the endpoint under test. That happens whether the endpoint under
# test is implemented one way or another, so this check holds for any valid
# solution, not just the reference one. A run whose test bodies never
# genuinely executed - whatever the reason - leaves the database exactly as
# migrations left it, which this catches independently of the exit-code and
# elapsed-time checks above.
verify_genuine_db_activity() {
  local table="$1"
  local min_count="$2"
  local actual
  actual="$(su postgres -c "psql -d '$DB_NAME' -tAc 'SELECT count(*) FROM $table;'" 2>>"$RUN_LOG")"
  actual="$(echo "$actual" | tr -d '[:space:]')"
  if ! [[ "$actual" =~ ^[0-9]+$ ]]; then
    echo "Could not read $table row count for the genuine-activity check" \
      | tee -a "$RUN_LOG"
    exit 6
  fi
  if [ "$actual" -lt "$min_count" ]; then
    echo "Held-out suite left only $actual row(s) in $table (expected at least $min_count) - too few for the suite's own fixture setup to have genuinely run; not grading this report" \
      | tee -a "$RUN_LOG"
    exit 6
  fi
}

rm -rf "$RUNNER_DIR"
mkdir -p "$RUNNER_DIR" "$RUNNER_DIR/.npm" || exit 6
chown -R "$RUNNER_USER":"$RUNNER_USER" "$RUNNER_DIR" || exit 6
# The held-out suite's own Jest invocation (see its own section below) runs
# as $RUNNER_USER_TESTS, not $RUNNER_USER, but still needs to `cd` into this
# same directory: the CTRF reporter's own default output path
# (./ctrf/ctrf-report.json) is relative to CWD, and CTRF_CAPTURE_DIR below
# is fixed to a subdirectory of $RUNNER_DIR specifically - landing anywhere
# else would make the reporter write somewhere this script's reader was
# never listening. Grant "other" execute (traverse-only, same minimal grant
# CTRF_CAPTURE_DIR itself uses below) explicitly, rather than resting on
# whatever mode mkdir's default umask happened to leave this directory at.
chmod o+x "$RUNNER_DIR" || exit 6

# Separate HOME/NPM_CONFIG_CACHE for $RUNNER_USER_TESTS - kept apart from
# $RUNNER_DIR (owned by, and read/write-able only by, $RUNNER_USER) so the
# held-out suite's own process isn't left trying to write its npm cache
# into a directory it has no write access to; it still runs with $RUNNER_DIR
# itself as its CWD (see above), just not as HOME.
rm -rf "$RUNNER_DIR_TESTS"
mkdir -p "$RUNNER_DIR_TESTS" "$RUNNER_DIR_TESTS/.npm" || exit 6
chown -R "$RUNNER_USER_TESTS":"$RUNNER_USER_TESTS" "$RUNNER_DIR_TESTS" || exit 6

# Ensure the trusted reporter is owned by root and is not writable by the
# unprivileged process.
chown -R root:root /opt/ctrf >> "$RUN_LOG" 2>&1 || exit 6
chmod -R go-w /opt/ctrf >> "$RUN_LOG" 2>&1 || exit 6

trusted_assets_digest() {
  find /opt/ctrf -type f -print0 2>/dev/null \
    | sort -z \
    | xargs -0 sha256sum 2>/dev/null \
    | sha256sum \
    | awk '{print $1}'
}

CTRF_DIGEST_BEFORE="$(trusted_assets_digest)"

if [ -z "$CTRF_DIGEST_BEFORE" ]; then
  echo "Could not fingerprint trusted CTRF reporter" | tee -a "$RUN_LOG"
  exit 6
fi

DB_NAME="rateeat_gold_split_test"
DB_PASSWORD="gold-split-payment-db-password"

service postgresql start >> "$RUN_LOG" 2>&1 || {
  echo "Failed to start PostgreSQL" | tee -a "$RUN_LOG"
  exit 6
}

for _ in $(seq 1 30); do
  if pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  echo "PostgreSQL did not become ready" | tee -a "$RUN_LOG"
  exit 6
fi

su postgres -c \
  "psql -v ON_ERROR_STOP=1 -c \"ALTER USER postgres WITH PASSWORD '$DB_PASSWORD';\"" \
  >> "$RUN_LOG" 2>&1 || exit 6

su postgres -c "dropdb --if-exists '$DB_NAME'" \
  >> "$RUN_LOG" 2>&1 || exit 6

su postgres -c "createdb '$DB_NAME'" \
  >> "$RUN_LOG" 2>&1 || exit 6

su postgres -c \
  "psql -v ON_ERROR_STOP=1 -d '$DB_NAME' -c 'CREATE EXTENSION IF NOT EXISTS pg_trgm;'" \
  >> "$RUN_LOG" 2>&1 || exit 6

export NODE_ENV=development
export DEVELOPMENT_PG_USER=postgres
export DEVELOPMENT_PG_PASSWORD="$DB_PASSWORD"
export DEVELOPMENT_PG_DATABASE="$DB_NAME"
export DEVELOPMENT_PG_HOST=127.0.0.1
export DEVELOPMENT_PG_PORT=5432
export JWT_SECRET="${JWT_SECRET:-gold-split-test-secret}"
export SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-https://hooks.slack.com/services/test/test/test}"

# Run repository-controlled migrations without root privileges.
run_log runuser -u "$RUNNER_USER" -- env \
  HOME="$RUNNER_DIR" \
  NPM_CONFIG_CACHE="$RUNNER_DIR/.npm" \
  PATH="$PATH" \
  NODE_PATH="$NODE_PATH" \
  NODE_ENV="$NODE_ENV" \
  DEVELOPMENT_PG_USER="$DEVELOPMENT_PG_USER" \
  DEVELOPMENT_PG_PASSWORD="$DEVELOPMENT_PG_PASSWORD" \
  DEVELOPMENT_PG_DATABASE="$DEVELOPMENT_PG_DATABASE" \
  DEVELOPMENT_PG_HOST="$DEVELOPMENT_PG_HOST" \
  DEVELOPMENT_PG_PORT="$DEVELOPMENT_PG_PORT" \
  JWT_SECRET="$JWT_SECRET" \
  SLACK_WEBHOOK_URL="$SLACK_WEBHOOK_URL" \
  npm --prefix /app/rateeat_backend run migrate

MIGRATE_EXIT=$?

# Reap before checking anything migrations could have tampered with: a
# malicious migration is repository-controlled code too, and could have
# spawned a detached watcher of its own regardless of whether migration
# itself reports success.
reap_runner_user

if [ "$MIGRATE_EXIT" -ne 0 ]; then
  echo "Database migrations failed" | tee -a "$RUN_LOG"
  exit 6
fi

if [ "$(trusted_assets_digest)" != "$CTRF_DIGEST_BEFORE" ]; then
  echo "Trusted CTRF reporter changed during migration" | tee -a "$RUN_LOG"
  exit 6
fi

# Trusted, verifier-owned Jest setup file, written fresh here (same reason
# and same mechanism as the config below: created by root, in a path never
# read from anywhere inside /app, then locked to root-only-writable before
# any repository-controlled process starts).
#
# Why this exists: the existing-suite's own test files import the real
# Express `app`, which pulls in every route/controller/service the
# repository (including a submitted solution) defines - meaning
# repository-controlled code runs inside the SAME Node process as the Jest
# test framework, before that file's own describe/it blocks ever register.
# (The held-out suite below no longer imports `app` at all, so none of this
# applies to it any more - this config is shared between both runs purely
# for simplicity, and this lockdown is a no-op cost there.) Before that
# point, nothing would otherwise stop repository code from:
#
#   1. Reassigning global.describe/it/test/expect (etc.) so the real hidden
#      tests silently register as empty, always-passing tests instead of
#      running their real bodies - flipping grading without implementing
#      anything.
#   2. Registering a process 'exit'/'beforeExit' listener that rewrites the
#      CTRF report file on disk after the trusted reporter's onRunComplete
#      already wrote the real result, using the same OS user/process that
#      legitimately produced it (so file ownership alone doesn't stop it).
#   3. Calling the real, unmodified `fs.writeFileSync` (or its write/
#      createWriteStream/promises siblings) directly, aimed at this run's
#      own CTRF capture path, to preempt the trusted reporter's later write
#      with a fabricated report and exit before a single real test runs.
#
# Loaded via Jest's `setupFilesAfterEnv`, which Jest guarantees runs once per
# test file, after the test framework has installed the real global test
# API, but before that test file's own top-level code (and therefore
# anything it imports) executes a single line. Freezing/guarding here closes
# all three gaps before repository code ever gets a chance to run.
cat > /tmp/rateeat-split-verifier-jest-lockdown.cjs <<'JEST_LOCKDOWN'
"use strict";

const LOCKED_TEST_GLOBALS = [
  "describe",
  "fdescribe",
  "xdescribe",
  "it",
  "fit",
  "xit",
  "test",
  "beforeAll",
  "beforeEach",
  "afterEach",
  "afterAll",
  "expect",
];

function lockGlobalProperty(name) {
  const current = global[name];
  if (current === undefined) {
    return;
  }
  try {
    Object.defineProperty(global, name, {
      value: current,
      writable: false,
      configurable: false,
      enumerable: true,
    });
  } catch (_) {
    // Already locked (e.g. a previous setupFilesAfterEnv pass in a realm
    // that somehow persisted) - nothing further to do.
  }
}

for (const name of LOCKED_TEST_GLOBALS) {
  lockGlobalProperty(name);
}

// describe/it/test/expect all carry their own mutable static properties
// (describe/it/test: .only, .skip, .each, .todo, ...; expect: .extend,
// .any, .stringMatching, .arrayContaining, ...). Freeze those too so code
// can't swap out e.g. `it.only`, or - the more powerful version of the same
// gap - call the perfectly ordinary, Jest-documented `expect.extend(...)`
// to globally replace a built-in matcher like `toBe` with one that always
// reports success, while leaving the `it`/`expect` bindings themselves (and
// the prototype expect(...) returns, frozen separately below) untouched.
function lockOwnMethods(fn) {
  if (typeof fn !== "function") {
    return;
  }
  for (const prop of Object.getOwnPropertyNames(fn)) {
    if (["length", "name", "prototype", "arguments", "caller"].includes(prop)) {
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(fn, prop);
    if (descriptor && descriptor.configurable) {
      try {
        Object.defineProperty(fn, prop, {
          ...descriptor,
          configurable: false,
          writable: false,
        });
      } catch (_) {
        // Ignore - some properties (e.g. getter-only accessors) can't be
        // redefined this way, and don't need to be for this guard to hold.
      }
    }
  }
}

// expect.extend (and, less critically, addSnapshotSerializer) are Jest's
// own designed-for-mutation APIs: freezing the *property* below only stops
// it from being swapped for a different function, but the real
// expect.extend, called completely normally with no reassignment at all,
// is specifically built to let a caller override any existing matcher name
// - including toBe/toEqual/toMatchObject/etc. - which is exactly how
// repository code could neutralize real assertions without touching any
// property this file otherwise locks. Neither the hidden tests nor the
// reference solution have any legitimate reason to call either, so replace
// both with no-ops before repository code loads (and before the freezing
// loop above/below locks them to whatever value they hold at that point),
// rather than only protecting the reference to the real implementation.
for (const method of ["extend", "addSnapshotSerializer"]) {
  if (typeof global.expect === "function" && typeof global.expect[method] === "function") {
    try {
      global.expect[method] = () => {};
    } catch (_) {
      // Already neutralized from an earlier setupFilesAfterEnv pass.
    }
  }
}

for (const name of ["describe", "it", "test", "expect"]) {
  lockOwnMethods(global[name]);
}

// Freeze the shape every `expect(...)` call returns, so matcher methods
// (toBe, toEqual, .not, ...) can't be silently replaced with no-ops either.
// Guarded against ever freezing a fundamental, process-wide shared
// prototype (Object.prototype chief among them): if Jest builds `.not` (or
// the matchers object itself) as a plain object literal rather than an
// instance of a dedicated class, its prototype IS Object.prototype, and
// freezing that would break unrelated code throughout the whole process
// (e.g. any library that does `someInstance.someProp = x` where `someProp`
// is inherited - a plain assignment like that throws once its inherited
// slot is frozen).
const NEVER_FREEZE = new Set(
  [Object.prototype, Array.prototype, Function.prototype, null].filter(
    Boolean
  )
);

function safeFreezePrototype(proto) {
  if (!proto || NEVER_FREEZE.has(proto)) {
    return;
  }
  Object.freeze(proto);
}

if (typeof global.expect === "function") {
  try {
    const sampleExpectation = global.expect(0);
    safeFreezePrototype(Object.getPrototypeOf(sampleExpectation));
    if (sampleExpectation && sampleExpectation.not) {
      safeFreezePrototype(Object.getPrototypeOf(sampleExpectation.not));
    }
  } catch (_) {
    // If Jest's expect() shape ever changes enough to throw here, fail
    // open on this one extra layer rather than break every test run - the
    // global/property locks above are the primary guarantee.
  }
}

// Repository-controlled code should never legitimately need to hook process
// shutdown to do its job. Guard 'exit'/'beforeExit' registration specifically
// (every other event still works normally) so nothing loaded after this
// point can register a handler that rewrites the CTRF report between the
// trusted reporter's onRunComplete and the process actually exiting.
const GUARDED_PROCESS_EVENTS = new Set(["exit", "beforeExit"]);
const REGISTRATION_METHODS = [
  "on",
  "addListener",
  "once",
  "prependListener",
  "prependOnceListener",
];

for (const method of REGISTRATION_METHODS) {
  const original = process[method] && process[method].bind(process);
  if (!original) {
    continue;
  }
  try {
    Object.defineProperty(process, method, {
      value: (event, listener) => {
        if (GUARDED_PROCESS_EVENTS.has(event)) {
          return process;
        }
        return original(event, listener);
      },
      writable: false,
      configurable: false,
    });
  } catch (_) {
    // Already guarded from an earlier setupFilesAfterEnv pass.
  }
}

// The trusted CTRF reporter's one expected write goes through
// `fs.writeFileSync` - the literal same function reference any other code
// in this process gets back from its own `require("fs")`, since Node
// caches built-in modules by identity and, unlike the per-test-file sandbox
// Jest gives user code, does not give each test file its own copy of `fs`.
// Left alone, repository-controlled code could reassign that one property
// to a wrapper that intercepts the reporter's call, rewrites the payload it
// was about to write (e.g. flips "failed" statuses to "passed"), and then
// forwards it to the real implementation - a single, ordinary-looking
// write, with no second write, no timeout, and no abnormal exit for any of
// the earlier defenses to catch. Freezing the property - not changing what
// it does when called, only preventing it from being replaced - runs before
// repository code ever loads, so whichever function is bound to
// `fs.writeFileSync` at this exact moment (the real one; nothing has had a
// chance to touch it yet) is what every later call, including the
// reporter's, is guaranteed to reach.
//
// That alone stops the reference from being swapped, but not the function
// from being *called* by something other than the reporter: repository code
// can still call the real, unmodified `fs.writeFileSync` itself, aimed at
// this run's exact CTRF capture path (test.sh passes it in as
// RATEEAT_CTRF_GUARDED_PATH - the same, predictable path every run uses,
// since the reporter's own default output location is fixed), to preempt
// the trusted reporter's later write with a fabricated report and then exit
// before a single real test runs. Distinguish the two callers by where the
// call actually originates: the trusted reporter's own write only ever
// happens from inside its own package directory (root-owned, under
// /opt/ctrf); nothing legitimate calling into this exact path has any
// reason to originate anywhere else. Reject - not silently ignore, so nothing
// downstream mistakes a no-op for a successful write - any attempt to write
// to that specific path from a call stack that doesn't pass through
// /opt/ctrf. Every write actually aimed anywhere else (Jest's own coverage
// output, ts-jest's cache, application logs, ...) is completely unaffected -
// those calls reach the real implementation exactly as before.
//
// This covers the synchronous, callback, and promise forms of the same
// underlying write - the three a caller would reach for first - though, as
// with the hidden-test-source readability noted above, it cannot reach
// every lower-level way a process could put bytes on disk (a raw already-open
// file descriptor, or a native addon); it closes the specific gap named
// above, not every conceivable one.
try {
  const fs = require("fs");
  const path = require("path");

  const guardedPathRaw = process.env.RATEEAT_CTRF_GUARDED_PATH || "";
  const guardedPath = guardedPathRaw ? path.resolve(guardedPathRaw) : null;

  const isTrustedReporterCaller = () => {
    const stack = new Error().stack || "";
    return stack.indexOf(`${path.sep}opt${path.sep}ctrf${path.sep}`) !== -1;
  };

  const targetsGuardedPath = (target) => {
    if (!guardedPath || typeof target !== "string") {
      return false;
    }
    try {
      return path.resolve(target) === guardedPath;
    } catch (_) {
      return false;
    }
  };

  const rejectUnlessTrustedReporter = (target) => {
    if (targetsGuardedPath(target) && !isTrustedReporterCaller()) {
      throw new Error(
        "Writing to the CTRF report path is only permitted from the trusted reporter."
      );
    }
  };

  const realWriteFileSync = fs.writeFileSync;
  const realWriteFile = fs.writeFile;
  const realCreateWriteStream = fs.createWriteStream;
  const realPromisesWriteFile =
    fs.promises && fs.promises.writeFile
      ? fs.promises.writeFile.bind(fs.promises)
      : null;

  const guardedWriteFileSync =
    typeof realWriteFileSync === "function"
      ? (file, ...rest) => {
          rejectUnlessTrustedReporter(file);
          return realWriteFileSync.call(fs, file, ...rest);
        }
      : realWriteFileSync;

  const guardedWriteFile =
    typeof realWriteFile === "function"
      ? (file, ...rest) => {
          rejectUnlessTrustedReporter(file);
          return realWriteFile.call(fs, file, ...rest);
        }
      : realWriteFile;

  const guardedCreateWriteStream =
    typeof realCreateWriteStream === "function"
      ? (file, ...rest) => {
          rejectUnlessTrustedReporter(file);
          return realCreateWriteStream.call(fs, file, ...rest);
        }
      : realCreateWriteStream;

  const lockValue = (obj, prop, value) => {
    if (typeof value !== "function") {
      return;
    }
    try {
      Object.defineProperty(obj, prop, {
        value,
        writable: false,
        configurable: false,
        enumerable: true,
      });
    } catch (_) {
      // Already locked from an earlier setupFilesAfterEnv pass.
    }
  };

  lockValue(fs, "writeFileSync", guardedWriteFileSync);
  lockValue(fs, "writeFile", guardedWriteFile);
  lockValue(fs, "createWriteStream", guardedCreateWriteStream);

  if (realPromisesWriteFile && fs.promises) {
    const guardedPromisesWriteFile = (file, ...rest) => {
      rejectUnlessTrustedReporter(file);
      return realPromisesWriteFile(file, ...rest);
    };
    lockValue(fs.promises, "writeFile", guardedPromisesWriteFile);
  }
} catch (_) {
  // Already guarded from an earlier setupFilesAfterEnv pass - fs is a
  // process-wide singleton, not per-test-file, so redefining it to the same
  // already-guarded value here is expected and harmless.
}
JEST_LOCKDOWN

chmod 644 /tmp/rateeat-split-verifier-jest-lockdown.cjs

# Verifier-owned Jest config, written fresh here rather than trusting the
# repository's own jest.config.js: a submitted solution diff could otherwise
# edit that file (transforms, module mapping, reporters) to manipulate test
# execution instead of implementing the feature. This config is never read
# from anywhere inside /app.
cat > /tmp/rateeat-split-verifier-jest.config.cjs <<'JEST_CONFIG'
// Jest resolves a bare `require("pg")` (or "supertest", "jsonwebtoken", ...)
// by walking UP from the requiring test file's own directory, checking each
// ancestor's node_modules, and using the FIRST match - it does not special-
// case the repository's real, trusted installation at the top of
// /app/rateeat_backend/node_modules over a NEARER one. A submitted solution
// diff can add plain new files anywhere under src/ (nothing stops a patch
// from including, say, src/__tests__/unit/node_modules/pg/index.js), and
// that nested node_modules is a closer ancestor of every held-out test file
// than the real one - so it would be found FIRST and silently shadow the
// genuine package, handing a fabricated Pool/Client/whatever back to test
// code that has no way to tell the difference from the outside. Guarding
// the CTRF report (see the lockdown above) means nothing if the test file's
// own view of "did this request/DB call actually happen" can be forged this
// way instead.
//
// moduleNameMapper is Jest's own documented, purpose-built escape hatch from
// that directory-walk: unlike a `Module._resolveFilename` patch (which does
// NOT intercept Jest's own module registry - Jest implements its own
// resolution rather than delegating to Node's, so patching Node's resolver
// from a setupFilesAfterEnv file has no effect on what a test file's own
// `require`/`import` sees), a moduleNameMapper entry is consulted by Jest's
// resolver itself, before its normal directory-walk ever runs, and an
// absolute path here is used as-is - there is no nearer ancestor left to
// prefer over it. Verified directly: an identical nested-shadow setup
// resolves to the shadow without this config, and to the real package with
// it, for both a bare specifier and a deep subpath.
//
// The pinned list below is every dependency/devDependency name from this
// repository's OWN package.json, fixed here at task-authoring time rather
// than read from the repository's copy at grading time - reading it live
// would let a submitted diff simply delete an entry (say, "pg") from its
// own package.json to reopen exactly the hole this closes for whatever it
// removed, while the real installed package (already present in the image
// from build time, never reinstalled at grading time) keeps right on
// existing for the shadow to impersonate. ("crypto" is deliberately left
// out: it's a Node core module, which core-module resolution already
// prevents any node_modules directory - real or shadowed - from overriding,
// and the repository's OWN "crypto" dependency is npm's empty deprecated
// placeholder package, not a working implementation, so mapping it here
// would break every genuine use of the real, built-in module instead of
// protecting anything.)
const TRUSTED_NODE_MODULES = "/app/rateeat_backend/node_modules";
const PINNED_PACKAGES = [
  "@google-cloud/documentai", "@google-cloud/language", "@google-cloud/logging",
  "@google-cloud/monitoring", "@google-cloud/secret-manager", "@google-cloud/storage",
  "@google-cloud/vertexai", "@google-cloud/vision", "@slack/webhook",
  "@types/axios", "@types/bcryptjs", "@types/cookie-parser", "@types/cors",
  "@types/debug", "@types/express", "@types/jest", "@types/jsonwebtoken",
  "@types/multer", "@types/node", "@types/node-cron", "@types/otp-generator",
  "@types/passport", "@types/passport-local", "@types/pg", "@types/sequelize",
  "@types/supertest", "@typescript-eslint/eslint-plugin", "@typescript-eslint/parser",
  "axios", "bcryptjs", "cloudinary", "cookie-parser", "cors", "cross-env",
  "datauri", "dotenv", "eslint", "eslint-config-airbnb", "eslint-config-prettier",
  "eslint-config-standard", "eslint-plugin-import", "eslint-plugin-jest",
  "eslint-plugin-prettier", "express", "express-session", "firebase-admin",
  "geo-lib", "geolib", "handlebars", "haversine-distance", "helmet", "husky",
  "jest", "jest-express", "jpeg-js", "jsonwebtoken", "jwks-rsa", "lint-staged",
  "multer", "mysql2", "natural", "newrelic", "node-cron", "node-telegram-bot-api",
  "nodemailer", "nodemon", "otp-generator", "passport", "passport-google-oauth20",
  "passport-google-oidc", "passport-local", "pg", "prettier", "puppeteer", "qs",
  "rate-limiter-flexible", "redis", "reflect-metadata", "rimraf", "sequelize",
  "sequelize-cli", "sequelize-typescript", "sharp", "socket.io", "socket.io-client",
  "stopword", "supertest", "telegram", "ts-jest", "ts-node", "typescript",
  "typescript-eslint", "zod"
];

function buildPinnedModuleNameMapper() {
  const escapeRegex = (name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mapper = {};

  // A bare package name is mapped to its own EXACT, individually resolved
  // entry file - via require.resolve, scoped to only ever look inside
  // TRUSTED_NODE_MODULES - rather than to the package's bare directory.
  // That distinction matters: some of these packages (axios chief among
  // them) ship both an ESM and a CommonJS build, selected through
  // package.json's conditional "exports" map (its "require" condition
  // picks the CJS build; anything else falls through to "main", the ESM
  // one). require.resolve() evaluates that map correctly, the same way an
  // ordinary `require("axios")` from anywhere else already does; mapping
  // the bare directory instead - the first, simpler version of this fix -
  // skips that map entirely and falls back to plain "main", which for a
  // dual-build package resolves to the WRONG (ESM) file and breaks with
  // "Cannot use import statement outside a module" the moment anything
  // requires it. Resolving each one individually, right here, avoids that
  // class of bug for any pinned package built the same dual-ESM/CJS way,
  // not just axios.
  //
  // Not every pinned name is actually resolvable this way - the @types/*
  // entries are TypeScript-only declaration packages with no runtime JS
  // entry point at all, so require.resolve() throws for them; skip rather
  // than fail the whole config over that; and since nothing here or in any
  // held-out test ever legitimately calls require() on a @types/* package
  // in the first place, there is no real require() call for a shadow of one
  // to intercept either.
  for (const name of PINNED_PACKAGES) {
    let resolved;
    try {
      resolved = require.resolve(name, { paths: [TRUSTED_NODE_MODULES] });
    } catch (_) {
      continue;
    }
    mapper[`^${escapeRegex(name)}$`] = resolved;
  }

  // Deep subpath imports (e.g. "pg/lib/foo") reference an explicit file
  // inside the package rather than going through the "exports" main-entry
  // condition above, so mapping them straight into the trusted package
  // directory (preserving the subpath) doesn't have the same failure mode.
  const alternation = PINNED_PACKAGES.map(escapeRegex).join("|");
  mapper[`^(${alternation})/(.*)$`] = `${TRUSTED_NODE_MODULES}/$1/$2`;

  return mapper;
}

module.exports = {
  rootDir: "/app/rateeat_backend",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/__tests__/unit/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
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
    "^@/(.*)$": "<rootDir>/src/$1",
    ...buildPinnedModuleNameMapper()
  },
  setupFiles: ["dotenv/config"],
  // Runs after Jest installs the real global test API but before each test
  // file's own imports (and therefore any repository code reachable from
  // `app`) execute a single line — see the JEST_LOCKDOWN heredoc above.
  setupFilesAfterEnv: ["/tmp/rateeat-split-verifier-jest-lockdown.cjs"]
};
JEST_CONFIG

chmod 644 /tmp/rateeat-split-verifier-jest.config.cjs

# Existing repository tests — P2P. These are all fully mocked (no database),
# so they run under the same trusted config with no extra setup. Excludes
# the new split-payment test files so the reference solution can't be graded against
# its own held-out tests.
start_ctrf_capture /logs/verifier/base_ctrf.json
BASE_JEST_STARTED_AT=$(date +%s)

(
  cd "$RUNNER_DIR" || exit 6

  timeout --signal=TERM --kill-after=10s 300 \
    runuser -u "$RUNNER_USER" -- env \
    HOME="$RUNNER_DIR" \
    NPM_CONFIG_CACHE="$RUNNER_DIR/.npm" \
    PATH="$PATH" \
    NODE_PATH="$NODE_PATH" \
    NODE_ENV="$NODE_ENV" \
    DEVELOPMENT_PG_USER="$DEVELOPMENT_PG_USER" \
    DEVELOPMENT_PG_PASSWORD="$DEVELOPMENT_PG_PASSWORD" \
    DEVELOPMENT_PG_DATABASE="$DEVELOPMENT_PG_DATABASE" \
    DEVELOPMENT_PG_HOST="$DEVELOPMENT_PG_HOST" \
    DEVELOPMENT_PG_PORT="$DEVELOPMENT_PG_PORT" \
    JWT_SECRET="$JWT_SECRET" \
    SLACK_WEBHOOK_URL="$SLACK_WEBHOOK_URL" \
    RATEEAT_CTRF_GUARDED_PATH="$CTRF_CAPTURE_PIPE" \
    "$JEST_BIN" \
    --config /tmp/rateeat-split-verifier-jest.config.cjs \
    --no-cache \
    --runInBand \
    --forceExit \
    --testPathIgnorePatterns='split_payment_(endpoint|transaction)\.test\.ts$|split_payment_test_support\.ts$' \
    --reporters=default \
    --reporters="$CTRF_REPORTER"
) 2>&1 | tee -a "$RUN_LOG"

BASE_JEST_EXIT=${PIPESTATUS[0]}

require_normal_jest_exit "$BASE_JEST_EXIT" "Existing-suite" "$BASE_JEST_STARTED_AT" 10

# Belt-and-suspenders on top of the pipe-based capture above: reap any
# leftover process owned by $RUNNER_USER before doing anything else, so
# nothing from this run can persist into (and interfere with) the next one.
reap_runner_user

if [ "$(trusted_assets_digest)" != "$CTRF_DIGEST_BEFORE" ]; then
  echo "Trusted CTRF reporter changed during existing tests" | tee -a "$RUN_LOG"
  exit 6
fi

finish_ctrf_capture /logs/verifier/base_ctrf.json "Existing-suite"

# Split-payment task tests — F2P. Real black-box HTTP tests against a real,
# separately-running instance of the real app and the real Postgres database
# seeded above.
#
# Unlike the existing-suite run above (and unlike every attempt before this
# one), the held-out Jest process below never imports the repository's `app`,
# routes, controllers, services, or Sequelize models at all - see
# src/__tests__/unit/split_payment_test_support.ts, which every held-out test
# file imports instead of any repository source. It only makes real HTTP
# requests, on a real socket, to the harness server started just below, and
# reaches the database directly over its own raw `pg` connection for fixture
# setup/verification. A submitted solution's code runs only in that separate
# server process - never in the process that decides these tests' outcome -
# so there is no repository-controlled code left anywhere that shares a
# process with the Jest run, the CTRF capture, or the reporter. Forging a
# report from inside the server process is no longer a way to pass: exiting
# early there just breaks every real HTTP request the held-out suite makes
# against it, which already shows up as genuine assertion failures.
#
# Verifier-owned harness server (never the repository's own src/server.ts,
# which pulls in Firebase, Telegram, a headless browser, and cron jobs this
# suite has no business needing) - mounts only the real, repository-authored
# split-bill router on a minimal Express app of our own. Written fresh here,
# same reason as the Jest config/lockdown files above: never trusted from the
# repository.
cat > /tmp/rateeat-split-verifier-server.js <<'SPLIT_SERVER'
require("dotenv/config");
const express = require("express");
const cookieParser = require("cookie-parser");

const splitBillRoute = require(
  "/app/rateeat_backend/src/routes/split_bill.route"
).default;
const { errorHandler, urlNotFound } = require(
  "/app/rateeat_backend/src/middlewares/error-handler"
);

const app = express();
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use("/api/v1/split-group", splitBillRoute);
app.use(urlNotFound);
app.use(errorHandler);

const port = process.env.SPLIT_TEST_SERVER_PORT || "4600";
const server = app.listen(port, () => {
  console.log(`split-payment test server listening on ${port}`);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
SPLIT_SERVER

chmod 644 /tmp/rateeat-split-verifier-server.js

SPLIT_SERVER_PORT=4600
SPLIT_TEST_BASE_URL="http://127.0.0.1:$SPLIT_SERVER_PORT"

runuser -u "$RUNNER_USER" -- env \
  HOME="$RUNNER_DIR" \
  NPM_CONFIG_CACHE="$RUNNER_DIR/.npm" \
  PATH="$PATH" \
  NODE_PATH="$NODE_PATH" \
  NODE_ENV="$NODE_ENV" \
  DEVELOPMENT_PG_USER="$DEVELOPMENT_PG_USER" \
  DEVELOPMENT_PG_PASSWORD="$DEVELOPMENT_PG_PASSWORD" \
  DEVELOPMENT_PG_DATABASE="$DEVELOPMENT_PG_DATABASE" \
  DEVELOPMENT_PG_HOST="$DEVELOPMENT_PG_HOST" \
  DEVELOPMENT_PG_PORT="$DEVELOPMENT_PG_PORT" \
  JWT_SECRET="$JWT_SECRET" \
  SPLIT_TEST_SERVER_PORT="$SPLIT_SERVER_PORT" \
  node -r ts-node/register/transpile-only \
  /tmp/rateeat-split-verifier-server.js \
  >> "$RUN_LOG" 2>&1 &

if ! wait_for_split_server "$SPLIT_SERVER_PORT"; then
  echo "Split-payment test server did not become ready" | tee -a "$RUN_LOG"
  kill_runner_pids
  exit 6
fi

start_ctrf_capture /logs/verifier/new_ctrf.json
NEW_JEST_STARTED_AT=$(date +%s)

(
  # CWD is $RUNNER_DIR (not $RUNNER_DIR_TESTS) specifically so the CTRF
  # reporter's own relative default output path - ./ctrf/ctrf-report.json -
  # lands on the exact same CTRF_CAPTURE_DIR/CTRF_CAPTURE_PIPE this script
  # already set up under $RUNNER_DIR, above. HOME/NPM_CONFIG_CACHE (below)
  # are the separate, $RUNNER_USER_TESTS-owned $RUNNER_DIR_TESTS instead -
  # this process only needs to land at $RUNNER_DIR, never write into it.
  cd "$RUNNER_DIR" || exit 6

  # Runs as $RUNNER_USER_TESTS, not $RUNNER_USER: this is the one process
  # that ever legitimately reads the held-out test source (locked to this
  # user alone - see the chmod block near the top of this script) to
  # compile and execute it. It shares no filesystem access beyond that
  # shared CWD, no HOME, and (per its own section above) no process with
  # whatever runs repository or solution code, so that read access is never
  # something repository code gets to inherit.
  timeout --signal=TERM --kill-after=10s 300 \
    runuser -u "$RUNNER_USER_TESTS" -- env \
    HOME="$RUNNER_DIR_TESTS" \
    NPM_CONFIG_CACHE="$RUNNER_DIR_TESTS/.npm" \
    PATH="$PATH" \
    NODE_PATH="$NODE_PATH" \
    NODE_ENV="$NODE_ENV" \
    DEVELOPMENT_PG_USER="$DEVELOPMENT_PG_USER" \
    DEVELOPMENT_PG_PASSWORD="$DEVELOPMENT_PG_PASSWORD" \
    DEVELOPMENT_PG_DATABASE="$DEVELOPMENT_PG_DATABASE" \
    DEVELOPMENT_PG_HOST="$DEVELOPMENT_PG_HOST" \
    DEVELOPMENT_PG_PORT="$DEVELOPMENT_PG_PORT" \
    JWT_SECRET="$JWT_SECRET" \
    SLACK_WEBHOOK_URL="$SLACK_WEBHOOK_URL" \
    SPLIT_TEST_BASE_URL="$SPLIT_TEST_BASE_URL" \
    RATEEAT_CTRF_GUARDED_PATH="$CTRF_CAPTURE_PIPE" \
    "$JEST_BIN" \
    --config /tmp/rateeat-split-verifier-jest.config.cjs \
    --no-cache \
    --runInBand \
    --forceExit \
    --runTestsByPath \
    /app/rateeat_backend/src/__tests__/unit/split_payment_endpoint.test.ts \
    /app/rateeat_backend/src/__tests__/unit/split_payment_transaction.test.ts \
    --reporters=default \
    --reporters="$CTRF_REPORTER"
) 2>&1 | tee -a "$RUN_LOG"

NEW_JEST_EXIT=${PIPESTATUS[0]}

require_normal_jest_exit "$NEW_JEST_EXIT" "Held-out-suite" "$NEW_JEST_STARTED_AT" 10

# Same reasoning as reap_runner_user's own comment above, for the user that
# just ran the held-out suite itself.
reap_runner_user "$RUNNER_USER_TESTS"

# Defense in depth on top of the process-separation above: if the harness
# server had exited on its own before the held-out suite finished (say, to
# try to preempt the CTRF FIFO the way earlier attempts could from inside
# the shared process), every request the suite made against it from that
# point on would already have failed with a connection error - genuine
# assertion failures, not a bypass. Checking directly here catches that
# case explicitly rather than relying on that indirect signal alone.
if [ -z "$(runner_pids)" ]; then
  echo "Split-payment test server was not running at the end of the held-out suite - not grading this run" \
    | tee -a "$RUN_LOG"
  exit 6
fi

# Same reasoning as after the existing-suite run above - this also tears
# down the harness server itself, which has done its job by this point.
reap_runner_user

if [ "$(trusted_assets_digest)" != "$CTRF_DIGEST_BEFORE" ]; then
  echo "Trusted CTRF reporter changed during held-out tests" | tee -a "$RUN_LOG"
  exit 6
fi

finish_ctrf_capture /logs/verifier/new_ctrf.json "Held-out-suite"

# See verify_genuine_db_activity's definition above for why this specifically
# targets the fake-report-then-sleep-then-exit gap the elapsed-time check
# alone can't close. Floors are well under the ~31-33 split_groups/
# split_participants rows the held-out suite's own fixtures actually create
# (verified against a real run), leaving comfortable margin, while staying
# far out of reach for a run that never executed a single test body.
verify_genuine_db_activity split_groups 20
verify_genuine_db_activity split_participants 20

echo "existing suite exit: $BASE_JEST_EXIT" | tee -a "$RUN_LOG"
echo "split-payment suite exit: $NEW_JEST_EXIT" | tee -a "$RUN_LOG"

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
