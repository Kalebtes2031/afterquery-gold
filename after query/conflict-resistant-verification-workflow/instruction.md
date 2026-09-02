Reliable Candidate Restaurant Verification Workflow

Add a race-safe review endpoint, an atomic batch endpoint and a metrics endpoint for candidate restaurants, all behind the existing admin guard. Leave the current approve and reject endpoints untouched.

Single review — `PUT /api/v1/candidate-restaurants/:candidateRestaurantId/review`, body `{ "action": "approve" | "reject", "rejectionReason"?: string }`. Match `action` case-insensitively after trimming; anything else is 400. Work in one transaction and take a row-level lock on the candidate so reviewers serialize.

Approving a pending candidate marks it approved and creates the live `Restaurant` — copying the candidate's name, description and opening/closing hours, and always opened (`is_open` true). Every candidate menu image is copied into a restaurant image row carrying the new `restaurant_id` and the image `url`. One notification is written per admin user: the actor is the reviewer and the text names the restaurant.

Rejecting marks the candidate rejected and stores the trimmed `rejectionReason` (missing or whitespace-only becomes `null`); it creates no restaurant, media or notifications.

Any failure rolls the whole transaction back, leaves the candidate pending, and answers with that failure's status — a throwing side effect such as the notification write becomes 500.

Batch review — `PUT /api/v1/candidate-restaurants/batch-review`, body `{ "reviews": [ { "candidateRestaurantId": string, "action": "approve" | "reject", "rejectionReason"?: string }, ... ] }`. Trim each id, review every entry by the single-review rules inside one shared transaction, and return the results in request order. If any entry is not found, already reviewed or otherwise fails, roll the whole batch back and answer with that entry's status and no `data`.

Metrics — `GET /api/v1/candidate-restaurants/metrics` returns candidate-restaurant counts by state; `pending` is `total − approved − rejected` floored at 0.

    Statuses & messages
      unknown candidate ............................. 404
      candidate already approved / rejected ......... 409, message states which
      action not approve/reject .................... 400, message mentions "approve or reject"
      reviews missing / not an array / empty ....... 400, "The reviews field must be a non-empty array"
      a review entry is not an object .............. 400, message mentions "object"
      entry has no non-empty string candidateRestaurantId ... 400, message mentions "candidateRestaurantId"
      candidateRestaurantId repeats after trimming . 400, exactly "Duplicate candidate restaurant id"

    review object (exact snake_case keys):
    { "candidate_restaurant_id": string, "name": string,
      "status": "approved" | "rejected", "rejection_reason": string | null,
      "restaurant_id": string | null,   // new restaurant on approve, else null
      "reviewed_by": string }           // acting admin id

    single 200:  { "success": true, "message": string, "data": <review object> }
    batch 200:   { "success": true, "message": string, "data": [ <review object>, ... ] }
    metrics 200: { "success": true, "message": string,
                   "data": { "pending": n, "approved": n, "rejected": n, "total": n } }
    any error:   { "success": false, "message": string, "statusCode": number }

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
