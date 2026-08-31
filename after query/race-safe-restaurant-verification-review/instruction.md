Enforce race-safe and transactional review workflows for candidate restaurants.

Admin endpoints `PUT /api/v1/candidate-restaurants/:candidateRestaurantId/approve` and `PUT /api/v1/candidate-restaurants/:candidateRestaurantId/reject` must process reviews atomically. Approving a pending candidate provisions the restaurant, links location and chain metadata, creates candidate admin credentials if requested, transitions candidate state to approved, and awards 20 incentive points to the submitter. Rejecting transitions state to rejected and marks associated candidate admin users rejected.

Protect all state transitions against race conditions and invalid mutations. Approving or rejecting an already approved candidate returns HTTP 409 with message "Candidate Restaurant already approved". Approving or rejecting an already rejected candidate returns HTTP 409 with message "Candidate Restaurant already rejected". A non-existent candidate returns HTTP 404 with message "Candidate Restaurant not found".

Add admin batch moderation endpoint `PUT /api/v1/candidate-restaurants/review-batch` accepting `{ "items": [{ "candidateRestaurantId": string, "action": "approve" | "reject" }] }`. The `items` array must be non-empty, and each item must provide a valid ID and action. If duplicate IDs appear in the request, return HTTP 400 with "Duplicate candidate restaurant id".

Batch moderation runs in a single database transaction. If any candidate fails validation, does not exist, or has already been finalized, the entire batch must roll back completely without partial writes. Return HTTP 200 with `{ "success": true, "data": [...] }` containing resulting records in the exact requested order.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.