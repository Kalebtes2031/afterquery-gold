# context-format-suite — Progress Log

Task: fterquery/context-format-suite (stencilworks / newrepofromafterquery)
Batch slot: **4 / 10**
Theme: YAML / TOML / CSV context loaders
Primary modules: data/*, cli/commands/render, cli/args, error
Last updated: Sep 5, 2026

---

## Status

| Stage | Result |
|---|---|
| Draft scaffold | done |
| Instruction draft | done (210 words) |
| Solution patch | not started |
| Test patch | not started |
| config.json / test.sh | not started |
| Local fail@base / pass@solution | not started |
| Platform submit | not started |
| Automated checks | — |
| AI check | — |
| Originality | — |
| Reference verification | — |
| Quality review | — |
| Calibration | — |
| Human review | — |

---

## Goal (why this task)

Hard but solvable Jinja-gap feature for a zero-dependency engine. Multi-file language/runtime work with real edge cases (scope, depth, diagnostics). Disjoint from sibling batch tasks on primary files.

---

## Authoring checklist

- [x] instruction.md drafted (aim <=250, max 300) — currently **210** words
- [ ] Instruction names exact public surface tests will assert
- [ ] solution/solution.patch >=459 lines across >=4 files (fresh, not from history)
- [ ] 	ests/test.patch >=596 lines, >=2 files, aim 20+ F2P
- [ ] Test paths disjoint from solution paths
- [ ] 	ests/config.json pins full P2P suite + all F2P ids
- [ ] 	ests/test.sh RUN TESTS section only
- [ ] Local: base fails all F2P; solution passes all F2P; P2P green both sides
- [ ] No blocked platform vocabulary; no test references in instruction
- [ ] Ends with exact IMPORTANT line
- [ ] Submit and paste any failure into error.txt

---

## Errors & fixes

_(none yet — first pipeline failure goes in error.txt, summary here)_

---

## Notes

- Repo: 
ewrepofromafterquery (package stencilworks)
- Follow stencilworks-tasks/README.md + root 
eadme.md + 	raining-2/
- Keep solution original vs other batch tasks (different files + wording)
