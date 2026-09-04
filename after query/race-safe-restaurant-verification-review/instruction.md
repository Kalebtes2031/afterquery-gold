Ensure that the blending of candidate restaurant approval and rejection is both race-safe, atomic, and batchable.

The APIs for both candidate restaurant approval and rejection should be run within a single transaction. The candidate restaurant approval should entail the creation of the restaurant, obtaining or creating the parent company or chain based on the information present in its name until the first | symbol, marking the candidate as approved, and rolling out the incentive for the submitter, if available, by applying 20 points of incentive value and creating a new row entry of the type General for the incentive list. Candidate restaurants with no owner should carry out the approval without carrying out the approval process. For any candidate restaurant that is linked with another candidate restaurant, its admin will receive the admin account and the email with credentials only if the parent company has no admin account created previously.  If that admin account was created already, the APIs will return the error code 409 along with the message that this action cannot be performed. If the candidate restaurant is rejected, the answer will state that the candidate restaurant has been marked as rejected, while the linked candidate restaurant should also be rejected.

Lock each candidate during review so concurrent requests are serialized. For competing or duplicate reviews, exactly one request should succeed with 200; the other should return 409, stating that the candidate is already approved or rejected. Unknown candidates return 404 with Candidate Restaurant not found. Finalized candidates return 409 with Candidate Restaurant already approved or Candidate Restaurant already rejected. Keep the existing admin guard and its 401 behavior.

Both endpoints should return the existing success/error response structures.

On successful review, create one notification per admin naming the restaurant, with the acting admin recorded as the actor.

Add PUT /api/v1/candidate-restaurants/review-batch accepting:
{"items":[{"candidateRestaurantId":"<id>","action":"approve|reject"}]}

Handle the entire batch at one go, keep the order of requests intact, collect the submitter rewards throughout approvals, and roll back if something goes wrong, is incomplete or invalid, is already finished, or is unable to deliver notifications. Return error code 400 in case of empty, incorrect, or missing 'items', non-object entries, incorrect IDs, wrong actions, and duplicates; duplicates must be labelled as 'Duplicate candidate restaurant id'. Successful batches act according to the given algorithm and respond in the following way: {"success":true,"data":[...]}

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
