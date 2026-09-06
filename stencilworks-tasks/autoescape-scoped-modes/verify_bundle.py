#!/usr/bin/env python3
"""Pre-submit gate for autoescape-scoped-modes."""

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
    critical = [
        ROOT / "solution" / "solution.patch",
        ROOT / "tests" / "test.patch",
        ROOT / "tests" / "test.sh",
        ROOT / "tests" / "config.json",
        ROOT / "instruction.md",
    ]
    for cf in critical:
        raw = cf.read_bytes()
        if b"\r\n" in raw:
            fail(f"{cf.name} contains Windows CRLF")
        if raw.startswith(b"\xef\xbb\xbf"):
            fail(f"{cf.name} has UTF-8 BOM")

    test_patch = (ROOT / "tests" / "test.patch").read_text(encoding="utf-8")
    solution_patch = (ROOT / "solution" / "solution.patch").read_text(encoding="utf-8")
    instruction = (ROOT / "instruction.md").read_text(encoding="utf-8")
    config = json.loads((ROOT / "tests" / "config.json").read_text())

    paths = re.findall(r"^diff --git a/(.+?) b/", test_patch, re.M)
    bad = [p for p in paths if not p.startswith("tests/") or not p.endswith(".rs")]
    if bad:
        fail(f"test.patch touches non-test paths: {bad}")
    if ".config" in test_patch:
        fail("test.patch must not mention .config")

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
        fail(f"instruction word count {words}")
    ok(f"instruction words = {words}")

    mandatory = "IMPORTANT: Please work on this in a new branch from main and commit everything when you are done."
    if not instruction.strip().endswith(mandatory):
        fail("instruction missing mandatory ending")

    f2p = config.get("f2p_node_ids", [])
    p2p = config.get("p2p_node_ids", [])
    if len(f2p) < 20:
        fail(f"only {len(f2p)} F2P ids (need >= 20)")
    if len(p2p) < 50:
        fail(f"only {len(p2p)} P2P ids")
    if config.get("base_commit") != "3f4470fff4b1cd4509df4bf33af692315190d1e3":
        fail("wrong base_commit")

    test_sh = (ROOT / "tests" / "test.sh").read_text(encoding="utf-8")
    if "cargo test --lib" not in test_sh:
        fail("test.sh must use cargo test --lib")
    if "autoescape_render" not in test_sh or "autoescape_parse_and_cli" not in test_sh:
        fail("test.sh must run autoescape F2P suites")
    if "--test macros" in test_sh:
        fail("test.sh must not reference --test macros")
    ok("test.sh cargo-test layout ok")

    macro_kw = ["macro", "caller", "call_block", "import_as", "from_import", "call_expression"]
    bad_p2p = [t for t in p2p if any(k in t for k in macro_kw)]
    if bad_p2p:
        fail(f"P2P has macro tests: {bad_p2p[:5]}")

    lower = instruction.lower()
    for phrase in ["endautoescape", "escapemode", "xml", "url", "js", "safe"]:
        if phrase not in lower and phrase.upper() not in instruction:
            if phrase in ("xml", "url", "js") and f"`{phrase}`" not in lower:
                fail(f"instruction must mention {phrase} mode")

    print("\nAll pre-submit checks passed. Safe to paste to platform.")


if __name__ == "__main__":
    main()
