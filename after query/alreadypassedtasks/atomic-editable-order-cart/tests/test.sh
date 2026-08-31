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
RUNNER_USER="rateeat_cart_verifier"
RUNNER_DIR="/tmp/rateeat-cart-runner"

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
runner_pids() {
  if command -v pgrep >/dev/null 2>&1; then
    pgrep -u "$RUNNER_USER" 2>/dev/null
  else
    # Portable fallback if procps isn't present in the image.
    ps -u "$RUNNER_USER" -o pid= 2>/dev/null
  fi
}

kill_runner_pids() {
  if command -v pkill >/dev/null 2>&1; then
    pkill -KILL -u "$RUNNER_USER" >/dev/null 2>&1 || true
  else
    local pid
    for pid in $(runner_pids); do
      kill -KILL "$pid" >/dev/null 2>&1 || true
    done
  fi
}

reap_runner_user() {
  local waited=0
  kill_runner_pids
  while [ -n "$(runner_pids)" ]; do
    waited=$((waited + 1))
    if [ "$waited" -ge 25 ]; then
      break
    fi
    sleep 0.2
    kill_runner_pids
  done
  if [ -n "$(runner_pids)" ]; then
    echo "Could not reap all processes owned by $RUNNER_USER" \
      | tee -a "$RUN_LOG"
    exit 6
  fi
}

# Reaping (above) closes off further tampering once we get to it, but it
# cannot undo damage a still-running process already did: the trusted CTRF
# reporter's write to disk and this script's own later `mv` of that file are
# two separate moments, and a process that has been running the whole time
# (planted during migration, or at the top of the very Jest run that's about
# to produce the report - `import app` runs before this file's own tests
# even register) can sit and poll for the report to appear, then rewrite it
# in between those two moments. Reaping afterwards can't restore what it
# already overwrote.
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
require_normal_jest_exit() {
  local exit_code="$1"
  local label="$2"
  if [ "$exit_code" != "0" ] && [ "$exit_code" != "1" ]; then
    echo "$label Jest run exited abnormally ($exit_code) - not grading a run that didn't finish on its own" \
      | tee -a "$RUN_LOG"
    exit 6
  fi
}

rm -rf "$RUNNER_DIR"
mkdir -p "$RUNNER_DIR" "$RUNNER_DIR/.npm" || exit 6
chown -R "$RUNNER_USER":"$RUNNER_USER" "$RUNNER_DIR" || exit 6

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

DB_NAME="rateeat_gold_cart_test"
DB_PASSWORD="gold-order-cart-db-password"

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
export JWT_SECRET="${JWT_SECRET:-gold-cart-test-secret}"
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
# Why this exists: the hidden test files import the real Express `app`,
# which pulls in every route/controller/service the repository (including a
# submitted solution) defines - meaning repository-controlled code runs
# inside the SAME Node process as the Jest test framework, before this
# file's test's own describe/it blocks ever register. Before that point,
# nothing would otherwise stop it from:
#
#   1. Reassigning global.describe/it/test/expect (etc.) so the real hidden
#      tests silently register as empty, always-passing tests instead of
#      running their real bodies - flipping grading without implementing
#      anything.
#   2. Registering a process 'exit'/'beforeExit' listener that rewrites the
#      CTRF report file on disk after the trusted reporter's onRunComplete
#      already wrote the real result, using the same OS user/process that
#      legitimately produced it (so file ownership alone doesn't stop it).
#
# Loaded via Jest's `setupFilesAfterEnv`, which Jest guarantees runs once per
# test file, after the test framework has installed the real global test
# API, but before that test file's own top-level code (and therefore
# anything it imports) executes a single line. Freezing/guarding here closes
# both gaps before repository code ever gets a chance to run.
cat > /tmp/rateeat-cart-verifier-jest-lockdown.cjs <<'JEST_LOCKDOWN'
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
// the earlier defenses to catch.
//
// Freezing the property here - not changing what it does when called, only
// preventing it from being replaced - runs before repository code ever
// loads, so whichever function is bound to `fs.writeFileSync` at this exact
// moment (the real one; nothing has had a chance to touch it yet) is what
// every later call, including the reporter's, is guaranteed to reach.
try {
  const fs = require("fs");
  const realWriteFileSync = fs.writeFileSync;
  if (typeof realWriteFileSync === "function") {
    Object.defineProperty(fs, "writeFileSync", {
      value: realWriteFileSync,
      writable: false,
      configurable: false,
      enumerable: true,
    });
  }
} catch (_) {
  // Already frozen from an earlier setupFilesAfterEnv pass - fs is a
  // process-wide singleton, not per-test-file, so redefining it to the same
  // already-frozen value here is expected and harmless.
}
JEST_LOCKDOWN

chmod 644 /tmp/rateeat-cart-verifier-jest-lockdown.cjs

# Verifier-owned Jest config, written fresh here rather than trusting the
# repository's own jest.config.js: a submitted solution diff could otherwise
# edit that file (transforms, module mapping, reporters) to manipulate test
# execution instead of implementing the feature. This config is never read
# from anywhere inside /app.
cat > /tmp/rateeat-cart-verifier-jest.config.cjs <<'JEST_CONFIG'
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
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  setupFiles: ["dotenv/config"],
  // Runs after Jest installs the real global test API but before each test
  // file's own imports (and therefore any repository code reachable from
  // `app`) execute a single line — see the JEST_LOCKDOWN heredoc above.
  setupFilesAfterEnv: ["/tmp/rateeat-cart-verifier-jest-lockdown.cjs"]
};
JEST_CONFIG

chmod 644 /tmp/rateeat-cart-verifier-jest.config.cjs

# Existing repository tests — P2P. These are all fully mocked (no database),
# so they run under the same trusted config with no extra setup. Excludes
# the new cart test files so the reference solution can't be graded against
# its own held-out tests.
start_ctrf_capture /logs/verifier/base_ctrf.json

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
    "$JEST_BIN" \
    --config /tmp/rateeat-cart-verifier-jest.config.cjs \
    --no-cache \
    --runInBand \
    --forceExit \
    --testPathIgnorePatterns='order_cart_(endpoint|transaction)\.test\.ts$|order_cart_test_support\.ts$' \
    --reporters=default \
    --reporters="$CTRF_REPORTER"
) 2>&1 | tee -a "$RUN_LOG"

BASE_JEST_EXIT=${PIPESTATUS[0]}

require_normal_jest_exit "$BASE_JEST_EXIT" "Existing-suite"

# Belt-and-suspenders on top of the pipe-based capture above: reap any
# leftover process owned by $RUNNER_USER before doing anything else, so
# nothing from this run can persist into (and interfere with) the next one.
reap_runner_user

if [ "$(trusted_assets_digest)" != "$CTRF_DIGEST_BEFORE" ]; then
  echo "Trusted CTRF reporter changed during existing tests" | tee -a "$RUN_LOG"
  exit 6
fi

finish_ctrf_capture /logs/verifier/base_ctrf.json "Existing-suite"

# Order-cart task tests — F2P. Real black-box HTTP tests against the real
# app and the real Postgres database seeded above.
start_ctrf_capture /logs/verifier/new_ctrf.json

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
    "$JEST_BIN" \
    --config /tmp/rateeat-cart-verifier-jest.config.cjs \
    --no-cache \
    --runInBand \
    --forceExit \
    --runTestsByPath \
    /app/rateeat_backend/src/__tests__/unit/order_cart_endpoint.test.ts \
    /app/rateeat_backend/src/__tests__/unit/order_cart_transaction.test.ts \
    --reporters=default \
    --reporters="$CTRF_REPORTER"
) 2>&1 | tee -a "$RUN_LOG"

NEW_JEST_EXIT=${PIPESTATUS[0]}

require_normal_jest_exit "$NEW_JEST_EXIT" "Held-out-suite"

# Same reasoning as after the existing-suite run above.
reap_runner_user

if [ "$(trusted_assets_digest)" != "$CTRF_DIGEST_BEFORE" ]; then
  echo "Trusted CTRF reporter changed during held-out tests" | tee -a "$RUN_LOG"
  exit 6
fi

finish_ctrf_capture /logs/verifier/new_ctrf.json "Held-out-suite"

echo "existing suite exit: $BASE_JEST_EXIT" | tee -a "$RUN_LOG"
echo "order-cart suite exit: $NEW_JEST_EXIT" | tee -a "$RUN_LOG"

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