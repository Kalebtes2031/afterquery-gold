Scope requirements
Tasks must be substantial, multi-file engineering work — not one-line fixes. The automated checks enforce these minimums:

Reference solution	≥ 459 added lines, across at least 4 files
Held-out tests	≥ 596 added lines, across at least 2 test files
Instruction	100 – 300 words, and aim near 250. A strong instruction states the required behavior and stops; padding toward the cap reads as a spec dump and hurts review.
Instruction-to-solution balance	0.9 – 7.5 added solution lines per instruction word. A short spec driving a deep change is the goal; a spec that narrates the implementation line by line is rejected.
Fail-to-pass tests	At least 8 named tests, and aim for 20+
Pass-to-pass tests	At least 50 tests that stay green. Pin the full existing suite, and add regression tests if the repository has fewer
Time budget	Fixed platform standard: 90 minutes for the attempt, 30 minutes for verification
These are floors, not targets — tasks near the minimums on every dimension tend to be rejected on quality. The resource envelope (CPU, memory, timeouts) is identical for every task and is not editable.