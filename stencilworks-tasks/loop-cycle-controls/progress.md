# loop-cycle-controls — Progress Log

Task: afterquery/loop-cycle-controls (stencilworks-render-core)
Last updated: Sep 5, 2026

---

## Pipeline status

| Stage | Att 1 | Att 2 | Att 3 | Att 4 (ready) |
|---|---|---|---|---|
| Automated checks | ❌ | ✅ | ❌ | **fix ready** |
| AI check | — | ✅ | — | pending |
| Originality | — | ✅ | — | pending |
| Reference verification | — | ❌ | — | pending |
| Quality review | — | — | — | pending |
| Calibration I/II | — | — | — | pending |

---

## Mistakes log (learn once, don't repeat)

| # | Mistake | Pipeline hit | Correct rule |
|---|---|---|---|
| 1 | Used local base `52713c9` in config | Automated checks | **`base_commit` = published env hash** (`3f4470fff4b1cd4509df4bf33af692315190d1e3`) |
| 2 | Uploaded hand-built `test.sh` (missing frame comments) | Automated checks | **Only edit RUN TESTS block**; keep platform-seeded frame byte-identical |
| 3 | Used Node/CTRF config on Rust task | Automated checks | Rust seed: **`junit`** + `base.xml`/`new.xml` + `cargo-nextest` |
| 4 | JUnit normalize prefixed integration ids (`stencilworks::cycles::…`) | Reference verification | Config ids = **bare fn names** for integration tests; fix in **test.sh** RUN TESTS |
| 5 | Windows BOM in config test ids (`\ufeff…`) | Reference verification | Regenerate ids from **`cargo test --list`**; strip BOM; Linux is authoritative |
| 6 | Put `.config/nextest.toml` in **test.patch** | Automated checks | **test.patch = test files only** (`tests/*.rs`); write nextest config in **test.sh RUN TESTS** |
| 7 | Instruction copied F2P test titles verbatim | Warnings / quality | Write **behavioral prose**; never restate test function names |

---

## Attempt history

### Attempt 1 — Automated checks failed
- Missing `test.sh` canonical frame comments
- Wrong `base_commit` (local vs platform)

### Attempt 2 — Reference verification failed
- Reference runs reward 0 (~1s runtime → grading/report mismatch)
- JUnit id normalization bug + BOM in config + nextest profile missing at runtime

### Attempt 3 — Automated checks failed
- Added `.config/nextest.toml` to test.patch (forbidden — not a test file)

### Attempt 4 — Fixes ready
| File | Fix |
|---|---|
| `tests/test.patch` | **2 test files only** (602 lines); no `.config/` |
| `tests/test.sh` | Creates `.config/nextest.toml` inside RUN TESTS; fixed `normalize_junit` |
| `tests/config.json` | Platform base; 62 F2P + 649 P2P; no BOM; junit grade |
| `instruction.md` | 203 words; no test-title mirroring |
| `verify_bundle.py` | Pre-submit gate — fails if test.patch touches non-test paths |

---

## Local verification (proxy base `52713c9`)

```
git reset --hard 52713c9 && git clean -fd
git apply --whitespace=nowarn tests/test.patch        # F2P fail ✓
git apply --whitespace=nowarn solution/solution.patch # all pass ✓
```

---

## Resubmit checklist (Attempt 4)

- [x] Remove `.config/nextest.toml` from test.patch
- [x] Write nextest profile in test.sh RUN TESTS only
- [x] Keep JUnit normalize fix + clean config ids
- [x] Rewrite instruction (no test mirroring)
- [ ] Paste all updated files on platform
- [ ] Pass automated checks → reference verification → quality → calibration

---

## Files to paste

See `SUBMIT.md`.
