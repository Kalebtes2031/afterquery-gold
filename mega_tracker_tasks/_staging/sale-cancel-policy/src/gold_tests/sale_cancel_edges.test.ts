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
