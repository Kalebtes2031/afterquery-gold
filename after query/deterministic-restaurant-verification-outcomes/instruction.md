Reliable Restaurant Claim Verification Workflow

Update restaurant claim verification to enforce strict terminal state transitions, chain synchronization, and atomic batch moderation.

- State Transitions & Guards:
  `PUT /api/v1/restaurant-claim-request/:claimId/approve` and `PUT /api/v1/restaurant-claim-request/:claimId/reject` transition a Pending claim to Approved or Rejected. Once in a terminal state, subsequent approval or rejection attempts must return HTTP 409 Conflict with `{"success": false, "message": "..."}`.
  Rejecting accepts optional `rejectionReason` in the request body.

- Side Effects on Approval:
  When approving a claim with `restaurant_chain_id`, set the associated `RestaurantChain.is_verified = true` in the same transaction.
  Create a `Notification` for every super admin user (`AdminUser` with `is_super_admin: true`) with category `RestaurantClaim`.

- Batch Verification Endpoint:
  Add `POST /api/v1/restaurant-claim-request/batch-verify` accepting `{ "claims": [...] }`. Each item requires `claimId` and `action` (`"approve"` or `"reject"`), with optional `rejectionReason`.
  Return HTTP 200 with `{ "success": true, "message": "...", "data": [...] }` containing verified claim records in the exact order requested.

- Strict Validation & Atomic Rollback:
  Missing, non-array, or empty `claims` returns HTTP 400.
  Duplicate `claimId` values in a batch return HTTP 400 with `Duplicate claim request id`.
  Unknown actions return HTTP 400.
  If any claim in a batch fails, is not found (HTTP 404), or conflicts with an existing terminal state (HTTP 409), roll back the entire batch transaction.

Keep existing authorization and error handling conventions.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
