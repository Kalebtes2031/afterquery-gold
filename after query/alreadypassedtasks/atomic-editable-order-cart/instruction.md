Add a cart update endpoint for orders still being edited.

Expose PUT /api/v1/orders/:orderId/cart for the authenticated owner. The body needs a non-empty items array of {itemId, quantity} entries; each itemId appears at most once, and every quantity is a positive integer. Validate the whole request before touching the order, so a bad request changes nothing.

Cart replacement is allowed only while the order's status is Order Created or Order Edited. A missing order returns 404 with message "Order not found", a non-owner request returns 403, and any other status returns 409 with message "Order is not editable".

Every requested item must exist, be available for ordering, and belong to the order's restaurant. A missing item returns 404 with message "Item not found"; an unavailable item, or one from another restaurant, returns 400 naming the problem. Rejected requests leave the existing cart and totals untouched.

On success, replace the order's items with the submitted set, recompute total_number_of_items and total_price from current item prices, keep the status unchanged, and respond 200 with success: true and the updated order under data.

The replacement is atomic: a failed write leaves the previous items and totals intact, and concurrent updates to one order serialize so the final state reflects exactly one complete request, never a mix of two.

An Idempotency-Key header is optional. Reusing a key for the same order, even racing requests, executes the replacement at most once: a repeat replays the first success's exact response, without re-validating or rewriting the cart, regardless of body. A rejected request never consumes its key and may be retried. A different key, or none, behaves as an independent request.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.