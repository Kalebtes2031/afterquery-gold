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
