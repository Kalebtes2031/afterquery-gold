# block-super-stack — Submit bundle

Lessons from task 1 (`loop-cycle-controls`) applied throughout.

## Paste these files

| Platform field | File |
|---|---|
| Instruction | `instruction.md` |
| Solution | `solution/solution.patch` |
| Tests | `tests/test.patch` (**2 files only**) |
| Config | `tests/config.json` |
| test.sh | `tests/test.sh` (full file recommended) |

## Verified metrics

| Check | Value | Floor |
|---|---|---|
| base_commit | `3f4470fff4b1cd4509df4bf33af692315190d1e3` | platform env |
| test.patch paths | `tests/super_stack.rs`, `tests/super_parse_and_outline.rs` | tests only |
| Solution lines | 461+ | ≥ 459 |
| Solution files | 7 | ≥ 4 |
| Test + lines | 650+ | ≥ 596 |
| Test files | 2 | ≥ 2 |
| F2P / P2P | 50 / 661 | ≥ 8 / ≥ 50 |
| Instruction words | ~230 | 100–300 |

## Do-not-repeat (from task 1)

1. **Never** put non-test paths in `test.patch` (no `.config/`, no `src/`)
2. Write nextest config in **test.sh RUN TESTS** only
3. Use platform **base_commit**, not local proxy hash
4. Keep **test.sh** canonical frame; edit RUN TESTS only
5. JUnit ids: bare names for integration tests; `module::path::test` for lib
6. Instruction = behavioral prose, not F2P test function names
7. `config.json` grade format = **junit** + `base.xml` / `new.xml`

## Local verify (proxy base `52713c9`)

```bash
git reset --hard 52713c9 && git clean -fd
git apply --whitespace=nowarn tests/test.patch        # F2P fail expected
git apply --whitespace=nowarn solution/solution.patch # all pass expected
```
