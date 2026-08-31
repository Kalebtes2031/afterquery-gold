Once-Only Candidate Item Review Verification Effects

Ensure candidate item review verification side effects occur only once, even under concurrent or retried reviews.

- State Transitions & Incentive Adjustment:
  `PUT /api/v1/candidate-item-reviews/:id` manages review status (`{ "isApproved": boolean }`). Approving an unmoderated review awards monetary incentives to the reviewer. Subsequent approvals on an already approved review must not repeat incentive awards.
  Rejecting an approved review deducts previously awarded incentives from the reviewer and marks the review as unapproved.

- Parent Item Verification Guard:
  Before approving a candidate item review, verify that the parent Item is already approved. If the item is not approved, return HTTP 400 Bad Request with `{"success": false, "message": "Item is not approved yet"}`.

- Batch Moderation Endpoint:
  Add `PUT /api/v1/candidate-item-reviews/batch-manage` accepting `{ "reviews": [...] }`. Each item requires `reviewId` and `isApproved`.
  Return HTTP 200 with `{ "success": true, "message": "...", "data": [...] }` containing moderated review records in the exact order requested.

- Strict Validation & Atomic Rollback:
  Missing, non-array, or empty `reviews` returns HTTP 400.
  Duplicate `reviewId` values return HTTP 400 with `Duplicate review id`.
  If any review in a batch fails validation, is not found (HTTP 404), or encounters an error, roll back the entire batch.

Keep existing authorization and error conventions.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
