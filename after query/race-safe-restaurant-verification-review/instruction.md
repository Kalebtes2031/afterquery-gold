Ensure race-safe and atomic processing of the review workflows for candidate restaurants.

The APIs PUT /api/v1/candidate-restaurants/:candidateRestaurantId/approve and PUT /api/v1/candidate-restaurants/:candidateRestaurantId/reject must handle reviews atomically. Approving a restaurant means the creation of that restaurant, linking of its location and chain, generating requested credentials, updating the status of a candidate to approved, and awarding 20 bonus points to the user who submitted the review. Rejecting means that the candidate gets the new status "rejected," and its candidates' admin users are rejected from the system.

It is important to ensure that state transitions are free from race conditions and illegal mutations. If an approved candidate is approved once again, it returns an error with the description "Candidate Restaurant already approved." If a rejected candidate is rejected again, it returns "Candidate Restaurant already rejected." If a candidate does not exist, it returns "Candidate Restaurant not found," and an unauthenticated request will return "Unauthorized."

An administrator endpoint should be established: PUT /api/v1/candidate-restaurants/review-batch which will accept { "items": [{ "candidateRestaurantId": string, "action": "approve" | "reject" }] }. There should be at least one item present in the items array.The ID should be valid and an action should be provided otherwise the request should result in an error. If the same ID is present in the request, please respond with status 400 and a message containing "Duplicate candidate restaurant id".


Batch moderation will happen in one transaction in the DB. If one of the candidate restaurants fails in the verification process or is finalized already, the batch will be rolled back and there won’t be any partial writes or remaining bonuses. User awards should accumulate properly in case of multiple approved items. HTTP 200 response should be returned with { "success": true, "data": [...] } where the data includes all items in the original request order.

An administrator endpoint should be established: PUT /api/v1/candidate-restaurants/review-batch which will accept { "items": [{ "candidateRestaurantId": string, "action": "approve" | "reject" }] }. There should be at least one item present in the items array.The ID should be valid and an action should be provided otherwise the request should result in an error. If the same ID is present in the request, please respond with status 400 and a message containing "Duplicate candidate restaurant id".


Batch moderation will happen in one transaction in the DB. If one of the candidate restaurants fails in the verification process or is finalized already, the batch will be rolled back and there won’t be any partial writes or remaining bonuses. User awards should accumulate properly in case of multiple approved items. HTTP 200 response should be returned with { "success": true, "data": [...] } where the data includes all items in the original request order.

IMPORTANT: Please finish this in a separate branch created from main and commit the changes after completion.