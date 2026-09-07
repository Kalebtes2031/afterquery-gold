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
    expect(roundMoney(1.006)).toBe(1.01);
    expect(roundMoney(2.004)).toBe(2);
    expect(sumPaymentTotal([{ amount: 1.006, method: "cash" }, { amount: 2.004, method: "cash" }])).toBe(3.01);
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
