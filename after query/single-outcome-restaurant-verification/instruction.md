Reliable Restaurant Claim Verification Workflow

Update restaurant claim verification to enforce strict terminal state transitions, chain synchronization, and atomic batch moderation.

- State Transitions & Guards:
  `PUT /api/v1/restaurant-claim-request/:claimId/approve` and `PUT /api/v1/restaurant-claim-request/:claimId/reject` transition a Pending claim to Approved or Rejected and respond with HTTP 200 `{ "success": true, "message": "...", "data": { ... } }`, where `data` reports the claim's `id`, `restaurant_id`, `restaurant_chain_id`, resulting `status` (`"Approved"` / `"Rejected"`), `rejection_reason`, and the reviewer.
  An unknown `claimId` returns HTTP 404.
  Once in a terminal state, subsequent approval or rejection attempts must return HTTP 409 Conflict with `{ "success": false, "message": "..." }`.
  Rejecting accepts an optional `rejectionReason` in the request body; when supplied it is echoed back on `data.rejection_reason`.
  Each single transition runs in its own transaction and rolls back completely on any failure.

- Side Effects on Approval:
  When approving a claim with a `restaurant_chain_id`, set the associated `RestaurantChain.is_verified = true` in the same transaction. A claim with no `restaurant_chain_id` triggers no chain lookup or update.
  Create a `Notification` for every super admin user (`AdminUser` with `is_super_admin: true`) with category `RestaurantClaim`.

- Batch Verification Endpoint:
  Add `POST /api/v1/restaurant-claim-request/batch-verify` accepting `{ "claims": [...] }`. Each item requires `claimId` and `action` (`"approve"` or `"reject"`, case-insensitive), with an optional `rejectionReason`.
  `claimId` values are trimmed before use.
  Return HTTP 200 with `{ "success": true, "message": "...", "data": [...] }` containing the verified claim records in the exact order requested.

- Strict Validation & Atomic Rollback:
  Missing, non-array, or empty `claims` returns HTTP 400.
  A non-object entry returns HTTP 400 with a message of the form `Claim item at index <n> must be an object`.
  A missing or blank `claimId`, or an unknown `action`, returns HTTP 400.
  Duplicate `claimId` values in a batch (compared after trimming) return HTTP 400 with a message containing `Duplicate claim request id`.
  Process the whole batch in one transaction: if any claim fails, is not found (HTTP 404), or conflicts with an existing terminal state (HTTP 409), roll the entire batch back.

- Verification Metrics:
  Add `GET /api/v1/restaurant-claim-request/metrics` returning HTTP 200 `{ "success": true, "message": "...", "data": { ... } }` with aggregated counts: `totalClaims`, `pendingCount`, `approvedCount`, `rejectedCount`, and `chainLinkedCount`.

Keep existing authorization and error-handling conventions: the approve, reject, batch-verify, and metrics routes stay behind admin authorization and return HTTP 401 when the caller is unauthenticated.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
