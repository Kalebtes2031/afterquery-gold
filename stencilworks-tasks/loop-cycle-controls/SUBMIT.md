# loop-cycle-controls — Resubmit (Attempt 8)

Reference verification already green (solution unchanged). Quality failed on anti-cheat (mutable TARGET binaries) and undocumented outline encoding — both fixed.

## Paste

| Field | File |
|---|---|
| Instruction | `instruction.md` (283 words) |
| Solution | `solution/solution.patch` |
| Tests | `tests/test.patch` |
| Config | `tests/config.json` (65 F2P / 618 P2P) |
| test.sh | `tests/test.sh` (seal + kill + hash) |

```bash
python stencilworks-tasks/loop-cycle-controls/verify_bundle.py
```
