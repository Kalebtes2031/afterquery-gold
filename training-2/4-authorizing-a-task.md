Authoring a task
Creating a task (pick repository, published environment, task name, category) seeds a draft workspace with the complete bundle. Most files are generated and must stay untouched — the automated checks regenerate and byte-compare them. You edit five:

instruction.md	The task instruction, written like a real work request (see the skeleton below). Must end with the generated IMPORTANT line.
solution/solution.patch	Your reference solution as a unified diff against the base commit. Every fail-to-pass test must pass with it applied.
tests/test.patch	A unified diff ADDING your new tests at the base commit. Applied only inside the verifier — the solver never sees these tests.
tests/config.json	The graded test ids: f2p_node_ids (new tests) and p2p_node_ids (existing tests that must keep passing), plus the report format.
tests/test.sh	Only the marked RUN TESTS middle section — the commands that run your suite and write the report files.
Generated and frozen: task.toml, pre_artifacts.sh, environment/Dockerfile, tests/grader.py, tests/Dockerfile, solution/solve.sh, and the frame of tests/test.sh. Fill in the two task.toml metadata placeholders (display title and description); everything else in it is fixed.

Write the instruction the way you would brief a capable colleague. Open with the problem or the need, then describe the finished behavior: inputs, outputs, edge cases, error handling, precisely enough that an engineer who has never seen your change could implement it from the text alone. Name the public surface your tests exercise (commands, endpoints, exported names, output shapes, exact strings your tests match) naturally in prose, and leave file layout, helper names, and other internal decisions to the implementer: any correct implementation shape must be able to satisfy the text. Never reference your tests, hidden files, or external links. Write it in your own words and your own structure: flowing developer prose, no fill-in template, no numbered requirement ledger. A worked example:

Add per-token rate limiting to the public API.

Right now requests to /api/v1/* are served unconditionally, so a single token
can issue unlimited requests. We want requests beyond 60 per rolling minute
per API token to get an HTTP 429 with body
{"error": "rate_limited", "retry_after_seconds": <n>}. The window is per
token, not per IP; unauthenticated requests share one global bucket of 10
per minute. Responses under the limit must be unchanged apart from a new
X-RateLimit-Remaining header, and existing endpoints keep their current
response shapes for admitted requests. Limits should be configurable through
the existing config module.

Two boundary cases matter: a request that arrives exactly as the window
resets is admitted, and clock skew between workers must not double-count a
request against the window.

IMPORTANT: Please work on this in a new branch from main and commit
everything when you are done.
Why this reads like a strong task. The strongest instructions are dense work requests; yours should read the same way. Each part of the example above earns its place — aim for the same density:

Opens with the goal	The first sentence names the behavior to build ("Add per-token rate limiting"), not the defect. The goal is clear immediately.
Developer prose, your own shape	Written the way you would brief a colleague: flowing prose, no header template, no bullet checklist. State the contract (observable behavior), not a sequence of edit steps, so any correct implementation shape can satisfy it.
Exact observable values	60 requests/minute, HTTP 429, the literal JSON body, the X-RateLimit-Remaining header. Concrete numbers and output shapes, but no internal module layouts, helper names, or struct fields; where the change lives is the solver’s job to discover.
Named edge cases	The window-reset boundary and cross-worker clock skew are spelled out, giving the tests precise, non-obvious conditions to check.
Existing behavior stays green	Under-limit responses stay unchanged, and your verifier must actually check that by running the repository’s existing suite as regression cover.
Self-contained and tight	Nothing points at the held-out tests, internal files, commit history, or external links, and it stops once the contract is stated. A spec that enumerates everything measures transcription, not engineering.
The final line is load-bearing and must be kept exactly as generated — committed work is the only thing the verifier ever sees:

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.