# -*- coding: utf-8 -*-
"""Second-pass padding for remaining short floors + longer instructions."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
STAGING = ROOT / "_staging"
IMPORTANT = (
    "IMPORTANT: Please work on this in a new branch from main and commit everything when you are done."
)


def append(rel: str, extra: str) -> None:
    path = STAGING / rel
    text = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    if not text.endswith("\n"):
        text += "\n"
    extra = extra.replace("\r\n", "\n")
    if not extra.endswith("\n"):
        extra += "\n"
    path.write_text(text + "\n" + extra, encoding="utf-8")


def write_instruction(task_id: str, body: str) -> None:
    path = STAGING / task_id / "instruction.md"
    text = body.strip() + "\n\n" + IMPORTANT + "\n"
    path.write_text(text.replace("\r\n", "\n"), encoding="utf-8")
    print(task_id, len(body.split()), "words")


LOAN_EXTRA = r'''
export function allocateExact(
  partnerId: string,
  legs: OpenLoanLeg[],
  options?: SettlementOptions
): SettlementResult {
  const total = totalPrincipal(legs);
  if (total <= 0) return { ok: false, reason: "invalid_amount" };
  return allocateSettlement(partnerId, total, legs, options);
}

export function allocatePartialPercent(
  partnerId: string,
  legs: OpenLoanLeg[],
  percent: number,
  options?: SettlementOptions
): SettlementResult {
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    return { ok: false, reason: "invalid_amount" };
  }
  const total = totalPrincipal(legs);
  const amount = Math.round(((total * percent) / 100) * 100) / 100;
  return allocateSettlement(partnerId, amount, legs, options);
}

export function settlementCoverageRatio(result: SettlementResult, legs: OpenLoanLeg[]): number {
  if (!result.ok) return 0;
  const total = totalPrincipal(legs);
  if (total <= 0) return 0;
  return Math.min(1, appliedTotal(result) / total);
}

export function unpaidLegsAfter(result: SettlementResult | LoanSettlementPreview): string[] {
  if (!result.ok) return [];
  if ("openLegsAfter" in result) return result.openLegsAfter.map((l) => l.legId);
  return result.allocations.filter((a) => a.remainingAfter > 0).map((a) => a.legId);
}

export function compareStrategies(
  partnerId: string,
  amount: number,
  legs: OpenLoanLeg[],
  now: number
): { fifo: SettlementResult; largest: SettlementResult } {
  return {
    fifo: allocateSettlement(partnerId, amount, legs, { strategy: "fifo", now }),
    largest: allocateSettlement(partnerId, amount, legs, { strategy: "largest_first", now }),
  };
}

export function firstAllocation(result: SettlementResult): SettlementAllocation | null {
  if (!result.ok || result.allocations.length === 0) return null;
  return result.allocations[0];
}

export function lastAllocation(result: SettlementResult): SettlementAllocation | null {
  if (!result.ok || result.allocations.length === 0) return null;
  return result.allocations[result.allocations.length - 1];
}

export function settledSourceTypes(result: SettlementResult, legs: OpenLoanLeg[]): string[] {
  if (!result.ok) return [];
  const byId = new Map(listOpenLoanLegs(legs).map((l) => [l.legId, l.sourceType]));
  const types = new Set<string>();
  for (const legId of result.fullySettledLegIds) {
    const t = byId.get(legId);
    if (t) types.add(t);
  }
  return [...types].sort();
}

export function describeStrategy(strategy: SettlementStrategy): string {
  return strategy === "largest_first"
    ? "clear largest principal first"
    : "clear oldest open legs first";
}

export function normalizeLegsInput(legs: OpenLoanLeg[]): OpenLoanLeg[] {
  return listOpenLoanLegs(legs).map((leg) => ({ ...leg }));
}
'''.lstrip()

FULFILL_EXTRA = r'''
export function validateMany(
  lines: FulfillmentLine[],
  delta: number
): Array<{ lineId: string; result: ValidateDeltaResult }> {
  return lines.map((line) => ({
    lineId: normalizeLineId(line.lineId) ?? String(line.lineId),
    result: validatePartialFulfillment(line, delta),
  }));
}

export function applyMany(
  lines: FulfillmentLine[],
  delta: number
): Array<{ lineId: string; result: ApplyFulfillmentResult }> {
  return lines.map((line) => ({
    lineId: normalizeLineId(line.lineId) ?? String(line.lineId),
    result: applyFulfillmentDelta(line, delta),
  }));
}

export function countByStatus(lines: FulfillmentLine[]): Record<FulfillmentLineStatus, number> {
  const counts: Record<FulfillmentLineStatus, number> = {
    UNFULFILLED: 0,
    PARTIAL: 0,
    FULFILLED: 0,
  };
  for (const line of lines) {
    const view = computeRemaining(line);
    if (!view) continue;
    counts[view.status] += 1;
  }
  return counts;
}

export function totalRemaining(lines: FulfillmentLine[]): number {
  return lines.reduce((sum, line) => {
    const view = computeRemaining(line);
    return sum + (view ? view.remaining : 0);
  }, 0);
}

export function totalOrdered(lines: FulfillmentLine[]): number {
  return lines.reduce((sum, line) => sum + (Number(line.qtyOrdered) || 0), 0);
}

export function totalFulfilled(lines: FulfillmentLine[]): number {
  return lines.reduce((sum, line) => sum + (Number(line.qtyFulfilled) || 0), 0);
}

export function findOverFulfilled(lines: FulfillmentLine[]): string[] {
  return auditFulfillmentConsistency(lines).issues
    .filter((i) => i.code === "over_fulfilled")
    .map((i) => i.lineId);
}

export function sameLineIdentity(a: FulfillmentLine, b: FulfillmentLine): boolean {
  return normalizeLineId(a.lineId) === normalizeLineId(b.lineId);
}

export function cloneLine(line: FulfillmentLine): FulfillmentLine {
  return {
    lineId: line.lineId,
    qtyOrdered: line.qtyOrdered,
    qtyFulfilled: line.qtyFulfilled,
  };
}

export function withFulfilled(line: FulfillmentLine, qtyFulfilled: number): FulfillmentLine {
  return { ...cloneLine(line), qtyFulfilled };
}
'''.lstrip()

# Also pad shared fulfillment files
SHARED_MATH_PAD = r'''
export function formatRemainingView(view: RemainingView): string {
  return `${view.lineId} ordered=${view.qtyOrdered} fulfilled=${view.qtyFulfilled} remaining=${view.remaining} status=${view.status}`;
}

export function isPartialView(view: RemainingView): boolean {
  return view.status === "PARTIAL";
}

export function isUnfulfilledView(view: RemainingView): boolean {
  return view.status === "UNFULFILLED";
}

export function isFulfilledView(view: RemainingView): boolean {
  return view.status === "FULFILLED";
}

export function remainingPercent(view: RemainingView): number {
  if (view.qtyOrdered <= 0) return 0;
  return Math.round((view.remaining / view.qtyOrdered) * 10000) / 100;
}
'''.lstrip()

SHARED_AUDIT_PAD = r'''
export function issuesForLine(result: FulfillmentAuditResult, lineId: string): FulfillmentIssue[] {
  return result.issues.filter((issue) => issue.lineId === lineId);
}

export function hasAnyIssue(result: FulfillmentAuditResult, code: FulfillmentIssueCode): boolean {
  return result.issues.some((issue) => issue.code === code);
}

export function summarizeAuditResult(result: FulfillmentAuditResult): string {
  if (result.ok) return "ok";
  return result.issues.map((i) => `${i.lineId}:${i.code}`).join(",");
}

export function emptyAuditResult(): FulfillmentAuditResult {
  return { ok: true, issues: [] };
}
'''.lstrip()

ORDERING_PAD = r'''
export function sortLegsStable(legs: OpenLoanLeg[]): OpenLoanLeg[] {
  return orderLegsForStrategy(listOpenLoanLegs(legs), "fifo");
}

export function uniqueLegIds(legs: OpenLoanLeg[]): string[] {
  return [...new Set(listOpenLoanLegs(legs).map((l) => l.legId))].sort();
}

export function oldestOpenedAt(legs: OpenLoanLeg[]): number | null {
  const listed = listOpenLoanLegs(legs);
  if (listed.length === 0) return null;
  return Math.min(...listed.map((l) => l.openedAt));
}

export function newestOpenedAt(legs: OpenLoanLeg[]): number | null {
  const listed = listOpenLoanLegs(legs);
  if (listed.length === 0) return null;
  return Math.max(...listed.map((l) => l.openedAt));
}

export function filterBySource(legs: OpenLoanLeg[], sourceType: LoanSourceType): OpenLoanLeg[] {
  return listOpenLoanLegs(legs).filter((leg) => leg.sourceType === sourceType);
}
'''.lstrip()


INSTRUCTIONS = {
    "sale-cancel-policy": """
We need a pure cancel-eligibility + reversal preview for sale orders before touching the DB. Ops keep cancelling shipped or completed documents, and finance wants a deterministic preview of what inventory and payments would reverse if cancel is allowed.

Put the public surface at `src/modules/sales/domain/SaleCancelPolicy.ts` (re-export from `src/modules/sales/domain/index.ts` is fine). Export `SaleCancelPolicy`, `evaluateSaleCancel`, `previewSaleCancelReversal`, `SaleCancelDecision`, and the supporting snapshot/decision types. Split the implementation across `SaleCancelTypes.ts`, `SaleCancelRules.ts`, and `SaleCancelReversal.ts` so validation, status rules, and reversal math stay independently unit-testable with Jest.

Input is an order snapshot: `orderId`, `status` one of `OPEN|PARTIALLY_SHIPPED|SHIPPED|CANCELLED|COMPLETED`, `items[{productId, qtyOrdered, qtyShipped}]`, `payments[{amount, method}]`, and `shipments[{qty}]`. Cancel is allowed only when status is `OPEN` or `PARTIALLY_SHIPPED`. `CANCELLED`, `COMPLETED`, and `SHIPPED` must return `canCancel:false` with an explicit reason such as already cancelled/completed or fully shipped. Empty/blank `orderId`, unknown status, or missing item/payment/shipment arrays yield `{ok:false, reason:"invalid_order"}`.

If any shipment qty is > 0, build `inventoryReversals` by aggregating positive item `qtyShipped` per trimmed `productId` (sorted by product id). If payments exist, set `paymentReversalTotal` to the sum of positive amounts and `loanReversalTotal` for methods matching `partner_loan` case-insensitively. Success shape: `{ok:true, canCancel, reasons[], inventoryReversals[], paymentReversalTotal, loanReversalTotal}`. Advisory reversal reasons may appear even when cancel is still allowed; blocking reasons (terminal status, missing shipped item qty, etc.) must force `canCancel:false`. `previewSaleCancelReversal` must be pure and idempotent — same snapshot, same decision, no shared mutable state and no repository calls.
""",
    "inventory-transfer-wac-fix": """
Branch transfers currently skip WAC bookkeeping, so company average cost drifts after stock moves between branches. Add a pure transfer cost engine — no live DB — that models transfer legs correctly and can audit drift after mixed inventory operations.

Public barrel: `src/modules/inventory/domain/TransferWacEngine.ts`. Export `TransferWacEngine`, `calculateTransferLegs`, `applyTransferWac`, `auditTransferWacDrift`, and the related types. Split into `TransferWacTypes.ts`, `TransferWacMath.ts`, `TransferWacAudit.ts`, plus a domain `index.ts` re-export if useful for consumers.

A transfer moves `qty` from `sourceBranchId` to `destBranchId`. The source unit cost is the current WAC passed in on the request; the destination receives that same unit cost on its inbound leg. For transfer-only moves, company WAC and company on-hand stay unchanged while both branch on-hand values update. Over-transfer (`qty` greater than source on-hand) returns `{ok:false, reason:"insufficient_stock"}`. Zero, negative, or non-finite qty returns `invalid_qty`. Blank product/branch ids, identical source/dest, or a negative unit cost returns `invalid_transfer`.

`auditTransferWacDrift` replays mixed `POSITIVE|NEGATIVE|TRANSFER` ops from an initial company/branch snapshot and compares the expected company WAC and per-branch on-hand to the stored values. Emit issue codes `company_wac_drift`, `branch_onhand_mismatch`, and `missing_leg` when replay cannot produce a consistent result (for example a transfer missing its destination leg, or an over-transfer during audit replay). Keep the whole module pure and deterministic so the regression is covered by Jest without Postgres or side effects.
""",
    "partner-loan-settlement": """
Partner loan balances are stored as many open legs from sales, purchases, expenses, and direct loans. Before we write settlement transactions we need a pure allocator that shows exactly how a payment would clear those legs, including overpay leftover that should stay unallocated.

Barrel at `src/modules/finance/domain/LoanSettlementAllocator.ts`. Export `LoanSettlementAllocator`, `allocateSettlement`, `previewSettlement`, `listOpenLoanLegs`, and types. Supporting files for types, ordering, and math are expected and should stay free of infrastructure imports.

Open legs look like `{legId, sourceType: SALE|PURCHASE|EXPENSE|DIRECT, principalRemaining, openedAt}`. Only legs with a non-empty leg id, positive remaining principal, finite openedAt, and a known source type count as open. `allocateSettlement(partnerId, amount, legs, options?)` clamps amount to a positive finite value at two decimal places. Strategy defaults to `fifo` — sort by `openedAt` ascending, then `legId`. Pass `strategy:"largest_first"` to clear the biggest principal first; ties still break on openedAt then legId.

Return `{ok:true, partnerId, strategy, amount, allocations[{legId, applied, remainingAfter}], leftover, fullySettledLegIds, settledAt}`. Overpay is allowed: leftover stays > 0 after every open leg is cleared. Invalid partner id, non-positive amount, or a non-array legs argument must fail with `invalid_partner`, `invalid_amount`, or `invalid_legs`. `previewSettlement` mirrors allocate and also returns `openLegsAfter` for legs that still have principal remaining. This is application math only — no repositories, SQL, or mutable process state.
""",
    "fulfillment-remaining-guard": """
Ship-later and receive-later flows keep over-fulfilling lines because remaining quantity is computed ad hoc inside use-cases. Add a pure remaining-qty guard we can call before applying a ship/receive delta, and keep the contracts shared so purchases can reuse them later.

Public API lives at `src/modules/sales/domain/FulfillmentRemainingGuard.ts` and exports `FulfillmentRemainingGuard`, `computeRemaining`, `validatePartialFulfillment`, `applyFulfillmentDelta`, `auditFulfillmentConsistency`, plus types. Shared line/status helpers belong under `src/shared/domain/fulfillment/` so other modules can import the same shapes without depending on the sales module graph.

A line is `{lineId, qtyOrdered, qtyFulfilled}`. Remaining is ordered minus fulfilled, but the displayed remaining must never go negative (clamp at zero). Status is `UNFULFILLED` when fulfilled <= 0, `FULFILLED` when fulfilled >= ordered, otherwise `PARTIAL`. `validatePartialFulfillment(line, delta)` rejects non-finite or `delta <= 0` as `invalid_delta`, and `delta > remaining` as `over_fulfill`. Invalid line snapshots (blank id or non-finite/negative quantities) return `invalid_line`.

`applyFulfillmentDelta` returns the updated line, new status, and remaining after a valid delta. `auditFulfillmentConsistency` walks a list of lines (optional stored status) and flags `over_fulfilled`, `negative_remaining`, and `status_mismatch` when stored status disagrees with derived status. Keep the implementation pure and Jest-friendly — no DB clients, no Express wiring, and no hidden clocks or randomness.
""",
}


def main() -> None:
    append("partner-loan-settlement/src/modules/finance/domain/LoanSettlementAllocator.ts", LOAN_EXTRA)
    append("partner-loan-settlement/src/modules/finance/domain/LoanSettlementOrdering.ts", ORDERING_PAD)
    append("partner-loan-settlement/src/modules/finance/domain/LoanSettlementMath.ts", r'''
export function amountFullyCovers(legs: OpenLoanLeg[], amount: number): boolean {
  const open = listOpenLoanLegs(legs);
  const total = open.reduce((sum, leg) => sum + leg.principalRemaining, 0);
  return amount >= total;
}

export function simulateLeftover(legs: OpenLoanLeg[], amount: number, strategy: SettlementStrategy): number {
  return distributeAmount(legs, amount, strategy).leftover;
}
'''.lstrip())

    # Need imports in Ordering pad - LoanSourceType used
    # LoanSettlementOrdering already imports OpenLoanLeg, SettlementStrategy - need LoanSourceType
    ordering = STAGING / "partner-loan-settlement/src/modules/finance/domain/LoanSettlementOrdering.ts"
    text = ordering.read_text(encoding="utf-8")
    if "LoanSourceType" not in text.split("orderLegsForStrategy")[0]:
        text = text.replace(
            "import { OpenLoanLeg, SettlementStrategy } from \"./LoanSettlementTypes\";",
            "import { LoanSourceType, OpenLoanLeg, SettlementStrategy } from \"./LoanSettlementTypes\";",
        )
        ordering.write_text(text, encoding="utf-8")

    math = STAGING / "partner-loan-settlement/src/modules/finance/domain/LoanSettlementMath.ts"
    mtext = math.read_text(encoding="utf-8")
    if "listOpenLoanLegs" not in mtext.split("export function resolveStrategy")[0]:
        mtext = mtext.replace(
            "import { orderLegsForStrategy, listOpenLoanLegs } from \"./LoanSettlementOrdering\";",
            "import { listOpenLoanLegs, orderLegsForStrategy } from \"./LoanSettlementOrdering\";",
        )
        math.write_text(mtext, encoding="utf-8")

    append("fulfillment-remaining-guard/src/modules/sales/domain/FulfillmentRemainingGuard.ts", FULFILL_EXTRA)
    append("fulfillment-remaining-guard/src/shared/domain/fulfillment/FulfillmentMath.ts", SHARED_MATH_PAD)
    # RemainingView already imported in math file via types - check
    mathf = STAGING / "fulfillment-remaining-guard/src/shared/domain/fulfillment/FulfillmentMath.ts"
    ft = mathf.read_text(encoding="utf-8")
    if "RemainingView" not in ft.split("export function normalizeLineId")[0]:
        pass  # already in import from types

    append("fulfillment-remaining-guard/src/shared/domain/fulfillment/FulfillmentAudit.ts", SHARED_AUDIT_PAD)
    auditf = STAGING / "fulfillment-remaining-guard/src/shared/domain/fulfillment/FulfillmentAudit.ts"
    at = auditf.read_text(encoding="utf-8")
    if "FulfillmentIssueCode" not in at.split("export function auditFulfillmentConsistency")[0]:
        at = at.replace(
            "FulfillmentAuditResult,\n  FulfillmentIssue,\n  FulfillmentLine,\n  FulfillmentLineStatus,",
            "FulfillmentAuditResult,\n  FulfillmentIssue,\n  FulfillmentIssueCode,\n  FulfillmentLine,\n  FulfillmentLineStatus,",
        )
        auditf.write_text(at, encoding="utf-8")

    # Fix FulfillmentRemainingGuard for ValidateDeltaResult and FulfillmentLineStatus in pad
    guard = STAGING / "fulfillment-remaining-guard/src/modules/sales/domain/FulfillmentRemainingGuard.ts"
    gt = guard.read_text(encoding="utf-8")
    if "ValidateDeltaResult," not in gt.split("export class FulfillmentRemainingGuard")[0]:
        gt = gt.replace(
            "ApplyFulfillmentResult,\n  ApplyFulfillmentSuccess,\n  FulfillmentAuditResult,\n  FulfillmentLine,\n  RemainingView,\n  ValidateDeltaResult,",
            "ApplyFulfillmentResult,\n  ApplyFulfillmentSuccess,\n  FulfillmentAuditResult,\n  FulfillmentLine,\n  FulfillmentLineStatus,\n  RemainingView,\n  ValidateDeltaResult,",
        )
        guard.write_text(gt, encoding="utf-8")

    for task_id, body in INSTRUCTIONS.items():
        write_instruction(task_id, body)

    # inventory pad a bit more for comfort over 459
    append(
        "inventory-transfer-wac-fix/src/modules/inventory/domain/TransferWacMath.ts",
        r'''
export function mirrorLegs(result: TransferWacResult): TransferLeg[] {
  if (!result.ok) return [];
  return result.legs.map((leg) => ({ ...leg }));
}

export function netQtyMoved(result: TransferWacResult): number {
  if (!result.ok) return 0;
  return result.legs.filter((l) => l.qtyDelta > 0).reduce((s, l) => s + l.qtyDelta, 0);
}
'''.lstrip(),
    )
    math2 = STAGING / "inventory-transfer-wac-fix/src/modules/inventory/domain/TransferWacMath.ts"
    t2 = math2.read_text(encoding="utf-8")
    if "TransferLeg," not in t2.split("export function roundCost")[0]:
        t2 = t2.replace(
            "TransferLeg,\n  TransferRequest,",
            "TransferLeg,\n  TransferRequest,",
        )
        # already has TransferLeg
        math2.write_text(t2, encoding="utf-8")

    print("second pad done")


if __name__ == "__main__":
    main()
