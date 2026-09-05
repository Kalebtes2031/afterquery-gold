#!/usr/bin/env python3
"""Pre-submit gate for loop-cycle-controls. Run before pasting to the platform."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def fail(msg: str) -> None:
    print(f"FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def ok(msg: str) -> None:
    print(f"OK: {msg}")


def main() -> None:
    # Binary checks: ensure NO Windows CRLF and NO UTF-8 BOM
    critical_files = [
        ROOT / "solution" / "solution.patch",
        ROOT / "tests" / "test.patch",
        ROOT / "tests" / "test.sh",
        ROOT / "tests" / "config.json",
        ROOT / "instruction.md",
    ]
    for cf in critical_files:
        raw = cf.read_bytes()
        if b"\r\n" in raw:
            fail(f"{cf.name} contains Windows CRLF (\\r\\n) line endings — must be strictly Unix LF")
        if raw.startswith(b"\xef\xbb\xbf"):
            fail(f"{cf.name} starts with a UTF-8 BOM — must be clean UTF-8")
    ok("all critical files use Unix LF (\\n) and have no BOM")

    test_patch = (ROOT / "tests" / "test.patch").read_text(encoding="utf-8")
    solution_patch = (ROOT / "solution" / "solution.patch").read_text(encoding="utf-8")
    instruction = (ROOT / "instruction.md").read_text(encoding="utf-8")
    config = json.loads((ROOT / "tests" / "config.json").read_text(encoding="utf-8"))

    # Check for mojibake / corrupt non-ascii characters in patches
    non_ascii_sol = [line for line in solution_patch.splitlines() if any(ord(c) > 127 for c in line)]
    if non_ascii_sol:
        fail(f"solution.patch contains non-ascii/mojibake characters: {non_ascii_sol}")
    ok("solution.patch has no non-ascii/mojibake characters")

    paths = re.findall(r"^diff --git a/(.+?) b/", test_patch, re.M)
    bad = [p for p in paths if not p.startswith("tests/") or not p.endswith(".rs")]
    if bad:
        fail(f"test.patch touches non-test paths: {bad}")
    if ".config" in test_patch or "nextest.toml" in test_patch:
        fail("test.patch still mentions .config/nextest.toml")
    ok(f"test.patch paths only tests/*.rs ({len(paths)} files)")

    plus = sum(1 for line in test_patch.splitlines() if line.startswith("+") and not line.startswith("+++"))
    if plus < 596:
        fail(f"test.patch adds {plus} lines (need >= 596)")
    ok(f"test.patch +lines = {plus}")

    sol_plus = sum(
        1 for line in solution_patch.splitlines() if line.startswith("+") and not line.startswith("+++")
    )
    if sol_plus < 459:
        fail(f"solution.patch adds {sol_plus} lines (need >= 459)")
    ok(f"solution.patch +lines = {sol_plus}")

    words = len(re.findall(r"[A-Za-z0-9']+", instruction))
    if words < 100 or words > 300:
        fail(f"instruction word count {words} (need 100-300)")
    ok(f"instruction words = {words}")

    # Check mandatory load-bearing ending
    mandatory_ending = "IMPORTANT: Please work on this in a new branch from main and commit everything when you are done."
    if not instruction.strip().endswith(mandatory_ending):
        fail(f"instruction.md must end with exact generated line: {mandatory_ending}")
    ok("instruction ends with exact mandatory line")

    f2p = config.get("f2p_node_ids", [])
    p2p = config.get("p2p_node_ids", [])
    if len(f2p) < 8:
        fail(f"only {len(f2p)} F2P ids")
    if len(p2p) < 50:
        fail(f"only {len(p2p)} P2P ids")
    if config.get("base_commit") != "3f4470fff4b1cd4509df4bf33af692315190d1e3":
        fail("wrong base_commit in config.json")
    grade = config.get("grade", {})
    if grade.get("format") != "junit":
        fail("config grade format must be junit")
    ok(f"config: {len(f2p)} F2P, {len(p2p)} P2P, junit grade")

    test_sh = (ROOT / "tests" / "test.sh").read_text(encoding="utf-8")
    if "HIDDEN" not in test_sh or "shutil.move" not in test_sh:
        fail("test.sh must hide /tests/config.json during cargo build (anti-cheat)")
    if "setuid" not in test_sh or "SW_BUILD_USER" not in test_sh:
        fail("test.sh must drop privileges (setuid) so root build.rs cannot rewrite tests")
    if "stencilworks-verifier-sealed" not in test_sh and "SEALED" not in test_sh:
        fail("test.sh must seal libtest binaries into a root-owned immutable directory")
    if "kill_builder_leftovers" not in test_sh and "pkill" not in test_sh:
        fail("test.sh must kill detached builder processes before grading")
    if "sha256" not in test_sh.lower() and "file_sha256" not in test_sh:
        fail("test.sh must checksum sealed binaries so mutations are detected")
    if "as_builder=False" not in test_sh:
        fail("test.sh must run --list/tests as root against sealed binaries (not builder)")
    if "cycle_parse_and_behavior" not in test_patch and "cycles.rs" not in test_patch:
        fail("test.patch must include cycle suites")
    if "cycle_tag_runs_inside_a_block_body" not in test_patch:
        fail("test.patch must cover cycle tag inside block bodies")
    if "outline_lists_cycle_nodes_with_value_counts" not in test_patch:
        fail("test.patch must grade outline value-count formatting")
    if "outline_shows_named_cycle_groups" not in test_patch:
        fail("test.patch must grade named outline groups")
    if 'contains("inside a for loop")' not in test_patch:
        fail("test.patch must assert loop.cycle/anonymous errors mention inside a for loop")
    if "cycle_tag_runs_inside_a_block_body" not in f2p:
        fail("config F2P must include cycle_tag_runs_inside_a_block_body")
    if "outline_lists_cycle_nodes_with_value_counts" not in f2p:
        fail("config F2P must include outline_lists_cycle_nodes_with_value_counts")
    if "--test macros" in test_sh:
        fail("test.sh still references --test macros (doesn't exist on pre-macro platform)")
    ok("anti-cheat drop-priv + outline/error/block coverage present")

    lower = instruction.lower()
    awkward = [
        "ought to be introduced such that",
        "they operate using different loops in one rendering",
        "names associated with the count of their occurrence",
        "there will be some differences in the implementation",
        "number of pointers",
    ]
    hits_awk = [p for p in awkward if p in lower]
    if hits_awk:
        fail(f"instruction still has awkward generated phrasing: {hits_awk}")
    if "first identifier" in lower and "when there are no other expressions" in lower:
        fail("instruction still has the reversed first-identifier naming rule")
    if "followed directly by another value is the group name" not in lower and "followed directly by another value is a group name" not in lower:
        fail("instruction must state: leading identifier followed by another value is the group name")
    if "lone identifier" not in lower:
        fail("instruction must state lone identifiers are values")
    if "empty string" not in lower and "no arguments" not in lower:
        fail("instruction must state empty loop.cycle() renders empty")
    if "trailing comma" not in lower:
        fail("instruction must state trailing comma handling")
    if "parse at the template root" not in lower and "may parse at the template root" not in lower:
        fail("instruction must state anonymous tags may parse at root but fail at render")
    if "cycle band/2" not in instruction:
        fail("instruction must state exact outline example cycle band/2")
    if "cycle n" not in lower and "anonymous ones outline as" not in lower:
        fail("instruction must state anonymous outline shape cycle N")
    if "across separate loops" not in lower and "keep going across separate loops" not in lower:
        fail("instruction must state named-cycle lifetime across loops")
    ok("instruction naming, edges, outline, and natural phrasing checks passed")

    macro_keywords = [
        "macro",
        "caller",
        "call_block",
        "import_as",
        "from_import",
        "call_expression",
        "omitted_defaults_use_the_declared",
        "provided_arguments_override_defaults",
    ]
    bad_p2p = [t for t in p2p if any(kw in t for kw in macro_keywords)]
    if bad_p2p:
        fail(f"P2P still has macro-related tests: {bad_p2p}")
    ok("no macro-related P2P tests remain")

    mirror_phrases = [
        "loop cycle error mentions for loop",
        "loop cycle outside a for loop is an error",
        "check rejects a cycle tag with no values",
    ]
    hits = [p for p in mirror_phrases if p in lower]
    if hits:
        fail(f"instruction mirrors test titles: {hits}")
    ok("instruction has no known test-title mirrors")

    print("\nAll pre-submit checks passed. Safe to paste to platform.")


if __name__ == "__main__":
    main()
