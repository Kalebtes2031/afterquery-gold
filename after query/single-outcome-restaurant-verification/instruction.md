Tighten restaurant claim verification so Pending claims reach one terminal outcome, stay aligned with linked chains, and support atomic batch review.

`PUT /api/v1/restaurant-claim-request/:claimId/approve` and `PUT /api/v1/restaurant-claim-request/:claimId/reject` return HTTP 200 `{ "success": true, "message": "<text>", "data": { "id", "restaurant_id", "restaurant_chain_id", "status", "rejection_reason", "reviewed_at", "reviewed_by", "chain_verified", "notifications_created" } }` with `status` exactly `"Approved"` or `"Rejected"`. Unknown ids return 404. Already Approved or Rejected claims return 409 `{ "success": false, "message": "<text>" }`. Reject may send optional body field `rejectionReason`, which is echoed on `data.rejection_reason`. Each single transition is atomic and rolls back on failure, including when notification writes fail.

On approve, when `restaurant_chain_id` is set, set that chain's `is_verified` to true in the same transaction; a null chain id skips chain work and leaves `chain_verified` false. Write a Notification with category `RestaurantClaim` for every super-admin AdminUser. `notifications_created` is that count (zero on reject).

Add `POST /api/v1/restaurant-claim-request/batch-verify` accepting `{ "claims": [ { "claimId": "<id>", "action": "approve"|"reject", "rejectionReason"?: "<text>" } ] }`. Actions are case-insensitive; trim `claimId` values. Success is 200 `{ "success": true, "message": "<text>", "data": [ <same per-claim data object>, ... ] }` in request order. Missing, non-array, or empty `claims` returns 400. A non-object entry returns 400 whose message contains `Claim item at index <n> must be an object`. Blank `claimId` or unknown `action` returns 400. Duplicate trimmed ids return 400 with message containing `Duplicate claim request id`. Validate the payload before any mutation, then run the batch in one transaction so any 404 or 409 rolls earlier changes back.

Add `GET /api/v1/restaurant-claim-request/metrics` returning 200 with `data` fields `totalClaims`, `pendingCount`, `approvedCount`, `rejectedCount`, and `chainLinkedCount`.

Approve, reject, batch-verify, and metrics require the existing admin guard and return 401 when unauthenticated.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
