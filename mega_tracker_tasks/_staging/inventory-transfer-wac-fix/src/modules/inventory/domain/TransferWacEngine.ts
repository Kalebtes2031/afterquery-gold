import { auditTransferWacDrift } from "./TransferWacAudit";
import { applyTransferWac, calculateTransferLegs, roundCost } from "./TransferWacMath";
import {
  TransferRequest,
  TransferWacAuditInput,
  TransferWacAuditResult,
  TransferWacIssueCode,
  TransferWacResult,
} from "./TransferWacTypes";

export type {
  TransferOpKind,
  BranchStockSnapshot,
  TransferRequest,
  TransferLeg,
  TransferWacSuccess,
  TransferWacFailure,
  TransferWacResult,
  MixedInventoryOp,
  TransferWacAuditInput,
  TransferWacIssueCode,
  TransferWacIssue,
  TransferWacAuditResult,
} from "./TransferWacTypes";

export { roundCost, validateTransferQty, validateTransferIdentity } from "./TransferWacMath";
export { replayOps } from "./TransferWacAudit";

export class TransferWacEngine {
  calculateLegs(req: TransferRequest): TransferWacResult {
    return calculateTransferLegs(req);
  }

  apply(req: TransferRequest): TransferWacResult {
    return applyTransferWac(req);
  }

  audit(input: TransferWacAuditInput): TransferWacAuditResult {
    return auditTransferWacDrift(input);
  }
}

export { calculateTransferLegs, applyTransferWac, auditTransferWacDrift };

export const transferWacEngine = new TransferWacEngine();

export function describeTransferResult(result: TransferWacResult): string {
  if (!result.ok) return `fail:${result.reason}`;
  return `ok:src=${result.sourceOnHandAfter},dest=${result.destOnHandAfter},wac=${result.companyWacAfter}`;
}

export function transferMovedQty(result: TransferWacResult): number {
  if (!result.ok) return 0;
  const destLeg = result.legs.find((leg) => leg.qtyDelta > 0);
  return destLeg ? destLeg.qtyDelta : 0;
}

export function assertCompanyWacUnchanged(
  before: number,
  result: TransferWacResult
): void {
  if (!result.ok) throw new Error("transfer failed");
  if (roundCost(before) !== result.companyWacAfter) {
    throw new Error("company WAC changed on transfer");
  }
}

export function invertTransferRequest(req: TransferRequest): TransferRequest {
  return {
    ...req,
    sourceBranchId: req.destBranchId,
    destBranchId: req.sourceBranchId,
    sourceOnHand: req.destOnHand,
    destOnHand: req.sourceOnHand,
  };
}

export function summarizeAudit(result: TransferWacAuditResult): string {
  if (result.ok) return "clean";
  return result.issues.map((i) => i.code).sort().join(",");
}

export function hasIssueCode(result: TransferWacAuditResult, code: TransferWacIssueCode): boolean {
  return result.issues.some((issue) => issue.code === code);
}

export function expectedOnHand(
  result: TransferWacAuditResult,
  branchId: string
): number | null {
  const row = result.expectedBranches.find((b) => b.branchId === branchId);
  return row ? row.onHand : null;
}

export function buildTransferRequest(partial: Partial<TransferRequest> & Pick<TransferRequest, "productId" | "sourceBranchId" | "destBranchId" | "qty">): TransferRequest {
  return {
    sourceOnHand: partial.sourceOnHand ?? partial.qty,
    destOnHand: partial.destOnHand ?? 0,
    unitCost: partial.unitCost ?? 0,
    companyWac: partial.companyWac ?? partial.unitCost ?? 0,
    companyOnHand: partial.companyOnHand ?? (partial.sourceOnHand ?? partial.qty) + (partial.destOnHand ?? 0),
    ...partial,
  };
}

export function isTransferOnlySafe(result: TransferWacResult, companyWacBefore: number, companyOnHandBefore: number): boolean {
  if (!result.ok) return false;
  return (
    result.companyWacAfter === roundCost(companyWacBefore) &&
    result.companyOnHandAfter === companyOnHandAfter(companyOnHandBefore)
  );
}

function companyOnHandAfter(before: number): number {
  return before;
}

export function legPairValid(result: TransferWacResult): boolean {
  if (!result.ok) return false;
  if (result.legs.length !== 2) return false;
  const [outLeg, inLeg] = result.legs;
  return outLeg.qtyDelta === -inLeg.qtyDelta && outLeg.unitCost === inLeg.unitCost;
}

export function auditIssueMessages(result: TransferWacAuditResult): string[] {
  return result.issues.map((issue) => `${issue.code}:${issue.message}`);
}

export function countIssuesByCode(result: TransferWacAuditResult): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const issue of result.issues) {
    counts[issue.code] = (counts[issue.code] ?? 0) + 1;
  }
  return counts;
}
