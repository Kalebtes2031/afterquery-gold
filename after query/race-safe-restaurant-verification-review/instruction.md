Promoting Candidate Restaurants into the Live Catalogue

Make the candidate-restaurant approve and reject actions transactional and safe when two admins act on the same candidate at once.

    approve: PUT /api/v1/candidate-restaurants/:candidateRestaurantId/approve
    reject:  PUT /api/v1/candidate-restaurants/:candidateRestaurantId/reject

## Approve

Write-lock the candidate row so a second admin's call blocks until this one finishes, and run everything below inside one transaction:

- create the live `Restaurant` (same name, description, opening/closing hours, opened). Its `@AfterCreate` hooks seed a menu and an availability alert; those inserts have to run on this transaction, or they outlive a rollback and can stall on the row lock;
- chain name = the text before the first ` | ` in the name; reuse or create that `RestaurantChain` and link the restaurant to it;
- with a submitting user, add 20 to their incentive (creating the row when absent) plus one `General` incentive-history entry of 20; skip this for an ownerless candidate;
- with a linked candidate-admin, create that person's admin account, email the credentials, mark it approved, and set it as chain admin only when the chain has none; a candidate-admin that is already approved fails with 409;
- mark the candidate approved and write one notification per admin user, naming the restaurant and the acting admin.

If any step throws — the credentials email and the notification insert included — nothing commits: the candidate stays pending and the response status mirrors the error (a bare throw is 500).

## Reject

Locking and transaction match Approve. Flip the candidate and any linked candidate-admin to rejected and emit the same per-admin notifications. Nothing else changes — no restaurant, chain, admin account or incentive.

## Guards and responses

Keep the current admin guard ahead of both handlers; anyone it turns away still gets its own 401.

    unknown candidate ............ 404, message "Candidate Restaurant not found"
    candidate already finalized .. 409, message says whether it was approved or rejected

    success: { "success": true,
               "data": { "candidateRestaurantId": "<url id>",
                         "action": "approve" | "reject",
                         "is_approved": <bool>, "is_rejected": <bool>,
                         "restaurant_id": "<new restaurant id>" | null } }
    handler error: { "success": false, "message": "<text>", "statusCode": <status> }

`restaurant_id` is the new restaurant on approve, `null` on reject.
