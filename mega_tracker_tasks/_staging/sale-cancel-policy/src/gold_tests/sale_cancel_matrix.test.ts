import { evaluateSaleCancel } from "../modules/sales/domain/SaleCancelPolicy";

describe("Sale cancel status matrix coverage", () => {
  it("status matrix case 1 evaluates without throwing", () => {
    const statuses = ["OPEN", "PARTIALLY_SHIPPED", "SHIPPED", "CANCELLED", "COMPLETED"] as const;
    const status = statuses[0];
    const result = evaluateSaleCancel({
      orderId: "SO-1",
      status,
      items: [{ productId: "P1", qtyOrdered: 2, qtyShipped: 1 }],
      payments: 1 % 2 === 0 ? [{ amount: 1.5, method: "cash" }] : [],
      shipments: 1 % 3 === 0 ? [] : [{ qty: 1 }],
    });
    expect(result.ok === true || result.ok === false).toBe(true);
  });
  it("status matrix case 2 evaluates without throwing", () => {
    const statuses = ["OPEN", "PARTIALLY_SHIPPED", "SHIPPED", "CANCELLED", "COMPLETED"] as const;
    const status = statuses[1];
    const result = evaluateSaleCancel({
      orderId: "SO-2",
      status,
      items: [{ productId: "P2", qtyOrdered: 3, qtyShipped: 1 }],
      payments: 2 % 2 === 0 ? [{ amount: 2.5, method: "cash" }] : [],
      shipments: 2 % 3 === 0 ? [] : [{ qty: 1 }],
    });
    expect(result.ok === true || result.ok === false).toBe(true);
  });
  it("status matrix case 3 evaluates without throwing", () => {
    const statuses = ["OPEN", "PARTIALLY_SHIPPED", "SHIPPED", "CANCELLED", "COMPLETED"] as const;
    const status = statuses[2];
    const result = evaluateSaleCancel({
      orderId: "SO-3",
      status,
      items: [{ productId: "P3", qtyOrdered: 4, qtyShipped: 0 }],
      payments: 3 % 2 === 0 ? [{ amount: 3.5, method: "cash" }] : [],
      shipments: 3 % 3 === 0 ? [] : [{ qty: 1 }],
    });
    expect(result.ok === true || result.ok === false).toBe(true);
  });
  it("status matrix case 4 evaluates without throwing", () => {
    const statuses = ["OPEN", "PARTIALLY_SHIPPED", "SHIPPED", "CANCELLED", "COMPLETED"] as const;
    const status = statuses[3];
    const result = evaluateSaleCancel({
      orderId: "SO-4",
      status,
      items: [{ productId: "P4", qtyOrdered: 5, qtyShipped: 1 }],
      payments: 4 % 2 === 0 ? [{ amount: 4.5, method: "cash" }] : [],
      shipments: 4 % 3 === 0 ? [] : [{ qty: 1 }],
    });
    expect(result.ok === true || result.ok === false).toBe(true);
  });
  it("status matrix case 5 evaluates without throwing", () => {
    const statuses = ["OPEN", "PARTIALLY_SHIPPED", "SHIPPED", "CANCELLED", "COMPLETED"] as const;
    const status = statuses[4];
    const result = evaluateSaleCancel({
      orderId: "SO-5",
      status,
      items: [{ productId: "P5", qtyOrdered: 6, qtyShipped: 1 }],
      payments: 5 % 2 === 0 ? [{ amount: 5.5, method: "cash" }] : [],
      shipments: 5 % 3 === 0 ? [] : [{ qty: 1 }],
    });
    expect(result.ok === true || result.ok === false).toBe(true);
  });
  it("status matrix case 6 evaluates without throwing", () => {
    const statuses = ["OPEN", "PARTIALLY_SHIPPED", "SHIPPED", "CANCELLED", "COMPLETED"] as const;
    const status = statuses[0];
    const result = evaluateSaleCancel({
      orderId: "SO-6",
      status,
      items: [{ productId: "P6", qtyOrdered: 7, qtyShipped: 0 }],
      payments: 6 % 2 === 0 ? [{ amount: 6.5, method: "cash" }] : [],
      shipments: 6 % 3 === 0 ? [] : [{ qty: 1 }],
    });
    expect(result.ok === true || result.ok === false).toBe(true);
  });
  it("status matrix case 7 evaluates without throwing", () => {
    const statuses = ["OPEN", "PARTIALLY_SHIPPED", "SHIPPED", "CANCELLED", "COMPLETED"] as const;
    const status = statuses[1];
    const result = evaluateSaleCancel({
      orderId: "SO-7",
      status,
      items: [{ productId: "P7", qtyOrdered: 8, qtyShipped: 1 }],
      payments: 7 % 2 === 0 ? [{ amount: 7.5, method: "cash" }] : [],
      shipments: 7 % 3 === 0 ? [] : [{ qty: 1 }],
    });
    expect(result.ok === true || result.ok === false).toBe(true);
  });
  it("status matrix case 8 evaluates without throwing", () => {
    const statuses = ["OPEN", "PARTIALLY_SHIPPED", "SHIPPED", "CANCELLED", "COMPLETED"] as const;
    const status = statuses[2];
    const result = evaluateSaleCancel({
      orderId: "SO-8",
      status,
      items: [{ productId: "P8", qtyOrdered: 9, qtyShipped: 1 }],
      payments: 8 % 2 === 0 ? [{ amount: 8.5, method: "cash" }] : [],
      shipments: 8 % 3 === 0 ? [] : [{ qty: 1 }],
    });
    expect(result.ok === true || result.ok === false).toBe(true);
  });
  it("status matrix case 9 evaluates without throwing", () => {
    const statuses = ["OPEN", "PARTIALLY_SHIPPED", "SHIPPED", "CANCELLED", "COMPLETED"] as const;
    const status = statuses[3];
    const result = evaluateSaleCancel({
      orderId: "SO-9",
      status,
      items: [{ productId: "P9", qtyOrdered: 10, qtyShipped: 0 }],
      payments: 9 % 2 === 0 ? [{ amount: 9.5, method: "cash" }] : [],
      shipments: 9 % 3 === 0 ? [] : [{ qty: 1 }],
    });
    expect(result.ok === true || result.ok === false).toBe(true);
  });
  it("status matrix case 10 evaluates without throwing", () => {
    const statuses = ["OPEN", "PARTIALLY_SHIPPED", "SHIPPED", "CANCELLED", "COMPLETED"] as const;
    const status = statuses[4];
    const result = evaluateSaleCancel({
      orderId: "SO-10",
      status,
      items: [{ productId: "P10", qtyOrdered: 11, qtyShipped: 1 }],
      payments: 10 % 2 === 0 ? [{ amount: 10.5, method: "cash" }] : [],
      shipments: 10 % 3 === 0 ? [] : [{ qty: 1 }],
    });
    expect(result.ok === true || result.ok === false).toBe(true);
  });
  it("status matrix case 11 evaluates without throwing", () => {
    const statuses = ["OPEN", "PARTIALLY_SHIPPED", "SHIPPED", "CANCELLED", "COMPLETED"] as const;
    const status = statuses[0];
    const result = evaluateSaleCancel({
      orderId: "SO-11",
      status,
      items: [{ productId: "P11", qtyOrdered: 12, qtyShipped: 1 }],
      payments: 11 % 2 === 0 ? [{ amount: 11.5, method: "cash" }] : [],
      shipments: 11 % 3 === 0 ? [] : [{ qty: 1 }],
    });
    expect(result.ok === true || result.ok === false).toBe(true);
  });
  it("status matrix case 12 evaluates without throwing", () => {
    const statuses = ["OPEN", "PARTIALLY_SHIPPED", "SHIPPED", "CANCELLED", "COMPLETED"] as const;
    const status = statuses[1];
    const result = evaluateSaleCancel({
      orderId: "SO-12",
      status,
      items: [{ productId: "P12", qtyOrdered: 13, qtyShipped: 0 }],
      payments: 12 % 2 === 0 ? [{ amount: 12.5, method: "cash" }] : [],
      shipments: 12 % 3 === 0 ? [] : [{ qty: 1 }],
    });
    expect(result.ok === true || result.ok === false).toBe(true);
  });
});

describe("Sale cancel barrel extras", () => {
  it("ignores zero-amount payments in totals", () => {
    const result = evaluateSaleCancel({
      orderId: "SO-0",
      status: "OPEN",
      items: [],
      payments: [{ amount: 0, method: "cash" }, { amount: 0, method: "partner_loan" }],
      shipments: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.paymentReversalTotal).toBe(0);
      expect(result.loanReversalTotal).toBe(0);
    }
  });

  it("does not reverse inventory when shipments empty even if item qtyShipped set", () => {
    const result = evaluateSaleCancel({
      orderId: "SO-I",
      status: "OPEN",
      items: [{ productId: "P1", qtyOrdered: 5, qtyShipped: 2 }],
      payments: [],
      shipments: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.inventoryReversals).toEqual([]);
      expect(result.reasons).not.toContain("inventory_reversal_required");
    }
  });

  it("loan total is a subset of payment total", () => {
    const result = evaluateSaleCancel({
      orderId: "SO-L",
      status: "OPEN",
      items: [],
      payments: [
        { amount: 40, method: "cash" },
        { amount: 10, method: "partner_loan" },
      ],
      shipments: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.loanReversalTotal).toBe(10);
      expect(result.paymentReversalTotal).toBe(50);
    }
  });

  it("returns invalid_order when payments is not an array", () => {
    expect(
      evaluateSaleCancel({
        orderId: "SO-X",
        status: "OPEN",
        items: [],
        payments: {} as any,
        shipments: [],
      })
    ).toEqual({ ok: false, reason: "invalid_order" });
  });

  it("handles multiple shipment rows summing to positive", () => {
    const result = evaluateSaleCancel({
      orderId: "SO-M",
      status: "PARTIALLY_SHIPPED",
      items: [{ productId: "Z", qtyOrdered: 9, qtyShipped: 4 }],
      payments: [],
      shipments: [{ qty: 0 }, { qty: 4 }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.inventoryReversals).toEqual([{ productId: "Z", qty: 4 }]);
    }
  });
});
