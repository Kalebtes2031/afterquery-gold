import { applyTransferWac, roundCost, validateTransferQty } from "../modules/inventory/domain/TransferWacEngine";

describe("Transfer WAC edge matrix", () => {
  it("qty edge case 1", () => {
    const qty = 1 * 0.5;
    const result = applyTransferWac({
      productId: "P1",
      sourceBranchId: "S1",
      destBranchId: "D1",
      qty,
      sourceOnHand: 21,
      destOnHand: 1,
      unitCost: 1.25,
      companyWac: 1.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(21 - qty);
      expect(result.companyWacAfter).toBe(roundCost(1.25));
    }
  });
  it("qty edge case 2", () => {
    const qty = 2 * 0.5;
    const result = applyTransferWac({
      productId: "P2",
      sourceBranchId: "S2",
      destBranchId: "D2",
      qty,
      sourceOnHand: 22,
      destOnHand: 2,
      unitCost: 2.25,
      companyWac: 2.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(22 - qty);
      expect(result.companyWacAfter).toBe(roundCost(2.25));
    }
  });
  it("qty edge case 3", () => {
    const qty = 3 * 0.5;
    const result = applyTransferWac({
      productId: "P3",
      sourceBranchId: "S3",
      destBranchId: "D3",
      qty,
      sourceOnHand: 23,
      destOnHand: 3,
      unitCost: 3.25,
      companyWac: 3.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(23 - qty);
      expect(result.companyWacAfter).toBe(roundCost(3.25));
    }
  });
  it("qty edge case 4", () => {
    const qty = 4 * 0.5;
    const result = applyTransferWac({
      productId: "P4",
      sourceBranchId: "S4",
      destBranchId: "D4",
      qty,
      sourceOnHand: 24,
      destOnHand: 4,
      unitCost: 4.25,
      companyWac: 4.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(24 - qty);
      expect(result.companyWacAfter).toBe(roundCost(4.25));
    }
  });
  it("qty edge case 5", () => {
    const qty = 5 * 0.5;
    const result = applyTransferWac({
      productId: "P5",
      sourceBranchId: "S5",
      destBranchId: "D5",
      qty,
      sourceOnHand: 25,
      destOnHand: 5,
      unitCost: 5.25,
      companyWac: 5.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(25 - qty);
      expect(result.companyWacAfter).toBe(roundCost(5.25));
    }
  });
  it("qty edge case 6", () => {
    const qty = 6 * 0.5;
    const result = applyTransferWac({
      productId: "P6",
      sourceBranchId: "S6",
      destBranchId: "D6",
      qty,
      sourceOnHand: 26,
      destOnHand: 6,
      unitCost: 6.25,
      companyWac: 6.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(26 - qty);
      expect(result.companyWacAfter).toBe(roundCost(6.25));
    }
  });
  it("qty edge case 7", () => {
    const qty = 7 * 0.5;
    const result = applyTransferWac({
      productId: "P7",
      sourceBranchId: "S7",
      destBranchId: "D7",
      qty,
      sourceOnHand: 27,
      destOnHand: 7,
      unitCost: 7.25,
      companyWac: 7.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(27 - qty);
      expect(result.companyWacAfter).toBe(roundCost(7.25));
    }
  });
  it("qty edge case 8", () => {
    const qty = 8 * 0.5;
    const result = applyTransferWac({
      productId: "P8",
      sourceBranchId: "S8",
      destBranchId: "D8",
      qty,
      sourceOnHand: 28,
      destOnHand: 8,
      unitCost: 8.25,
      companyWac: 8.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(28 - qty);
      expect(result.companyWacAfter).toBe(roundCost(8.25));
    }
  });
  it("qty edge case 9", () => {
    const qty = 9 * 0.5;
    const result = applyTransferWac({
      productId: "P9",
      sourceBranchId: "S9",
      destBranchId: "D9",
      qty,
      sourceOnHand: 29,
      destOnHand: 9,
      unitCost: 9.25,
      companyWac: 9.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(29 - qty);
      expect(result.companyWacAfter).toBe(roundCost(9.25));
    }
  });
  it("qty edge case 10", () => {
    const qty = 10 * 0.5;
    const result = applyTransferWac({
      productId: "P10",
      sourceBranchId: "S10",
      destBranchId: "D10",
      qty,
      sourceOnHand: 30,
      destOnHand: 10,
      unitCost: 10.25,
      companyWac: 10.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(30 - qty);
      expect(result.companyWacAfter).toBe(roundCost(10.25));
    }
  });
  it("qty edge case 11", () => {
    const qty = 11 * 0.5;
    const result = applyTransferWac({
      productId: "P11",
      sourceBranchId: "S11",
      destBranchId: "D11",
      qty,
      sourceOnHand: 31,
      destOnHand: 11,
      unitCost: 11.25,
      companyWac: 11.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(31 - qty);
      expect(result.companyWacAfter).toBe(roundCost(11.25));
    }
  });
  it("qty edge case 12", () => {
    const qty = 12 * 0.5;
    const result = applyTransferWac({
      productId: "P12",
      sourceBranchId: "S12",
      destBranchId: "D12",
      qty,
      sourceOnHand: 32,
      destOnHand: 12,
      unitCost: 12.25,
      companyWac: 12.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(32 - qty);
      expect(result.companyWacAfter).toBe(roundCost(12.25));
    }
  });
  it("qty edge case 13", () => {
    const qty = 13 * 0.5;
    const result = applyTransferWac({
      productId: "P13",
      sourceBranchId: "S13",
      destBranchId: "D13",
      qty,
      sourceOnHand: 33,
      destOnHand: 13,
      unitCost: 13.25,
      companyWac: 13.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(33 - qty);
      expect(result.companyWacAfter).toBe(roundCost(13.25));
    }
  });
  it("qty edge case 14", () => {
    const qty = 14 * 0.5;
    const result = applyTransferWac({
      productId: "P14",
      sourceBranchId: "S14",
      destBranchId: "D14",
      qty,
      sourceOnHand: 34,
      destOnHand: 14,
      unitCost: 14.25,
      companyWac: 14.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(34 - qty);
      expect(result.companyWacAfter).toBe(roundCost(14.25));
    }
  });
  it("qty edge case 15", () => {
    const qty = 15 * 0.5;
    const result = applyTransferWac({
      productId: "P15",
      sourceBranchId: "S15",
      destBranchId: "D15",
      qty,
      sourceOnHand: 35,
      destOnHand: 15,
      unitCost: 15.25,
      companyWac: 15.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(35 - qty);
      expect(result.companyWacAfter).toBe(roundCost(15.25));
    }
  });
  it("qty edge case 16", () => {
    const qty = 16 * 0.5;
    const result = applyTransferWac({
      productId: "P16",
      sourceBranchId: "S16",
      destBranchId: "D16",
      qty,
      sourceOnHand: 36,
      destOnHand: 16,
      unitCost: 16.25,
      companyWac: 16.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(36 - qty);
      expect(result.companyWacAfter).toBe(roundCost(16.25));
    }
  });
  it("qty edge case 17", () => {
    const qty = 17 * 0.5;
    const result = applyTransferWac({
      productId: "P17",
      sourceBranchId: "S17",
      destBranchId: "D17",
      qty,
      sourceOnHand: 37,
      destOnHand: 17,
      unitCost: 17.25,
      companyWac: 17.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(37 - qty);
      expect(result.companyWacAfter).toBe(roundCost(17.25));
    }
  });
  it("qty edge case 18", () => {
    const qty = 18 * 0.5;
    const result = applyTransferWac({
      productId: "P18",
      sourceBranchId: "S18",
      destBranchId: "D18",
      qty,
      sourceOnHand: 38,
      destOnHand: 18,
      unitCost: 18.25,
      companyWac: 18.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(38 - qty);
      expect(result.companyWacAfter).toBe(roundCost(18.25));
    }
  });
  it("qty edge case 19", () => {
    const qty = 19 * 0.5;
    const result = applyTransferWac({
      productId: "P19",
      sourceBranchId: "S19",
      destBranchId: "D19",
      qty,
      sourceOnHand: 39,
      destOnHand: 19,
      unitCost: 19.25,
      companyWac: 19.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(39 - qty);
      expect(result.companyWacAfter).toBe(roundCost(19.25));
    }
  });
  it("qty edge case 20", () => {
    const qty = 20 * 0.5;
    const result = applyTransferWac({
      productId: "P20",
      sourceBranchId: "S20",
      destBranchId: "D20",
      qty,
      sourceOnHand: 40,
      destOnHand: 20,
      unitCost: 20.25,
      companyWac: 20.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(40 - qty);
      expect(result.companyWacAfter).toBe(roundCost(20.25));
    }
  });
  it("qty edge case 21", () => {
    const qty = 21 * 0.5;
    const result = applyTransferWac({
      productId: "P21",
      sourceBranchId: "S21",
      destBranchId: "D21",
      qty,
      sourceOnHand: 41,
      destOnHand: 21,
      unitCost: 21.25,
      companyWac: 21.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(41 - qty);
      expect(result.companyWacAfter).toBe(roundCost(21.25));
    }
  });
  it("qty edge case 22", () => {
    const qty = 22 * 0.5;
    const result = applyTransferWac({
      productId: "P22",
      sourceBranchId: "S22",
      destBranchId: "D22",
      qty,
      sourceOnHand: 42,
      destOnHand: 22,
      unitCost: 22.25,
      companyWac: 22.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(42 - qty);
      expect(result.companyWacAfter).toBe(roundCost(22.25));
    }
  });
  it("qty edge case 23", () => {
    const qty = 23 * 0.5;
    const result = applyTransferWac({
      productId: "P23",
      sourceBranchId: "S23",
      destBranchId: "D23",
      qty,
      sourceOnHand: 43,
      destOnHand: 23,
      unitCost: 23.25,
      companyWac: 23.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(43 - qty);
      expect(result.companyWacAfter).toBe(roundCost(23.25));
    }
  });
  it("qty edge case 24", () => {
    const qty = 24 * 0.5;
    const result = applyTransferWac({
      productId: "P24",
      sourceBranchId: "S24",
      destBranchId: "D24",
      qty,
      sourceOnHand: 44,
      destOnHand: 24,
      unitCost: 24.25,
      companyWac: 24.25,
      companyOnHand: 100,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(44 - qty);
      expect(result.companyWacAfter).toBe(roundCost(24.25));
    }
  });
  it("validateTransferQty rejects zero", () => {
    expect(validateTransferQty(0)).toEqual({ ok: false, reason: "invalid_qty" });
  });
});
