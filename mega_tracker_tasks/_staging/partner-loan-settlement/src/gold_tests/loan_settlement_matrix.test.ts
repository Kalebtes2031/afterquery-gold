import { allocateSettlement, OpenLoanLeg } from "../modules/finance/domain/LoanSettlementAllocator";

describe("Loan settlement amount matrix", () => {
  it("allocates amount case 1", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A1", sourceType: "SALE", principalRemaining: 6, openedAt: 1001 },
      { legId: "B1", sourceType: "PURCHASE", principalRemaining: 3, openedAt: 2001 },
    ];
    const result = allocateSettlement("partner-1", 4, open, { now: 9001 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(4);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 2", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A2", sourceType: "SALE", principalRemaining: 7, openedAt: 1002 },
      { legId: "B2", sourceType: "PURCHASE", principalRemaining: 4, openedAt: 2002 },
    ];
    const result = allocateSettlement("partner-2", 5, open, { now: 9002 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(5);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 3", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A3", sourceType: "SALE", principalRemaining: 8, openedAt: 1003 },
      { legId: "B3", sourceType: "PURCHASE", principalRemaining: 5, openedAt: 2003 },
    ];
    const result = allocateSettlement("partner-3", 6, open, { now: 9003 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(6);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 4", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A4", sourceType: "SALE", principalRemaining: 9, openedAt: 1004 },
      { legId: "B4", sourceType: "PURCHASE", principalRemaining: 6, openedAt: 2004 },
    ];
    const result = allocateSettlement("partner-4", 7, open, { now: 9004 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(7);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 5", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A5", sourceType: "SALE", principalRemaining: 10, openedAt: 1005 },
      { legId: "B5", sourceType: "PURCHASE", principalRemaining: 7, openedAt: 2005 },
    ];
    const result = allocateSettlement("partner-5", 8, open, { now: 9005 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(8);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 6", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A6", sourceType: "SALE", principalRemaining: 11, openedAt: 1006 },
      { legId: "B6", sourceType: "PURCHASE", principalRemaining: 8, openedAt: 2006 },
    ];
    const result = allocateSettlement("partner-6", 9, open, { now: 9006 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(9);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 7", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A7", sourceType: "SALE", principalRemaining: 12, openedAt: 1007 },
      { legId: "B7", sourceType: "PURCHASE", principalRemaining: 9, openedAt: 2007 },
    ];
    const result = allocateSettlement("partner-7", 10, open, { now: 9007 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(10);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 8", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A8", sourceType: "SALE", principalRemaining: 13, openedAt: 1008 },
      { legId: "B8", sourceType: "PURCHASE", principalRemaining: 10, openedAt: 2008 },
    ];
    const result = allocateSettlement("partner-8", 11, open, { now: 9008 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(11);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 9", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A9", sourceType: "SALE", principalRemaining: 14, openedAt: 1009 },
      { legId: "B9", sourceType: "PURCHASE", principalRemaining: 11, openedAt: 2009 },
    ];
    const result = allocateSettlement("partner-9", 12, open, { now: 9009 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(12);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 10", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A10", sourceType: "SALE", principalRemaining: 15, openedAt: 1010 },
      { legId: "B10", sourceType: "PURCHASE", principalRemaining: 12, openedAt: 2010 },
    ];
    const result = allocateSettlement("partner-10", 13, open, { now: 9010 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(13);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 11", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A11", sourceType: "SALE", principalRemaining: 16, openedAt: 1011 },
      { legId: "B11", sourceType: "PURCHASE", principalRemaining: 13, openedAt: 2011 },
    ];
    const result = allocateSettlement("partner-11", 14, open, { now: 9011 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(14);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 12", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A12", sourceType: "SALE", principalRemaining: 17, openedAt: 1012 },
      { legId: "B12", sourceType: "PURCHASE", principalRemaining: 14, openedAt: 2012 },
    ];
    const result = allocateSettlement("partner-12", 15, open, { now: 9012 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(15);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 13", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A13", sourceType: "SALE", principalRemaining: 18, openedAt: 1013 },
      { legId: "B13", sourceType: "PURCHASE", principalRemaining: 15, openedAt: 2013 },
    ];
    const result = allocateSettlement("partner-13", 16, open, { now: 9013 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(16);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 14", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A14", sourceType: "SALE", principalRemaining: 19, openedAt: 1014 },
      { legId: "B14", sourceType: "PURCHASE", principalRemaining: 16, openedAt: 2014 },
    ];
    const result = allocateSettlement("partner-14", 17, open, { now: 9014 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(17);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 15", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A15", sourceType: "SALE", principalRemaining: 20, openedAt: 1015 },
      { legId: "B15", sourceType: "PURCHASE", principalRemaining: 17, openedAt: 2015 },
    ];
    const result = allocateSettlement("partner-15", 18, open, { now: 9015 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(18);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 16", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A16", sourceType: "SALE", principalRemaining: 21, openedAt: 1016 },
      { legId: "B16", sourceType: "PURCHASE", principalRemaining: 18, openedAt: 2016 },
    ];
    const result = allocateSettlement("partner-16", 19, open, { now: 9016 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(19);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 17", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A17", sourceType: "SALE", principalRemaining: 22, openedAt: 1017 },
      { legId: "B17", sourceType: "PURCHASE", principalRemaining: 19, openedAt: 2017 },
    ];
    const result = allocateSettlement("partner-17", 20, open, { now: 9017 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(20);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 18", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A18", sourceType: "SALE", principalRemaining: 23, openedAt: 1018 },
      { legId: "B18", sourceType: "PURCHASE", principalRemaining: 20, openedAt: 2018 },
    ];
    const result = allocateSettlement("partner-18", 21, open, { now: 9018 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(21);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 19", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A19", sourceType: "SALE", principalRemaining: 24, openedAt: 1019 },
      { legId: "B19", sourceType: "PURCHASE", principalRemaining: 21, openedAt: 2019 },
    ];
    const result = allocateSettlement("partner-19", 22, open, { now: 9019 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(22);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 20", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A20", sourceType: "SALE", principalRemaining: 25, openedAt: 1020 },
      { legId: "B20", sourceType: "PURCHASE", principalRemaining: 22, openedAt: 2020 },
    ];
    const result = allocateSettlement("partner-20", 23, open, { now: 9020 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(23);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 21", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A21", sourceType: "SALE", principalRemaining: 26, openedAt: 1021 },
      { legId: "B21", sourceType: "PURCHASE", principalRemaining: 23, openedAt: 2021 },
    ];
    const result = allocateSettlement("partner-21", 24, open, { now: 9021 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(24);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 22", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A22", sourceType: "SALE", principalRemaining: 27, openedAt: 1022 },
      { legId: "B22", sourceType: "PURCHASE", principalRemaining: 24, openedAt: 2022 },
    ];
    const result = allocateSettlement("partner-22", 25, open, { now: 9022 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(25);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 23", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A23", sourceType: "SALE", principalRemaining: 28, openedAt: 1023 },
      { legId: "B23", sourceType: "PURCHASE", principalRemaining: 25, openedAt: 2023 },
    ];
    const result = allocateSettlement("partner-23", 26, open, { now: 9023 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(26);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 24", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A24", sourceType: "SALE", principalRemaining: 29, openedAt: 1024 },
      { legId: "B24", sourceType: "PURCHASE", principalRemaining: 26, openedAt: 2024 },
    ];
    const result = allocateSettlement("partner-24", 27, open, { now: 9024 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(27);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 25", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A25", sourceType: "SALE", principalRemaining: 30, openedAt: 1025 },
      { legId: "B25", sourceType: "PURCHASE", principalRemaining: 27, openedAt: 2025 },
    ];
    const result = allocateSettlement("partner-25", 28, open, { now: 9025 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(28);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 26", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A26", sourceType: "SALE", principalRemaining: 31, openedAt: 1026 },
      { legId: "B26", sourceType: "PURCHASE", principalRemaining: 28, openedAt: 2026 },
    ];
    const result = allocateSettlement("partner-26", 29, open, { now: 9026 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(29);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
  it("allocates amount case 27", () => {
    const open: OpenLoanLeg[] = [
      { legId: "A27", sourceType: "SALE", principalRemaining: 32, openedAt: 1027 },
      { legId: "B27", sourceType: "PURCHASE", principalRemaining: 29, openedAt: 2027 },
    ];
    const result = allocateSettlement("partner-27", 30, open, { now: 9027 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amount).toBe(30);
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }
  });
});
