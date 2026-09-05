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
| 11 | **Windows CRLF line endings (`\r\n`) in patch and script files** | **Reference verification** | `git apply` fails context matching on Linux LF files; strictly enforce Unix LF on all files |
| 12 | **Non-canonical instruction ending** | Automated / Quality | Must end with exact generated line: `IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.` |

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
- Root causes:
  1. `solution.patch` had Windows CRLF line endings (`\r\n`), causing `git apply` to fail against Linux LF files in `grader.py prepare`.
  2. Mojibake in `ast.rs` comment lines (`╬ô├ç┬¬` and `ΓÇö`).
  3. `instruction.md` ended with non-standard phrase instead of exact frozen line.

### Attempt 5 — Fixes ready (all verified)
| File | Fix | Status |
|---|---|---|
| `solution/solution.patch` | Rebuilt from pre-macro base (`_patchwork/b8f85fd`); 563 +lines, 6 files; clean ASCII comments; strictly Unix LF (`\n`) | ✅ Verified (`git apply --check` exits 0) |
| `tests/test.patch` | 2 test files only (608 lines); no `.config/`; strictly Unix LF (`\n`) | ✅ Verified (`git apply` exits 0) |
| `tests/test.sh` | Creates nextest.toml inside RUN TESTS; fixed `normalize_junit`; removed `--test macros`; strictly Unix LF (`\n`) | ✅ Verified |
| `tests/config.json` | Platform base; 62 F2P + 617 P2P; no BOM; junit grade; all 30 macros.rs tests removed; strictly Unix LF (`\n`) | ✅ Verified |
| `instruction.md` | 242 words; ends with exact mandatory line; strictly Unix LF (`\n`) | ✅ Verified |
| `verify_bundle.py` | Enhanced pre-submit gate: checks CRLF, BOM, non-ascii mojibake, mandatory line, word count, line count floors | ✅ Passes all checks |

---

## Local verification (proxy base `_patchwork`)

```
git apply --check --whitespace=nowarn solution/solution.patch  # exits 0 ✓
git apply --check --whitespace=nowarn tests/test.patch         # exits 0 ✓
python stencilworks-tasks/loop-cycle-controls/verify_bundle.py # all checks pass ✓
```

---

## Resubmit checklist (Attempt 5)

- [x] Strictly Unix LF (`\n`) on all task files (`solution.patch`, `test.patch`, `test.sh`, `config.json`, `instruction.md`)
- [x] Zero UTF-8 BOMs
- [x] Replaced mojibake comments with clean ASCII
- [x] Mandatory instruction line verified
- [x] Run `verify_bundle.py` gate
- [ ] Paste all updated files on platform
- [ ] Pass automated checks → reference verification → quality → calibration

---

## Files to paste

See `SUBMIT.md`.
