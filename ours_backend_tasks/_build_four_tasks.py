# -*- coding: utf-8 -*-
"""Emit four AfterQuery Gold task bundles from _staging sources."""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STAGING = ROOT / "_staging"
SHARED_P2P = STAGING / "_shared_p2p"
BASE = "519bfd8ee87e3aef50ed6584a364ef081f398d1c"

P2P_FILES = [
    "p2p_constants_compat.test.ts",
    "p2p_input_validation_compat.test.ts",
    "p2p_env_utils_compat.test.ts",
    "p2p_gif_compat.test.ts",
]

P2P_IDS = json.loads((ROOT / "channel-timeout-ledger" / "tests" / "config.json").read_text(encoding="utf-8"))[
    "p2p_node_ids"
]

TASKS = [
    {
        "id": "channel-mute-ledger",
        "title": "Channel Mute Ledger",
        "description": "Apply permanent or timed channel mutes, unmute, and sweep expired timed rows without using timeouts or slow-mode.",
        "category": "enhancement",
        "config_name": "gold-mute-ledger-vitest.config.ts",
        "sol": [
            "packages/backend/src/services/mute_types.ts",
            "packages/backend/src/services/mute_utils.ts",
            "packages/backend/src/services/mute_store.ts",
            "packages/backend/src/services/mute_policy.ts",
            "packages/backend/src/services/mute_service.ts",
            "packages/backend/src/services/mutes.ts",
        ],
        "f2p": [
            "packages/backend/src/gold_tests/mute_apply_behavior.test.ts",
            "packages/backend/src/gold_tests/mute_lift_and_lookup.test.ts",
            "packages/backend/src/gold_tests/mute_list_and_sweep.test.ts",
            "packages/backend/src/gold_tests/mute_edge_behavior.test.ts",
        ],
    },
    {
        "id": "channel-pin-board",
        "title": "Channel Pin Board",
        "description": "Pin up to ten messages per channel with refresh, reorder, and versioned compare-and-set board updates.",
        "category": "enhancement",
        "config_name": "gold-pin-board-vitest.config.ts",
        "sol": [
            "packages/backend/src/services/pin_types.ts",
            "packages/backend/src/services/pin_utils.ts",
            "packages/backend/src/services/pin_store.ts",
            "packages/backend/src/services/pin_policy.ts",
            "packages/backend/src/services/pin_service.ts",
            "packages/backend/src/services/pins.ts",
        ],
        "f2p": [
            "packages/backend/src/gold_tests/pin_apply_behavior.test.ts",
            "packages/backend/src/gold_tests/pin_unpin_and_lookup.test.ts",
            "packages/backend/src/gold_tests/pin_reorder_and_clear.test.ts",
            "packages/backend/src/gold_tests/pin_edge_behavior.test.ts",
        ],
    },
    {
        "id": "channel-join-passes",
        "title": "Channel Join Passes",
        "description": "Issue one-time channel admit passes, consume them once, revoke by issuer, and sweep expired unused passes.",
        "category": "enhancement",
        "config_name": "gold-join-passes-vitest.config.ts",
        "sol": [
            "packages/backend/src/services/join_pass_types.ts",
            "packages/backend/src/services/join_pass_utils.ts",
            "packages/backend/src/services/join_pass_store.ts",
            "packages/backend/src/services/join_pass_policy.ts",
            "packages/backend/src/services/join_pass_service.ts",
            "packages/backend/src/services/join_passes.ts",
        ],
        "f2p": [
            "packages/backend/src/gold_tests/join_pass_issue.test.ts",
            "packages/backend/src/gold_tests/join_pass_consume_revoke.test.ts",
            "packages/backend/src/gold_tests/join_pass_list_and_sweep.test.ts",
            "packages/backend/src/gold_tests/join_pass_edge_behavior.test.ts",
        ],
    },
    {
        "id": "session-idle-leases",
        "title": "Session Idle Leases",
        "description": "Fix drifted session connection state by tracking active, idle, and disconnected leases with heartbeat sweeps.",
        "category": "bug",
        "config_name": "gold-session-leases-vitest.config.ts",
        "sol": [
            "packages/backend/src/services/session_lease_types.ts",
            "packages/backend/src/services/session_lease_utils.ts",
            "packages/backend/src/services/session_lease_store.ts",
            "packages/backend/src/services/session_lease_policy.ts",
            "packages/backend/src/services/session_lease_service.ts",
            "packages/backend/src/services/session_leases.ts",
        ],
        "f2p": [
            "packages/backend/src/gold_tests/session_lease_touch.test.ts",
            "packages/backend/src/gold_tests/session_lease_mark_lookup.test.ts",
            "packages/backend/src/gold_tests/session_lease_list_sweep.test.ts",
            "packages/backend/src/gold_tests/session_lease_edge_behavior.test.ts",
        ],
    },
]


def unix(text: str) -> bytes:
    return text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


def read_unix(path: Path) -> str:
    return path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")


def git_diff(staging_root: Path, paths: list[str]) -> str:
    chunks: list[str] = []
    for rel in paths:
        content = read_unix(staging_root / rel)
        if not content.endswith("\n"):
            content += "\n"
        lines = content.splitlines()
        header = [
            f"diff --git a/{rel} b/{rel}",
            "new file mode 100644",
            "index 0000000..1111111",
            "--- /dev/null",
            f"+++ b/{rel}",
            f"@@ -0,0 +1,{len(lines)} @@",
        ]
        body = [f"+{line}" for line in lines]
        chunks.append("\n".join(header + body) + "\n")
    return "".join(chunks)


def added(patch: str) -> int:
    return sum(1 for line in patch.splitlines() if line.startswith("+") and not line.startswith("+++"))


def extract_ids(staging_root: Path, paths: list[str]) -> list[str]:
    ids: list[str] = []
    for rel in paths:
        text = read_unix(staging_root / rel)
        stack: list[str] = []
        for line in text.splitlines():
            m = re.match(r'\s*describe\("([^"]+)"', line)
            if m:
                stack = [m.group(1)]
                continue
            m = re.match(r'\s*it\("([^"]+)"', line)
            if m and stack:
                ids.append(f"{stack[-1]} > {m.group(1)}")
    return ids


def word_count(path: Path) -> int:
    body = read_unix(path).replace(
        "IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.",
        "",
    )
    return len(body.split())


def make_test_sh(config_name: str, f2p_rel: list[str]) -> str:
    template = read_unix(ROOT / "channel-timeout-ledger" / "tests" / "test.sh")
    template = template.replace("gold-timeout-ledger-vitest.config.ts", config_name)
    p2p_block = " \\\n  ".join(f"src/gold_tests/{name}" for name in P2P_FILES)
    f2p_block = " \\\n  ".join(path.split("packages/backend/")[1] for path in f2p_rel)
    template = re.sub(
        r"run_selection /logs/verifier/existing_vitest\.json \\\n(?:  .+\n)+P2P_EXIT=\$\?",
        "run_selection /logs/verifier/existing_vitest.json \\\n  " + p2p_block + "\nP2P_EXIT=$?",
        template,
    )
    template = re.sub(
        r"run_selection /logs/verifier/feature_vitest\.json \\\n(?:  .+\n)+F2P_EXIT=\$\?",
        "run_selection /logs/verifier/feature_vitest.json \\\n  " + f2p_block + "\nF2P_EXIT=$?",
        template,
    )
    return template


def make_task_toml(task: dict) -> str:
    return f"""schema_version = "1.1"
artifacts = ["/logs/artifacts/model.patch"]

[task]
name = "ours/{task['id']}"

[metadata]
task_id = "{task['id']}"
display_title = "{task['title']}"
display_description = "{task['description']}"
category = "{task['category']}"
language = "typescript"
repository_url = "https://github.com/dawit2119/ours_backend"
base_commit_hash = "{BASE}"

[agent]
timeout_sec = 5400

[verifier]
environment_mode = "separate"
timeout_sec = 1800

[verifier.environment]
build_timeout_sec = 1800
cpus = 2
memory_mb = 8192
storage_mb = 20480
allow_internet = false

[environment]
build_timeout_sec = 1800
docker_image = "us-docker.pkg.dev/afterquery-compute/compute-images/gold-repo-ours-backend-jnkmji:v1"
os = "linux"
cpus = 2
memory_mb = 8192
storage_mb = 20480
gpus = 0
allow_internet = false
"""


def make_verify() -> str:
    return read_unix(ROOT / "channel-timeout-ledger" / "verify_bundle.py")


def ensure_p2p_in_staging(staging_root: Path) -> None:
    dest = staging_root / "packages" / "backend" / "src" / "gold_tests"
    dest.mkdir(parents=True, exist_ok=True)
    for name in P2P_FILES:
        shutil.copy2(SHARED_P2P / name, dest / name)


def build_one(task: dict) -> dict:
    task_id = task["id"]
    staging_root = STAGING / task_id
    ensure_p2p_in_staging(staging_root)

    dest = ROOT / task_id
    (dest / "solution").mkdir(parents=True, exist_ok=True)
    (dest / "tests").mkdir(parents=True, exist_ok=True)

    instruction_src = staging_root / "instruction.md"
    instruction_text = read_unix(instruction_src)
    (dest / "instruction.md").write_bytes(unix(instruction_text))

    sol_patch = git_diff(staging_root, task["sol"])
    p2p_paths = [f"packages/backend/src/gold_tests/{name}" for name in P2P_FILES]
    test_patch = git_diff(staging_root, task["f2p"] + p2p_paths)
    (dest / "solution" / "solution.patch").write_bytes(unix(sol_patch))
    (dest / "tests" / "test.patch").write_bytes(unix(test_patch))

    f2p_ids = extract_ids(staging_root, task["f2p"])
    config = {
        "base_commit": BASE,
        "f2p_node_ids": f2p_ids,
        "p2p_node_ids": P2P_IDS,
        "grade": {
            "format": "ctrf",
            "node_id": "name",
            "tool_label": "vitest-json-ctrf",
            "reports": ["/logs/verifier/base_ctrf.json", "/logs/verifier/new_ctrf.json"],
        },
    }
    (dest / "tests" / "config.json").write_bytes(unix(json.dumps(config, indent=2) + "\n"))
    (dest / "tests" / "test.sh").write_bytes(unix(make_test_sh(task["config_name"], task["f2p"])))
    (dest / "task.toml").write_bytes(unix(make_task_toml(task)))
    (dest / "verify_bundle.py").write_bytes(unix(make_verify()))

    metrics = {
        "id": task_id,
        "category": task["category"],
        "sol": added(sol_patch),
        "test": added(test_patch),
        "f2p": len(f2p_ids),
        "words": word_count(dest / "instruction.md"),
    }

    submit = f"""# {task_id} — Submit bundle

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
| base_commit | `{BASE}` | platform |
| Solution +lines | {metrics['sol']} | ≥ 459 |
| Test +lines | {metrics['test']} | ≥ 596 |
| F2P / P2P | {metrics['f2p']} / {len(P2P_IDS)} | ≥ 20 / ≥ 50 |
| Instruction words | {metrics['words']} | 100–300 |
| Category | `{task['category']}` | enhancement or bug |

```bash
python ours_backend_tasks/{task_id}/verify_bundle.py
```
"""
    (dest / "SUBMIT.md").write_bytes(unix(submit))
    (dest / "error.txt").write_bytes(unix("READY — bundle not yet submitted\n"))
    return metrics


def main() -> None:
    if not SHARED_P2P.exists():
        raise SystemExit(f"missing shared p2p tests at {SHARED_P2P}")
    rows = [build_one(task) for task in TASKS]
    print("task_id\tcategory\tsol\ttest\tf2p\twords")
    for row in rows:
        print(f"{row['id']}\t{row['category']}\t{row['sol']}\t{row['test']}\t{row['f2p']}\t{row['words']}")


if __name__ == "__main__":
    main()
