# loop-cycle-controls — Task Bundle Guide

Complete AfterQuery Gold task layout. When you **create the task on the platform**, most frozen files are **seeded automatically** — use those byte-identical copies at submit time. The files here are **local reference copies** for prep and tracking.

## Full bundle layout

```
loop-cycle-controls/
├── task.toml                 ← fill display_* ; update docker_image after env publish
├── instruction.md            ← YOU EDIT
├── pre_artifacts.sh          ← frozen (platform-generated; local copy for reference)
├── environment/
│   └── Dockerfile            ← publish via platform environment settings
├── solution/
│   ├── solution.patch        ← YOU EDIT
│   └── solve.sh              ← frozen
├── tests/
│   ├── config.json           ← YOU EDIT
│   ├── test.patch            ← YOU EDIT
│   ├── test.sh               ← edit RUN TESTS section only
│   ├── grader.py             ← frozen (identical across all tasks)
│   └── Dockerfile            ← frozen verifier image recipe
├── progress.md               ← local tracking only
└── error.txt                 ← local tracking only
```

## What you edit vs what is frozen

| File | Editable? |
|---|---|
| `instruction.md` | Yes |
| `solution/solution.patch` | Yes |
| `tests/test.patch` | Yes |
| `tests/config.json` | Yes |
| `tests/test.sh` | **RUN TESTS section only** (between markers) |
| `task.toml` | **`display_title` and `display_description` only** |
| `task.toml` → `docker_image`, `repository_url`, `base_commit_hash` | Set when environment/repo is published |
| `pre_artifacts.sh`, `solve.sh`, `grader.py`, Dockerfiles, test.sh frame | **Frozen** — do not modify at submit |

## Before first submit

1. **Publish environment** for `newrepofromafterquery` using `environment/Dockerfile` (or platform UI).
2. Copy published **`docker_image`** tag into `task.toml` → `[environment].docker_image` and `tests/Dockerfile` `FROM` line.
3. Copy **`repository_url`** into `task.toml` after the repo is connected.
4. Confirm **`base_commit_hash`** = `52713c922b68e74da1e9ed6c3ba44a6724a3e707` matches the published environment.
5. **Create task** on platform → replace local frozen files with platform-seeded versions if they differ.
6. Paste your five editable artifacts + fill `display_title` / `display_description`.

## Placeholders in local `task.toml`

- `REPLACE_WITH_PUBLISHED_STENCILWORKS_REPO_URL` — your connected repo URL
- `REPLACE_WITH_PUBLISHED_ENV_IMAGE_TAG` — e.g. `us-docker.pkg.dev/.../gold-repo-stencilworks-xxx:v1`

## Note on `tests/test.sh`

The RUN TESTS section uses `cargo test` with the trusted CTRF reporter under `/opt/ctrf`. When the platform seeds a Rust task, it may provide a **Rust-specific reporter frame** — merge your suite commands into that seeded middle section rather than uploading this whole file unchanged.
