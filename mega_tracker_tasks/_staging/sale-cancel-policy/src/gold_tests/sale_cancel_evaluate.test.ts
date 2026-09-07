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
