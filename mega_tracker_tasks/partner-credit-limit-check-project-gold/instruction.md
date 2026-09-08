Add a credit ceiling to partners so new sales or lending cannot push a company’s exposure past an agreed amount.

A partner may have a nullable credit limit. Expose `PUT /api/v1/partners/:id/credit-limit` with a body of `{"creditLimit": <number|null>}`. A finite limit must be non-negative and have no more than two decimal places; `null` means unlimited. Lowering the limit below current exposure is allowed. Expose `GET /api/v1/partners/:id/credit` returning `{partnerId, creditLimit, openSales, loans, payments, exposure, availableCredit, overLimit}`. Partner view permission is enough to read credit status, while partner update permission is required to change the limit.

Calculate exposure per company as gross value of non-cancelled sales for the partner, plus signed loan activity that is not the sale/purchase/payment mirror ledger, minus recorded sale payments. Clamp exposure at zero. `availableCredit` is null for unlimited partners; otherwise it is `creditLimit - exposure`, and may be negative when already over the limit. Reaching the limit exactly is valid.

Before a transaction that increases exposure commits, compare the projected net delta against the current exposure. Cover the unpaid portion of new sale orders, partner-funded sale payments for the funding partner, direct and historical LENT loans, and the positive leg of partner-to-partner loans. Exposure-reducing actions must remain possible even when a partner is already over limit. If a finite ceiling would be exceeded, reject the whole operation with HTTP 409 and code `PARTNER_CREDIT_LIMIT_EXCEEDED`, with no partial side effects.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
