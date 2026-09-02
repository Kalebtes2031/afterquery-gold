Reliable Candidate Restaurant Verification Workflow

Add three admin-protected endpoints without changing the existing approve and reject routes:

- `PUT /api/v1/candidate-restaurants/:candidateRestaurantId/review`
- `PUT /api/v1/candidate-restaurants/batch-review`
- `GET /api/v1/candidate-restaurants/metrics`

Single review accepts `{ "action": "approve" | "reject", "rejectionReason"?: string }`. Trim and case-normalize `action`; other values return 400 mentioning "approve or reject". Lock the candidate row and complete the review in one transaction.

Approval marks the candidate approved and creates an always-open Restaurant with its name, description, and hours. Copy every candidate menu image URL into a RestaurantImage linked to it. Notify every admin, naming the restaurant and recording the reviewer as actor.

Rejection marks the candidate rejected and stores the trimmed reason; missing or whitespace-only reasons become null. It creates no restaurant, images, or notifications. Any failure rolls back everything. Unknown candidates return 404; finalized candidates return 409 with approved or rejected in the message.

Batch review accepts `{ "reviews": [...] }`, trims IDs, applies the same rules in one shared transaction, and preserves request order. Any failed entry rolls back the batch and returns no data. Reject missing, non-array, empty, non-object, invalid-action, or missing-ID input with 400. Duplicate trimmed IDs must return exactly "Duplicate candidate restaurant id".

Metrics returns nonnegative pending, approved, rejected, and total counts.

Each review result uses `candidate_restaurant_id`, `name`, `status`, `rejection_reason`, `restaurant_id`, and `reviewed_by`. Successful responses contain `success`, `message`, and `data`; errors contain `success: false`, `message`, and `statusCode`.

Work on a new branch from main and commit your changes.
