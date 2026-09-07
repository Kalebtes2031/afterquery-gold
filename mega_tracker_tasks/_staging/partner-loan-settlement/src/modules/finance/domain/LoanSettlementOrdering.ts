import { LoanSourceType, OpenLoanLeg, SettlementStrategy } from "./LoanSettlementTypes";

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

export function sortLegsStable(legs: OpenLoanLeg[]): OpenLoanLeg[] {
  return orderLegsForStrategy(listOpenLoanLegs(legs), "fifo");
}

export function uniqueLegIds(legs: OpenLoanLeg[]): string[] {
  return [...new Set(listOpenLoanLegs(legs).map((l) => l.legId))].sort();
}

export function oldestOpenedAt(legs: OpenLoanLeg[]): number | null {
  const listed = listOpenLoanLegs(legs);
  if (listed.length === 0) return null;
  return Math.min(...listed.map((l) => l.openedAt));
}

export function newestOpenedAt(legs: OpenLoanLeg[]): number | null {
  const listed = listOpenLoanLegs(legs);
  if (listed.length === 0) return null;
  return Math.max(...listed.map((l) => l.openedAt));
}

export function filterBySource(legs: OpenLoanLeg[], sourceType: LoanSourceType): OpenLoanLeg[] {
  return listOpenLoanLegs(legs).filter((leg) => leg.sourceType === sourceType);
}
