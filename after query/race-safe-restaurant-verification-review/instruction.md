Make the protected candidate restaurant approve and reject endpoints atomic and safe when multiple admins act on the same candidate concurrently.

`PUT /api/v1/candidate-restaurants/:candidateRestaurantId/approve` must run in one transaction. Create the restaurant, locate or create its chain using the part of the name before the separator " | ", then approve the candidate. A pending candidate succeeds with HTTP 200. An already approved or rejected candidate returns HTTP 409 with a message stating its current state. Any failure, including the final notification write, rolls back the restaurant and candidate changes.

`PUT /api/v1/candidate-restaurants/:candidateRestaurantId/reject` must reject the candidate atomically and must not create a restaurant. If any operation fails, including the final notification write, roll back every change. Lock the candidate row so concurrent reviews serialize. An unknown candidate returns HTTP 404 with the message "Candidate Restaurant not found". A finalized candidate returns HTTP 409 stating whether it was approved or rejected. A successful rejection creates one notification for every administrator, referencing the candidate and acting administrator.

Both endpoints return HTTP 200 with `{"success":true,"data":{"candidateRestaurantId":"<id>","action":"approve|reject","is_approved":<bool>,"is_rejected":<bool>,"restaurant_id":"<id>|null"}}`. Handler errors return `{"success":false,"message":"<text>","statusCode":<status>}`.

Also register `PUT /api/v1/candidate-restaurants/review-batch` behind the same admin guard; it must not be treated as a candidate ID route. Unauthenticated batch requests return 401.

Work on a new branch from main and commit everything.