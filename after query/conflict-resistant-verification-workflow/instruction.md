Reliable Candidate Restaurant Verification Workflow

Replace the separate candidate-restaurant approve and reject endpoints with one race-safe review endpoint, an atomic batch endpoint and a metrics endpoint, all behind the existing admin guard.

Single review — `PUT /api/v1/candidate-restaurants/:candidateRestaurantId/review`, body `{ "action": "approve" | "reject", "rejectionReason"?: string }`. Match `action` case-insensitively after trimming. Work in one transaction and take a row-level lock on the candidate so reviewers serialize.

Approving a pending candidate marks it approved, creates the live `Restaurant` (same name, description and opening/closing hours, opened), copies every candidate menu image into a restaurant image row (the new `restaurant_id` and the image `url`), and writes one notification per admin user — actor is the reviewer, text names the restaurant. Rejecting marks it rejected and stores the trimmed `rejectionReason` (missing or whitespace-only becomes `null`); rejection creates no restaurant, media or notifications. Any failure rolls the whole transaction back, leaves the candidate pending, and answers with that failure's status (a throwing side effect becomes 500).

Batch review — `PUT /api/v1/candidate-restaurants/batch-review`, body `{ "reviews": [ { "candidateRestaurantId": string, "action": "approve" | "reject", "rejectionReason"?: string }, ... ] }`. Review every entry by the single-review rules in one shared transaction; if any entry is not found, already reviewed, or otherwise fails, roll the whole batch back and return that entry's status with no `data`. Trim each id before lookup; return the results in request order.

Metrics — `GET /api/v1/candidate-restaurants/metrics` returns pending, approved, rejected and total candidate-restaurant counts; `pending` is never negative.

    Statuses & messages:
      unknown candidate ............................. 404
      candidate already approved / rejected ......... 409, message states which
      action not approve/reject .................... 400, message mentions "approve or reject"
      reviews missing / not an array / empty ....... 400, "The reviews field must be a non-empty array"
      a review entry is not an object ............... 400
      entry has no non-empty string candidateRestaurantId ... 400
      candidateRestaurantId repeats after trimming . 400, exactly "Duplicate candidate restaurant id"

    review object:
    { "candidate_restaurant_id": string, "name": string,
      "status": "approved" | "rejected", "rejection_reason": string | null,
      "restaurant_id": string | null,   // new restaurant on approve, else null
      "reviewed_by": string }           // acting admin id

    single 200:  { "success": true, "message": string, "data": <review object> }
    batch 200:   { "success": true, "message": string, "data": [ <review object>, ... ] }
    metrics 200: { "success": true, "message": string,
                   "data": { "pending": n, "approved": n, "rejected": n, "total": n } }
    any error:   { "success": false, "message": string }

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
