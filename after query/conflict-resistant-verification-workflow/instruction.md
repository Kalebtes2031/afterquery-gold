Reliable Candidate Restaurant Verification Workflow

Update candidate restaurant verification to enforce race-safe review serialization, media synchronization, and atomic batch moderation.

- State Transitions & Guards:
  `PUT /api/v1/candidate-restaurants/:candidateRestaurantId/review` transitions a Pending candidate restaurant to Approved or Rejected (`{ "action": "approve" | "reject", "rejectionReason"?: string }`). Once in a terminal state, subsequent review attempts must return HTTP 409 Conflict with `{"success": false, "message": "..."}`.

- Side Effects on Approval:
  When approving a candidate restaurant, automatically create and link the active `Restaurant` record and copy candidate media into `RestaurantMedia` within the same transaction.
  Create a `Notification` for super admins (`AdminUser` with `is_super_admin: true`) alerting them of the newly activated restaurant.

- Batch Review Endpoint:
  Add `PUT /api/v1/candidate-restaurants/batch-review` accepting `{ "reviews": [...] }`. Each item requires `candidateRestaurantId` and `action` (`"approve"` or `"reject"`), with optional `rejectionReason`.
  Return HTTP 200 with `{ "success": true, "message": "...", "data": [...] }` containing verified candidate restaurant records in the exact order requested.

- Strict Validation & Atomic Rollback:
  Missing, non-array, or empty `reviews` returns HTTP 400.
  Duplicate `candidateRestaurantId` values return HTTP 400 with `Duplicate candidate restaurant id`.
  Unknown actions return HTTP 400.
  If any candidate restaurant fails, is not found (HTTP 404), or is already reviewed (HTTP 409), roll back the entire batch.

Keep existing authorization conventions.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
