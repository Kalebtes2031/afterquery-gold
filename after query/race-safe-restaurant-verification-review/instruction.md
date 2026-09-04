Ensuring the candidate restaurants are approved and rejected is done in a way that is race-safe, atomic, and batchable. 

The processes of approval and rejection will be done in a single transaction. The process of approval creates the restaurant, looks for the parent company or chain using the part before the first `|`, marks the candidate as approved, awards 20 points to the submitter if he exists, and adds an entry into the `General` incentive history. Candidate restaurants with no owners will be approved without any awards being given. 

In the case of linked candidate restaurants, the administration account has to be created and the access credentials should be provided in the case when the parent company doesn’t have any existing admin account. The `409` status has to be returned and none of the changes to be made otherwise – if an admin already exists, all the changes should be rolled back. Rejection will mark the candidate and its linked candidate restaurant as rejected but will not create any restaurants.

During the evaluation process, every candidate should be locked so that processing can happen only in a sequential manner. In case of multiple requests for the same review of a candidate, only one request will process successfully returning a `200` response while the other will return a `409` response stating that the candidate has already either been approved or rejected. If the candidate is unknown then the response will be `404` with a message of `Candidate Restaurant not found`. In instances of finalized candidates, the response would be `409` stating `Candidate Restaurant already approved` and `Candidate Restaurant already rejected`. The existing admin guard and the `401` mechanism must not be removed.


When processing is done successfully, there must be a notification created for each of the admins regarding the restaurant and mentioning the person who has done the reviewing.

Add `PUT /api/v1/candidate-restaurants/review-batch` accepting `{"items":[{"candidateRestaurantId":"<id>","action":"approve|reject"}]}`. Handle the whole batch at once, so that requests retain their order of arrival, rewards of submitters are accumulated, and if any item is defective, absent, settled, repeated, or notifications cannot be preserved, the process should be canceled. Invalid inputs and duplicates must get response `400`; duplicate IDs should be marked Duplicate candidate restaurant id. In case of success, the response must be {"success":true,"data":[...]}.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
