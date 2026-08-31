Reliable Candidate Moderation Flow

Keep `PUT /api/v1/candidate-items/:id` unchanged. Approving a Pending or Rejected candidate with an owner adds 10 points. Rejecting an Approved candidate removes 10 points, while rejecting a Pending candidate leaves the balance unchanged. Ownerless candidates can still be moderated without creating an incentive record.

State, category, media, incentives, and batch notifications update atomically. If any write fails, roll back the batch. Concurrent requests for one candidate allow one transition, while same-owner candidates preserve reward updates.

Add `PUT /api/v1/candidate-items/moderate-batch` with `{ "items": [...] }`. Each item needs `id` and `isApproved`. `mediaImages` and `mediaVideos` are optional. Each image needs `highQualityImg`; `mediumQualityImg` and `lowQualityImg` are optional. `mediaVideos` is an array of URLs. Missing required fields return HTTP 400.

Supplied media replaces only that type. Empty arrays clear it; omitted media stays unchanged. Return `{ "success": true, "data": [...] }` in request order.

For every moderated batch candidate with an owner, create one notification linked to both in the same transaction. If the batch rolls back, no notification rows remain. Overlapping batches must not create duplicate notifications for transitions that did not commit.

Missing candidates, repeated states, duplicate IDs, or write failures roll back. Duplicate IDs return HTTP 400 with `Duplicate candidate item id`.

Overlapping batches must preserve rewards, avoid partial commits, duplicate transitions, and deadlocks with IDs in different orders.

Keep authorization and errors unchanged.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.