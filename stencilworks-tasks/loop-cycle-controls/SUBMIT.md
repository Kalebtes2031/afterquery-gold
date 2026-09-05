# loop-cycle-controls — Resubmit (Attempt 5)

Fixes **Attempt 4 Reference Verification**: `solution.patch` failing to apply in 0s due to CRLF line endings, plus instruction contract alignment.

## Root causes fixed

```
Reference verification failed: reference-solution runs scored [0, 0, 0] in 0s
```

1. **Windows CRLF line endings (`\r\n`) in patch and script files**:
   - On Linux containers, `git apply` against LF base files fails when patch context lines have `\r\n`.
   - All files (`solution.patch`, `test.patch`, `test.sh`, `config.json`, `instruction.md`) are now strictly normalized to Unix LF (`\n`).
2. **Mojibake in `solution.patch` comments**:
   - Replaced corrupted character sequences on `src/syntax/ast.rs` with clean ASCII (`...` and `-`).
3. **Mandatory instruction ending**:
   - Updated line 9 of `instruction.md` to the exact platform canonical line:
     `IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.`
4. **Pre-submit gate enhanced**:
   - `verify_bundle.py` now asserts 0 CRLF occurrences, 0 UTF-8 BOMs, exact instruction ending, and clean patch encoding.

## Paste these files to platform

| Platform field | File | Notes |
|---|---|---|
| Instruction | `instruction.md` | 242 words, ends with exact mandatory line, Unix LF |
| Solution | `solution/solution.patch` | 563 +lines, 6 files, clean ASCII comments, Unix LF |
| Tests | `tests/test.patch` | 608 +lines, 2 files only (`tests/*.rs`), Unix LF |
| Config | `tests/config.json` | 62 F2P, 617 P2P (30 macro tests excluded), junit grade, Unix LF |
| test.sh | `tests/test.sh` | Canonical frame intact, RUN TESTS creates nextest profile, Unix LF |

## Pre-submit gate (run first)

```bash
python stencilworks-tasks/loop-cycle-controls/verify_bundle.py
```

Must print `All pre-submit checks passed. Safe to paste to platform.`

## Verified metrics (Attempt 5)

| Check | Value | Floor / Rule |
|---|---|---|
| base_commit | `3f4470fff4b1cd4509df4bf33af692315190d1e3` | platform env v2 |
| Line endings | strictly Unix LF (`\n`) across all files | no `\r\n` |
| UTF-8 BOM | none | clean UTF-8 |
| test.patch paths | `tests/cycles.rs`, `tests/cycle_parse_and_outline.rs` | tests only |
| Test + lines | 608 | ≥ 596 |
| Test files | 2 | ≥ 2 |
| Solution + lines | 563 across 6 files | ≥ 459 lines, ≥ 4 files |
| F2P / P2P | 62 / 617 | ≥ 8 / ≥ 50 |
| Instruction words | 242 | 100–300 |
| Instruction ending | exact platform generated text | mandatory |
| Instruction mirrors tests | 0 hits | prose only |
