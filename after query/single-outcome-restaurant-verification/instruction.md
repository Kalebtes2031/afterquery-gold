Ensure that the restaurant claims cycle through deterministic lifecycles with only one possible outcome. 

All admin endpoints, ‘PUT/api/v1/restaurant-claim-request/:claimId/approve’ and ‘PUT/api/v1/restaurant-claim-request/:claimId/reject,’ should process claim verification decisions atomically. Claims are initially created in Pending status, transitioning to exactly one terminal state: either Approved or Rejected. Upon completion, the decision cannot change. If the user tries to approve or reject an already approved request, the system responds with HTTP 409 and the message “Claim request already approved.” If tries to approve or reject a claim request previously denied by the admin, the system responds with HTTP 409 and message “Claim request already rejected.” If the admin tries to approve or reject a claim request using a non-existent ID, the system responds with HTTP 404 and the message “Request not found.”


The new endpoint for verifying admin batch requests shall be added as `PUT /api/v1/restaurant-claim-request/verify-batch` expecting the following input: `{ "claims": [{ "claimId": string, "action": "approve" | "reject", "reason"?: string }] }`. The list of claims must be populated and each claim must contain a valid id and action. The error shall be raised in case of duplicate ids.

All claims must be verified in one database transaction. If any claim gets failed, does not exist or is already in final state, all batch operation must be canceled without changes. In case of successful verification, chain meta will be added and notification will be sent out once.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.