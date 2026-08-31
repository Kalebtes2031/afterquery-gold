Ensure that restaurant claim requests cycle through deterministic lifecycles with exactly one outcome.

Admin endpoints `PUT /api/v1/restaurant-claim-request/:claimId/approve` and `PUT /api/v1/restaurant-claim-request/:claimId/reject` must process claim verification decisions atomically. Claims start in Pending status, transitioning into one terminal state: Approved or Rejected. Once finalized, the decision is immutable. Approving or rejecting an already approved request returns HTTP 409 with "Claim request already approved". Approving or rejecting an already rejected request returns HTTP 409 with "Claim request already rejected". A non-existent claim ID returns HTTP 404 with "Request not found".

Add admin batch verification endpoint `PUT /api/v1/restaurant-claim-request/verify-batch` accepting `{ "claims": [{ "claimId": string, "action": "approve" | "reject", "reason"?: string }] }`. The list of claims must be non-empty and each item must contain a valid ID and action. Duplicate claim IDs must return HTTP 400 with "Duplicate claim request id".

All claims in a batch must be verified in a single database transaction. If any claim fails validation, does not exist, or has already reached a terminal state, the entire batch must be rolled back without partial changes. When approved, associate chain metadata and dispatch notification side effects once. Return HTTP 200 with `{ "success": true, "data": [...] }` containing updated claims in the requested order.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
