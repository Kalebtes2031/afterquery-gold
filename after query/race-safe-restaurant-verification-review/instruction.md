Promoting Candidate Restaurants into the Live Catalogue

Make approve and reject transactional and concurrency-safe, and add a bulk endpoint.

    approve: PUT /api/v1/candidate-restaurants/:candidateRestaurantId/approve
    reject:  PUT /api/v1/candidate-restaurants/:candidateRestaurantId/reject
    batch:   PUT /api/v1/candidate-restaurants/review-batch

## Approve

Write-lock the candidate row so a second admin's call waits; run everything below in one transaction:

- create the live `Restaurant` (same name, description, opening/closing hours, opened);
- chain name = text before the first ` | ` in the name; reuse or create that `RestaurantChain`, link the restaurant to it;
- with a submitting user, add 20 to their incentive (creating the row if absent) plus one `General` incentive-history entry of 20; skip for an ownerless candidate;
- with a linked candidate-admin, create their admin account, email the credentials, mark it approved, and make it chain admin only if the chain has none; an already-approved candidate-admin fails the call with 409 and "already approved" in the message;
- mark the candidate approved and write one notification per admin user; each notification's message text contains the restaurant name, with the acting admin as its actor.

If any step throws — credentials email and notification insert included — nothing commits; the candidate stays pending and the status mirrors the error (a bare throw is 500).

## Reject

Locking, transaction and guards match Approve. Flip the candidate and any linked candidate-admin to rejected and emit the same per-admin notifications (message text again carries the restaurant name). Nothing else changes — no restaurant, chain, admin account or incentive.

## Batch

Body `{ "items": [ { "candidateRestaurantId", "action" }, ... ] }`. Apply the Approve/Reject rules to every entry under one shared transaction, in sent order. If any entry can't be processed — not found, already decided, downstream error — abandon the whole batch and answer with that entry's status; otherwise return one result per entry.

Payload errors answer 400 up front:

    - items missing or empty
    - an item that is not an object
    - an item with no usable string candidateRestaurantId
    - action neither "approve" nor "reject"  (the message says "approve or reject")
    - an id repeated: message exactly "Duplicate candidate restaurant id"

## Guards and responses

Keep the admin guard ahead of all three handlers; anyone it turns away still gets its 401.

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
