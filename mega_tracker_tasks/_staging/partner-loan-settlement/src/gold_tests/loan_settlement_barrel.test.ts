import * as barrel from "../modules/finance/domain/LoanSettlementAllocator";
import {
  allocateSettlement,
  previewSettlement,
  listOpenLoanLegs,
  LoanSettlementAllocator,
} from "../modules/finance/domain/LoanSettlementAllocator";

describe("Loan settlement public barrel", () => {
  it("exports allocateSettlement previewSettlement listOpenLoanLegs", () => {
    expect(typeof allocateSettlement).toBe("function");
    expect(typeof previewSettlement).toBe("function");
    expect(typeof listOpenLoanLegs).toBe("function");
    expect(typeof LoanSettlementAllocator).toBe("function");
  });

  it("singleton works", () => {
    const result = barrel.loanSettlementAllocator.allocate(
      "p",
      5,
      [{ legId: "L", sourceType: "SALE", principalRemaining: 5, openedAt: 1 }],
      { now: 1 }
    );
    expect(result.ok).toBe(true);
  });

  it("unknown strategy values fall back to fifo", () => {
    const result = allocateSettlement(
      "p",
      5,
      [{ legId: "L", sourceType: "SALE", principalRemaining: 5, openedAt: 1 }],
      { strategy: "nope" as any, now: 1 }
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.strategy).toBe("fifo");
  });
});
