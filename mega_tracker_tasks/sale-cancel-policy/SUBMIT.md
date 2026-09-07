# sale-cancel-policy — Submit bundle

New mega-tracker task (Jest, pure domain modules).

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
| base_commit | `0b40f7e7515a05dbcadff4942d353af4ef02954f` | platform |
| Solution +lines | 486 | ≥ 459 |
| Solution files | 5 | ≥ 4 |
| Test +lines | 620 | ≥ 596 |
| Test files | 4 | ≥ 2 |
| F2P / P2P | 52 / 57 | ≥ 20 / ≥ 50 |
| Instruction words | 233 | 100–300 |
| Category | `feature` | feature/bug/enhancement |

```bash
python mega_tracker_tasks/sale-cancel-policy/verify_bundle.py
```

Note: docker image `us-docker.pkg.dev/afterquery-compute/compute-images/gold-repo-mega-tracker:v1` is a placeholder until the env is published.
