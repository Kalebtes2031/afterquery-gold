import {
  listOpenLoanLegs,
  orderLegsForStrategy,
  previewSettlement,
  resolveStrategy,
  clampPositiveAmount,
} from "../modules/finance/domain/LoanSettlementAllocator";

const NOW = 2_000;

describe("Loan settlement preview and ordering", () => {
  it("listOpenLoanLegs filters and trims", () => {
    const listed = listOpenLoanLegs([
      { legId: "  A  ", sourceType: "SALE", principalRemaining: 1.239, openedAt: 1 },
      { legId: "", sourceType: "SALE", principalRemaining: 5, openedAt: 1 },
      { legId: "B", sourceType: "NOPE" as any, principalRemaining: 5, openedAt: 1 },
    ]);
    expect(listed).toEqual([
      { legId: "A", sourceType: "SALE", principalRemaining: 1.24, openedAt: 1 },
    ]);
  });

  it("fifo ties break on legId", () => {
    const ordered = orderLegsForStrategy(
      [
        { legId: "b", sourceType: "SALE", principalRemaining: 1, openedAt: 5 },
        { legId: "a", sourceType: "SALE", principalRemaining: 1, openedAt: 5 },
      ],
      "fifo"
    );
    expect(ordered.map((l) => l.legId)).toEqual(["a", "b"]);
  });

  it("largest_first ties break on openedAt then legId", () => {
    const ordered = orderLegsForStrategy(
      [
        { legId: "b", sourceType: "SALE", principalRemaining: 10, openedAt: 9 },
        { legId: "a", sourceType: "SALE", principalRemaining: 10, openedAt: 8 },
      ],
      "largest_first"
    );
    expect(ordered.map((l) => l.legId)).toEqual(["a", "b"]);
  });

  it("resolveStrategy defaults to fifo", () => {
    expect(resolveStrategy()).toBe("fifo");
    expect(resolveStrategy({})).toBe("fifo");
    expect(resolveStrategy({ strategy: "largest_first" })).toBe("largest_first");
  });

  it("clampPositiveAmount rounds to cents", () => {
    expect(clampPositiveAmount(1.239)).toBe(1.24);
    expect(clampPositiveAmount(0)).toBeNull();
  });

  it("preview with overpay leaves leftover and empty open legs", () => {
    const preview = previewSettlement(
      "p",
      50,
      [{ legId: "only", sourceType: "DIRECT", principalRemaining: 20, openedAt: NOW }],
      { now: NOW }
    );
    expect(preview.ok).toBe(true);
    if (preview.ok && "openLegsAfter" in preview) {
      expect(preview.leftover).toBe(30);
      expect(preview.openLegsAfter).toEqual([]);
    }
  });

  it("preview failure paths match allocate", () => {
    expect(previewSettlement("", 10, [])).toEqual({ ok: false, reason: "invalid_partner" });
    expect(previewSettlement("p", -1, [])).toEqual({ ok: false, reason: "invalid_amount" });
  });
});
