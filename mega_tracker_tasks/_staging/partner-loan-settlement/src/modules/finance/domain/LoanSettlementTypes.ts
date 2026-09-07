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
