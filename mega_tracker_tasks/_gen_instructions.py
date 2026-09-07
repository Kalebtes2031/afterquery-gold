# -*- coding: utf-8 -*-
"""Write natural engineer instruction.md files for the four tasks."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
STAGING = ROOT / "_staging"

IMPORTANT = (
    "IMPORTANT: Please work on this in a new branch from main and commit everything when you are done."
)


def w(rel: str, body: str) -> None:
    text = body.strip() + "\n\n" + IMPORTANT + "\n"
    path = STAGING / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.replace("\r\n", "\n").replace("\r", "\n"), encoding="utf-8")


INSTRUCTIONS = {
    "sale-cancel-policy": """
We need a pure cancel-eligibility + reversal preview for sale orders before touching the DB. Ops keep cancelling shipped or completed orders, and finance wants a deterministic preview of what inventory and payments would reverse.

Put the public surface at `src/modules/sales/domain/SaleCancelPolicy.ts` (barrel also fine via `src/modules/sales/domain/index.ts`). Export `SaleCancelPolicy`, `evaluateSaleCancel`, `previewSaleCancelReversal`, `SaleCancelDecision`, and the supporting types. Split implementation across `SaleCancelTypes.ts`, `SaleCancelRules.ts`, and `SaleCancelReversal.ts` so the rules stay unit-testable.

Input is an order snapshot: `status` one of `OPEN|PARTIALLY_SHIPPED|SHIPPED|CANCELLED|COMPLETED`, `items[{productId, qtyOrdered, qtyShipped}]`, `payments[{amount, method}]`, `shipments[{qty}]`. Cancel is allowed only for `OPEN` or `PARTIALLY_SHIPPED`. Anything already `CANCELLED`/`COMPLETED`/`SHIPPED` must come back with `canCancel:false` and a clear reason. Empty/blank `orderId` or an unknown status is `{ok:false, reason:"invalid_order"}`.

If any shipment qty is > 0, aggregate inventory reversals from item `qtyShipped` per `productId`. If payments exist, set `paymentReversalTotal` to the positive payment sum and `loanReversalTotal` for methods that match `partner_loan` (case-insensitive). Success shape: `{ok:true, canCancel, reasons[], inventoryReversals[], paymentReversalTotal, loanReversalTotal}`. Preview must be pure and idempotent — same snapshot, same decision, no shared mutable state.
""",
    "inventory-transfer-wac-fix": """
Branch transfers are skipping WAC bookkeeping and company cost is drifting. Add a pure transfer cost engine — no live DB — that models transfer legs correctly and can audit drift after mixed inventory ops.

Public barrel: `src/modules/inventory/domain/TransferWacEngine.ts`. Export `TransferWacEngine`, `calculateTransferLegs`, `applyTransferWac`, `auditTransferWacDrift`, plus types. Split into `TransferWacTypes.ts`, `TransferWacMath.ts`, `TransferWacAudit.ts`, and a domain `index.ts` re-export.

A transfer moves `qty` from source branch to dest. Source unit cost is the current WAC passed in; dest receives that same unit cost. Company WAC and company on-hand stay unchanged for transfer-only moves, while both branch on-hand values update. Over-transfer (qty > source on-hand) returns `insufficient_stock`. Zero/negative/non-finite qty returns `invalid_qty`. Bad identity (blank ids, same source/dest, negative unit cost) returns `invalid_transfer`.

`auditTransferWacDrift` replays mixed `POSITIVE|NEGATIVE|TRANSFER` ops from an initial company/branch state and compares expected company WAC and branch on-hand to stored values. Issue codes: `company_wac_drift`, `branch_onhand_mismatch`, `missing_leg`. Keep everything pure so we can unit-test the bug fix without Postgres.
""",
    "partner-loan-settlement": """
Partner loan balances are a pile of open legs from sales, purchases, expenses, and direct loans. We need a pure settlement allocator that previews how a payment would clear those legs before writing transactions.

Barrel at `src/modules/finance/domain/LoanSettlementAllocator.ts`. Export `LoanSettlementAllocator`, `allocateSettlement`, `previewSettlement`, `listOpenLoanLegs`, and types. Supporting files for ordering/math/types are fine.

Open legs look like `{legId, sourceType: SALE|PURCHASE|EXPENSE|DIRECT, principalRemaining, openedAt}`. `allocateSettlement(partnerId, amount, legs, options?)` distributes a clamped positive amount. Strategy defaults to `fifo` (sort by `openedAt` then `legId`); `largest_first` is optional. Return `allocations[{legId, applied, remainingAfter}]`, `leftover` for overpay, and `fullySettledLegIds`. Invalid partner / non-positive amount / non-array legs must error with `invalid_partner`, `invalid_amount`, or `invalid_legs`. `previewSettlement` should also return the remaining open legs after the allocation. No DB access — this is application math only.
""",
    "fulfillment-remaining-guard": """
Ship-later / receive-later flows keep over-fulfilling lines because remaining qty is computed ad hoc in use-cases. Add a pure remaining-qty guard we can reuse for sales (and purchases via shared types).

Public API: `src/modules/sales/domain/FulfillmentRemainingGuard.ts` exporting `FulfillmentRemainingGuard`, `computeRemaining`, `validatePartialFulfillment`, `applyFulfillmentDelta`, `auditFulfillmentConsistency`, and types. Put shared line/status types and helpers under `src/shared/domain/fulfillment/` so purchases can import the same contracts later.

A line is `{lineId, qtyOrdered, qtyFulfilled}`. Remaining is ordered minus fulfilled, clamped so the displayed remaining is never negative. `validatePartialFulfillment(line, delta)` rejects `delta <= 0` as `invalid_delta` and `delta > remaining` as `over_fulfill`. `applyFulfillmentDelta` returns the new `qtyFulfilled` plus status `UNFULFILLED|PARTIAL|FULFILLED`. `auditFulfillmentConsistency` flags `over_fulfilled`, `negative_remaining`, and `status_mismatch`. Keep it pure and unit-testable with no repository calls.
""",
}


def main() -> None:
    for task_id, body in INSTRUCTIONS.items():
        w(f"{task_id}/instruction.md", body)
        words = len(
            body.replace(IMPORTANT, "").split()
        )
        print(f"{task_id}: ~{words} words (body only)")


if __name__ == "__main__":
    main()
