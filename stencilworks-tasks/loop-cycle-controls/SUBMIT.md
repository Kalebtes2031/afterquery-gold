# loop-cycle-controls — Resubmit (Attempt 4)

Fixes **Attempt 3 automated check**: `test.patch` must not touch `.config/nextest.toml`.

## Blocking error fixed

```
test.patch touches path(s) that don't look like tests: .config/nextest.toml
```

**Rule:** `test.patch` may only add/extend files under `tests/` (e.g. `tests/*.rs`).

**Fix:** Removed nextest config from test.patch. The RUN TESTS block in `test.sh` now writes `.config/nextest.toml` at runtime (allowed — only the marked section is editable).

## Also carried forward from Attempt 2

- JUnit `normalize_junit` keeps integration test names as bare `snake_case` ids
- `config.json` ids regenerated without Windows BOM
- Platform base commit + junit grade format

## Paste these files

| Platform field | File |
|---|---|
| Instruction | `instruction.md` |
| Solution | `solution/solution.patch` |
| Tests | `tests/test.patch` (**2 files only**) |
| Config | `tests/config.json` |
| test.sh | `tests/test.sh` (full file recommended) |

## Pre-submit gate (run first)

```bash
python stencilworks-tasks/loop-cycle-controls/verify_bundle.py
```

Must print `All pre-submit checks passed`. If it fails, **do not paste** to the platform.

## Verified metrics (Attempt 4 — current local bundle)

| Check | Value | Floor |
|---|---|---|
| base_commit | `3f4470fff4b1cd4509df4bf33af692315190d1e3` | platform env v2 |
| test.patch paths | `tests/cycles.rs`, `tests/cycle_parse_and_outline.rs` | tests only |
| Test + lines | 608 | ≥ 596 |
| Test files | **2** (not 3) | ≥ 2 |
| F2P / P2P | 62 / 649 | ≥ 8 / ≥ 50 |
| Instruction words | 203 | 100–300 |
| Instruction mirrors tests | 0 hits | — |

**If platform shows Test files = 3**, you pasted the old Attempt 3 `test.patch` again.

## Do-not-repeat rules

1. **Never** put non-test paths in `test.patch` (no `.config/`, no `src/`)
2. **Never** put nextest/Docker/env setup in test.patch — use **test.sh RUN TESTS**
3. **Never** use local git base in `config.json`
4. **Never** replace the full `test.sh` frame — only RUN TESTS
5. **Never** copy F2P test titles into `instruction.md`
