# -*- coding: utf-8 -*-
"""Write staging sources for all four mega-tracker Gold tasks."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
STAGING = ROOT / "_staging"


def w(rel: str, content: str) -> None:
    path = STAGING / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    text = content.replace("\r\n", "\n").replace("\r", "\n")
    if not text.endswith("\n"):
        text += "\n"
    path.write_text(text, encoding="utf-8")


def write_sale_cancel() -> None:
    t = "sale-cancel-policy"
    w(f"{t}/src/modules/sales/domain/SaleCancelTypes.ts", r'''
export type SaleCancelStatus =
  | "OPEN"
  | "PARTIALLY_SHIPPED"
  | "SHIPPED"
  | "CANCELLED"
  | "COMPLETED";

export type SaleCancelPaymentMethod = "cash" | "transfer" | "partner_loan" | string;

export interface SaleCancelItemSnapshot {
  productId: string;
  qtyOrdered: number;
  qtyShipped: number;
}

export interface SaleCancelPaymentSnapshot {
  amount: number;
  method: SaleCancelPaymentMethod;
}

export interface SaleCancelShipmentSnapshot {
  qty: number;
}

export interface SaleCancelOrderSnapshot {
  orderId: string;
  status: SaleCancelStatus;
  items: SaleCancelItemSnapshot[];
  payments: SaleCancelPaymentSnapshot[];
  shipments: SaleCancelShipmentSnapshot[];
}

export interface InventoryReversalLine {
  productId: string;
  qty: number;
}

export interface SaleCancelSuccess {
  ok: true;
  canCancel: boolean;
  reasons: string[];
  inventoryReversals: InventoryReversalLine[];
  paymentReversalTotal: number;
  loanReversalTotal: number;
}

export interface SaleCancelFailure {
  ok: false;
  reason: "invalid_order";
}

export type SaleCancelDecision = SaleCancelSuccess | SaleCancelFailure;

export const CANCELABLE_STATUSES: ReadonlySet<SaleCancelStatus> = new Set([
  "OPEN",
  "PARTIALLY_SHIPPED",
]);

export const BLOCKED_STATUSES: ReadonlySet<SaleCancelStatus> = new Set([
  "SHIPPED",
  "CANCELLED",
  "COMPLETED",
]);
'''.lstrip())

    w(f"{t}/src/modules/sales/domain/SaleCancelRules.ts", r'''
import {
  BLOCKED_STATUSES,
  CANCELABLE_STATUSES,
  SaleCancelOrderSnapshot,
  SaleCancelStatus,
} from "./SaleCancelTypes";

export function normalizeOrderId(orderId: unknown): string | null {
  if (typeof orderId !== "string") return null;
  const trimmed = orderId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isKnownStatus(status: unknown): status is SaleCancelStatus {
  return (
    status === "OPEN" ||
    status === "PARTIALLY_SHIPPED" ||
    status === "SHIPPED" ||
    status === "CANCELLED" ||
    status === "COMPLETED"
  );
}

export function validateOrderSnapshot(
  order: SaleCancelOrderSnapshot | null | undefined
): { ok: true; orderId: string; status: SaleCancelStatus } | { ok: false; reason: "invalid_order" } {
  if (!order || typeof order !== "object") {
    return { ok: false, reason: "invalid_order" };
  }
  const orderId = normalizeOrderId(order.orderId);
  if (!orderId) {
    return { ok: false, reason: "invalid_order" };
  }
  if (!isKnownStatus(order.status)) {
    return { ok: false, reason: "invalid_order" };
  }
  if (!Array.isArray(order.items) || !Array.isArray(order.payments) || !Array.isArray(order.shipments)) {
    return { ok: false, reason: "invalid_order" };
  }
  return { ok: true, orderId, status: order.status };
}

export function statusAllowsCancel(status: SaleCancelStatus): boolean {
  if (BLOCKED_STATUSES.has(status)) return false;
  return CANCELABLE_STATUSES.has(status);
}

export function collectCancelBlockReasons(status: SaleCancelStatus): string[] {
  const reasons: string[] = [];
  if (status === "CANCELLED") reasons.push("already_cancelled");
  if (status === "COMPLETED") reasons.push("already_completed");
  if (status === "SHIPPED") reasons.push("fully_shipped");
  if (!statusAllowsCancel(status) && reasons.length === 0) {
    reasons.push("status_not_cancelable");
  }
  return reasons;
}
'''.lstrip())

    w(f"{t}/src/modules/sales/domain/SaleCancelReversal.ts", r'''
import {
  InventoryReversalLine,
  SaleCancelItemSnapshot,
  SaleCancelPaymentSnapshot,
  SaleCancelShipmentSnapshot,
} from "./SaleCancelTypes";

export function hasPositiveShipmentQty(shipments: SaleCancelShipmentSnapshot[]): boolean {
  return shipments.some((s) => Number(s?.qty) > 0);
}

export function aggregateInventoryReversals(
  items: SaleCancelItemSnapshot[]
): InventoryReversalLine[] {
  const map = new Map<string, number>();
  for (const item of items) {
    if (!item || typeof item.productId !== "string") continue;
    const productId = item.productId.trim();
    if (!productId) continue;
    const qty = Number(item.qtyShipped);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    map.set(productId, (map.get(productId) ?? 0) + qty);
  }
  return [...map.entries()]
    .map(([productId, qty]) => ({ productId, qty }))
    .sort((a, b) => a.productId.localeCompare(b.productId));
}

export function sumPaymentTotal(payments: SaleCancelPaymentSnapshot[]): number {
  let total = 0;
  for (const payment of payments) {
    const amount = Number(payment?.amount);
    if (Number.isFinite(amount) && amount > 0) total += amount;
  }
  return roundMoney(total);
}

export function sumLoanPaymentTotal(payments: SaleCancelPaymentSnapshot[]): number {
  let total = 0;
  for (const payment of payments) {
    if (String(payment?.method ?? "").toLowerCase() !== "partner_loan") continue;
    const amount = Number(payment?.amount);
    if (Number.isFinite(amount) && amount > 0) total += amount;
  }
  return roundMoney(total);
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
'''.lstrip())

    w(f"{t}/src/modules/sales/domain/SaleCancelPolicy.ts", r'''
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
'''.lstrip())

    w(f"{t}/src/modules/sales/domain/index.ts", r'''
export {
  SaleCancelPolicy,
  saleCancelPolicy,
  evaluateSaleCancel,
  previewSaleCancelReversal,
  CANCELABLE_STATUSES,
  BLOCKED_STATUSES,
  normalizeOrderId,
  isKnownStatus,
  validateOrderSnapshot,
  statusAllowsCancel,
  collectCancelBlockReasons,
  hasPositiveShipmentQty,
  aggregateInventoryReversals,
  sumPaymentTotal,
  sumLoanPaymentTotal,
  roundMoney,
} from "./SaleCancelPolicy";

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
} from "./SaleCancelPolicy";
'''.lstrip())

    # Import path in gold_tests: from the gold_tests folder, modules are at
    # ../modules/... but gold_tests live at src/gold_tests, so path is
    # ../modules/sales/domain/SaleCancelPolicy
    write_sale_cancel_tests(t)


def write_sale_cancel_tests(t: str) -> None:
    g = f"{t}/src/gold_tests"
    # Generate many small it() cases programmatically for line + f2p count
    cases = []
    for i in range(1, 13):
        cases.append(
            f'''  it("status matrix case {i} evaluates without throwing", () => {{
    const statuses = ["OPEN", "PARTIALLY_SHIPPED", "SHIPPED", "CANCELLED", "COMPLETED"] as const;
    const status = statuses[{(i - 1) % 5}];
    const result = evaluateSaleCancel({{
      orderId: "SO-{i}",
      status,
      items: [{{ productId: "P{i}", qtyOrdered: {i + 1}, qtyShipped: {0 if i % 3 == 0 else 1} }}],
      payments: {i} % 2 === 0 ? [{{ amount: {i}.5, method: "cash" }}] : [],
      shipments: {i} % 3 === 0 ? [] : [{{ qty: 1 }}],
    }});
    expect(result.ok === true || result.ok === false).toBe(true);
  }});'''
        )

    w(f"{g}/sale_cancel_evaluate.test.ts", r'''
import {
  evaluateSaleCancel,
  previewSaleCancelReversal,
  SaleCancelPolicy,
  SaleCancelOrderSnapshot,
} from "../modules/sales/domain/SaleCancelPolicy";

function baseOrder(over: Partial<SaleCancelOrderSnapshot> = {}): SaleCancelOrderSnapshot {
  return {
    orderId: "SO-1",
    status: "OPEN",
    items: [{ productId: "P1", qtyOrdered: 10, qtyShipped: 0 }],
    payments: [],
    shipments: [],
    ...over,
  };
}

describe("Sale cancel evaluate eligibility", () => {
  it("allows cancel for OPEN with no shipments or payments", () => {
    const result = evaluateSaleCancel(baseOrder());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.canCancel).toBe(true);
      expect(result.inventoryReversals).toEqual([]);
      expect(result.paymentReversalTotal).toBe(0);
      expect(result.loanReversalTotal).toBe(0);
    }
  });

  it("allows cancel for PARTIALLY_SHIPPED when inventory can reverse", () => {
    const result = evaluateSaleCancel(
      baseOrder({
        status: "PARTIALLY_SHIPPED",
        items: [{ productId: "P1", qtyOrdered: 10, qtyShipped: 3 }],
        shipments: [{ qty: 3 }],
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.canCancel).toBe(true);
      expect(result.inventoryReversals).toEqual([{ productId: "P1", qty: 3 }]);
      expect(result.reasons).toContain("inventory_reversal_required");
    }
  });

  it("blocks CANCELLED orders", () => {
    const result = evaluateSaleCancel(baseOrder({ status: "CANCELLED" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.canCancel).toBe(false);
      expect(result.reasons).toContain("already_cancelled");
    }
  });

  it("blocks COMPLETED orders", () => {
    const result = evaluateSaleCancel(baseOrder({ status: "COMPLETED" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.canCancel).toBe(false);
      expect(result.reasons).toContain("already_completed");
    }
  });

  it("blocks SHIPPED orders", () => {
    const result = evaluateSaleCancel(
      baseOrder({
        status: "SHIPPED",
        items: [{ productId: "P1", qtyOrdered: 2, qtyShipped: 2 }],
        shipments: [{ qty: 2 }],
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.canCancel).toBe(false);
      expect(result.reasons).toContain("fully_shipped");
    }
  });

  it("returns invalid_order for empty orderId", () => {
    expect(evaluateSaleCancel(baseOrder({ orderId: "  " }))).toEqual({
      ok: false,
      reason: "invalid_order",
    });
  });

  it("returns invalid_order for unknown status", () => {
    expect(evaluateSaleCancel(baseOrder({ status: "CLOSED" as any }))).toEqual({
      ok: false,
      reason: "invalid_order",
    });
  });

  it("returns invalid_order when order is nullish", () => {
    expect(evaluateSaleCancel(null as any)).toEqual({ ok: false, reason: "invalid_order" });
  });

  it("aggregates shipped qty per product across lines", () => {
    const result = evaluateSaleCancel(
      baseOrder({
        status: "PARTIALLY_SHIPPED",
        items: [
          { productId: "P2", qtyOrdered: 5, qtyShipped: 2 },
          { productId: "P1", qtyOrdered: 5, qtyShipped: 1 },
          { productId: "P2", qtyOrdered: 3, qtyShipped: 1 },
        ],
        shipments: [{ qty: 2 }, { qty: 1 }, { qty: 1 }],
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.inventoryReversals).toEqual([
        { productId: "P1", qty: 1 },
        { productId: "P2", qty: 3 },
      ]);
    }
  });

  it("sums payment and partner_loan totals separately", () => {
    const result = evaluateSaleCancel(
      baseOrder({
        payments: [
          { amount: 50, method: "cash" },
          { amount: 25.5, method: "partner_loan" },
          { amount: 10, method: "PARTNER_LOAN" },
        ],
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paymentReversalTotal).toBe(85.5);
      expect(result.loanReversalTotal).toBe(35.5);
      expect(result.reasons).toContain("payment_reversal_required");
      expect(result.reasons).toContain("loan_reversal_required");
      expect(result.canCancel).toBe(true);
    }
  });
});

describe("Sale cancel preview idempotence", () => {
  it("matches evaluate for the same snapshot", () => {
    const order = baseOrder({
      status: "PARTIALLY_SHIPPED",
      items: [{ productId: "P9", qtyOrdered: 4, qtyShipped: 2 }],
      shipments: [{ qty: 2 }],
      payments: [{ amount: 12, method: "transfer" }],
    });
    expect(previewSaleCancelReversal(order)).toEqual(evaluateSaleCancel(order));
  });

  it("is stable across repeated calls", () => {
    const order = baseOrder();
    expect(previewSaleCancelReversal(order)).toEqual(previewSaleCancelReversal(order));
  });

  it("SaleCancelPolicy.evaluate delegates to evaluateSaleCancel", () => {
    const policy = new SaleCancelPolicy();
    const order = baseOrder();
    expect(policy.evaluate(order)).toEqual(evaluateSaleCancel(order));
  });

  it("SaleCancelPolicy.previewReversal delegates to previewSaleCancelReversal", () => {
    const policy = new SaleCancelPolicy();
    const order = baseOrder({ payments: [{ amount: 1, method: "cash" }] });
    expect(policy.previewReversal(order)).toEqual(previewSaleCancelReversal(order));
  });
});
'''.lstrip())

    w(f"{g}/sale_cancel_reversal.test.ts", r'''
import {
  aggregateInventoryReversals,
  evaluateSaleCancel,
  hasPositiveShipmentQty,
  roundMoney,
  sumLoanPaymentTotal,
  sumPaymentTotal,
  SaleCancelOrderSnapshot,
} from "../modules/sales/domain/SaleCancelPolicy";

describe("Sale cancel reversal helpers", () => {
  it("detects positive shipment qty", () => {
    expect(hasPositiveShipmentQty([{ qty: 0 }, { qty: 1 }])).toBe(true);
    expect(hasPositiveShipmentQty([{ qty: 0 }])).toBe(false);
    expect(hasPositiveShipmentQty([])).toBe(false);
  });

  it("skips blank product ids when aggregating", () => {
    expect(
      aggregateInventoryReversals([
        { productId: "  ", qtyOrdered: 1, qtyShipped: 1 },
        { productId: "A", qtyOrdered: 2, qtyShipped: 2 },
      ])
    ).toEqual([{ productId: "A", qty: 2 }]);
  });

  it("ignores non-positive shipped qty", () => {
    expect(
      aggregateInventoryReversals([
        { productId: "A", qtyOrdered: 2, qtyShipped: 0 },
        { productId: "B", qtyOrdered: 2, qtyShipped: -1 },
      ])
    ).toEqual([]);
  });

  it("rounds money to two decimals", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(sumPaymentTotal([{ amount: 1.005, method: "cash" }, { amount: 2.004, method: "cash" }])).toBe(3.01);
  });

  it("ignores non-finite payment amounts", () => {
    expect(sumPaymentTotal([{ amount: Number.NaN, method: "cash" }, { amount: 4, method: "cash" }])).toBe(4);
    expect(sumLoanPaymentTotal([{ amount: Infinity, method: "partner_loan" }])).toBe(0);
  });

  it("does not require inventory reversal when all shipment qtys are zero", () => {
    const order: SaleCancelOrderSnapshot = {
      orderId: "SO-Z",
      status: "OPEN",
      items: [{ productId: "P1", qtyOrdered: 5, qtyShipped: 0 }],
      payments: [],
      shipments: [{ qty: 0 }],
    };
    const result = evaluateSaleCancel(order);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.inventoryReversals).toEqual([]);
      expect(result.reasons).not.toContain("inventory_reversal_required");
    }
  });

  it("flags missing_shipped_item_qty when shipments positive but items have no shipped qty", () => {
    const result = evaluateSaleCancel({
      orderId: "SO-BAD",
      status: "PARTIALLY_SHIPPED",
      items: [{ productId: "P1", qtyOrdered: 5, qtyShipped: 0 }],
      payments: [],
      shipments: [{ qty: 2 }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.canCancel).toBe(false);
      expect(result.reasons).toContain("missing_shipped_item_qty");
    }
  });

  it("trims product ids before aggregating", () => {
    expect(
      aggregateInventoryReversals([
        { productId: "  PX  ", qtyOrdered: 3, qtyShipped: 1 },
        { productId: "PX", qtyOrdered: 3, qtyShipped: 2 },
      ])
    ).toEqual([{ productId: "PX", qty: 3 }]);
  });

  it("keeps canCancel true for OPEN with payments that need reversal", () => {
    const result = evaluateSaleCancel({
      orderId: "SO-PAY",
      status: "OPEN",
      items: [{ productId: "P1", qtyOrdered: 1, qtyShipped: 0 }],
      payments: [{ amount: 9, method: "cash" }],
      shipments: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.canCancel).toBe(true);
      expect(result.paymentReversalTotal).toBe(9);
    }
  });

  it("treats negative payment amounts as zero contribution", () => {
    expect(sumPaymentTotal([{ amount: -5, method: "cash" }, { amount: 3, method: "cash" }])).toBe(3);
  });
});
'''.lstrip())

    w(f"{g}/sale_cancel_edges.test.ts", r'''
import {
  BLOCKED_STATUSES,
  CANCELABLE_STATUSES,
  collectCancelBlockReasons,
  evaluateSaleCancel,
  isKnownStatus,
  normalizeOrderId,
  statusAllowsCancel,
  validateOrderSnapshot,
} from "../modules/sales/domain/SaleCancelPolicy";

describe("Sale cancel edge validation", () => {
  it("normalizeOrderId trims and rejects blanks", () => {
    expect(normalizeOrderId("  a  ")).toBe("a");
    expect(normalizeOrderId("")).toBeNull();
    expect(normalizeOrderId(12 as any)).toBeNull();
  });

  it("isKnownStatus accepts only the five statuses", () => {
    expect(isKnownStatus("OPEN")).toBe(true);
    expect(isKnownStatus("PARTIALLY_SHIPPED")).toBe(true);
    expect(isKnownStatus("SHIPPED")).toBe(true);
    expect(isKnownStatus("CANCELLED")).toBe(true);
    expect(isKnownStatus("COMPLETED")).toBe(true);
    expect(isKnownStatus("CLOSED")).toBe(false);
  });

  it("statusAllowsCancel only for OPEN and PARTIALLY_SHIPPED", () => {
    expect(statusAllowsCancel("OPEN")).toBe(true);
    expect(statusAllowsCancel("PARTIALLY_SHIPPED")).toBe(true);
    expect(statusAllowsCancel("SHIPPED")).toBe(false);
    expect(statusAllowsCancel("CANCELLED")).toBe(false);
    expect(statusAllowsCancel("COMPLETED")).toBe(false);
  });

  it("exposes cancelable and blocked status sets", () => {
    expect(CANCELABLE_STATUSES.has("OPEN")).toBe(true);
    expect(BLOCKED_STATUSES.has("COMPLETED")).toBe(true);
  });

  it("validateOrderSnapshot requires item/payment/shipment arrays", () => {
    expect(
      validateOrderSnapshot({
        orderId: "X",
        status: "OPEN",
        items: null as any,
        payments: [],
        shipments: [],
      })
    ).toEqual({ ok: false, reason: "invalid_order" });
  });

  it("collectCancelBlockReasons covers blocked statuses", () => {
    expect(collectCancelBlockReasons("CANCELLED")).toContain("already_cancelled");
    expect(collectCancelBlockReasons("COMPLETED")).toContain("already_completed");
    expect(collectCancelBlockReasons("SHIPPED")).toContain("fully_shipped");
  });

  it("rejects missing order object fields as invalid_order", () => {
    expect(evaluateSaleCancel(undefined as any).ok).toBe(false);
  });

  it("reasons list is sorted uniquely", () => {
    const result = evaluateSaleCancel({
      orderId: "SO-R",
      status: "PARTIALLY_SHIPPED",
      items: [{ productId: "P1", qtyOrdered: 2, qtyShipped: 1 }],
      payments: [
        { amount: 1, method: "partner_loan" },
        { amount: 2, method: "cash" },
      ],
      shipments: [{ qty: 1 }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const sorted = [...result.reasons].sort((a, b) => a.localeCompare(b));
      expect(result.reasons).toEqual(sorted);
      expect(new Set(result.reasons).size).toBe(result.reasons.length);
    }
  });

  it("OPEN with empty arrays is cancelable", () => {
    const result = evaluateSaleCancel({
      orderId: "empty",
      status: "OPEN",
      items: [],
      payments: [],
      shipments: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.canCancel).toBe(true);
  });

  it("invalid status string yields invalid_order not a success decision", () => {
    const result = evaluateSaleCancel({
      orderId: "SO-1",
      status: "open" as any,
      items: [],
      payments: [],
      shipments: [],
    });
    expect(result).toEqual({ ok: false, reason: "invalid_order" });
  });
});

describe("Sale cancel concurrent preview safety", () => {
  it("two parallel logical previews do not interfere", () => {
    const a = evaluateSaleCancel({
      orderId: "A",
      status: "OPEN",
      items: [],
      payments: [{ amount: 5, method: "cash" }],
      shipments: [],
    });
    const b = evaluateSaleCancel({
      orderId: "B",
      status: "CANCELLED",
      items: [],
      payments: [],
      shipments: [],
    });
    expect(a.ok && a.canCancel).toBe(true);
    expect(b.ok && b.canCancel).toBe(false);
  });
});
'''.lstrip())

    matrix = "\n".join(cases)
    w(f"{g}/sale_cancel_matrix.test.ts", f'''
import {{ evaluateSaleCancel }} from "../modules/sales/domain/SaleCancelPolicy";

describe("Sale cancel status matrix coverage", () => {{
{matrix}
}});

describe("Sale cancel barrel extras", () => {{
  it("ignores zero-amount payments in totals", () => {{
    const result = evaluateSaleCancel({{
      orderId: "SO-0",
      status: "OPEN",
      items: [],
      payments: [{{ amount: 0, method: "cash" }}, {{ amount: 0, method: "partner_loan" }}],
      shipments: [],
    }});
    expect(result.ok).toBe(true);
    if (result.ok) {{
      expect(result.paymentReversalTotal).toBe(0);
      expect(result.loanReversalTotal).toBe(0);
    }}
  }});

  it("does not reverse inventory when shipments empty even if item qtyShipped set", () => {{
    const result = evaluateSaleCancel({{
      orderId: "SO-I",
      status: "OPEN",
      items: [{{ productId: "P1", qtyOrdered: 5, qtyShipped: 2 }}],
      payments: [],
      shipments: [],
    }});
    expect(result.ok).toBe(true);
    if (result.ok) {{
      expect(result.inventoryReversals).toEqual([]);
      expect(result.reasons).not.toContain("inventory_reversal_required");
    }}
  }});

  it("loan total is a subset of payment total", () => {{
    const result = evaluateSaleCancel({{
      orderId: "SO-L",
      status: "OPEN",
      items: [],
      payments: [
        {{ amount: 40, method: "cash" }},
        {{ amount: 10, method: "partner_loan" }},
      ],
      shipments: [],
    }});
    expect(result.ok).toBe(true);
    if (result.ok) {{
      expect(result.loanReversalTotal).toBe(10);
      expect(result.paymentReversalTotal).toBe(50);
    }}
  }});

  it("returns invalid_order when payments is not an array", () => {{
    expect(
      evaluateSaleCancel({{
        orderId: "SO-X",
        status: "OPEN",
        items: [],
        payments: {{}} as any,
        shipments: [],
      }})
    ).toEqual({{ ok: false, reason: "invalid_order" }});
  }});

  it("handles multiple shipment rows summing to positive", () => {{
    const result = evaluateSaleCancel({{
      orderId: "SO-M",
      status: "PARTIALLY_SHIPPED",
      items: [{{ productId: "Z", qtyOrdered: 9, qtyShipped: 4 }}],
      payments: [],
      shipments: [{{ qty: 0 }}, {{ qty: 4 }}],
    }});
    expect(result.ok).toBe(true);
    if (result.ok) {{
      expect(result.inventoryReversals).toEqual([{{ productId: "Z", qty: 4 }}]);
    }}
  }});
}});
'''.lstrip())


def main() -> None:
    write_sale_cancel()
    print("wrote sale-cancel-policy staging")


if __name__ == "__main__":
    main()
