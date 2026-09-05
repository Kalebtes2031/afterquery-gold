# Stencilworks (newrepofromafterquery) — AfterQuery Gold Task Batch

Private Rust template engine (`stencilworks` 0.7.2). Zero dependencies. Target: **10 approved tasks** on this repo ($75 × 10 + $300 bonus = **$1,050**).

Source tree: `../newrepofromafterquery/`  
Authoring rules: `../training-2/` + `../readme.md`  
Base commit: pick deliberately when publishing the environment (feature must not already exist in history).

## Task roster

### Sprint focus — submit these 4 first

| Order | Task id | Theme | Why selected | Status |
|---|---|---|---|---|
| 1 | `loop-cycle-controls` | `loop.cycle` + `{% cycle %}` | Core `cycle()` already in `loop_state.rs`; smallest gap to close | 🔄 in progress |
| 2 | `block-super-stack` | `{{ super() }}` parent stacking | Inheritance infra + 14 tests exist; focused render change | ✅ bundle ready |
| 3 | `named-filter-arguments` | Keyword filter args | Disjoint files; rich F2P surface (arity, keywords, errors) | ✅ bundle ready |
| 4 | `autoescape-scoped-modes` | Scoped autoescape + Xml/Url/Js | Builds on existing escape/options/CLI; high template value | ⬜ queued |

Implement **sequentially** — tasks 1–4 share `render.rs` / `parser.rs` if done in parallel.

### Deferred (batch 2)

| # | Task id | Theme | Why deferred |
|---|---|---|---|
| — | `macro-call-import` | Macros, call, import/from | Partially in working tree; needs clean base commit before F2P |
| — | `context-format-suite` | YAML / TOML / CSV loaders | Zero-dep parsers — too heavy for 4-hour sprint |
| — | `template-compile-cache` | Parse cache + invalidation | Infra-heavy; fewer behavioral edge cases |
| — | `set-capture-and-namespace` | `{% set %}…{% endset %}` + ns | Complex scope semantics |
| — | `static-lint-json-diagnostics` | Strict check + JSON diagnostics | New `analysis` module from scratch |
| — | `safe-string-sandbox` | Marked-safe Value + sandbox | Cross-cutting value model change |

Tasks are **mutually disjoint** on primary file ownership so originality checks stay clean.

## Per-task bundle (what we author)

Editable on platform:
- `instruction.md` (100–300 words, aim ≤250)
- `solution/solution.patch` (≥459 lines, ≥4 files)
- `tests/test.patch` (≥596 lines, ≥2 files, aim 20+ F2P)
- `tests/config.json` (full P2P suite + F2P ids)
- `tests/test.sh` RUN TESTS section only

Local tracking (this folder):
- `progress.md` — errors, fixes, checklist
- `error.txt` — paste latest pipeline failure (clear after fix)

## Floors reminder

| Metric | Floor | Target |
|---|---|---|
| Instruction | 100–300 words | ~230–250 |
| Solution | ≥459 lines / ≥4 files | 500–800+ |
| Tests | ≥596 lines / ≥2 files | 20+ F2P |
| P2P | ≥50 | pin full existing suite (~600 tests available) |
| Ratio | 0.9–7.5 sol lines / word | ~2–3.5 |

## 4-hour sprint plan

1. Publish environment for `newrepofromafterquery` (one-time; base commit must not include sprint features).
2. Implement the **4 focus tasks** in order: loop-cycle → block-super → named-filter → autoescape.
3. For each: instruction → solution → tests → config → local fail@base / pass@solution → submit → update `progress.md`.
4. If quality review fails: fix instruction/tests alignment, clear `error.txt`, resubmit.
5. Return to deferred tasks only if time remains.

## Disjointness map

| Task | Owns |
|---|---|
| macro-call-import | `ast`/`parser`/`token` + macro registry in render/scope |
| block-super-stack | `runtime/render.rs` inheritance path |
| autoescape-scoped-modes | `options`/`escape`/`cli args` |
| context-format-suite | `data/yaml|toml|csv` + CLI `--data` |
| template-compile-cache | `environment` + loader cache |
| named-filter-arguments | filter call AST + `filters/args` |
| set-capture-and-namespace | set-block AST + scope assign |
| loop-cycle-controls | `loop_state` + cycle tag |
| static-lint-json-diagnostics | new `analysis` + CLI check |
| safe-string-sandbox | `Value` safe bit + sandbox Options |
