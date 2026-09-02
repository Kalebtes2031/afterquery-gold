Promoting Candidate Restaurants into the Live Catalogue

Make the candidate-restaurant approve and reject actions transactional and safe under concurrent admin action, and add a bulk endpoint.

    approve: PUT /api/v1/candidate-restaurants/:candidateRestaurantId/approve
    reject:  PUT /api/v1/candidate-restaurants/:candidateRestaurantId/reject
    batch:   PUT /api/v1/candidate-restaurants/review-batch

## Approve

Write-lock the candidate row so a second admin's call blocks until this one finishes; run everything below in a single transaction:

- create the live `Restaurant` (same name, description, opening/closing hours, opened);
- chain name = text before the first ` | ` in the name; reuse or create that `RestaurantChain`, link the restaurant to it;
- with a submitting user, add 20 to their incentive (creating the row if absent) plus one `General` incentive-history entry of 20; skip for an ownerless candidate;
- with a linked candidate-admin, create that person's admin account, email the credentials, mark it approved, and set it as chain admin only if the chain has none; one already approved fails with 409;
- mark the candidate approved and write one notification per admin user, naming the restaurant and the acting admin.

If any step throws — the credentials email and the notification insert included — nothing commits; the candidate stays pending and the response status mirrors the error (a bare throw is 500).

## Reject

Locking, transaction and guards match Approve. Flip the candidate and any linked candidate-admin to rejected and emit the same per-admin notifications. Nothing else changes — no restaurant, chain, admin account or incentive.

## Batch

Body `{ "items": [ { "candidateRestaurantId", "action" }, ... ] }`. Process the entries by the Approve/Reject rules under one shared transaction. If any entry can't be processed — not found, already decided, downstream error — abandon the whole batch and answer with that entry's status. Otherwise reply with one result per entry, in sent order.

Payload errors answer 400 up front:

    - items missing or empty
    - an item that is not an object
    - an item with no usable string candidateRestaurantId
    - action neither "approve" nor "reject"  (the message says "approve or reject")
    - an id repeated: message exactly "Duplicate candidate restaurant id"

## Guards and responses

Keep the current admin guard ahead of all three handlers; anyone it turns away still receives its own 401.

    unknown candidate ............ 404, message "Candidate Restaurant not found"
    candidate already finalized .. 409, message says whether it was approved or rejected

    single success: { "success": true,
                      "data": { "candidateRestaurantId": "<url id>",
                                "action": "approve" | "reject",
                                "is_approved": <bool>, "is_rejected": <bool>,
                                "restaurant_id": "<new restaurant id>" | null } }
    batch success:  { "success": true, "data": [ <entry shaped like the data object above>, ... ] }
    handler error:  { "success": false, "message": "<text>", "statusCode": <status> }

`restaurant_id` is the new restaurant on approve, `null` on reject.
