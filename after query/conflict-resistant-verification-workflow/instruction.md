Add three admin endpoints for candidate restaurant review. Unauthenticated calls return 401. Success has `success`, `message`, and `data`; errors have `success`, `message`, and numeric `statusCode`.

`PUT /api/v1/candidate-restaurants/:candidateRestaurantId/review` accepts `{action, rejectionReason?}`. Trim action and match it case-insensitively; other values return 400 with a message containing "approve or reject". In one transaction, lock the candidate row. Missing candidates return 404; approved or rejected candidates return 409 stating the state. Approve marks approved, creates an always-open Restaurant copying name, description and hours, and copies every menu image URL to a restaurant image row. Notify every admin, naming the restaurant and reviewer. Reject marks rejected, stores trimmed rejectionReason or `null`, and creates no restaurant, media, or notifications. Any failure rolls back; notification failure returns 500.

Result `data` is exactly `{candidate_restaurant_id, name, status, rejection_reason, restaurant_id, reviewed_by}` with snake_case keys; status is `approved` or `rejected`; IDs are strings or `null`.

`PUT /api/v1/candidate-restaurants/batch-review` accepts `{reviews:[{candidateRestaurantId, action, rejectionReason?}, ...]}`. Require a non-empty `reviews` array, object entries, string IDs non-empty after trim, and string approve/reject actions. Missing, non-array, or empty `reviews` returns 400 with a message containing exactly "reviews field must be a non-empty array". Trim IDs and actions; duplicate trimmed IDs return exactly "Duplicate candidate restaurant id". Process in one transaction and return results in request order. Any failure rolls back with no data.

`GET /api/v1/candidate-restaurants/metrics` returns `{pending, approved, rejected, total}` where `pending = max(total - approved - rejected, 0)`.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
