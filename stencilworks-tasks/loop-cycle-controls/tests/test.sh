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
export CARGO_TERM_COLOR=never

# Non-root builder for cargo/build.rs, then root-seal the compiled libtest
# binaries so a detached build-script process cannot replace them before
# --list / grading runs.
BUILD_USER=sw-verifier-build
if ! id "$BUILD_USER" >/dev/null 2>&1; then
  useradd --system --no-create-home --shell /usr/sbin/nologin "$BUILD_USER" >>"$RUN_LOG" 2>&1 || {
    echo "could not create $BUILD_USER" | tee -a "$RUN_LOG"
    exit 6
  }
fi
export SW_BUILD_USER="$BUILD_USER"

python3 - <<'PYTEST'
import hashlib
import json
import os
import pwd
import shutil
import signal
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path

APP = Path("/app")
CONFIG = Path("/tests/config.json")
TEST_PATCH = Path("/tests/test.patch")
RUN_LOG = Path(os.environ.get("RUN_LOG", "/logs/verifier/run.log"))
BASE_XML = Path("/logs/verifier/base.xml")
NEW_XML = Path("/logs/verifier/new.xml")
WORK = Path("/tmp/stencilworks-verifier-work")
CARGO_HOME = Path("/tmp/stencilworks-verifier-cargo-home")
TARGET = Path("/tmp/stencilworks-verifier-target")
HIDDEN = Path("/tmp/stencilworks-verifier-hidden")
SEALED = Path("/tmp/stencilworks-verifier-sealed")
BUILD_USER = os.environ.get("SW_BUILD_USER", "").strip()

cfg = json.loads(CONFIG.read_text())
p2p = [str(x).strip() for x in cfg.get("p2p_node_ids", []) if str(x).strip()]
f2p = [str(x).strip() for x in cfg.get("f2p_node_ids", []) if str(x).strip()]
expected = list(dict.fromkeys(p2p + f2p))

for path in (WORK, CARGO_HOME, TARGET, HIDDEN, SEALED):
    shutil.rmtree(path, ignore_errors=True)
    path.mkdir(parents=True, exist_ok=True)

# Hide graded ids and the held-out patch from submission-controlled processes.
hidden_paths = []
for src in (CONFIG, TEST_PATCH):
    if src.is_file():
        dest = HIDDEN / src.name
        shutil.move(str(src), str(dest))
        hidden_paths.append((src, dest))

env = os.environ.copy()
env["CARGO_HOME"] = str(CARGO_HOME)
env["CARGO_TARGET_DIR"] = str(TARGET)
env["HOME"] = str(WORK)
env.pop("RUSTC_WRAPPER", None)
env.pop("RUSTC_WORKSPACE_WRAPPER", None)
env.pop("CARGO_BUILD_RUSTC_WRAPPER", None)
for key in list(env):
    if key.startswith("CARGO_TARGET_") and key.endswith("_RUNNER"):
        env.pop(key, None)

build_uid = build_gid = None
if BUILD_USER:
    pw = pwd.getpwnam(BUILD_USER)
    build_uid, build_gid = pw.pw_uid, pw.pw_gid
    for path in (WORK, CARGO_HOME, TARGET):
        shutil.chown(path, user=build_uid, group=build_gid)


def log(text):
    with RUN_LOG.open("a", errors="replace") as fh:
        fh.write(text)
        if text and not text.endswith("\n"):
            fh.write("\n")


def restore_hidden():
    for src, dest in hidden_paths:
        if dest.is_file() and not src.exists():
            shutil.move(str(dest), str(src))


def demote():
    if build_uid is None:
        return
    os.setgid(build_gid)
    os.setuid(build_uid)


def run(cmd, *, cwd, timeout=None, as_builder=False):
    log("+ " + " ".join(cmd))
    preexec = demote if as_builder and build_uid is not None else None
    try:
        proc = subprocess.run(
            cmd,
            cwd=cwd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            errors="replace",
            timeout=timeout,
            preexec_fn=preexec,
        )
        log(proc.stdout or "")
        return proc.returncode, proc.stdout or ""
    except subprocess.TimeoutExpired as exc:
        output = exc.stdout or ""
        if isinstance(output, bytes):
            output = output.decode(errors="replace")
        log(output)
        log(f"TIMEOUT after {timeout}s")
        return 124, output


def write_report(path, ids, results):
    root = ET.Element("testsuites")
    suite = ET.SubElement(root, "testsuite", name="direct-libtest", tests=str(len(ids)))
    failures = 0
    skipped = 0
    for name in ids:
        status, message = results.get(name, ("failed", "test was not discovered"))
        case = ET.SubElement(suite, "testcase", name=name, classname="")
        if status == "failed":
            failures += 1
            node = ET.SubElement(case, "failure", message=message[:500])
            if message:
                node.text = message[-8000:]
        elif status == "skipped":
            skipped += 1
            ET.SubElement(case, "skipped", message=message[:500])
    suite.set("failures", str(failures))
    suite.set("skipped", str(skipped))
    ET.ElementTree(root).write(path, encoding="unicode", xml_declaration=True)


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def kill_builder_leftovers():
    """Stop detached build.rs / cargo children that could mutate TARGET."""
    if build_uid is None:
        return
    # Prefer pkill when available; fall back to /proc scan.
    subprocess.run(
        ["pkill", "-9", "-u", str(build_uid)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    time.sleep(0.2)
    try:
        for entry in Path("/proc").iterdir():
            if not entry.name.isdigit():
                continue
            try:
                st = entry.stat()
                if st.st_uid != build_uid:
                    continue
                os.kill(int(entry.name), signal.SIGKILL)
            except (OSError, ProcessLookupError, PermissionError, ValueError):
                continue
    except OSError:
        pass
    time.sleep(0.1)


def seal_executables(executables):
    """Copy libtest binaries to a root-owned immutable dir; never re-use TARGET."""
    os.chown(SEALED, 0, 0)
    SEALED.chmod(0o755)
    sealed = []
    digests = {}
    for idx, exe in enumerate(executables):
        dest = SEALED / f"{idx:02d}-{exe.name}"
        shutil.copy2(exe, dest)
        os.chown(dest, 0, 0)
        dest.chmod(0o555)
        digests[dest] = file_sha256(dest)
        sealed.append(dest)
    # Freeze the cargo target tree so leftover writer processes cannot rewrite
    # the originals either (grading uses sealed copies only).
    try:
        for root, dirs, files in os.walk(TARGET):
            try:
                os.chown(root, 0, 0)
                os.chmod(root, 0o555)
            except OSError:
                pass
            for name in files:
                path = Path(root) / name
                try:
                    os.chown(path, 0, 0)
                    path.chmod(0o555)
                except OSError:
                    pass
    except OSError:
        pass
    SEALED.chmod(0o555)
    return sealed, digests


def assert_sealed_intact(digests):
    for path, expected in digests.items():
        if not path.is_file():
            raise RuntimeError(f"sealed binary missing: {path}")
        actual = file_sha256(path)
        if actual != expected:
            raise RuntimeError(f"sealed binary mutated: {path}")


locked = []
tests_dir = APP / "tests"
tests_dir_mode = None
try:
    # Lock the tests directory and held-out sources so a non-root build.rs
    # cannot rewrite or replace them. Root (this script) restores afterward.
    if tests_dir.is_dir():
        tests_dir_mode = tests_dir.stat().st_mode
        for path in sorted(tests_dir.glob("*.rs")):
            mode = path.stat().st_mode
            locked.append((path, mode))
            os.chown(path, 0, 0)
            path.chmod(0o444)
        for path in sorted(tests_dir.glob("cycle*.rs")):
            os.chown(path, 0, 0)
            path.chmod(0o444)
        tests_dir.chmod(0o555)

    build_cmd = [
        "cargo", "test",
        "--manifest-path", str(APP / "Cargo.toml"),
        "--no-run",
        "--message-format=json",
        "--locked",
        "--offline",
    ]
    rc, build_output = run(build_cmd, cwd=WORK, timeout=600, as_builder=True)

    executables = []
    if rc == 0:
        for line in build_output.splitlines():
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if obj.get("reason") != "compiler-artifact":
                continue
            exe = obj.get("executable")
            profile = obj.get("profile") or {}
            if exe and profile.get("test") is True:
                p = Path(exe)
                if p.is_file() and p not in executables:
                    executables.append(p)

    sealed = []
    digests = {}
    if rc == 0 and executables:
        # Seal immediately, then kill leftovers, then re-check digests.
        sealed, digests = seal_executables(executables)
        kill_builder_leftovers()
        assert_sealed_intact(digests)
        log(f"sealed {len(sealed)} libtest binaries under {SEALED}")

    locations = {name: [] for name in expected}
    ignored = {name: [] for name in expected}

    def listed_names(output):
        names = []
        for raw in output.splitlines():
            line = raw.strip()
            if line.endswith(": test"):
                names.append(line[:-6].strip())
        return names

    # Discovery and execution use only root-sealed binaries, invoked as root
    # (not the builder), so TARGET mutations cannot flip --list or exit status.
    if rc == 0 and sealed:
        assert_sealed_intact(digests)
        for exe in sealed:
            list_rc, list_out = run([str(exe), "--list"], cwd=APP, timeout=60, as_builder=False)
            if list_rc != 0:
                continue
            all_names = set(listed_names(list_out))
            ign_rc, ign_out = run(
                [str(exe), "--list", "--ignored"], cwd=APP, timeout=60, as_builder=False
            )
            ignored_names = set(listed_names(ign_out)) if ign_rc == 0 else set()
            for name in expected:
                if name in all_names:
                    locations[name].append(exe)
                if name in ignored_names:
                    ignored[name].append(exe)

    results = {}
    for name in expected:
        if ignored[name]:
            results[name] = ("skipped", "configured test is ignored")
            continue
        bins = locations[name]
        if not bins:
            results[name] = ("failed", "test was not discovered in compiled libtest binaries")
            continue
        failures = []
        for exe in bins:
            assert_sealed_intact({exe: digests[exe]})
            test_rc, test_out = run(
                [str(exe), "--exact", name, "--no-capture"],
                cwd=APP,
                timeout=120,
                as_builder=False,
            )
            if test_rc != 0:
                failures.append(test_out or f"test process exited with status {test_rc}")
        if failures:
            results[name] = ("failed", "\n".join(failures))
        else:
            results[name] = ("passed", "")

    write_report(BASE_XML, p2p, results)
    write_report(NEW_XML, f2p, results)
finally:
    if tests_dir.is_dir() and tests_dir_mode is not None:
        try:
            tests_dir.chmod(tests_dir_mode)
        except OSError:
            pass
    for path, mode in locked:
        try:
            path.chmod(mode)
        except OSError:
            pass
    restore_hidden()
PYTEST

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
