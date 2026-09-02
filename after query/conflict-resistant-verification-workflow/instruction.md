Reliable Candidate Restaurant Verification Workflow

Add three admin-guarded endpoints, leaving the existing approve and reject routes untouched.

Single review — `PUT /api/v1/candidate-restaurants/:candidateRestaurantId/review`, body `{ "action": "approve" | "reject", "rejectionReason"?: string }`. Trim `action`, match case-insensitively; anything else is 400 mentioning "approve or reject". Run it in one transaction that row-locks the candidate so concurrent reviewers serialize. Unknown candidate: 404. Already approved or rejected: 409 whose message states which.

Approving marks it approved and creates the live `Restaurant` (candidate's name, description, opening/closing hours; always open). Each candidate menu image url becomes a restaurant image row. One notification per admin user, message naming the restaurant, reviewer as actor.

Rejecting marks the candidate rejected and stores the trimmed `rejectionReason` (missing or whitespace-only becomes `null`); it creates no restaurant, images or notifications.

Any failure rolls everything back, leaves the candidate pending, and uses that failure's status; a throwing side effect (e.g. the notification write) is 500.

Batch review — `PUT /api/v1/candidate-restaurants/batch-review`, body `{ "reviews": [entry, ...] }`, each entry a review body plus its `candidateRestaurantId`. Trim each id, apply the single-review rules to every entry in one shared transaction, and return results in request order, each carrying the reviewer id. If any entry is not found, already reviewed, or fails, roll the whole batch back — respond with that entry's status, no `data`. Up front, return 400 for: `reviews` missing, non-array or empty (message exactly `The reviews field must be a non-empty array`); a non-object entry; an entry with no non-empty string `candidateRestaurantId`; a bad action; or a duplicate id after trimming (message exactly `Duplicate candidate restaurant id`).

Metrics — `GET /api/v1/candidate-restaurants/metrics` returns counts by state; `pending` is `total − approved − rejected` floored at 0.

Response envelopes and the snake_case result shape are exactly:

    review object (snake_case keys):
    { "candidate_restaurant_id": string, "name": string,
      "status": "approved" | "rejected", "rejection_reason": string | null,
      "restaurant_id": string | null,   // new restaurant on approve, else null
      "reviewed_by": string }           // acting admin id

    single 200:  { "success": true, "message": string, "data": <review object> }
    batch 200:   { "success": true, "message": string, "data": [ <review object>, ... ] }
    metrics 200: { "success": true, "message": string,
                   "data": { "pending": n, "approved": n, "rejected": n, "total": n } }
    any error:   { "success": false, "message": string, "statusCode": number }

Commit your work on a new branch.
