Add three admin endpoints for candidate restaurant review. Unauthenticated calls return 401. Success has `success`, `message`, and `data`; errors have `success`, `message`, and `statusCode`.

`PUT /api/v1/candidate-restaurants/:candidateRestaurantId/review` accepts `{action, rejectionReason?}`. Trim and match action case-insensitively; else 400 with a message containing "approve or reject". Lock the row in one transaction. Missing candidates return 404; already approved or rejected return 409 stating the state. Overlapping reviews on one candidate serialize: one 200, one 409. Approve marks approved, creates an open restaurant with the candidate name, description and hours, copies every menu image URL, or none when there is no media, and notifies every admin naming the restaurant and reviewer. Reject marks rejected, stores trimmed `rejectionReason` or `null`, and creates no restaurant, media, or notifications. Any failure rolls back; notification failure returns 500.

`data` is `{candidate_restaurant_id, name, status, rejection_reason, restaurant_id, reviewed_by}` — snake_case; `status` is `approved` or `rejected`; ids are strings or `null`; `reviewed_by` is the acting admin.

`PUT /api/v1/candidate-restaurants/batch-review` accepts `{reviews:[{candidateRestaurantId, action, rejectionReason?}, ...]}`. Require a non-empty `reviews` array of objects with trimmed string ids and string approve/reject actions. Missing or empty `reviews` returns 400 containing "reviews field must be a non-empty array". Duplicate trimmed ids return exactly "Duplicate candidate restaurant id". One transaction; return `data` in request order with `reviewed_by` on each entry. Failure rolls back without `data`.

`GET /api/v1/candidate-restaurants/metrics` returns `{pending, approved, rejected, total}` with `pending = max(total - approved - rejected, 0)`.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
