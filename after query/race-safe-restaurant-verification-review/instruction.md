Make the fix to approve and reject candidate restaurants atomic and immune to simultaneous requests.

For PUT /api/v1/candidate-restaurants/:candidateRestaurantId/approve, put the approval workflow in a single database transaction. That means creating the live restaurant, finding or creating the chain by the name until " | ", approving the candidate, giving the submitter 20 incentive points and creating a General history entry accordingly, and handling a candidate admin: creating the account, sending its credentials, associating with the chain if there is no admin yet and approving the candidate admin. In case of any failure, undo all actions, leaving the candidate restaurant pending. Both endpoints answer 200 `{ "success": true, "data": { ... } }` where data reports the candidate's `candidateRestaurantId`, the `action` taken, and the resulting `is_approved`/`is_rejected` flags.

Make the /reject endpoint transactional as well. Reject the candidate and candidate admin.

Lock the rows for each endpoint in order to prevent any other admin from finishing processing the same candidate. Return 409 with specific messages about already approved/rejected candidates and 404 for the unknown ID. Each successful call should trigger creation of notifications for each admin that the candidate was approved/rejected.

Implement PUT /api/v1/candidate-restaurants/review-batch with body { "items": [...] }. Verify the list is not empty, consists of valid IDs/actions, and does not contain duplicates. Return 400 with "Duplicate candidate restaurant id" message. Make the whole process transactional and rollback all actions on error for an unknown or already-finalized candidate restaurant. A successful response is 200 `{ "success": true, "data": [...] }` with one result per item, in the same order as the request, each shaped like the single-endpoint data above.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
