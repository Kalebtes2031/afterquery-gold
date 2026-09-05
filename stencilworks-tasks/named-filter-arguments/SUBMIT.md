# named-filter-arguments — Submit bundle

Third stencilworks sprint task. Lessons from `loop-cycle-controls` applied.

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
| test.patch paths | `named_filter_args.rs`, `named_filter_parse_and_cli.rs` | tests only |
| Solution lines | 730 | ≥ 459 |
| Solution files | 17 | ≥ 4 |
| Test + lines | 1104 | ≥ 596 |
| Test files | 2 | ≥ 2 |
| F2P / P2P | 69 / 617 | ≥ 8 / ≥ 50 |
| Instruction words | 221 | 100–300 |

## Before paste

```bash
python stencilworks-tasks/named-filter-arguments/verify_bundle.py
```

## Do-not-repeat

1. Never put non-test paths in `test.patch`
2. Write nextest config in **test.sh RUN TESTS** only
3. Use platform **base_commit**, not local proxy hash
4. No `--test macros` / no macros.rs P2P ids (pre-macro platform)
5. `solution.patch` must not carry post-macro `MacroParam` import context
6. Instruction = behavioral prose, not F2P function names
7. Grade format = **junit** + `base.xml` / `new.xml`
