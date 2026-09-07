Ship-later and receive-later flows keep over-fulfilling lines because remaining quantity is computed ad hoc inside use-cases. Add a pure remaining-qty guard we can call before applying a ship/receive delta, and keep the contracts shared so purchases can reuse them later.

Public API lives at `src/modules/sales/domain/FulfillmentRemainingGuard.ts` and exports `FulfillmentRemainingGuard`, `computeRemaining`, `validatePartialFulfillment`, `applyFulfillmentDelta`, `auditFulfillmentConsistency`, plus types. Shared line/status helpers belong under `src/shared/domain/fulfillment/` so other modules can import the same shapes without depending on the sales module graph.

A line is `{lineId, qtyOrdered, qtyFulfilled}`. Remaining is ordered minus fulfilled, but the displayed remaining must never go negative (clamp at zero). Status is `UNFULFILLED` when fulfilled <= 0, `FULFILLED` when fulfilled >= ordered, otherwise `PARTIAL`. `validatePartialFulfillment(line, delta)` rejects non-finite or `delta <= 0` as `invalid_delta`, and `delta > remaining` as `over_fulfill`. Invalid line snapshots (blank id or non-finite/negative quantities) return `invalid_line`.

`applyFulfillmentDelta` returns the updated line, new status, and remaining after a valid delta. Exact remaining deltas should reach `FULFILLED` with remaining 0. `auditFulfillmentConsistency` walks a list of lines (optional stored status) and flags `over_fulfilled`, `negative_remaining`, and `status_mismatch` when stored status disagrees with derived status. Keep the implementation pure and Jest-friendly — no DB clients, no Express wiring, and no hidden clocks or randomness.

IMPORTANT: Please work on this in a new branch from main and commit everything when you are done.
