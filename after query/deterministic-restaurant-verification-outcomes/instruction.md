We need to make restaurant claim verification outcomes deterministic, stable, and resilient against concurrent reviews and retried actions.

Currently, approving or rejecting a restaurant claim request does not enforce terminal state guards, resulting in duplicate processing, inconsistent responses, and conflicting chain updates under concurrent requests.

Update the restaurant claim verification workflow to satisfy the following requirements:
- Ensure each restaurant claim request transitions through valid lifecycle states (Pending -> Approved or Pending -> Rejected). Once in a terminal state, subsequent approval or rejection attempts must be rejected with a 409 Conflict error.
- When approving a claim with an associated restaurant chain (restaurant_chain_id present), synchronize and mark the chain as verified within the same transaction.
- Create administrator notification records upon approval to alert super admins of the verified claim.
- Provide a batch verification endpoint `POST /api/v1/restaurant-claim-request/batch-verify` accepting `{ claims: [{ claimId, action, rejectionReason? }] }` that processes mixed approvals and rejections atomically in the exact order specified.
- Enforce strict validation on batch payloads: reject requests missing required fields, containing unknown actions, or containing duplicate claim IDs with 400 Bad Request.
- If any individual claim in a batch fails validation, is not found, or is in an invalid state, roll back the entire batch transaction so no partial modifications persist.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.