# loop-cycle-controls — Progress Log

Task: afterquery/loop-cycle-controls (stencilworks / newrepofromafterquery)
Batch slot: **1 / 4 sprint focus**
Theme: `loop.cycle` + `{% cycle %}` tag
Primary modules: runtime/{cycle,render,loop_state}, syntax/{ast,parser,printer}
Last updated: Sep 5, 2026

---

## Status

| Stage | Result |
|---|---|
| Draft scaffold | done |
| Instruction draft | done (~201 words) |
| Solution patch | done — **508** added src lines, **6** files |
| Test patch | done — **602** added lines, **2** files, **62** F2P |
| config.json | done — 649 P2P + 62 F2P ids |
| test.sh RUN TESTS | done — full frame; sync RUN TESTS with platform Rust seed if needed |
| task.toml + frozen bundle | done — see BUNDLE.md (update docker_image after env publish) |
| Local fail@base / pass@solution | verified |
| Platform submit | **ready** |
| Automated checks | — |

---

## Base commit

```
52713c922b68e74da1e9ed6c3ba44a6724a3e707
```

Publish this hash when creating the stencilworks environment (includes macros; excludes cycle feature).

---

## Bundle paths

| File | Location |
|---|---|
| instruction.md | `stencilworks-tasks/loop-cycle-controls/instruction.md` |
| task.toml | `stencilworks-tasks/loop-cycle-controls/task.toml` |
| pre_artifacts.sh | `stencilworks-tasks/loop-cycle-controls/pre_artifacts.sh` |
| environment/Dockerfile | `stencilworks-tasks/loop-cycle-controls/environment/Dockerfile` |
| solution/solution.patch | `stencilworks-tasks/loop-cycle-controls/solution/solution.patch` |
| solution/solve.sh | `stencilworks-tasks/loop-cycle-controls/solution/solve.sh` |
| tests/test.patch | `stencilworks-tasks/loop-cycle-controls/tests/test.patch` |
| tests/config.json | `stencilworks-tasks/loop-cycle-controls/tests/config.json` |
| tests/test.sh | `stencilworks-tasks/loop-cycle-controls/tests/test.sh` (full frame + RUN TESTS) |
| tests/grader.py | `stencilworks-tasks/loop-cycle-controls/tests/grader.py` (frozen copy) |
| tests/Dockerfile | `stencilworks-tasks/loop-cycle-controls/tests/Dockerfile` |
| BUNDLE.md | `stencilworks-tasks/loop-cycle-controls/BUNDLE.md` — layout guide |

See **BUNDLE.md** for editable vs frozen files and placeholder fields in `task.toml`.

---

## Local verification

- Base + test.patch → cycle tests **fail** (feature missing)
- Base + test.patch + solution.patch → cycle tests **pass**, full suite green

---

## Submit checklist

- [ ] Publish environment with base commit above
- [ ] Create task on platform; paste instruction + patches + config
- [ ] Paste RUN TESTS section into seeded `test.sh` (use platform Rust/cargo CTRF template if provided)
- [ ] Fill `display_title` / `display_description` in task.toml
- [ ] Submit and monitor pipeline

---

## Errors & fixes

_(none on platform yet)_
