The pipeline
Every submission runs the full pipeline before human review. Each stage is visible live on the task page, including per-trial progress and the job directory of every run.

Automated checks — required files, frozen-file integrity, configuration values, patch scope floors, instruction bounds, blocked terms. Instant feedback at submit.
AI check — the instruction file is screened for AI-generated text. Write the instruction in your own words; flagged submissions are rejected.
Originality — the task is compared against previously submitted tasks (instruction wording and the set of files the patches change). Near-duplicates of anyone's task, including your own live ones, are rejected. Submit original work.
Reference verification — your reference solution and the unchanged repository each run three times on the real harness: the reference must pass every run, the unchanged repository must fail every run. Any deviation (including flakiness across the repeats) fails the stage.
Quality review — an automated reviewer reads the entire bundle against a quality rubric: instruction/test alignment, instruction writing quality (it must read like a real work request in natural, concise, behavior-focused prose, not a padded or templated specification), verifier integrity, test structure, environment cleanliness. Blocking criteria reject; advisory ones are surfaced to the human reviewer.
Calibration (two rounds) — independent automated attempts at the full time budget establish where your task sits. A task solved too often is too easy and fails. A task solved too rarely is above the accepted difficulty range and also fails. Only tasks inside the target range proceed.
Run audit — the unsuccessful calibration attempts are audited: genuine difficulty passes; failures caused by a broken environment, a flaky verifier, or a grading defect fail the task.
Human review — a reviewer makes the final call. Rejections always include a written reason.
Failures are classified: verdict failures are about the task; infra failures are platform flakes, never count against you, and get re-run.