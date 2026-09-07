import * as barrel from "../modules/sales/domain/FulfillmentRemainingGuard";
import {
  applyFulfillmentDelta,
  computeRemaining,
  validatePartialFulfillment,
  auditFulfillmentConsistency,
  FulfillmentRemainingGuard,
} from "../modules/sales/domain/FulfillmentRemainingGuard";

describe("Fulfillment remaining public barrel", () => {
  it("exports required symbols", () => {
    expect(typeof computeRemaining).toBe("function");
    expect(typeof validatePartialFulfillment).toBe("function");
    expect(typeof applyFulfillmentDelta).toBe("function");
    expect(typeof auditFulfillmentConsistency).toBe("function");
    expect(typeof FulfillmentRemainingGuard).toBe("function");
  });

  it("singleton guard works", () => {
    const view = barrel.fulfillmentRemainingGuard.computeRemaining({
      lineId: "S",
      qtyOrdered: 2,
      qtyFulfilled: 0,
    });
    expect(view?.status).toBe("UNFULFILLED");
  });

  it("shared types module is importable via relative path used by sales guard", () => {
    const result = validatePartialFulfillment(
      { lineId: "Z", qtyOrdered: 1, qtyFulfilled: 1 },
      1
    );
    expect(result).toEqual({ ok: false, reason: "over_fulfill", lineId: "Z" });
  });
});
