import { applyFulfillmentDelta, auditFulfillmentConsistency, computeRemaining, maxAcceptableDelta, progressRatio } from "../modules/sales/domain/FulfillmentRemainingGuard";

describe("Fulfillment remaining extras", () => {
  it("extra progress case 1", () => {
    const line = { lineId: "E1", qtyOrdered: 11, qtyFulfilled: 1 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 2", () => {
    const line = { lineId: "E2", qtyOrdered: 12, qtyFulfilled: 2 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 3", () => {
    const line = { lineId: "E3", qtyOrdered: 13, qtyFulfilled: 3 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 4", () => {
    const line = { lineId: "E4", qtyOrdered: 14, qtyFulfilled: 4 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 5", () => {
    const line = { lineId: "E5", qtyOrdered: 15, qtyFulfilled: 0 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 6", () => {
    const line = { lineId: "E6", qtyOrdered: 16, qtyFulfilled: 1 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 7", () => {
    const line = { lineId: "E7", qtyOrdered: 17, qtyFulfilled: 2 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 8", () => {
    const line = { lineId: "E8", qtyOrdered: 18, qtyFulfilled: 3 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 9", () => {
    const line = { lineId: "E9", qtyOrdered: 19, qtyFulfilled: 4 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 10", () => {
    const line = { lineId: "E10", qtyOrdered: 20, qtyFulfilled: 0 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 11", () => {
    const line = { lineId: "E11", qtyOrdered: 21, qtyFulfilled: 1 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 12", () => {
    const line = { lineId: "E12", qtyOrdered: 22, qtyFulfilled: 2 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 13", () => {
    const line = { lineId: "E13", qtyOrdered: 23, qtyFulfilled: 3 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 14", () => {
    const line = { lineId: "E14", qtyOrdered: 24, qtyFulfilled: 4 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 15", () => {
    const line = { lineId: "E15", qtyOrdered: 25, qtyFulfilled: 0 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 16", () => {
    const line = { lineId: "E16", qtyOrdered: 26, qtyFulfilled: 1 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 17", () => {
    const line = { lineId: "E17", qtyOrdered: 27, qtyFulfilled: 2 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 18", () => {
    const line = { lineId: "E18", qtyOrdered: 28, qtyFulfilled: 3 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 19", () => {
    const line = { lineId: "E19", qtyOrdered: 29, qtyFulfilled: 4 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 20", () => {
    const line = { lineId: "E20", qtyOrdered: 30, qtyFulfilled: 0 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 21", () => {
    const line = { lineId: "E21", qtyOrdered: 31, qtyFulfilled: 1 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 22", () => {
    const line = { lineId: "E22", qtyOrdered: 32, qtyFulfilled: 2 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 23", () => {
    const line = { lineId: "E23", qtyOrdered: 33, qtyFulfilled: 3 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 24", () => {
    const line = { lineId: "E24", qtyOrdered: 34, qtyFulfilled: 4 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 25", () => {
    const line = { lineId: "E25", qtyOrdered: 35, qtyFulfilled: 0 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 26", () => {
    const line = { lineId: "E26", qtyOrdered: 36, qtyFulfilled: 1 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 27", () => {
    const line = { lineId: "E27", qtyOrdered: 37, qtyFulfilled: 2 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 28", () => {
    const line = { lineId: "E28", qtyOrdered: 38, qtyFulfilled: 3 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 29", () => {
    const line = { lineId: "E29", qtyOrdered: 39, qtyFulfilled: 4 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 30", () => {
    const line = { lineId: "E30", qtyOrdered: 40, qtyFulfilled: 0 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 31", () => {
    const line = { lineId: "E31", qtyOrdered: 41, qtyFulfilled: 1 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 32", () => {
    const line = { lineId: "E32", qtyOrdered: 42, qtyFulfilled: 2 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 33", () => {
    const line = { lineId: "E33", qtyOrdered: 43, qtyFulfilled: 3 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
  it("extra progress case 34", () => {
    const line = { lineId: "E34", qtyOrdered: 44, qtyFulfilled: 4 };
    const view = computeRemaining(line);
    expect(view).not.toBeNull();
    expect(maxAcceptableDelta(line)).toBe(view!.remaining);
    const ratio = progressRatio(line);
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
    if (view!.remaining > 0) {
      const applied = applyFulfillmentDelta(line, 1);
      expect(applied.ok).toBe(true);
    }
    const audit = auditFulfillmentConsistency([{ ...line, status: view!.status }]);
    expect(audit.ok).toBe(true);
  });
});
