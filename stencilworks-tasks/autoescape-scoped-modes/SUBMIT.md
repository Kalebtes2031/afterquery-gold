# autoescape-scoped-modes — Submit bundle

Fourth sprint task. Same pipeline lessons as loop-cycle-controls / named-filter-arguments.

## Paste

| Field | File |
|---|---|
| Instruction | `instruction.md` |
| Solution | `solution/solution.patch` |
| Tests | `tests/test.patch` |
| Config | `tests/config.json` |
| test.sh | `tests/test.sh` |

## Verified metrics

| Check | Value | Floor |
|---|---|---|
| base_commit | `3f4470fff4b1cd4509df4bf33af692315190d1e3` | platform |
| Solution +lines | 474 | ≥ 459 |
| Test +lines | 998 | ≥ 596 |
| F2P / P2P | 89 / 618 | ≥ 20 / ≥ 50 |
| Instruction words | ~210 | 100–300 |

```bash
python stencilworks-tasks/autoescape-scoped-modes/verify_bundle.py
```

## Local verify (proxy base `52713c9`)

```bash
cd newrepofromafterquery
git reset --hard 52713c9 && git clean -fd
git apply --whitespace=nowarn ../stencilworks-tasks/autoescape-scoped-modes/tests/test.patch
git apply --whitespace=nowarn ../stencilworks-tasks/autoescape-scoped-modes/solution/solution.patch
```
