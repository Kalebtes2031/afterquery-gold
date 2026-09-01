Approving and rejecting candidate restaurants must be atomic and safe against concurrent admin actions on the same candidate.

In one transaction, the approve endpoint (PUT /api/v1/candidate-restaurants/:candidateRestaurantId/approve) creates the live restaurant, finds or creates its chain from the name up to " | ", approves the candidate, and—if it has a submitter—adds 20 incentive points (create the row if absent) plus a General history entry. If a candidate admin is linked, create its admin account, email the credentials, set it as the chain's admin if none exists, and approve it; if it is already approved, fail with 409. reject works the same way, rejecting the candidate and any linked candidate admin.

On any failure, roll everything back, leave the candidate pending, and answer with the failure's status (e.g. 500 when the credentials email throws). Lock the candidate row so concurrent reviews serialize. Unknown id → 404 with message "Candidate Restaurant not found"; already-finalized → 409, the message saying which (already approved or rejected). Each success writes one notification per admin that records the candidate and the acting admin. Leave the existing admin guard on all three endpoints, so a caller it rejects still gets that guard's own 401.

Both endpoints answer 200 with a data object; `restaurant_id` is the new restaurant on approval, `null` on rejection:

    { "success": true,
      "data": { "candidateRestaurantId": "<url id>", "action": "approve"|"reject",
                "is_approved": <bool>, "is_rejected": <bool>, "restaurant_id": "<id>"|null } }

Also add PUT /api/v1/candidate-restaurants/review-batch, running the whole batch in one transaction that any failing item (unknown or already-finalized candidate) rolls back:

    request:  { "items": [ { "candidateRestaurantId": "<id>", "action": "approve"|"reject" }, ... ] }
    200 body: { "success": true, "data": [ <one entry per item, request order, shaped like the data object above> ] }

Answer 400 for missing or empty `items`, an entry that is not an object or has no usable `candidateRestaurantId`, an `action` that is neither "approve" nor "reject", or a repeated id — exact message "Duplicate candidate restaurant id".

Every error these handlers raise responds `{ "success": false, "message": "<text>", "statusCode": <status> }` with the status above.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
