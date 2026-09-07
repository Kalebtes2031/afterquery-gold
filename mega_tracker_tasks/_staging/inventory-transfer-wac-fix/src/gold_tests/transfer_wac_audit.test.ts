import {
  auditTransferWacDrift,
  TransferWacEngine,
} from "../modules/inventory/domain/TransferWacEngine";

describe("Transfer WAC audit drift", () => {
  it("passes when stored state matches transfer-only replay", () => {
    const result = auditTransferWacDrift({
      productId: "SKU",
      initialCompanyWac: 10,
      initialCompanyOnHand: 30,
      initialBranches: [
        { branchId: "B1", onHand: 20 },
        { branchId: "B2", onHand: 10 },
      ],
      ops: [{ kind: "TRANSFER", branchId: "B1", destBranchId: "B2", qty: 5 }],
      companyWacStored: 10,
      companyOnHandStored: 30,
      branches: [
        { branchId: "B1", onHand: 15 },
        { branchId: "B2", onHand: 15 },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.expectedCompanyWac).toBe(10);
  });

  it("flags company_wac_drift when stored WAC changed after transfer", () => {
    const result = auditTransferWacDrift({
      productId: "SKU",
      initialCompanyWac: 10,
      initialCompanyOnHand: 30,
      initialBranches: [
        { branchId: "B1", onHand: 20 },
        { branchId: "B2", onHand: 10 },
      ],
      ops: [{ kind: "TRANSFER", branchId: "B1", destBranchId: "B2", qty: 5 }],
      companyWacStored: 11,
      companyOnHandStored: 30,
      branches: [
        { branchId: "B1", onHand: 15 },
        { branchId: "B2", onHand: 15 },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "company_wac_drift")).toBe(true);
  });

  it("flags branch_onhand_mismatch", () => {
    const result = auditTransferWacDrift({
      productId: "SKU",
      initialCompanyWac: 10,
      initialCompanyOnHand: 30,
      initialBranches: [
        { branchId: "B1", onHand: 20 },
        { branchId: "B2", onHand: 10 },
      ],
      ops: [{ kind: "TRANSFER", branchId: "B1", destBranchId: "B2", qty: 5 }],
      companyWacStored: 10,
      companyOnHandStored: 30,
      branches: [
        { branchId: "B1", onHand: 14 },
        { branchId: "B2", onHand: 15 },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "branch_onhand_mismatch")).toBe(true);
  });

  it("flags missing_leg for transfer without dest", () => {
    const result = auditTransferWacDrift({
      productId: "SKU",
      initialCompanyWac: 10,
      initialCompanyOnHand: 10,
      initialBranches: [{ branchId: "B1", onHand: 10 }],
      ops: [{ kind: "TRANSFER", branchId: "B1", qty: 2 }],
      companyWacStored: 10,
      companyOnHandStored: 10,
      branches: [{ branchId: "B1", onHand: 10 }],
    });
    expect(result.issues.some((i) => i.code === "missing_leg")).toBe(true);
  });

  it("POSITIVE then TRANSFER updates WAC only on positive leg", () => {
    const result = auditTransferWacDrift({
      productId: "SKU",
      initialCompanyWac: 10,
      initialCompanyOnHand: 10,
      initialBranches: [
        { branchId: "B1", onHand: 10 },
        { branchId: "B2", onHand: 0 },
      ],
      ops: [
        { kind: "POSITIVE", branchId: "B1", qty: 10, unitCost: 20 },
        { kind: "TRANSFER", branchId: "B1", destBranchId: "B2", qty: 5 },
      ],
      companyWacStored: 15,
      companyOnHandStored: 20,
      branches: [
        { branchId: "B1", onHand: 15 },
        { branchId: "B2", onHand: 5 },
      ],
    });
    expect(result.expectedCompanyWac).toBe(15);
    expect(result.ok).toBe(true);
  });

  it("NEGATIVE does not change company WAC", () => {
    const result = auditTransferWacDrift({
      productId: "SKU",
      initialCompanyWac: 8,
      initialCompanyOnHand: 10,
      initialBranches: [{ branchId: "B1", onHand: 10 }],
      ops: [{ kind: "NEGATIVE", branchId: "B1", qty: 2 }],
      companyWacStored: 8,
      companyOnHandStored: 8,
      branches: [{ branchId: "B1", onHand: 8 }],
    });
    expect(result.expectedCompanyWac).toBe(8);
    expect(result.ok).toBe(true);
  });

  it("engine.audit delegates to auditTransferWacDrift", () => {
    const input = {
      productId: "SKU",
      initialCompanyWac: 1,
      initialCompanyOnHand: 1,
      initialBranches: [{ branchId: "B1", onHand: 1 }],
      ops: [] as any[],
      companyWacStored: 1,
      companyOnHandStored: 1,
      branches: [{ branchId: "B1", onHand: 1 }],
    };
    expect(new TransferWacEngine().audit(input)).toEqual(auditTransferWacDrift(input));
  });

  it("mixed ops with bad transfer qty produce missing_leg", () => {
    const result = auditTransferWacDrift({
      productId: "SKU",
      initialCompanyWac: 10,
      initialCompanyOnHand: 5,
      initialBranches: [
        { branchId: "B1", onHand: 2 },
        { branchId: "B2", onHand: 3 },
      ],
      ops: [{ kind: "TRANSFER", branchId: "B1", destBranchId: "B2", qty: 9 }],
      companyWacStored: 10,
      companyOnHandStored: 5,
      branches: [
        { branchId: "B1", onHand: 2 },
        { branchId: "B2", onHand: 3 },
      ],
    });
    expect(result.issues.some((i) => i.code === "missing_leg")).toBe(true);
  });
});
