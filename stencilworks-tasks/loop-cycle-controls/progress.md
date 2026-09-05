# loop-cycle-controls — Progress Log

Task: afterquery/loop-cycle-controls (stencilworks-render-core)
Last updated: Sep 5, 2026

---

## Pipeline status

| Stage | Att 1 | Att 2 | Att 3 | Att 4 | Att 5 (ready) |
|---|---|---|---|---|---|
| Automated checks | ❌ | ✅ | ❌ | ✅ | **fix ready** |
| AI check | — | ✅ | — | ✅ | pending |
| Originality | — | ✅ | — | ✅ | pending |
| Reference verification | — | ❌ | — | ❌ | **fix ready** |
| Quality review | — | — | — | — | pending |
| Calibration I/II | — | — | — | — | pending |

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
| 8 | **solution.patch built against wrong base** (post-macro `52713c9`) | **Reference verification** | Platform base `3f4470f` is **pre-macro**; always generate patches from `_patchwork/b8f85fd` |
| 9 | **P2P config had 3 extra macros.rs tests** without macro/caller/import/call_block in name | **Reference verification** | Filter ALL 30 `tests/macros.rs` functions, not just name-matched ones |
| 10 | **test.sh referenced `--test macros`** binary | **Reference verification** | Pre-macro base has no `tests/macros.rs`; remove from both `INTEGRATION_BINS` and `cargo nextest run` |

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

### Attempt 4 — Reference verification failed
- Automated checks PASSED (fixed test.patch paths)
- Reference solution scored [0, 0, 0] in 0 seconds
- Root cause: solution.patch was generated against LOCAL base `52713c9` which has macros module
- Platform base `3f4470f` is PRE-MACRO (no macros in ast/parser/render/mod.rs)
- Context lines mismatch → `git apply` fails → immediate reward 0

### Attempt 5 — Fixes ready (correct base)
| File | Fix |
|---|---|
| `solution/solution.patch` | **Rebuilt from pre-macro base** (`_patchwork/b8f85fd`); 563 +lines, 6 files |
| `tests/test.patch` | Same 2 test files (608 lines); no `.config/` |
| `tests/test.sh` | Creates nextest.toml inside RUN TESTS; fixed `normalize_junit`; removed `--test macros` |
| `tests/config.json` | Platform base; 62 F2P + 617 P2P; no BOM; junit grade; all 30 macros.rs tests removed |
| `instruction.md` | 203 words; no test-title mirroring |
| `verify_bundle.py` | Pre-submit gate — catches non-test paths |

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
