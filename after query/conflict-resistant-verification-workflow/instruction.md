Reliable Candidate Restaurant Verification Workflow

Add three admin-guarded endpoints; leave the existing approve and reject routes untouched.

Single review — `PUT /api/v1/candidate-restaurants/:candidateRestaurantId/review`, body `{ "action": "approve" | "reject", "rejectionReason"?: string }`. Trim `action`, match case-insensitively; anything else is 400 mentioning "approve or reject". Run it in one transaction that row-locks the candidate, so concurrent reviewers serialize. Unknown candidate: 404. Already approved or rejected: 409 whose message states which.

Approving marks it approved and creates the live `Restaurant` from the candidate's name, description and opening/closing hours, always open. Each candidate menu image url becomes a restaurant image row on it. Write one notification per admin user naming the restaurant, with the reviewer as actor.

Rejecting marks the candidate rejected and stores the trimmed `rejectionReason` (missing or whitespace-only becomes `null`); it creates no restaurant, images or notifications.

Any failure rolls everything back, leaves the candidate pending, and answers with that failure's status; a throwing side effect (e.g. the notification write) is 500.

Batch review — `PUT /api/v1/candidate-restaurants/batch-review`, body `{ "reviews": [entry, ...] }` where each entry is a single-review body plus its `candidateRestaurantId`. Trim each id, apply the single-review rules to every entry in one shared transaction, and return results in request order, each carrying the reviewer id. If any entry is not found, already reviewed, or fails, roll the whole batch back and answer with that entry's status and no `data`. Up front, return 400 for a missing, non-array or empty `reviews`; a non-object entry; an entry lacking a string `candidateRestaurantId`; a bad action; or a repeated (trimmed) id.

Metrics — `GET /api/v1/candidate-restaurants/metrics` returns candidate-restaurant counts by state; `pending` is `total − approved − rejected` floored at 0.

    Fixed 400 messages
      missing / non-array / empty reviews  ->  "The reviews field must be a non-empty array"
      duplicate id after trimming          ->  "Duplicate candidate restaurant id"
    The non-object and missing-id 400s only need to name "object" / "candidateRestaurantId".

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

Work on a new branch and commit your changes.
