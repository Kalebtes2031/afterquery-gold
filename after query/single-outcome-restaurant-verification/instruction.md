### Restaurant Claim Verification

Improve the restaurant claim verification flow so that both single and batch operations are reliable and fully transactional.

For the existing approve/reject endpoints:

* `PUT /api/v1/restaurant-claim-request/:claimId/approve`
* `PUT /api/v1/restaurant-claim-request/:claimId/reject`

Only `Pending` claims can be processed. Approval changes the status to `Approved`, while rejection changes it to `Rejected`. Once a claim is already in a terminal state, any further approve/reject attempt should return **409 Conflict**. Rejection should support an optional `rejectionReason`.

When approving a claim, also set the linked restaurant chain's `is_verified` to `true` and send `RestaurantClaim` notifications to all super admins. These changes must happen within the same transaction.

Add:

`POST /api/v1/restaurant-claim-request/batch-verify`

It should accept a `claims` array containing `claimId`, `action` (`approve`/`reject`), and optional `rejectionReason`. Return **200** with results in the exact order provided.

Validation must return **400** for missing/empty payloads, invalid actions, or duplicate claim IDs. For duplicates, use the exact message: `Duplicate claim request id`.

If any batch claim is invalid, missing (**404**), or already terminal (**409**), roll back the entire batch with no partial changes.

Keep existing authentication, routes, and response conventions unchanged.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
