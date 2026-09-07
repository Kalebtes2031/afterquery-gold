# session-idle-leases — Submit bundle

New ours_backend task. Disjoint from existing timeout/hold/slow-mode/presence/reaction tasks.

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
| Solution +lines | 818 | ≥ 459 |
| Test +lines | 705 | ≥ 596 |
| F2P / P2P | 40 / 56 | ≥ 20 / ≥ 50 |
| Instruction words | 226 | 100–300 |
| Category | `bug` | enhancement or bug |

```bash
python ours_backend_tasks/session-idle-leases/verify_bundle.py
```
