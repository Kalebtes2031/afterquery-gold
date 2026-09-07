import {
  allocateSettlement,
  previewSettlement,
  LoanSettlementAllocator,
  OpenLoanLeg,
} from "../modules/finance/domain/LoanSettlementAllocator";

const NOW = 1_700_000_000_000;

function legs(): OpenLoanLeg[] {
  return [
    { legId: "L2", sourceType: "SALE", principalRemaining: 40, openedAt: NOW + 20 },
    { legId: "L1", sourceType: "PURCHASE", principalRemaining: 25, openedAt: NOW + 10 },
    { legId: "L3", sourceType: "DIRECT", principalRemaining: 10, openedAt: NOW + 30 },
  ];
}

describe("Loan settlement allocate", () => {
  it("defaults to fifo by openedAt then legId", () => {
    const result = allocateSettlement("partner-1", 30, legs(), { now: NOW });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.strategy).toBe("fifo");
      expect(result.allocations).toEqual([
        { legId: "L1", applied: 25, remainingAfter: 0 },
        { legId: "L2", applied: 5, remainingAfter: 35 },
      ]);
      expect(result.fullySettledLegIds).toEqual(["L1"]);
      expect(result.leftover).toBe(0);
      expect(result.settledAt).toBe(NOW);
    }
  });

  it("supports largest_first strategy", () => {
    const result = allocateSettlement("partner-1", 45, legs(), {
      strategy: "largest_first",
      now: NOW,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.strategy).toBe("largest_first");
      expect(result.allocations[0].legId).toBe("L2");
      expect(result.allocations[0].applied).toBe(40);
      expect(result.fullySettledLegIds).toContain("L2");
    }
  });

  it("allows overpay leftover", () => {
    const result = allocateSettlement("p1", 1000, legs(), { now: NOW });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.leftover).toBe(925);
      expect(result.fullySettledLegIds.sort()).toEqual(["L1", "L2", "L3"]);
    }
  });

  it("rejects blank partner", () => {
    expect(allocateSettlement("  ", 10, legs())).toEqual({
      ok: false,
      reason: "invalid_partner",
    });
  });

  it("rejects non-positive amount", () => {
    expect(allocateSettlement("p1", 0, legs())).toEqual({
      ok: false,
      reason: "invalid_amount",
    });
    expect(allocateSettlement("p1", -5, legs())).toEqual({
      ok: false,
      reason: "invalid_amount",
    });
  });

  it("rejects non-array legs", () => {
    expect(allocateSettlement("p1", 10, null as any)).toEqual({
      ok: false,
      reason: "invalid_legs",
    });
  });

  it("trims partner id", () => {
    const result = allocateSettlement("  acme  ", 10, legs(), { now: NOW });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.partnerId).toBe("acme");
  });

  it("skips non-open legs", () => {
    const mixed: OpenLoanLeg[] = [
      { legId: "bad", sourceType: "SALE", principalRemaining: 0, openedAt: NOW },
      { legId: "ok", sourceType: "EXPENSE", principalRemaining: 15, openedAt: NOW + 1 },
    ];
    const result = allocateSettlement("p1", 10, mixed, { now: NOW });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.allocations).toEqual([{ legId: "ok", applied: 10, remainingAfter: 5 }]);
    }
  });

  it("LoanSettlementAllocator.allocate delegates", () => {
    const alloc = new LoanSettlementAllocator();
    expect(alloc.allocate("p1", 5, legs(), { now: NOW })).toEqual(
      allocateSettlement("p1", 5, legs(), { now: NOW })
    );
  });

  it("previewSettlement includes openLegsAfter", () => {
    const preview = previewSettlement("p1", 25, legs(), { now: NOW });
    expect(preview.ok).toBe(true);
    if (preview.ok && "openLegsAfter" in preview) {
      expect(preview.openLegsAfter.find((l) => l.legId === "L1")).toBeUndefined();
      expect(preview.openLegsAfter.find((l) => l.legId === "L2")?.principalRemaining).toBe(40);
    }
  });
});
