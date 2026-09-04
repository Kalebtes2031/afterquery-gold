Approving and rejecting candidate restaurants must stay atomic when admins act on the same candidate at once.

`PUT /api/v1/candidate-restaurants/:candidateRestaurantId/approve` runs in one transaction: create the restaurant, find or create its chain from the name before `" | "`, approve the candidate, and when a submitter exists add 20 incentive points plus one `General` history entry (create the row if missing). A linked candidate admin gets an admin account, credentials email, chain assignment only when the chain has no admin, and approval; an already-approved candidate admin fails with 409 containing "already approved".

`PUT /api/v1/candidate-restaurants/:candidateRestaurantId/reject` rejects the candidate and linked candidate admin atomically. Any failure — including credential email or final notification persistence — rolls everything back. Lock the candidate so concurrent reviews serialize. Unknown candidates return 404 `"Candidate Restaurant not found"`; finalized ones return 409 stating approved or rejected. Success writes one notification per admin naming the restaurant, with the acting admin as actor. Keep the existing admin guard and its 401.

Both endpoints return 200 as `{"success":true,"data":{"candidateRestaurantId":"<id>","action":"approve|reject","is_approved":<bool>,"is_rejected":<bool>,"restaurant_id":"<id>|null"}}`.

Add `PUT /api/v1/candidate-restaurants/review-batch` with `{"items":[{"candidateRestaurantId":"<id>","action":"approve|reject"}]}`. Process the batch in one transaction, keep request order, and roll back if any item fails. Success uses the same data shape per item. Return 400 for missing or empty `items`, non-object entries, missing, blank, or non-string IDs, malformed nonempty non-UUID IDs, invalid actions, or duplicates; duplicates must say exactly `"Duplicate candidate restaurant id"`. Handler errors return `{"success":false,"message":"<text>","statusCode":<status>}`.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
