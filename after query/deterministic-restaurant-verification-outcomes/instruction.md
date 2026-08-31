We need to introduce a reliable and stable solution for restaurant claim verification processes.

At this moment, it does not require moving requests to a terminal state which results in duplicate processing of claims and differences in responses.

The approach to restaurant claim verification should be revised so that at least the following rules should be met:

- On the way to the terminal states, only valid statuses should be assumed (Pending -> Approved or Pending -> Rejected) so that if any attempt at the approval or disapproval of the already verified claim is made, a 409 Conflict message is shown.

- If restaurant chain (with restaurant_chain_id) is approval relevant, the restaurant chain should be validated in the same transaction together with the claim approval.

- When the claim is approved, super admins should receive notifications about the newly-verified claim.

- Provide a batch verification endpoint `POST /api/v1/restaurant-claim-request/batch-verify` which accepts `{ claims: [{ claimId, action, rejectionReason? }] }` and processes approvals and rejections in the order specified.
- Batch payloads should be validated strictly: requests missing required fields, requests that contain actions we don't know, and those with claims that violate duplicate claim IDs will automatically be rejected with 400 Bad Request.
- Must roll back the entire transaction batch if any claim fails validation, cannot be found or if its state is invalid.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.