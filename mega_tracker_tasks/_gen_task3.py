# -*- coding: utf-8 -*-
"""Staging for partner-loan-settlement."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
STAGING = ROOT / "_staging"
T = "partner-loan-settlement"


def w(rel: str, content: str) -> None:
    path = STAGING / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    text = content.replace("\r\n", "\n").replace("\r", "\n")
    if not text.endswith("\n"):
        text += "\n"
    path.write_text(text, encoding="utf-8")


def write() -> None:
    w(f"{T}/src/modules/finance/domain/LoanSettlementTypes.ts", r'''
export type LoanSourceType = "SALE" | "PURCHASE" | "EXPENSE" | "DIRECT";

export type SettlementStrategy = "fifo" | "largest_first";

export interface OpenLoanLeg {
  legId: string;
  sourceType: LoanSourceType;
  principalRemaining: number;
  openedAt: number;
}

export interface SettlementOptions {
  strategy?: SettlementStrategy;
  now?: number;
}

export interface SettlementAllocation {
  legId: string;
  applied: number;
  remainingAfter: number;
}

export interface SettlementSuccess {
  ok: true;
  partnerId: string;
  strategy: SettlementStrategy;
  amount: number;
  allocations: SettlementAllocation[];
  leftover: number;
  fullySettledLegIds: string[];
  settledAt: number;
}

export interface SettlementFailure {
  ok: false;
  reason: "invalid_partner" | "invalid_amount" | "invalid_legs";
}

export type SettlementResult = SettlementSuccess | SettlementFailure;

export interface LoanSettlementPreview extends SettlementSuccess {
  openLegsAfter: OpenLoanLeg[];
}
'''.lstrip())

    w(f"{T}/src/modules/finance/domain/LoanSettlementOrdering.ts", r'''
import { OpenLoanLeg, SettlementStrategy } from "./LoanSettlementTypes";

export function normalizePartnerId(partnerId: unknown): string | null {
  if (typeof partnerId !== "string") return null;
  const trimmed = partnerId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function clampPositiveAmount(amount: unknown): number | null {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

export function isOpenLeg(leg: OpenLoanLeg | null | undefined): leg is OpenLoanLeg {
  if (!leg || typeof leg !== "object") return false;
  if (typeof leg.legId !== "string" || !leg.legId.trim()) return false;
  if (!Number.isFinite(leg.principalRemaining) || leg.principalRemaining <= 0) return false;
  if (!Number.isFinite(leg.openedAt)) return false;
  const st = leg.sourceType;
  return st === "SALE" || st === "PURCHASE" || st === "EXPENSE" || st === "DIRECT";
}

export function listOpenLoanLegs(legs: OpenLoanLeg[]): OpenLoanLeg[] {
  return legs
    .filter(isOpenLeg)
    .map((leg) => ({
      legId: leg.legId.trim(),
      sourceType: leg.sourceType,
      principalRemaining: Math.round(leg.principalRemaining * 100) / 100,
      openedAt: leg.openedAt,
    }));
}

export function orderLegsForStrategy(
  legs: OpenLoanLeg[],
  strategy: SettlementStrategy
): OpenLoanLeg[] {
  const copy = [...legs];
  if (strategy === "largest_first") {
    copy.sort((a, b) => {
      if (b.principalRemaining !== a.principalRemaining) {
        return b.principalRemaining - a.principalRemaining;
      }
      if (a.openedAt !== b.openedAt) return a.openedAt - b.openedAt;
      return a.legId.localeCompare(b.legId);
    });
    return copy;
  }
  // fifo default: openedAt then legId
  copy.sort((a, b) => {
    if (a.openedAt !== b.openedAt) return a.openedAt - b.openedAt;
    return a.legId.localeCompare(b.legId);
  });
  return copy;
}
'''.lstrip())

    w(f"{T}/src/modules/finance/domain/LoanSettlementMath.ts", r'''
import { orderLegsForStrategy, listOpenLoanLegs } from "./LoanSettlementOrdering";
import {
  OpenLoanLeg,
  SettlementAllocation,
  SettlementOptions,
  SettlementStrategy,
} from "./LoanSettlementTypes";

export function resolveStrategy(options?: SettlementOptions): SettlementStrategy {
  return options?.strategy === "largest_first" ? "largest_first" : "fifo";
}

export function resolveNow(options?: SettlementOptions): number {
  const n = options?.now;
  if (typeof n === "number" && Number.isFinite(n)) return n;
  return Date.now();
}

export function distributeAmount(
  legs: OpenLoanLeg[],
  amount: number,
  strategy: SettlementStrategy
): { allocations: SettlementAllocation[]; leftover: number; fullySettledLegIds: string[] } {
  const ordered = orderLegsForStrategy(listOpenLoanLegs(legs), strategy);
  let remaining = amount;
  const allocations: SettlementAllocation[] = [];
  const fullySettledLegIds: string[] = [];

  for (const leg of ordered) {
    if (remaining <= 0) break;
    const applied = Math.min(leg.principalRemaining, remaining);
    const remainingAfter = Math.round((leg.principalRemaining - applied) * 100) / 100;
    const appliedRounded = Math.round(applied * 100) / 100;
    allocations.push({
      legId: leg.legId,
      applied: appliedRounded,
      remainingAfter,
    });
    remaining = Math.round((remaining - appliedRounded) * 100) / 100;
    if (remainingAfter === 0) fullySettledLegIds.push(leg.legId);
  }

  return {
    allocations,
    leftover: Math.max(0, remaining),
    fullySettledLegIds,
  };
}
'''.lstrip())

    w(f"{T}/src/modules/finance/domain/LoanSettlementAllocator.ts", r'''
import {
  distributeAmount,
  resolveNow,
  resolveStrategy,
} from "./LoanSettlementMath";
import {
  clampPositiveAmount,
  listOpenLoanLegs,
  normalizePartnerId,
} from "./LoanSettlementOrdering";
import {
  LoanSettlementPreview,
  OpenLoanLeg,
  SettlementOptions,
  SettlementResult,
} from "./LoanSettlementTypes";

export type {
  LoanSourceType,
  SettlementStrategy,
  OpenLoanLeg,
  SettlementOptions,
  SettlementAllocation,
  SettlementSuccess,
  SettlementFailure,
  SettlementResult,
  LoanSettlementPreview,
} from "./LoanSettlementTypes";

export {
  normalizePartnerId,
  clampPositiveAmount,
  isOpenLeg,
  listOpenLoanLegs,
  orderLegsForStrategy,
} from "./LoanSettlementOrdering";

export { resolveStrategy, resolveNow, distributeAmount } from "./LoanSettlementMath";

export class LoanSettlementAllocator {
  allocate(
    partnerId: string,
    amount: number,
    legs: OpenLoanLeg[],
    options?: SettlementOptions
  ): SettlementResult {
    return allocateSettlement(partnerId, amount, legs, options);
  }

  preview(
    partnerId: string,
    amount: number,
    legs: OpenLoanLeg[],
    options?: SettlementOptions
  ): SettlementResult | LoanSettlementPreview {
    return previewSettlement(partnerId, amount, legs, options);
  }
}

export function allocateSettlement(
  partnerId: string,
  amount: number,
  legs: OpenLoanLeg[],
  options?: SettlementOptions
): SettlementResult {
  const pid = normalizePartnerId(partnerId);
  if (!pid) return { ok: false, reason: "invalid_partner" };
  const amt = clampPositiveAmount(amount);
  if (amt === null) return { ok: false, reason: "invalid_amount" };
  if (!Array.isArray(legs)) return { ok: false, reason: "invalid_legs" };

  const strategy = resolveStrategy(options);
  const settledAt = resolveNow(options);
  const { allocations, leftover, fullySettledLegIds } = distributeAmount(legs, amt, strategy);

  return {
    ok: true,
    partnerId: pid,
    strategy,
    amount: amt,
    allocations,
    leftover,
    fullySettledLegIds,
    settledAt,
  };
}

export function previewSettlement(
  partnerId: string,
  amount: number,
  legs: OpenLoanLeg[],
  options?: SettlementOptions
): SettlementResult | LoanSettlementPreview {
  const allocated = allocateSettlement(partnerId, amount, legs, options);
  if (!allocated.ok) return allocated;

  const open = listOpenLoanLegs(legs);
  const remainingById = new Map(open.map((l) => [l.legId, l.principalRemaining]));
  for (const row of allocated.allocations) {
    remainingById.set(row.legId, row.remainingAfter);
  }
  const openLegsAfter: OpenLoanLeg[] = open
    .map((leg) => ({
      ...leg,
      principalRemaining: remainingById.get(leg.legId) ?? leg.principalRemaining,
    }))
    .filter((leg) => leg.principalRemaining > 0)
    .map((leg) => ({
      legId: leg.legId,
      sourceType: leg.sourceType,
      principalRemaining: leg.principalRemaining,
      openedAt: leg.openedAt,
    }));

  return {
    ...allocated,
    openLegsAfter,
  };
}

export const loanSettlementAllocator = new LoanSettlementAllocator();
'''.lstrip())

    w(f"{T}/src/modules/finance/domain/index.ts", r'''
export {
  LoanSettlementAllocator,
  loanSettlementAllocator,
  allocateSettlement,
  previewSettlement,
  listOpenLoanLegs,
  normalizePartnerId,
  clampPositiveAmount,
  isOpenLeg,
  orderLegsForStrategy,
  resolveStrategy,
  resolveNow,
  distributeAmount,
} from "./LoanSettlementAllocator";

export type {
  LoanSourceType,
  SettlementStrategy,
  OpenLoanLeg,
  SettlementOptions,
  SettlementAllocation,
  SettlementSuccess,
  SettlementFailure,
  SettlementResult,
  LoanSettlementPreview,
} from "./LoanSettlementAllocator";
'''.lstrip())

    write_tests()


def write_tests() -> None:
    g = f"{T}/src/gold_tests"
    w(f"{g}/loan_settlement_allocate.test.ts", r'''
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
'''.lstrip())

    w(f"{g}/loan_settlement_preview.test.ts", r'''
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
'''.lstrip())

    lines = [
        'import { allocateSettlement, OpenLoanLeg } from "../modules/finance/domain/LoanSettlementAllocator";',
        "",
        'describe("Loan settlement amount matrix", () => {',
    ]
    for i in range(1, 28):
        lines.append(
            f'''  it("allocates amount case {i}", () => {{
    const open: OpenLoanLeg[] = [
      {{ legId: "A{i}", sourceType: "SALE", principalRemaining: {i + 5}, openedAt: {1000 + i} }},
      {{ legId: "B{i}", sourceType: "PURCHASE", principalRemaining: {i + 2}, openedAt: {2000 + i} }},
    ];
    const result = allocateSettlement("partner-{i}", {i + 3}, open, {{ now: 9{i:03d} }});
    expect(result.ok).toBe(true);
    if (result.ok) {{
      expect(result.amount).toBe({i + 3});
      expect(result.allocations.length).toBeGreaterThan(0);
      const applied = result.allocations.reduce((s, a) => s + a.applied, 0);
      expect(applied + result.leftover).toBeCloseTo(result.amount, 2);
    }}
  }});'''
        )
    lines.append("});")
    w(f"{g}/loan_settlement_matrix.test.ts", "\n".join(lines) + "\n")

    w(f"{g}/loan_settlement_barrel.test.ts", r'''
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
'''.lstrip())


if __name__ == "__main__":
    write()
    print("wrote partner-loan-settlement")
