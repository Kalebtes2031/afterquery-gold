Add an approval gate for expenses that should not hit the financial ledgers until somebody reviews them.

`POST /api/v1/expenses` should accept an optional `requiresApproval` boolean. Omitted or false keeps the current behavior and the existing `{expenseId}` response. When true, save the expense and its payment lines as a `DRAFT`, return `{expenseId, status: "DRAFT"}`, and do not create account or partner-loan transactions yet. Expense details and list results should expose `requiresApproval` and `status`; ordinary immediately-posted expenses use status `POSTED`.

Approval limits are company-scoped and belong to roles. `PUT /api/v1/expenses/approval-bands/:roleId` accepts `{"bands":[...]}` where every band has `minAmount`, nullable `maxAmount`, `canSubmit`, `canApprove`, and `canReject`; an empty array clears that role. Bounds are inclusive, null means no upper limit, and bands with invalid bounds or no enabled action are invalid. `GET /api/v1/expenses/approval-bands` returns `{bands:[...]}` and accepts an optional `roleId` query filter.

Approval-required expenses follow `DRAFT -> SUBMITTED -> APPROVED` or `REJECTED` through `POST /:id/submit`, `/:id/approve`, and `/:id/reject`. Only the creator may submit. The creator may never approve or reject their own expense, even if they are the owner. Owners otherwise bypass amount bands; employees need their current role to have a matching band for the action and amount. Rejection requires a trimmed reason from 1 to 1000 characters.

Approval must post the stored payment lines exactly once, in the same transaction as the status change and decision record. A posting failure must leave the expense submitted; rejection posts nothing. `GET /:id/approval-history` returns `{decisions:[...]}` in chronological order with `action`, `actorUserId`, `actorRoleId` (null for owners), `amount`, `reason`, and `createdAt`. Invalid state transitions return 409, missing action authority returns 403, and normal validation/not-found handling stays consistent with the existing API.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
