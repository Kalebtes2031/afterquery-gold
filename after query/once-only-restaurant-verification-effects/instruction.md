We need to ensure side effects from restaurant review verifications happen only once, even when actions are retried or processed concurrently.

Currently, approving or rejecting candidate item reviews can double-award monetary incentives, duplicate notification alerts, or corrupt balances if duplicate requests or concurrent reviews occur.

Update the candidate item review verification workflow to satisfy the following requirements:
- Enforce strict once-only incentive awards: approving a candidate item review awards reviewer incentives based on rank in time, but retried approvals or concurrent submissions must not repeat incentive awards.
- When rejecting an already approved review, deduct previously awarded incentives only if the user has sufficient balance and update the terminal status cleanly.
- Verify parent item approval status before approving candidate item reviews, returning 400 Bad Request if the item is not yet approved.
- Provide a batch moderation endpoint `PUT /api/v1/candidate-item-reviews/batch-manage` accepting `{ reviews: [{ reviewId, isApproved }] }` that processes review verifications atomically with rollback on any failure.
- Enforce payload validation: reject missing arrays, empty lists, and duplicate review IDs with 400 Bad Request.
- Guarantee that database updates, media synchronization, and incentive adjustments commit within a single atomic transaction.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.