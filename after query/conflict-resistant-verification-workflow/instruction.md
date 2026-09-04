Reliable Candidate Restaurant Review Workflow

Add three admin endpoints; unauthenticated requests return 401. Successful responses have `success`, `message`, and `data`; errors have `success`, `message`, and numeric `statusCode`.

Single: `PUT /api/v1/candidate-restaurants/:candidateRestaurantId/review` accepts `{action, rejectionReason?}`. Trim action and match it case-insensitively; other values return 400 with a message containing "approve or reject". In one transaction, lock candidate row. Missing candidates return 404; approved or rejected candidates return 409 stating the state. Approve marks approved, creates an always-open Restaurant copying name, description and hours, and copies every menu image URL to a restaurant image row. Notify every admin, naming the restaurant and reviewer. Reject marks rejected, stores trimmed rejectionReason or `null`, and creates no restaurant, media or notifications. Any failure rolls back; notification failure returns 500.

Result `data` is exactly `{candidate_restaurant_id, name, status, rejection_reason, restaurant_id, reviewed_by}`, with snake_case keys; status is `approved` or `rejected`, and IDs are strings or `null` as appropriate.

Batch: `PUT /api/v1/candidate-restaurants/batch-review` accepts `{reviews:[{candidateRestaurantId, action, rejectionReason?}, ...]}`. Require a non-empty array, object entries, non-empty string IDs, and string actions of approve/reject. For missing, non-array, or empty `reviews`, return 400 with a message containing exactly "reviews field must be a non-empty array". Trim IDs and actions, reject duplicate trimmed IDs with exactly "Duplicate candidate restaurant id", process all in one transaction, and return result data in request order. Any failure rolls back with no data.

Metrics: `GET /api/v1/candidate-restaurants/metrics` returns `{pending, approved, rejected, total}`; `pending = max(total - approved - rejected, 0)`.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
