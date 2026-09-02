Promoting Candidate Restaurants into the Live Catalogue

Make the candidate-restaurant approve and reject actions transactional and safe under concurrent admin action.

    approve: PUT /api/v1/candidate-restaurants/:candidateRestaurantId/approve
    reject:  PUT /api/v1/candidate-restaurants/:candidateRestaurantId/reject

## Approve

Write-lock the candidate row so a second admin's call waits; run everything below in one transaction:

- create the live `Restaurant` (same name, description, opening/closing hours, opened); its `@AfterCreate` hooks that seed a menu and availability alert must join this transaction;
- chain name = text before the first ` | ` in the name; reuse or create that `RestaurantChain` and link the restaurant to it;
- with a submitting user, add 20 to their incentive (creating the row if absent) plus one `General` incentive-history entry of 20; skip for an ownerless candidate;
- with a linked candidate-admin, create their admin account, email the credentials, mark it approved, and set it as chain admin only if the chain has none; one already approved fails with 409;
- mark the candidate approved and write one notification per admin user, naming the restaurant and acting admin.

If any step throws — credentials email and notification insert included — nothing commits; the candidate stays pending and the status mirrors the error (bare throw = 500).

## Reject

Same lock and transaction. Flip the candidate and any linked candidate-admin to rejected and emit the same per-admin notifications — nothing else changes.

## Guards and responses

Keep the current admin guard ahead of both handlers; anyone it turns away still gets its 401.

    unknown candidate ............ 404, message "Candidate Restaurant not found"
    candidate already finalized .. 409, message says whether it was approved or rejected

    success: { "success": true,
               "data": { "candidateRestaurantId": "<url id>",
                         "action": "approve" | "reject",
                         "is_approved": <bool>, "is_rejected": <bool>,
                         "restaurant_id": "<new restaurant id>" | null } }
    handler error: { "success": false, "message": "<text>", "statusCode": <status> }

`restaurant_id` is the new restaurant on approve, `null` on reject.
