# AfterQuery Gold — Task Authoring Procedure & Presubmission Checklist

Use this document for every new task. It combines the official pipeline rules from `training-2/` with patterns from the eight approved RateEat tasks in `after query/alreadypassedtasks/`.

**Payout reminder:** $75 per approved task; +$300 once a repo has more than 5 approved tasks (max 10 tasks/repo → up to $1,050).

---

## What a task is

A task packages three things so an engineer or agent can implement from the instruction alone, and a sealed verifier can grade pass/fail with no human judgment:

| Artifact | Role |
|---|---|
| `instruction.md` | Behavioral work request (public contract only) |
| `solution/solution.patch` | Reference solution — proves the task is solvable |
| `tests/test.patch` + `tests/config.json` + `tests/test.sh` (RUN TESTS section) | Held-out tests that fail at base and pass with the solution |

Binary reward = **1** only if: at least one F2P id is listed, **every** F2P passes, and **no** P2P fails. Anything else = **0**.

---

## Approved-task patterns (what already passed looks like)

Studied from:

- `atomic-editable-order-cart`
- `consistent-featured-restaurant-availability-rules`
- `consistent-review-vote-transitions`
- `consistent-split-payment-settlement`
- `durable-waitlist-otp-state`
- `idempotent-and-atomic-order-creation`
- `keep-candidate-item-moderation-consistent`
- `reliable-sponsored-listing-lifecycle`

### Theme

Strong tasks are **multi-file consistency / concurrency / atomicity** work on real backend surfaces — not one-line fixes:

- Idempotent retries + transactional side effects
- Durable DB state under overlapping requests
- Counter / vote / settlement correctness under races
- Feed + impression + job rules staying aligned
- Batch moderation with rollback and no duplicate notifications

### Bundle shape

| Piece | Typical passed range | Hard floor (platform) |
|---|---|---|
| Instruction words | ~220–280 (aim ~250) | 100–300 |
| Solution added lines | ~500–800+ across **5–11** files | ≥459 lines, ≥4 files |
| Test added lines | ~660–1700 across **2–6** test files | ≥596 lines, ≥2 test files |
| F2P named tests | **17–52** (most ≥20) | ≥8 (aim 20+) |
| P2P pinned tests | **~90–120** (full existing suite) | ≥50 |
| Sol lines / instruction word | ~1.7–3.5 | 0.9–7.5 |

### Solution layout that works

Passed solutions usually touch several of:

- migration(s)
- model(s) / `models/index.ts` / `config/db.ts`
- controller + route
- dedicated service(s)
- types + utils / constants
- sometimes schemas

They implement **observable behavior** (status codes, messages, headers, response shapes, DB outcomes under concurrency) — not a narrative of file edits in the instruction.

### Test layout that works

Passed `test.patch` files:

- **Only add** files under `src/__tests__/…` (never overlap solution paths)
- Split into **endpoint/behavior** suites + **transaction/concurrency** suites + shared `*_test_support.ts` / helpers
- Assert through HTTP / public APIs / observable DB state
- Cover: happy path, validation, auth, exact error strings, atomic rollback, concurrent races, idempotency replay, and “existing behavior stays green” cases (those last ones often go in **P2P**, not F2P)

### Instruction style that works

Passed instructions read like a tight ticket to a capable colleague:

1. Open with the **goal** (behavior to build), not a defect dump.
2. Name the **public surface**: routes, headers, body fields, status codes, exact message/JSON strings tests will match.
3. Spell **edge cases** and **concurrency/atomicity** rules in prose.
4. State what must **stay unchanged**.
5. Stop. No file paths, helper names, test names, PR links, or implementation steps.
6. End with the exact generated line:

   `IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.`

---

## End-to-end procedure

### 0. One-time: repo + environment

1. Connect a **private** owned repo (public / forks / already-public code are rejected).
2. Eligibility: TS/JS/Python/Go/Rust; ~8k+ LOC across 50+ files; ≥50 commits and ≥2 weeks of real history.
3. Publish an environment (dependency Dockerfile only; platform checks out the base commit to `/app`).
4. Dockerfile rules: one `FROM` (language default or digest-pinned); ≤20 KB / 200 lines / 30 RUN; pin versions; no `curl | sh`, no `ADD` from URLs, no git clone, no copying tests/solutions, no `|| true` error swallowing.
5. Pick the **base commit** deliberately — every task on that environment version is defined against it. Prefer a commit where the feature does **not** already exist in history (replaying a past commit as “solution” is rejected).

### 1. Choose a substantial, original task

- Multi-file engineering work with real edge cases (concurrency, atomicity, invariants).
- Must be **original** vs your other tasks and anyone else’s (instruction wording + files touched).
- Must **not** be recoverable from git history at/near the base commit.
- Stay inside the repo’s domain but do not near-duplicate an already-passed task theme with the same surface.

### 2. Create the draft workspace

In the platform: pick repository, published environment, task name, category. The workspace seeds the full bundle.

**You edit only these five:**

1. `instruction.md`
2. `solution/solution.patch`
3. `tests/test.patch`
4. `tests/config.json`
5. `tests/test.sh` — **only** the marked `RUN TESTS` middle section

**Also fill** in `task.toml`: `display_title` and `display_description` only. Everything else in `task.toml` is fixed.

**Do not touch (frozen / regenerated / byte-compared):**

- rest of `task.toml`
- `pre_artifacts.sh`
- `environment/Dockerfile` (or `enviroment/Dockerfile` in older copies)
- `tests/grader.py`
- `tests/Dockerfile`
- `solution/solve.sh`
- the frame of `tests/test.sh` outside the RUN TESTS markers

### 3. Write the instruction first (contract)

- 100–300 words; aim near **250**.
- Flowing developer prose — no templates, no numbered requirement ledgers, no padding.
- Every F2P assertion must be implied by the instruction; if tests check it, the instruction states it.
- Include exact observable values the tests will match (codes, messages, headers, limits, window sizes).
- No blocked/program vocabulary; write as a normal ticket in the repo.
- Keep the final `IMPORTANT: …` line exactly as generated.

### 4. Implement the reference solution (fresh)

1. From the base commit, implement on a new branch.
2. Author the change **for this task** (do not cherry-pick an already-shipped commit).
3. Export a unified diff → `solution/solution.patch`.
4. Meet floors: ≥459 added lines across ≥4 files; stay in the 0.9–7.5 lines-per-instruction-word band (passed tasks usually land ~2–3.5).
5. Solution must make **all** F2P tests pass and keep **all** P2P green.

### 5. Author held-out tests

1. Add **new** test files only in `tests/test.patch` (unified diff against base).
2. Disjoint from solution paths — never edit the same file in both patches.
3. ≥596 added lines across ≥2 test files; aim well past the floor.
4. ≥8 named F2P tests; **aim 20+** with validation, success, rollback, and concurrency coverage.
5. Tests must be **deterministic**: no timing flakiness, no live network, no order dependence.
6. Assert public/observable behavior only — not private helpers or symbol names.
7. Any correct implementation shape must be able to pass (not only your reference layout).

### 6. Wire `tests/config.json`

```json
{
  "base_commit": "<exact base hash>",
  "f2p_node_ids": [ /* every new test name that must fail→pass */ ],
  "p2p_node_ids": [ /* full existing suite ids that stay green */ ],
  "grade": {
    "format": "ctrf",
    "node_id": "name",
    "tool_label": "jest-ctrf-json-reporter",
    "reports": [
      "/logs/verifier/base_ctrf.json",
      "/logs/verifier/new_ctrf.json"
    ]
  }
}
```

Rules:

- **Pin the whole existing suite** into `p2p_node_ids` — hand-picked subsets are rejected. Ids not listed do not protect the codebase even if they run.
- F2P ids must match report names exactly (Jest CTRF `name`).
- Absent or skipped listed ids count as **failed**.
- For thin existing suites, add extra tests that already pass at base (they go in P2P).

### 7. Fill `tests/test.sh` (RUN TESTS only)

Follow the RateEat passed-task pattern:

1. Start PostgreSQL, wait until ready, recreate a clean DB, enable `pg_trgm`.
2. Export app env (`NODE_ENV`, `DEVELOPMENT_PG_*`, secrets needed by the app).
3. Run migrations.
4. Use a **trusted** CTRF reporter resolved from `/opt/ctrf` (not the app tree).
5. Run **P2P** suite → write `/logs/verifier/base_ctrf.json`.
6. Run **F2P** suite (held-out paths only) → write `/logs/verifier/new_ctrf.json`.
7. Do not silence failures; keep `run.log`; never swallow install/test errors.
8. Leave the script frame outside the markers untouched so `grader.py` still runs.

### 8. Local sanity before submit

1. At base (no solution): every F2P fails; every P2P passes.
2. With solution applied: every F2P passes; every P2P still passes.
3. Repeat F2P/P2P a few times — flakiness fails reference verification (3× each side on the harness).
4. Confirm patch file sets do not intersect.
5. Confirm instruction word count and solution/test size floors.
6. Confirm no references to tests, hidden files, this program, or external links in the instruction.

### 9. Submit and watch the pipeline

Stages (live on the task page):

1. **Automated checks** — files, frozen integrity, floors, instruction bounds, blocked terms  
2. **AI check** — instruction must read human-authored  
3. **Originality** — vs prior tasks (yours and others)  
4. **Reference verification** — solution passes 3×; unchanged repo fails 3×  
5. **Quality review** — instruction/test alignment, writing quality, verifier integrity  
6. **Calibration (two rounds)** — not too easy, not impossibly hard  
7. **Run audit** — failures must be genuine difficulty, not broken env/flaky grader  
8. **Human review** — final approve/reject with written reason  

Infra flakes are re-run and do not count against you. Verdict failures require revising the draft and resubmitting (do not submit a duplicate of a live/decided task).

---

## Presubmission checklist

Copy this for every new task. Do not submit until every box is true.

### Bundle integrity

- [ ] Edited only: `instruction.md`, `solution/solution.patch`, `tests/test.patch`, `tests/config.json`, RUN TESTS section of `tests/test.sh`, plus `display_title` / `display_description` in `task.toml`
- [ ] All frozen/generated files left byte-identical to the seeded workspace
- [ ] `solution/solve.sh`, `pre_artifacts.sh`, `tests/grader.py`, `tests/Dockerfile`, environment Dockerfile untouched
- [ ] Base commit in `task.toml` / `config.json` matches the published environment

### Instruction

- [ ] 100–300 words (aim ~250); not padded toward the cap
- [ ] Reads as a real work request in natural prose (no template headers / numbered ledger)
- [ ] Opens with the goal; states finished behavior, edge cases, and what stays unchanged
- [ ] Names public surface with exact observable values tests assert
- [ ] No file layout, helper names, internal modules, test names, PR/issue links, or external links
- [ ] No program/platform/evaluation vocabulary
- [ ] Written in your own words (will face AI-screening)
- [ ] Ends with exact: `IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.`
- [ ] Instruction↔solution balance in 0.9–7.5 added solution lines per instruction word

### Solution

- [ ] Authored fresh for this task (not lifted from repo history / already-shipped PR)
- [ ] Unified diff against the exact base commit
- [ ] ≥459 added lines across ≥4 files (aim well above)
- [ ] Every F2P passes with it; unchanged repo fails every F2P
- [ ] Does not break P2P

### Tests & verifier

- [ ] `test.patch` only **adds** test files; no production/source overlap with `solution.patch`
- [ ] ≥596 added test lines across ≥2 test files
- [ ] ≥8 F2P tests (aim **20+**), each named and listed in `f2p_node_ids`
- [ ] F2P fail at base and pass with solution (verified locally, ideally multi-run)
- [ ] `p2p_node_ids` pins the **full** existing suite (≥50); thin suites topped up with already-green tests
- [ ] Every P2P passes at base **and** with solution
- [ ] Behavioral assertions only (public API / observable outputs)
- [ ] Deterministic (no timing races, network, or order dependence)
- [ ] CTRF reports written to the paths in `config.json`; listed ids absent/skipped count as fail
- [ ] `test.sh` RUN TESTS starts DB, migrates, runs P2P then F2P, uses trusted reporter under `/opt/ctrf`

### Quality / originality / difficulty

- [ ] Substantial multi-file feature with real edge cases (atomicity / concurrency / invariants preferred)
- [ ] Not a near-duplicate of another live or decided task (including your own)
- [ ] Instruction and tests align — nothing tested that the instruction does not specify
- [ ] Difficulty aimed at the calibration band (solvable with effort, not trivial, not impossible)
- [ ] No test-runner tricks, report suppression, or early-exit cheats

### Final gate

- [ ] Local: base → F2P all fail, P2P all pass
- [ ] Local: solution → F2P all pass, P2P all pass
- [ ] Repeated runs stable
- [ ] Ready for automated checks → AI → originality → reference ×3 → quality → calibration → audit → human review

---

## Quick reference: edit vs frozen

| Edit | Leave frozen |
|---|---|
| `instruction.md` | `pre_artifacts.sh` |
| `solution/solution.patch` | `environment/Dockerfile` |
| `tests/test.patch` | `tests/grader.py` |
| `tests/config.json` | `tests/Dockerfile` |
| `tests/test.sh` (RUN TESTS only) | `solution/solve.sh` |
| `task.toml` display title + description only | Rest of `task.toml` + test.sh frame |

---

## Reference examples

When stuck on tone or structure, open any task under `after query/alreadypassedtasks/` and mirror:

- Instruction density and exact status/message naming  
- Solution split across migration + service + controller  
- Tests split into behavior + transaction/concurrency + shared support  
- Full-suite P2P pinning in `tests/config.json`  
- Verifier `test.sh` DB bootstrap + separate P2P/F2P Jest runs with CTRF  

Official rule source: `training-2/` (`1`–`9` plus overview pages).
