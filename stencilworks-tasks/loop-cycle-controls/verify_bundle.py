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
    if "cat > .config/nextest.toml" not in test_sh:
        fail("test.sh must create .config/nextest.toml in RUN TESTS")
    if "cycles" not in test_sh or "cycle_parse_and_outline" not in test_sh:
        fail("test.sh must run cycles + cycle_parse_and_outline for F2P")
    if "--test macros" in test_sh:
        fail("test.sh still references --test macros (doesn't exist on pre-macro platform)")
    ok("test.sh has nextest setup + cycle suites, no macros ref")

    # Check no macro-related P2P tests survived
    macro_keywords = ["macro", "caller", "call_block", "import_as", "from_import",
                       "call_expression", "omitted_defaults_use_the_declared",
                       "provided_arguments_override_defaults"]
    bad_p2p = [t for t in p2p if any(kw in t for kw in macro_keywords)]
    if bad_p2p:
        fail(f"P2P still has macro-related tests: {bad_p2p}")
    ok("no macro-related P2P tests remain")

    mirror_phrases = [
        "loop cycle error mentions for loop",
        "loop cycle outside a for loop is an error",
        "check rejects a cycle tag with no values",
    ]
    lower = instruction.lower()
    hits = [p for p in mirror_phrases if p in lower]
    if hits:
        fail(f"instruction mirrors test titles: {hits}")
    ok("instruction has no known test-title mirrors")

    print("\nAll pre-submit checks passed. Safe to paste to platform.")


if __name__ == "__main__":
    main()
