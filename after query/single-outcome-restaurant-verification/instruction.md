Make restaurant claim verification reliable and atomic across single and batch operations.

When approving or rejecting a pending restaurant claim via PUT /api/v1/restaurant-claim-request/:claimId/approve and PUT /api/v1/restaurant-claim-request/:claimId/reject, transition the claim from Pending to Approved or Rejected. Once a claim reaches a terminal state, subsequent approval or rejection attempts must return HTTP 409 Conflict. Rejecting a claim accepts an optional rejectionReason in the request body.

Approving a claim must also verify the associated restaurant chain by setting is_verified to true when linked, and dispatch notifications to all super admin users under the RestaurantClaim category within the same transaction.

Add a batch verification endpoint at POST /api/v1/restaurant-claim-request/batch-verify that takes a claims array containing claimId, action ('approve' or 'reject'), and optional rejectionReason. The endpoint must return HTTP 200 with the verified records in the exact order requested.

Validation and transactional integrity must be strict: return HTTP 400 for empty or missing payloads, unknown actions, or duplicate claim IDs in a batch with message 'Duplicate claim request id'. If any claim in a batch fails, is not found (HTTP 404), or is already in a terminal state (HTTP 409), the entire batch transaction must roll back cleanly.

Existing authentication, routes, and response conventions remain unchanged.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
