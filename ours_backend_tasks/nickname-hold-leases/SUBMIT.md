# nickname-hold-leases — Submit bundle

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
| Solution +lines | 660 | ≥ 459 |
| Test +lines | 626 | ≥ 596 |
| F2P / P2P | 42 / 56 | ≥ 20 / ≥ 50 |
| Instruction words | 276 | 100–300 |

```bash
python ours_backend_tasks/nickname-hold-leases/verify_bundle.py
```
