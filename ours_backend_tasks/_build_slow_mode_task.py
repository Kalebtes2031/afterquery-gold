from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(r"C:\Users\A Y U B COMPUTERS\afterquery-gold")
REPO = ROOT / "_ours_zip" / "ours"
TASKS = ROOT / "ours_backend_tasks"
BASE = "519bfd8ee87e3aef50ed6584a364ef081f398d1c"

SOL = [
    "packages/backend/src/services/slow_mode_types.ts",
    "packages/backend/src/services/slow_mode_utils.ts",
    "packages/backend/src/services/slow_mode_store.ts",
    "packages/backend/src/services/slow_mode_policy.ts",
    "packages/backend/src/services/slow_mode_service.ts",
    "packages/backend/src/services/slow_mode.ts",
]
F2P = [
    "packages/backend/src/gold_tests/slow_mode_config.test.ts",
    "packages/backend/src/gold_tests/slow_mode_speak.test.ts",
    "packages/backend/src/gold_tests/slow_mode_cooldowns.test.ts",
    "packages/backend/src/gold_tests/slow_mode_edges.test.ts",
]
P2P = [
    "packages/backend/src/gold_tests/p2p_constants_compat.test.ts",
    "packages/backend/src/gold_tests/p2p_input_validation_compat.test.ts",
    "packages/backend/src/gold_tests/p2p_env_utils_compat.test.ts",
    "packages/backend/src/gold_tests/p2p_gif_compat.test.ts",
]

P2P_IDS = json.loads((TASKS / "channel-timeout-ledger" / "tests" / "config.json").read_text(encoding="utf-8"))[
    "p2p_node_ids"
]


def extract_ids(paths: list[str]) -> list[str]:
    ids: list[str] = []
    for rel in paths:
        text = (REPO / rel).read_text(encoding="utf-8")
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


def unix(text: str) -> bytes:
    return text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


def git_diff(paths: list[str]) -> str:
    chunks: list[str] = []
    for rel in paths:
        content = (REPO / rel).read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")
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


def word_count(path: Path) -> int:
    body = path.read_text(encoding="utf-8").replace(
        "IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.",
        "",
    )
    return len(body.split())


instruction = """Busy channels need a speak cooldown, not another moderator block list. After someone posts, they should wait before posting again in that channel.

Export `ChannelSlowModeService`, `createChannelSlowModeService`, `MemoryChannelSlowModeStore`, `setChannelSlowMode`, `getChannelSlowMode`, `clearChannelSlowMode`, `canSpeak`, `recordChannelSpeak`, `trySpeak`, `getCooldown`, `listActiveCooldowns`, and `sweepExpiredCooldowns` from `packages/backend/src/services/slow_mode.ts`. Optional store, memory by default. Store needs config get/put/delete, cooldown get/put/delete/list, and `compareAndSetCooldown`. Helpers take the same options plus an optional store last.

Channel ids are trimmed and keep case (colons ok). Empty channel is invalid. Nicknames use the shared trim / NFC / 3–24 rules and are stored lowercase.

`setChannelSlowMode(channelId, options?)` turns the channel on. `intervalSeconds` defaults to 20, rejects non-finite with `invalid_interval`, truncates, clamps 1–600. Success: `{ok:true, channelId, intervalSeconds, enabled:true}`. `getChannelSlowMode` returns `{channelId, intervalSeconds, enabled:true}` or `null`. `clearChannelSlowMode` removes the config and every cooldown for that channel; missing config is `not_enabled`.

With slow mode off, `canSpeak` always allows. With it on, the first speak is allowed; after `recordChannelSpeak`, later checks are denied until `availableAt`. Denial: `{ok:true, allowed:false, channelId, nickname, availableAt, remainingSeconds}`. Recording while still cooling down fails with `cooldown_active`. Recording with slow mode off fails with `not_enabled`. `trySpeak` is canSpeak then record on allow; if blocked it returns the denial and does not record.

`listActiveCooldowns` is live windows only, sorted by nickname. `getCooldown` returns the live view or `null`. `sweepExpiredCooldowns` deletes expired rows and returns `{removed, nicknames}` sorted unique. `remainingSeconds` is floored and never negative. Cooldowns are per channel and per nickname. `now` is an injectable epoch-ms clock.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
"""

timeout_sh = (TASKS / "channel-timeout-ledger" / "tests" / "test.sh").read_text(encoding="utf-8")
timeout_sh = timeout_sh.replace("gold-timeout-ledger-vitest.config.ts", "gold-slow-mode-vitest.config.ts")
f2p_block = " \\\n  ".join(p.split("packages/backend/")[1] for p in F2P)
p2p_block = " \\\n  ".join(p.split("packages/backend/")[1] for p in P2P)
timeout_sh = re.sub(
    r"run_selection /logs/verifier/existing_vitest\.json \\\n(?:  .+\n)+P2P_EXIT=\$\?",
    "run_selection /logs/verifier/existing_vitest.json \\\n  " + p2p_block + "\nP2P_EXIT=$?",
    timeout_sh,
)
timeout_sh = re.sub(
    r"run_selection /logs/verifier/feature_vitest\.json \\\n(?:  .+\n)+F2P_EXIT=\$\?",
    "run_selection /logs/verifier/feature_vitest.json \\\n  " + f2p_block + "\nF2P_EXIT=$?",
    timeout_sh,
)

f2p_ids = extract_ids(F2P)
dest = TASKS / "channel-slow-mode"
(dest / "solution").mkdir(parents=True, exist_ok=True)
(dest / "tests").mkdir(parents=True, exist_ok=True)

sol_patch = git_diff(SOL)
test_patch = git_diff(F2P + P2P)
(dest / "instruction.md").write_bytes(unix(instruction))
(dest / "solution" / "solution.patch").write_bytes(unix(sol_patch))
(dest / "tests" / "test.patch").write_bytes(unix(test_patch))
(dest / "tests" / "test.sh").write_bytes(unix(timeout_sh))
(dest / "tests" / "config.json").write_bytes(
    unix(
        json.dumps(
            {
                "base_commit": BASE,
                "f2p_node_ids": f2p_ids,
                "p2p_node_ids": P2P_IDS,
                "grade": {
                    "format": "ctrf",
                    "node_id": "name",
                    "tool_label": "vitest-json-ctrf",
                    "reports": ["/logs/verifier/base_ctrf.json", "/logs/verifier/new_ctrf.json"],
                },
            },
            indent=2,
        )
        + "\n"
    )
)

task_toml = (TASKS / "channel-timeout-ledger" / "task.toml").read_text(encoding="utf-8")
task_toml = task_toml.replace("channel-timeout-ledger", "channel-slow-mode")
task_toml = task_toml.replace("Channel Timeout Ledger", "Channel Slow Mode")
task_toml = task_toml.replace(
    "Apply, extend, lift, and sweep channel timeouts without touching presence or reaction indexes.",
    "Add per-channel speak cooldowns so users wait between posts without using mute or timeout ledgers.",
)
(dest / "task.toml").write_bytes(unix(task_toml))
(dest / "verify_bundle.py").write_bytes(unix((TASKS / "channel-timeout-ledger" / "verify_bundle.py").read_text(encoding="utf-8")))
(dest / "SUBMIT.md").write_bytes(
    unix(
        f"""# channel-slow-mode — Submit bundle

Different from timeouts/mutes: this is post-speak cooldown gating.

## Metrics
- Solution +lines: {added(sol_patch)}
- Test +lines: {added(test_patch)}
- F2P / P2P: {len(f2p_ids)} / {len(P2P_IDS)}
- Instruction words: {word_count(dest / 'instruction.md')}

```bash
python ours_backend_tasks/channel-slow-mode/verify_bundle.py
```
"""
    )
)
(dest / "error.txt").write_bytes(unix("READY — bundle not yet submitted\n"))
print("sol", added(sol_patch), "test", added(test_patch), "words", word_count(dest / "instruction.md"), "f2p", len(f2p_ids))
