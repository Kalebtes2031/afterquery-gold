# Conflict-Resistant Verification Workflow — Progress Log

Task: `afterquery/conflict-resistant-verification-workflow`  
Base commit: `220d10014c0bac8a924aa5ed50a989b1bab19a94`  
Last updated: Sep 4, 2026

---

## Pipeline status (Attempt 14 — Sep 4, 2026)

| Stage | Result |
|---|---|
| Automated checks | ✅ Passed |
| AI check | ✅ Passed |
| Originality | ✅ Passed |
| Reference verification | ✅ Passed |
| **Quality review** | ❌ **Failed (6 blocking criteria)** |
| Calibration I | ⏸ Pending |
| Calibration II | ⏸ Pending |
| Run audit | ⏸ Pending |
| Human review | ⏸ Pending |

---

## Quality review failures (what blocked us)

Six blocking criteria failed. The core problem was **instruction ↔ tests ↔ solution misalignment** — three different contracts in one bundle.

### 1. `behavior in task description`
**Problem:** Tests checked `/review`, `/batch-review`, `/metrics`, `reviews` wrapper, `rejectionReason`, media copying, action normalization, and specific response fields. The submitted instruction instead named `/approve`, `/reject`, `/review-batch` and omitted metrics and most tested contracts.

### 2. `behavior in tests`
**Problem:** Instruction promised chain creation, submitter incentives/history, candidate-admin email/provisioning, and separate approve/reject routes — but F2P tests exercised a different unified review API and did not verify those promises. An agent could pass tests without implementing instruction requirements (and vice versa).

### 3. `hardcoded solution`
**Problem:** Reference solution implemented different routes and omitted chains, incentives, and candidate-admin processing — so it was not a real implementation of the **stated** instruction (even though it matched the hidden tests).

### 4. `implementation acceptance breadth`
**Problem:** A correct implementation following the instruction (approve/reject/review-batch) would fail most F2P tests; only the undocumented hidden contract passed.

### 5. `instruction reads naturally`
**Problem:** Broken prose in the failed submission, e.g. *"Then. Create the chain"* and *"After that should the candidate restaurant be approved."*

### 6. `instruction self containedness`
**Problem:** Instruction referred to unspecified "documentation" for response shapes and did not define metrics, batch payload, normalization rules, or media behavior that tests required.

**Advisory failures also noted:** `file reference mentioned`, `structured data schema`, `typos` (path-name conflicts between instruction and tests/solution).

**Root theme:** The bundle looked like two tasks stitched together — an approve/reject/incentive workflow in the instruction vs. a unified review + metrics API in tests and solution.

---

## Scope decision (fix strategy)

Instead of rewriting tests/solution to match the old instruction, we **aligned everything on the unified verification API** that tests and solution already implement:

| Surface | Correct path / contract |
|---|---|
| Single review | `PUT /api/v1/candidate-restaurants/:id/review` with `{action, rejectionReason?}` |
| Batch review | `PUT /api/v1/candidate-restaurants/batch-review` with `{reviews:[...]}` |
| Metrics | `GET /api/v1/candidate-restaurants/metrics` → `{pending, approved, rejected, total}` |

**Removed from instruction** (not tested by F2P suite): chain creation, submitter incentives/history, candidate-admin provisioning/email — these belonged to a different task shape and caused the hardcoded-solution / behavior-in-tests failures.

Held-out tests live in:
- `candidate_restaurant_verification_behavior.test.ts`
- `candidate_restaurant_verification_auth.test.ts`

**41 total** held-out tests, all pinned as F2P in `config.json`.

---

## Fixes applied (Sep 4, 2026)

### `instruction.md`
Full rewrite to a self-contained contract aligned with tests and solution:

- Three endpoints with exact paths: `/review`, `/batch-review`, `/metrics`
- Unified action-based review (not separate approve/reject routes)
- Response envelopes: success `{success, message, data}`; errors `{success, message, statusCode}`
- Per-item result schema: `{candidate_restaurant_id, name, status, rejection_reason, restaurant_id, reviewed_by}`
- Action normalization (trim + case-insensitive), rejectionReason trim/null rules
- Row locking, concurrency (one 200 / one 409 on overlap), atomic rollback, 500 on notification failure
- Approval: open restaurant, copy description/hours, copy menu image URLs (zero when no media), notify all admins
- Rejection: no restaurant/media/notifications
- Batch validation messages including `reviews field must be a non-empty array` and `Duplicate candidate restaurant id`
- Metrics: `pending = max(total - approved - rejected, 0)`

### `tests/config.json`
No structural change needed — already lists all **41 F2P** tests matching the held-out suite; **91 P2P** existing-suite pins. `f2p p2p consistency` had already passed.

### Unchanged (already aligned & passing other stages)
- `solution/solution.patch` — implements `/review`, `/batch-review`, `/metrics` via `CandidateRestaurantVerificationService`
- `tests/test.patch` — 659 added lines, 41 behavioral tests
- `tests/test.sh` — P2P existing suite + F2P held-out verification files
- Frozen files (`task.toml`, `grader.py`, Dockerfiles, etc.)

### Scope floors verified
| Metric | Value | Floor |
|---|---|---|
| Solution lines | 496 | ≥ 459 |
| Test lines | 659 | ≥ 596 |
| Instruction words | ~280 | 100–300 |
| F2P tests | 41 | ≥ 8 |
| P2P tests | 91 | ≥ 50 |

---

## Pre-resubmission checklist

- [x] Instruction uses same routes as tests/solution (`/review`, `/batch-review`, `/metrics`)
- [x] Instruction defines exact result schema and error/success envelopes
- [x] Instruction does **not** promise untested behavior (chains, incentives, candidate-admin email)
- [x] Tests verify every major instruction promise
- [x] Solution implements the instruction contract (not a different hidden API)
- [x] All 41 held-out tests pinned in F2P; no overlap with P2P
- [x] Natural developer prose (no broken template sentences)
- [x] Word count within 100–300
- [ ] Resubmit on platform and confirm quality review passes
- [ ] Proceed through calibration I/II

---

## If resubmission fails

| Symptom | Likely fix |
|---|---|
| `behavior in task description` | Add any missing exact strings or response fields tests assert |
| `behavior in tests` | Add tests for any instruction promise not yet covered |
| `hardcoded solution` | Ensure solution implements all instruction requirements, not just test shortcuts |
| `implementation acceptance breadth` | Loosen overly specific test assertions or document exact strings in instruction |
| `instruction reads naturally` | Rewrite awkward sentences; keep dense developer prose |
| Reference verification fails | Move base-green tests from F2P to P2P |

---

## Lessons learned (apply to future tasks)

1. **Pick one API shape** — do not write instruction for approve/reject routes while tests use a unified `/review` endpoint.
2. **Instruction, tests, and solution must describe the same task** — reference verification passing is not enough if quality review sees three different contracts.
3. **Do not promise chains/incentives/admin email unless F2P tests verify them** — over-promising fails `behavior in tests` and makes the solution look hardcoded.
4. **Define schemas in the instruction** — never point to unspecified "documentation" for response shapes.
5. **Use exact path names everywhere** — `batch-review` vs `review-batch` typos fail honest implementations.
6. **Write natural prose** — broken template text fails `instruction reads naturally` even when requirements are complete.
