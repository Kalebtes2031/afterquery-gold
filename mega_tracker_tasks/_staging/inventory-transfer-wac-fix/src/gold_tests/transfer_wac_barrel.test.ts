import * as barrel from "../modules/inventory/domain/TransferWacEngine";
import {
  applyTransferWac,
  calculateTransferLegs,
  auditTransferWacDrift,
  TransferWacEngine,
} from "../modules/inventory/domain/TransferWacEngine";

describe("Transfer WAC public barrel", () => {
  it("exports core functions", () => {
    expect(typeof calculateTransferLegs).toBe("function");
    expect(typeof applyTransferWac).toBe("function");
    expect(typeof auditTransferWacDrift).toBe("function");
    expect(typeof TransferWacEngine).toBe("function");
  });

  it("singleton transferWacEngine works", () => {
    const result = barrel.transferWacEngine.apply({
      productId: "X",
      sourceBranchId: "A",
      destBranchId: "B",
      qty: 1,
      sourceOnHand: 2,
      destOnHand: 0,
      unitCost: 3,
      companyWac: 3,
      companyOnHand: 2,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects negative unit cost as invalid_transfer", () => {
    expect(
      applyTransferWac({
        productId: "X",
        sourceBranchId: "A",
        destBranchId: "B",
        qty: 1,
        sourceOnHand: 2,
        destOnHand: 0,
        unitCost: -1,
        companyWac: 3,
        companyOnHand: 2,
      })
    ).toEqual({ ok: false, reason: "invalid_transfer" });
  });

  it("trims branch ids", () => {
    const result = applyTransferWac({
      productId: "X",
      sourceBranchId: "  A  ",
      destBranchId: "  B  ",
      qty: 1,
      sourceOnHand: 2,
      destOnHand: 0,
      unitCost: 3,
      companyWac: 3,
      companyOnHand: 2,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.legs[0].branchId).toBe("A");
      expect(result.legs[1].branchId).toBe("B");
    }
  });
});
