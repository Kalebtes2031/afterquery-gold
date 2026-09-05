# loop-cycle-controls — Progress Log

Task: afterquery/loop-cycle-controls (stencilworks-render-core)
Last updated: Sep 5, 2026

---

## Pipeline status

| Stage | … | Att 5 (log) | Att 8 (ready) |
|---|---|---|---|
| Automated checks | … | ✅ | pending |
| AI check | … | ✅ | pending |
| Originality | … | ✅ | pending |
| Reference verification | … | ✅ | pending (solution unchanged) |
| Quality review | … | ❌ 8 blockers | **fix ready** |
| Calibration | … | — | pending |

---

## Mistakes log (learn once, don't repeat)

| # | Mistake | Hit | Rule |
|---|---|---|---|
| 1–16 | base / CRLF / macros / naming / config hide / etc. | various | earlier rows |
| 17 | chmod 0444 as root useless while cargo is root | Quality anti-cheat | Drop privileges (setuid) for cargo |
| 18 | Humanized instruction dropped precise grammar | Quality | Keep grammar + edges in human tone |
| 19 | Outline promised but not graded | Quality | Grade outline + for-loop error text |
| 20 | Grammar vague → outline looked like overfitting | Quality | Specify outline shape in instruction |
| 21 | **Builder-owned TARGET still mutable** — detached build.rs can replace sealed-looking test binaries after compile | Quality anti-cheat + report + verifier integrity | **Root-seal copies + kill leftovers + hash + run as root** |
| 22 | Instruction said "names and counts" only; tests required `cycle 2` / `cycle band/2` | Quality behavior/self-contained/acceptance | Document exact outline encoding |
| 23 | Awkward AI phrases in instruction | Quality natural | Ban: ought to be introduced / different loops in one rendering / names associated with the count |

---

## Attempt 8 — fixes

| File | Change |
|---|---|
| `instruction.md` | Natural rewrite; exact outline `cycle N` / `cycle band/2`; 283 words |
| `tests/test.sh` | Seal binaries root-owned 0555; pkill builder; SHA-256; grade as root |
| `verify_bundle.py` | Gates for seal/pkill/sha256 + awkward phrases |
| `error.txt` / `progress.md` / `SUBMIT.md` | Attempt 8 notes |

**Unchanged:** `solution/solution.patch`, `tests/test.patch`, `tests/config.json` (already match the documented outline).

---

## Resubmit checklist

- [x] Anti-cheat: non-root cargo + root-sealed binaries + kill leftovers + hash
- [x] Instruction states outline encoding and grammar without awkward phrases
- [x] LF / verify_bundle passed
- [ ] Paste on platform
- [ ] Pass quality → calibration
