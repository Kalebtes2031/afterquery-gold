import {
  auditFulfillmentConsistency,
  deriveStatus,
  clampRemaining,
} from "../modules/sales/domain/FulfillmentRemainingGuard";

describe("Fulfillment audit consistency", () => {
  it("passes clean lines", () => {
    const result = auditFulfillmentConsistency([
      { lineId: "A", qtyOrdered: 5, qtyFulfilled: 0, status: "UNFULFILLED" },
      { lineId: "B", qtyOrdered: 5, qtyFulfilled: 2, status: "PARTIAL" },
      { lineId: "C", qtyOrdered: 5, qtyFulfilled: 5, status: "FULFILLED" },
    ]);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("flags over_fulfilled", () => {
    const result = auditFulfillmentConsistency([
      { lineId: "X", qtyOrdered: 2, qtyFulfilled: 5, status: "FULFILLED" },
    ]);
    expect(result.issues.some((i) => i.code === "over_fulfilled")).toBe(true);
    expect(result.issues.some((i) => i.code === "negative_remaining")).toBe(true);
  });

  it("flags status_mismatch", () => {
    const result = auditFulfillmentConsistency([
      { lineId: "Y", qtyOrdered: 4, qtyFulfilled: 1, status: "FULFILLED" },
    ]);
    expect(result.issues.some((i) => i.code === "status_mismatch")).toBe(true);
  });

  it("deriveStatus boundaries", () => {
    expect(deriveStatus(5, 0)).toBe("UNFULFILLED");
    expect(deriveStatus(5, 1)).toBe("PARTIAL");
    expect(deriveStatus(5, 5)).toBe("FULFILLED");
    expect(deriveStatus(5, 9)).toBe("FULFILLED");
  });

  it("clampRemaining never negative", () => {
    expect(clampRemaining(3, 10)).toBe(0);
    expect(clampRemaining(3, 1)).toBe(2);
  });
});
