import {
  applyFulfillmentDelta,
  computeRemaining,
  validatePartialFulfillment,
  FulfillmentRemainingGuard,
} from "../modules/sales/domain/FulfillmentRemainingGuard";

describe("Fulfillment remaining compute", () => {
  it("computes remaining as ordered minus fulfilled", () => {
    expect(computeRemaining({ lineId: "L1", qtyOrdered: 10, qtyFulfilled: 3 })).toEqual({
      lineId: "L1",
      qtyOrdered: 10,
      qtyFulfilled: 3,
      remaining: 7,
      status: "PARTIAL",
    });
  });

  it("clamps negative remaining display to zero", () => {
    const view = computeRemaining({ lineId: "L2", qtyOrdered: 5, qtyFulfilled: 9 });
    expect(view?.remaining).toBe(0);
    expect(view?.status).toBe("FULFILLED");
  });

  it("marks UNFULFILLED when fulfilled is zero", () => {
    expect(computeRemaining({ lineId: "L3", qtyOrdered: 4, qtyFulfilled: 0 })?.status).toBe(
      "UNFULFILLED"
    );
  });

  it("returns null for blank line id", () => {
    expect(computeRemaining({ lineId: "  ", qtyOrdered: 1, qtyFulfilled: 0 })).toBeNull();
  });

  it("returns null for negative quantities", () => {
    expect(computeRemaining({ lineId: "L", qtyOrdered: -1, qtyFulfilled: 0 })).toBeNull();
  });
});

describe("Fulfillment validate and apply", () => {
  it("rejects delta <= 0 as invalid_delta", () => {
    expect(validatePartialFulfillment({ lineId: "L", qtyOrdered: 5, qtyFulfilled: 1 }, 0)).toEqual({
      ok: false,
      reason: "invalid_delta",
      lineId: "L",
    });
    expect(validatePartialFulfillment({ lineId: "L", qtyOrdered: 5, qtyFulfilled: 1 }, -2).ok).toBe(
      false
    );
  });

  it("rejects delta greater than remaining as over_fulfill", () => {
    expect(validatePartialFulfillment({ lineId: "L", qtyOrdered: 5, qtyFulfilled: 4 }, 2)).toEqual({
      ok: false,
      reason: "over_fulfill",
      lineId: "L",
    });
  });

  it("applies delta and returns PARTIAL status", () => {
    const result = applyFulfillmentDelta({ lineId: "L", qtyOrdered: 10, qtyFulfilled: 2 }, 3);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.line.qtyFulfilled).toBe(5);
      expect(result.status).toBe("PARTIAL");
      expect(result.remaining).toBe(5);
    }
  });

  it("applies delta to reach FULFILLED", () => {
    const result = applyFulfillmentDelta({ lineId: "L", qtyOrdered: 4, qtyFulfilled: 1 }, 3);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("FULFILLED");
      expect(result.remaining).toBe(0);
    }
  });

  it("guard class delegates", () => {
    const guard = new FulfillmentRemainingGuard();
    const line = { lineId: "G", qtyOrdered: 6, qtyFulfilled: 1 };
    expect(guard.computeRemaining(line)).toEqual(computeRemaining(line));
    expect(guard.validatePartialFulfillment(line, 2)).toEqual(
      validatePartialFulfillment(line, 2)
    );
    expect(guard.applyFulfillmentDelta(line, 2)).toEqual(applyFulfillmentDelta(line, 2));
  });
});
