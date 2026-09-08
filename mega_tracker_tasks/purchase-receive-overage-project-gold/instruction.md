Fix purchase receiving so cumulative receipts cannot silently exceed what a purchase order allows.

Purchase creation should accept an optional `receiveOverageTolerancePercent` from 0 through 100, defaulting to 0. Store that value with the order and return it with purchase order data. The maximum cumulative receipt for each order line is `quantityOrdered * (1 + tolerance / 100)`. Base the tolerance on the original ordered quantity, not the current remainder, and round quantity calculations to six decimal places. A receipt exactly on the limit is valid; anything above it must return the existing validation-style 400 response.

Apply the same rule to quantities received during purchase creation and to later `POST /api/v1/purchases/:id/receives` calls. Later receipts must validate the entire request before creating a receipt or changing inventory. Every `purchaseOrderItemId` must belong to that order, its `productId` must match, and the same order item cannot appear twice in one receipt.

Accepted overage is real stock and must flow through the normal inventory/WAC posting. It must not create extra pending demand: reduce pending-to-receive only by the original ordered quantity that was still outstanding, and only once. `quantityRemaining` cannot go below zero, and an order closes once its original ordered quantities are fulfilled.

`GET /api/v1/purchases/:id` should also return `receiveAllowance`, including the order tolerance, whether receiving is still allowed, summary totals, and per-line ordered, received, remaining, maximum receivable, currently receivable, and overage values.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
