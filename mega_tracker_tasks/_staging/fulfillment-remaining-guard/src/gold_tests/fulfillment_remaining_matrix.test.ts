import { applyFulfillmentDelta, computeRemaining, validatePartialFulfillment } from "../modules/sales/domain/FulfillmentRemainingGuard";

describe("Fulfillment remaining matrix", () => {
  it("line matrix case 1", () => {
    const line = { lineId: "L1", qtyOrdered: 6, qtyFulfilled: 1 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 6 - 1));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(2);
    }
  });
  it("line matrix case 2", () => {
    const line = { lineId: "L2", qtyOrdered: 7, qtyFulfilled: 2 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 7 - 2));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(3);
    }
  });
  it("line matrix case 3", () => {
    const line = { lineId: "L3", qtyOrdered: 8, qtyFulfilled: 3 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 8 - 3));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(4);
    }
  });
  it("line matrix case 4", () => {
    const line = { lineId: "L4", qtyOrdered: 9, qtyFulfilled: 0 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 9 - 0));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(1);
    }
  });
  it("line matrix case 5", () => {
    const line = { lineId: "L5", qtyOrdered: 10, qtyFulfilled: 1 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 10 - 1));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(2);
    }
  });
  it("line matrix case 6", () => {
    const line = { lineId: "L6", qtyOrdered: 11, qtyFulfilled: 2 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 11 - 2));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(3);
    }
  });
  it("line matrix case 7", () => {
    const line = { lineId: "L7", qtyOrdered: 12, qtyFulfilled: 3 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 12 - 3));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(4);
    }
  });
  it("line matrix case 8", () => {
    const line = { lineId: "L8", qtyOrdered: 13, qtyFulfilled: 0 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 13 - 0));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(1);
    }
  });
  it("line matrix case 9", () => {
    const line = { lineId: "L9", qtyOrdered: 14, qtyFulfilled: 1 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 14 - 1));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(2);
    }
  });
  it("line matrix case 10", () => {
    const line = { lineId: "L10", qtyOrdered: 15, qtyFulfilled: 2 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 15 - 2));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(3);
    }
  });
  it("line matrix case 11", () => {
    const line = { lineId: "L11", qtyOrdered: 16, qtyFulfilled: 3 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 16 - 3));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(4);
    }
  });
  it("line matrix case 12", () => {
    const line = { lineId: "L12", qtyOrdered: 17, qtyFulfilled: 0 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 17 - 0));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(1);
    }
  });
  it("line matrix case 13", () => {
    const line = { lineId: "L13", qtyOrdered: 18, qtyFulfilled: 1 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 18 - 1));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(2);
    }
  });
  it("line matrix case 14", () => {
    const line = { lineId: "L14", qtyOrdered: 19, qtyFulfilled: 2 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 19 - 2));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(3);
    }
  });
  it("line matrix case 15", () => {
    const line = { lineId: "L15", qtyOrdered: 20, qtyFulfilled: 3 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 20 - 3));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(4);
    }
  });
  it("line matrix case 16", () => {
    const line = { lineId: "L16", qtyOrdered: 21, qtyFulfilled: 0 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 21 - 0));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(1);
    }
  });
  it("line matrix case 17", () => {
    const line = { lineId: "L17", qtyOrdered: 22, qtyFulfilled: 1 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 22 - 1));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(2);
    }
  });
  it("line matrix case 18", () => {
    const line = { lineId: "L18", qtyOrdered: 23, qtyFulfilled: 2 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 23 - 2));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(3);
    }
  });
  it("line matrix case 19", () => {
    const line = { lineId: "L19", qtyOrdered: 24, qtyFulfilled: 3 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 24 - 3));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(4);
    }
  });
  it("line matrix case 20", () => {
    const line = { lineId: "L20", qtyOrdered: 25, qtyFulfilled: 0 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 25 - 0));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(1);
    }
  });
  it("line matrix case 21", () => {
    const line = { lineId: "L21", qtyOrdered: 26, qtyFulfilled: 1 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 26 - 1));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(2);
    }
  });
  it("line matrix case 22", () => {
    const line = { lineId: "L22", qtyOrdered: 27, qtyFulfilled: 2 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 27 - 2));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(3);
    }
  });
  it("line matrix case 23", () => {
    const line = { lineId: "L23", qtyOrdered: 28, qtyFulfilled: 3 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 28 - 3));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(4);
    }
  });
  it("line matrix case 24", () => {
    const line = { lineId: "L24", qtyOrdered: 29, qtyFulfilled: 0 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 29 - 0));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(1);
    }
  });
  it("line matrix case 25", () => {
    const line = { lineId: "L25", qtyOrdered: 30, qtyFulfilled: 1 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 30 - 1));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(2);
    }
  });
  it("line matrix case 26", () => {
    const line = { lineId: "L26", qtyOrdered: 31, qtyFulfilled: 2 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 31 - 2));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(3);
    }
  });
  it("line matrix case 27", () => {
    const line = { lineId: "L27", qtyOrdered: 32, qtyFulfilled: 3 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 32 - 3));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(4);
    }
  });
  it("line matrix case 28", () => {
    const line = { lineId: "L28", qtyOrdered: 33, qtyFulfilled: 0 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 33 - 0));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(1);
    }
  });
  it("line matrix case 29", () => {
    const line = { lineId: "L29", qtyOrdered: 34, qtyFulfilled: 1 };
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, 34 - 1));
    const validated = validatePartialFulfillment(line, 1);
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, 1);
    expect(applied.ok).toBe(true);
    if (applied.ok) {
      expect(applied.line.qtyFulfilled).toBe(2);
    }
  });
});
