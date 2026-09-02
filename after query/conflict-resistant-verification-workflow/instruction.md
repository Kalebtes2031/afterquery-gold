Reliable Candidate Restaurant Verification Workflow

Add three admin-guarded endpoints (401 otherwise); keep the existing approve and reject routes unchanged. Every response has `success` and `message`; successes add `data`, errors a numeric `statusCode`.

Single review — `PUT /api/v1/candidate-restaurants/:candidateRestaurantId/review`, body `{ "action", "rejectionReason"? }`. Trim `action`, match case-insensitively; anything else is 400 whose message contains "approve or reject". Run it in one transaction, row-locking the candidate so concurrent reviewers serialize. Unknown candidate: 404. Already approved or rejected: 409 whose message states which.

Approving marks it approved and creates the live `Restaurant` (candidate's name, description, opening/closing hours; always open). Each candidate menu image url becomes a restaurant image row. One notification per admin user, message naming the restaurant, reviewer as actor.

Rejecting marks the candidate rejected and stores the trimmed `rejectionReason` (missing or whitespace-only becomes `null`); it creates no restaurant, images or notifications.

Any failure rolls back, leaves the candidate pending, and uses that failure's status; a throwing side effect (the notification write) is 500.

A review result holds `candidate_restaurant_id`, `name`, `status`, `rejection_reason`, `restaurant_id` and `reviewed_by`.

Batch review — `PUT /api/v1/candidate-restaurants/batch-review`, body `{ "reviews": [entry, ...] }`, each entry a review body plus its `candidateRestaurantId`. Trim each id, apply the single-review rules to every entry in one shared transaction, returning results in request order, each with the reviewer id. If any entry is not found, already reviewed, or fails, the whole batch rolls back with that entry's status and no `data`. Return 400 up front for a missing/non-array/empty `reviews`, a non-object entry, an entry lacking a non-empty string `candidateRestaurantId`, an unknown or non-string action, or an id repeated after trimming (messages below).

Metrics — `GET /api/v1/candidate-restaurants/metrics` returns `data` counts `pending`, `approved`, `rejected`, `total`; `pending` is `total − approved − rejected` floored at 0.

    review result (snake_case) — the single-review `data`, and each entry of the batch `data`:
    { "candidate_restaurant_id": string, "name": string,
      "status": "approved" | "rejected", "rejection_reason": string | null,
      "restaurant_id": string | null,   // new restaurant on approve, else null
      "reviewed_by": string }           // acting admin id

    request bodies:
    single  { "action": "approve" | "reject", "rejectionReason"?: string }
    batch   { "reviews": [ { "candidateRestaurantId": string,
                             "action": "approve" | "reject",
                             "rejectionReason"?: string }, ... ] }

    batch 400 messages:
      missing / non-array / empty reviews  ->  "The reviews field must be a non-empty array"
      duplicate id after trimming          ->  "Duplicate candidate restaurant id"
      non-object entry / missing id / bad action  ->  contain "object" / "candidateRestaurantId" / "approve or reject"

    single 200:  { "success": true, "message": string, "data": <review result> }
    batch 200:   { "success": true, "message": string, "data": [ <review result>, ... ] }
    metrics 200: { "success": true, "message": string,
                   "data": { "pending": n, "approved": n, "rejected": n, "total": n } }
    any error:   { "success": false, "message": string, "statusCode": number }

Commit your work on a new branch.
