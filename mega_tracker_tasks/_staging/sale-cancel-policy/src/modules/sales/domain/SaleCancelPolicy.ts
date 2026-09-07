import {
  collectCancelBlockReasons,
  statusAllowsCancel,
  validateOrderSnapshot,
} from "./SaleCancelRules";
import {
  aggregateInventoryReversals,
  hasPositiveShipmentQty,
  sumLoanPaymentTotal,
  sumPaymentTotal,
} from "./SaleCancelReversal";
import {
  InventoryReversalLine,
  SaleCancelDecision,
  SaleCancelOrderSnapshot,
  SaleCancelSuccess,
} from "./SaleCancelTypes";

export type {
  SaleCancelDecision,
  SaleCancelOrderSnapshot,
  SaleCancelStatus,
  SaleCancelItemSnapshot,
  SaleCancelPaymentSnapshot,
  SaleCancelShipmentSnapshot,
  InventoryReversalLine,
  SaleCancelSuccess,
  SaleCancelFailure,
  SaleCancelPaymentMethod,
} from "./SaleCancelTypes";

export {
  CANCELABLE_STATUSES,
  BLOCKED_STATUSES,
} from "./SaleCancelTypes";

export {
  normalizeOrderId,
  isKnownStatus,
  validateOrderSnapshot,
  statusAllowsCancel,
  collectCancelBlockReasons,
} from "./SaleCancelRules";

export {
  hasPositiveShipmentQty,
  aggregateInventoryReversals,
  sumPaymentTotal,
  sumLoanPaymentTotal,
  roundMoney,
} from "./SaleCancelReversal";

/**
 * Pure sale-cancel eligibility + reversal preview.
 * Concurrent-safe and idempotent: no shared mutable state.
 */
export class SaleCancelPolicy {
  evaluate(order: SaleCancelOrderSnapshot): SaleCancelDecision {
    return evaluateSaleCancel(order);
  }

  previewReversal(order: SaleCancelOrderSnapshot): SaleCancelDecision {
    return previewSaleCancelReversal(order);
  }
}

export function evaluateSaleCancel(order: SaleCancelOrderSnapshot): SaleCancelDecision {
  const validated = validateOrderSnapshot(order);
  if (!validated.ok) return { ok: false, reason: "invalid_order" };

  const reasons = collectCancelBlockReasons(validated.status);
  const canCancelByStatus = statusAllowsCancel(validated.status) && reasons.length === 0;

  const needsInventory = hasPositiveShipmentQty(order.shipments ?? []);
  const inventoryReversals = needsInventory
    ? aggregateInventoryReversals(order.items ?? [])
    : [];

  const paymentReversalTotal = sumPaymentTotal(order.payments ?? []);
  const loanReversalTotal = sumLoanPaymentTotal(order.payments ?? []);

  if (needsInventory && inventoryReversals.length === 0) {
    reasons.push("missing_shipped_item_qty");
  }
  if (paymentReversalTotal > 0) reasons.push("payment_reversal_required");
  if (loanReversalTotal > 0) reasons.push("loan_reversal_required");
  if (needsInventory) reasons.push("inventory_reversal_required");

  const blocking = reasons.filter((r) =>
    r === "already_cancelled" ||
    r === "already_completed" ||
    r === "fully_shipped" ||
    r === "status_not_cancelable" ||
    r === "missing_shipped_item_qty"
  );

  const success: SaleCancelSuccess = {
    ok: true,
    canCancel: canCancelByStatus && blocking.length === 0,
    reasons: uniqueSorted(reasons),
    inventoryReversals,
    paymentReversalTotal,
    loanReversalTotal,
  };
  return success;
}

export function previewSaleCancelReversal(order: SaleCancelOrderSnapshot): SaleCancelDecision {
  return evaluateSaleCancel(order);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export const saleCancelPolicy = new SaleCancelPolicy();

/** Summarize a decision for logs / UI without mutating it. */
export function summarizeSaleCancelDecision(decision: SaleCancelDecision): string {
  if (!decision.ok) return `fail:${decision.reason}`;
  const inv = decision.inventoryReversals.map((r) => `${r.productId}:${r.qty}`).join(",");
  return [
    `canCancel=${decision.canCancel}`,
    `reasons=${decision.reasons.join("|") || "-"}`,
    `inv=[${inv}]`,
    `pay=${decision.paymentReversalTotal}`,
    `loan=${decision.loanReversalTotal}`,
  ].join(";");
}

export function countInventoryReversalQty(decision: SaleCancelDecision): number {
  if (!decision.ok) return 0;
  return decision.inventoryReversals.reduce((sum, row) => sum + row.qty, 0);
}

export function hasLoanReversal(decision: SaleCancelDecision): boolean {
  return decision.ok && decision.loanReversalTotal > 0;
}

export function hasPaymentReversal(decision: SaleCancelDecision): boolean {
  return decision.ok && decision.paymentReversalTotal > 0;
}

export function isAdvisoryReason(reason: string): boolean {
  return (
    reason === "payment_reversal_required" ||
    reason === "loan_reversal_required" ||
    reason === "inventory_reversal_required"
  );
}

export function partitionReasons(reasons: string[]): { blocking: string[]; advisory: string[] } {
  const blocking: string[] = [];
  const advisory: string[] = [];
  for (const reason of reasons) {
    if (isAdvisoryReason(reason)) advisory.push(reason);
    else blocking.push(reason);
  }
  return { blocking, advisory };
}

export function assertCancelPreviewStable(
  order: SaleCancelOrderSnapshot,
  rounds = 3
): SaleCancelDecision {
  const first = previewSaleCancelReversal(order);
  for (let i = 0; i < rounds; i += 1) {
    const next = previewSaleCancelReversal(order);
    if (JSON.stringify(next) !== JSON.stringify(first)) {
      throw new Error("sale cancel preview is not stable");
    }
  }
  return first;
}

export function mergeInventoryReversals(
  left: InventoryReversalLine[],
  right: InventoryReversalLine[]
): InventoryReversalLine[] {
  const map = new Map<string, number>();
  for (const row of [...left, ...right]) {
    map.set(row.productId, (map.get(row.productId) ?? 0) + row.qty);
  }
  return [...map.entries()]
    .map(([productId, qty]) => ({ productId, qty }))
    .sort((a, b) => a.productId.localeCompare(b.productId));
}

export function describeCancelability(decision: SaleCancelDecision): string {
  if (!decision.ok) return "invalid";
  if (decision.canCancel) return "cancelable";
  return "blocked";
}

export function requireCancelable(decision: SaleCancelDecision): asserts decision is SaleCancelSuccess {
  if (!decision.ok || !decision.canCancel) {
    throw new Error("order is not cancelable");
  }
}

export function paymentMethodsRequiringReversal(order: SaleCancelOrderSnapshot): string[] {
  const methods = new Set<string>();
  for (const payment of order.payments ?? []) {
    const amount = Number(payment?.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    methods.add(String(payment.method ?? "unknown").toLowerCase());
  }
  return [...methods].sort((a, b) => a.localeCompare(b));
}

export function shipmentQtyTotal(order: SaleCancelOrderSnapshot): number {
  return (order.shipments ?? []).reduce((sum, row) => {
    const qty = Number(row?.qty);
    return sum + (Number.isFinite(qty) && qty > 0 ? qty : 0);
  }, 0);
}

export function itemShippedQtyTotal(order: SaleCancelOrderSnapshot): number {
  return (order.items ?? []).reduce((sum, row) => {
    const qty = Number(row?.qtyShipped);
    return sum + (Number.isFinite(qty) && qty > 0 ? qty : 0);
  }, 0);
}

export function previewNeedsAttention(decision: SaleCancelDecision): boolean {
  if (!decision.ok) return true;
  return !decision.canCancel || decision.reasons.length > 0;
}
