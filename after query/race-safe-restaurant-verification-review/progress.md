# Race-Safe Restaurant Verification Review — Progress Log

Task: `afterquery/race-safe-restaurant-verification-review`  
Base commit: `220d10014c0bac8a924aa5ed50a989b1bab19a94`  
Last updated: Sep 4, 2026 (instruction trimmed to **248 words**)

---

## Pipeline status (Attempt 15 — Sep 3, 2026)

| Stage | Result |
|---|---|
| Automated checks | ✅ Passed |
| AI check | ✅ Passed |
| Originality | ✅ Passed |
| Reference verification | ✅ Passed |
| **Quality review** | ❌ **Failed (5 blocking criteria)** |
| Calibration I | ⏸ Pending |
| Calibration II | ⏸ Pending |
| Run audit | ⏸ Pending |
| Human review | ⏸ Pending |

---

## Quality review failures (what blocked us)

Five blocking criteria failed on the submitted bundle:

### 1. `behavior in task description`
**Problem:** Tests checked behaviors not written in the instruction. Examples from the reviewer:
- Concurrent approval test required exact error text `"Recommendation is already rejected"` for the losing PUT, but the instruction only promised a generic 400 for repeated state.
- Other tested strings and edge cases were only in hidden tests / reference code.

### 2. `behavior in tests`
**Problem:** Instruction promised behavior that tests did not fully verify. Example cited:
- Instruction required `totalPages` to exclude inactive users, but tests only asserted `count` (not `totalPages`).

### 3. `f2p p2p consistency`
**Problem:** F2P/P2P lists did not correctly reflect what the verifier actually grades. Example cited:
- `'the follow notification tracks the followings row writes exactly one notification for a successful follow'` was listed as F2P but was vacuous — base already passed that behavior and the solution did not change it.

### 4. `implementation acceptance breadth`
**Problem:** Tests rejected valid implementations by asserting incidental exact strings (e.g. `"Recommendation is already rejected"`) that the instruction did not specify.

### 5. `instruction self containedness`
**Problem:** Passing required exact error text that appeared only in tests/reference code, not in the instruction.

**Root theme:** instruction ↔ tests ↔ `config.json` were out of sync. Either the instruction over-promised, tests under-checked, or F2P/P2P pins did not match the held-out suite.

---

## Scope refocus (before this fix)

The failed submission mixed unrelated surfaces (recommendations, follow notifications, inactive-user pagination). The bundle was refocused on **candidate restaurant verification review**:

- Atomic `approve` / `reject`
- Admin notifications with rollback
- Concurrency / race safety
- `PUT /api/v1/candidate-restaurants/review-batch`

Held-out tests live in:
- `candidate_restaurant_review_behavior.test.ts`
- `candidate_restaurant_review_auth.test.ts`

**47 total** held-out tests; only **21** were pinned as F2P in `config.json` before this fix.

---

## Fixes applied (Sep 4, 2026)

### Pass 1 — align instruction, tests, and config
Rewrote to a dense, self-contained contract that explicitly states:

- Single-transaction approve/reject with full rollback on any failure (email, notifications, etc.)
- Chain creation/reuse from name before `" | "`
- 20-point incentive + `General` history; ownerless candidates skip incentives
- Candidate-admin provisioning, chain-admin rules, rollback on already-approved admin
- Exact error strings: `Candidate Restaurant not found`, `Candidate Restaurant already approved`, `Candidate Restaurant already rejected`, `Duplicate candidate restaurant id`
- Concurrency: one 200 winner, one 409 loser with already-approved/rejected message
- Success shape `{"success":true,"data":{...}}` and error shape `{"success":false,"message":"...","statusCode":N}`
- One notification per admin on success; batch endpoint validation, ordering, reward accumulation, atomic rollback

Realigned `tests/config.json` F2P/P2P to cover **all 47** held-out tests (42 F2P + 5 P2P review guards + 91 existing suite).

### Pass 2 — word-count trim (same day)
Restored tight developer prose and compressed `instruction.md` to **248 words** (target: under 250, max 300). Replaced an over-long / unnatural draft that had drifted above the limit.

### `error.txt`
Cleared after Pass 2 — ready to paste output from the next pipeline run.

### Unchanged (already passing)
- `solution/solution.patch` — 485 added lines, 7 files
- `tests/test.patch` — 922 added lines, 47 tests
- `tests/test.sh` — P2P existing suite + F2P held-out files
- Frozen files (`task.toml` metadata, `grader.py`, Dockerfiles, etc.)

### Scope floors verified
| Metric | Value | Floor |
|---|---|---|
| Solution lines | 485 | ≥ 459 |
| Solution files | 7 | ≥ 4 |
| Test lines | 922 | ≥ 596 |
| Instruction words | **248** | 100–300 (aim ≤250) |
| F2P tests | 42 | ≥ 8 |
| P2P tests | 96 | ≥ 50 |

---

## Pre-resubmission checklist

- [x] Instruction states every behavior F2P tests assert (exact strings, shapes, concurrency rules)
- [x] Tests cover every behavior the instruction promises
- [x] All 47 held-out test names pinned in F2P or P2P (disjoint)
- [x] No vacuous F2P tests (base-already-green behavior moved to P2P)
- [x] No hidden-only error strings — all documented in instruction
- [x] Instruction word count within bounds (**248 words**, under 250 target)
- [ ] Resubmit on platform and confirm quality review passes
- [ ] Watch reference verification after F2P expansion (21 → 42); move any base-green tests to P2P if needed

---

## If resubmission fails

| Symptom | Likely fix |
|---|---|
| Reference verification fails | One or more new F2P tests pass at base → move them to P2P |
| `behavior in task description` | Add missing exact strings/status codes to instruction |
| `behavior in tests` | Add assertions for any instruction promise not yet tested |
| `f2p p2p consistency` | Reconcile `config.json` names with Jest CTRF report names exactly |
| Calibration too easy/hard | Adjust task difficulty (edge cases, concurrency coverage) |

---

## Notes for future tasks

1. **Pin every held-out test** in `config.json` before submit — orphan tests fail quality review even if they run.
2. **Every exact string tests match** must appear in the instruction (status codes, JSON messages, headers).
3. **F2P = fail at base, pass with solution.** If base already satisfies a test, it belongs in P2P.
4. **Keep instruction and tests on one coherent feature** — do not mix unrelated endpoints in one task.
5. **Use `readme.md`** presubmission checklist at repo root before every submit.
6. **Aim under 250 words** — platform max is 300; dense prose near 250 reads best and avoids automated bounds issues.
