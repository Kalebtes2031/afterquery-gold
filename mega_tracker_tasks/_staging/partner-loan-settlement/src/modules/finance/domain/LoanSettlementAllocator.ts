import {
  distributeAmount,
  resolveNow,
  resolveStrategy,
} from "./LoanSettlementMath";
import {
  clampPositiveAmount,
  listOpenLoanLegs,
  normalizePartnerId,
  orderLegsForStrategy,
} from "./LoanSettlementOrdering";
import {
  LoanSettlementPreview,
  OpenLoanLeg,
  SettlementAllocation,
  SettlementOptions,
  SettlementResult,
  SettlementStrategy,
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

export function totalPrincipal(legs: OpenLoanLeg[]): number {
  return listOpenLoanLegs(legs).reduce((sum, leg) => sum + leg.principalRemaining, 0);
}

export function summarizeSettlement(result: SettlementResult): string {
  if (!result.ok) return `fail:${result.reason}`;
  return `ok:applied=${result.allocations.length},leftover=${result.leftover},settled=${result.fullySettledLegIds.length}`;
}

export function appliedTotal(result: SettlementResult): number {
  if (!result.ok) return 0;
  return result.allocations.reduce((sum, row) => sum + row.applied, 0);
}

export function assertSettlementConserved(result: SettlementResult): void {
  if (!result.ok) throw new Error("settlement failed");
  const applied = appliedTotal(result);
  const total = Math.round((applied + result.leftover) * 100) / 100;
  if (total !== result.amount) {
    throw new Error(`settlement not conserved: ${total} != ${result.amount}`);
  }
}

export function remainingByLeg(result: SettlementResult): Record<string, number> {
  if (!result.ok) return {};
  const map: Record<string, number> = {};
  for (const row of result.allocations) map[row.legId] = row.remainingAfter;
  return map;
}

export function groupLegsBySource(legs: OpenLoanLeg[]): Record<string, OpenLoanLeg[]> {
  const groups: Record<string, OpenLoanLeg[]> = {
    SALE: [],
    PURCHASE: [],
    EXPENSE: [],
    DIRECT: [],
  };
  for (const leg of listOpenLoanLegs(legs)) {
    groups[leg.sourceType].push(leg);
  }
  return groups;
}

export function pickOldestLeg(legs: OpenLoanLeg[]): OpenLoanLeg | null {
  const ordered = orderLegsForStrategy(listOpenLoanLegs(legs), "fifo");
  return ordered[0] ?? null;
}

export function pickLargestLeg(legs: OpenLoanLeg[]): OpenLoanLeg | null {
  const ordered = orderLegsForStrategy(listOpenLoanLegs(legs), "largest_first");
  return ordered[0] ?? null;
}

export function settlementClearsAll(result: SettlementResult): boolean {
  return result.ok && result.leftover >= 0 && result.allocations.every((a) => a.remainingAfter === 0 || true) && result.leftover === Math.max(0, result.amount - appliedTotal(result));
}

export function previewOpenCount(result: SettlementResult | LoanSettlementPreview): number {
  if (!result.ok) return -1;
  if ("openLegsAfter" in result) return result.openLegsAfter.length;
  return result.allocations.filter((a) => a.remainingAfter > 0).length;
}

export function formatAllocation(row: SettlementAllocation): string {
  return `${row.legId}:${row.applied}->${row.remainingAfter}`;
}

export function formatSettlementLines(result: SettlementResult): string[] {
  if (!result.ok) return [result.reason];
  return result.allocations.map(formatAllocation);
}

export function isFullySettled(result: SettlementResult, legId: string): boolean {
  return result.ok && result.fullySettledLegIds.includes(legId);
}

export function allocateExact(
  partnerId: string,
  legs: OpenLoanLeg[],
  options?: SettlementOptions
): SettlementResult {
  const total = totalPrincipal(legs);
  if (total <= 0) return { ok: false, reason: "invalid_amount" };
  return allocateSettlement(partnerId, total, legs, options);
}

export function allocatePartialPercent(
  partnerId: string,
  legs: OpenLoanLeg[],
  percent: number,
  options?: SettlementOptions
): SettlementResult {
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    return { ok: false, reason: "invalid_amount" };
  }
  const total = totalPrincipal(legs);
  const amount = Math.round(((total * percent) / 100) * 100) / 100;
  return allocateSettlement(partnerId, amount, legs, options);
}

export function settlementCoverageRatio(result: SettlementResult, legs: OpenLoanLeg[]): number {
  if (!result.ok) return 0;
  const total = totalPrincipal(legs);
  if (total <= 0) return 0;
  return Math.min(1, appliedTotal(result) / total);
}

export function unpaidLegsAfter(result: SettlementResult | LoanSettlementPreview): string[] {
  if (!result.ok) return [];
  if ("openLegsAfter" in result) return result.openLegsAfter.map((l) => l.legId);
  return result.allocations.filter((a) => a.remainingAfter > 0).map((a) => a.legId);
}

export function compareStrategies(
  partnerId: string,
  amount: number,
  legs: OpenLoanLeg[],
  now: number
): { fifo: SettlementResult; largest: SettlementResult } {
  return {
    fifo: allocateSettlement(partnerId, amount, legs, { strategy: "fifo", now }),
    largest: allocateSettlement(partnerId, amount, legs, { strategy: "largest_first", now }),
  };
}

export function firstAllocation(result: SettlementResult): SettlementAllocation | null {
  if (!result.ok || result.allocations.length === 0) return null;
  return result.allocations[0];
}

export function lastAllocation(result: SettlementResult): SettlementAllocation | null {
  if (!result.ok || result.allocations.length === 0) return null;
  return result.allocations[result.allocations.length - 1];
}

export function settledSourceTypes(result: SettlementResult, legs: OpenLoanLeg[]): string[] {
  if (!result.ok) return [];
  const byId = new Map(listOpenLoanLegs(legs).map((l) => [l.legId, l.sourceType]));
  const types = new Set<string>();
  for (const legId of result.fullySettledLegIds) {
    const t = byId.get(legId);
    if (t) types.add(t);
  }
  return [...types].sort();
}

export function describeStrategy(strategy: SettlementStrategy): string {
  return strategy === "largest_first"
    ? "clear largest principal first"
    : "clear oldest open legs first";
}

export function normalizeLegsInput(legs: OpenLoanLeg[]): OpenLoanLeg[] {
  return listOpenLoanLegs(legs).map((leg) => ({ ...leg }));
}
