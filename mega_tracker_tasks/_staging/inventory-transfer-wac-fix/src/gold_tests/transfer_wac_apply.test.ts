import {
  applyTransferWac,
  calculateTransferLegs,
  TransferWacEngine,
  TransferRequest,
} from "../modules/inventory/domain/TransferWacEngine";

function req(over: Partial<TransferRequest> = {}): TransferRequest {
  return {
    productId: "SKU-1",
    sourceBranchId: "B1",
    destBranchId: "B2",
    qty: 5,
    sourceOnHand: 20,
    destOnHand: 3,
    unitCost: 10,
    companyWac: 10,
    companyOnHand: 50,
    ...over,
  };
}

describe("Transfer WAC calculate and apply", () => {
  it("moves qty from source to dest at source unit cost", () => {
    const result = calculateTransferLegs(req());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.unitCostApplied).toBe(10);
      expect(result.sourceOnHandAfter).toBe(15);
      expect(result.destOnHandAfter).toBe(8);
      expect(result.legs).toHaveLength(2);
      expect(result.legs[0]).toMatchObject({ branchId: "B1", qtyDelta: -5, unitCost: 10 });
      expect(result.legs[1]).toMatchObject({ branchId: "B2", qtyDelta: 5, unitCost: 10 });
    }
  });

  it("keeps company WAC unchanged on transfer-only", () => {
    const result = applyTransferWac(req({ companyWac: 12.5, unitCost: 12.5 }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.companyWacAfter).toBe(12.5);
      expect(result.companyOnHandAfter).toBe(50);
    }
  });

  it("rejects over-transfer with insufficient_stock", () => {
    expect(applyTransferWac(req({ qty: 25, sourceOnHand: 20 }))).toEqual({
      ok: false,
      reason: "insufficient_stock",
    });
  });

  it("rejects zero qty with invalid_qty", () => {
    expect(applyTransferWac(req({ qty: 0 }))).toEqual({ ok: false, reason: "invalid_qty" });
  });

  it("rejects negative qty with invalid_qty", () => {
    expect(applyTransferWac(req({ qty: -3 }))).toEqual({ ok: false, reason: "invalid_qty" });
  });

  it("rejects NaN qty with invalid_qty", () => {
    expect(applyTransferWac(req({ qty: Number.NaN }))).toEqual({ ok: false, reason: "invalid_qty" });
  });

  it("rejects same source and dest as invalid_transfer", () => {
    expect(applyTransferWac(req({ sourceBranchId: "B1", destBranchId: "B1" }))).toEqual({
      ok: false,
      reason: "invalid_transfer",
    });
  });

  it("rejects blank product id", () => {
    expect(applyTransferWac(req({ productId: "  " }))).toEqual({
      ok: false,
      reason: "invalid_transfer",
    });
  });

  it("dest receives the same unit cost as source WAC", () => {
    const result = calculateTransferLegs(req({ unitCost: 7.25, companyWac: 9 }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.legs[0].unitCost).toBe(7.25);
      expect(result.legs[1].unitCost).toBe(7.25);
      expect(result.companyWacAfter).toBe(9);
    }
  });

  it("TransferWacEngine.calculateLegs matches calculateTransferLegs", () => {
    const engine = new TransferWacEngine();
    const input = req();
    expect(engine.calculateLegs(input)).toEqual(calculateTransferLegs(input));
  });

  it("TransferWacEngine.apply matches applyTransferWac", () => {
    const engine = new TransferWacEngine();
    const input = req({ qty: 2 });
    expect(engine.apply(input)).toEqual(applyTransferWac(input));
  });

  it("exact source depletion is allowed", () => {
    const result = applyTransferWac(req({ qty: 20, sourceOnHand: 20, destOnHand: 0 }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(0);
      expect(result.destOnHandAfter).toBe(20);
    }
  });
});
