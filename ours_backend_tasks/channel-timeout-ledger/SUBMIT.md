# channel-timeout-ledger — Submit bundle

New ours_backend task. Disjoint from reaction-timeline-integrity and reconcile-channel-presence.

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
| base_commit | `519bfd8ee87e3aef50ed6584a364ef081f398d1c` | platform |
| Solution +lines | 747 | ≥ 459 |
| Test +lines | 653 | ≥ 596 |
| F2P / P2P | 40 / 56 | ≥ 20 / ≥ 50 |
| Instruction words | 291 | 100–300 |

```bash
python ours_backend_tasks/channel-timeout-ledger/verify_bundle.py
```
