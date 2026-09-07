export type TransferOpKind = "POSITIVE" | "NEGATIVE" | "TRANSFER";

export interface BranchStockSnapshot {
  branchId: string;
  onHand: number;
}

export interface TransferRequest {
  productId: string;
  sourceBranchId: string;
  destBranchId: string;
  qty: number;
  sourceOnHand: number;
  destOnHand: number;
  /** Current company / source unit cost (WAC). */
  unitCost: number;
  companyWac: number;
  companyOnHand: number;
}

export interface TransferLeg {
  branchId: string;
  qtyDelta: number;
  unitCost: number;
  onHandBefore: number;
  onHandAfter: number;
}

export interface TransferWacSuccess {
  ok: true;
  legs: TransferLeg[];
  sourceOnHandAfter: number;
  destOnHandAfter: number;
  companyWacAfter: number;
  companyOnHandAfter: number;
  unitCostApplied: number;
}

export interface TransferWacFailure {
  ok: false;
  reason: "insufficient_stock" | "invalid_qty" | "invalid_transfer";
}

export type TransferWacResult = TransferWacSuccess | TransferWacFailure;

export interface MixedInventoryOp {
  kind: TransferOpKind;
  branchId: string;
  qty: number;
  unitCost?: number;
  /** For TRANSFER: destination branch. */
  destBranchId?: string;
}

export interface TransferWacAuditInput {
  productId: string;
  branches: BranchStockSnapshot[];
  companyWacStored: number;
  companyOnHandStored: number;
  ops: MixedInventoryOp[];
  /** Expected company WAC after replaying ops from an initial state. */
  initialCompanyWac: number;
  initialCompanyOnHand: number;
  initialBranches: BranchStockSnapshot[];
}

export type TransferWacIssueCode =
  | "company_wac_drift"
  | "branch_onhand_mismatch"
  | "missing_leg";

export interface TransferWacIssue {
  code: TransferWacIssueCode;
  message: string;
  branchId?: string;
}

export interface TransferWacAuditResult {
  ok: boolean;
  issues: TransferWacIssue[];
  expectedCompanyWac: number;
  expectedBranches: BranchStockSnapshot[];
}
