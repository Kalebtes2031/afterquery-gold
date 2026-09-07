# -*- coding: utf-8 -*-
"""Extract describe > it ids from mega-tracker Jest suite for p2p_node_ids."""
from __future__ import annotations

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent / "mega-tracker"
OUT = Path(__file__).resolve().parent / "_shared_p2p_ids.json"

DESCRIBE_RE = re.compile(r"""^\s*describe\(\s*["']([^"']+)["']""")
IT_RE = re.compile(r"""^\s*it\(\s*["']([^"']+)["']""")


def extract() -> list[str]:
    ids: list[str] = []
    for path in sorted(REPO.joinpath("src").rglob("*.test.ts")):
        stack: list[tuple[int, str]] = []
        for line in path.read_text(encoding="utf-8").splitlines():
            m = DESCRIBE_RE.match(line)
            if m:
                indent = len(line) - len(line.lstrip(" "))
                while stack and stack[-1][0] >= indent:
                    stack.pop()
                stack.append((indent, m.group(1)))
                continue
            m = IT_RE.match(line)
            if m and stack:
                ids.append(" > ".join([s[1] for s in stack] + [m.group(1)]))
    # de-dupe preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for i in ids:
        if i not in seen:
            seen.add(i)
            unique.append(i)
    return unique


def main() -> None:
    ids = extract()
    OUT.write_text(json.dumps(ids, indent=2) + "\n", encoding="utf-8")
    print(f"extracted {len(ids)} ids -> {OUT}")
    for i in ids[:20]:
        print(i)


if __name__ == "__main__":
    main()
