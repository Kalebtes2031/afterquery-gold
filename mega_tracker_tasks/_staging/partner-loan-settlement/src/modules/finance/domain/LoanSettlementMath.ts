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

export function amountFullyCovers(legs: OpenLoanLeg[], amount: number): boolean {
  const open = listOpenLoanLegs(legs);
  const total = open.reduce((sum, leg) => sum + leg.principalRemaining, 0);
  return amount >= total;
}

export function simulateLeftover(legs: OpenLoanLeg[], amount: number, strategy: SettlementStrategy): number {
  return distributeAmount(legs, amount, strategy).leftover;
}
