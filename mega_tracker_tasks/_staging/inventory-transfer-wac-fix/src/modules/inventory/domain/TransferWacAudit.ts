import { calculateTransferLegs, roundCost } from "./TransferWacMath";
import {
  BranchStockSnapshot,
  MixedInventoryOp,
  TransferWacAuditInput,
  TransferWacAuditResult,
  TransferWacIssue,
} from "./TransferWacTypes";

function cloneBranches(branches: BranchStockSnapshot[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const b of branches) {
    const id = String(b.branchId ?? "").trim();
    if (!id) continue;
    map.set(id, Number(b.onHand) || 0);
  }
  return map;
}

function toSnapshots(map: Map<string, number>): BranchStockSnapshot[] {
  return [...map.entries()]
    .map(([branchId, onHand]) => ({ branchId, onHand }))
    .sort((a, b) => a.branchId.localeCompare(b.branchId));
}

/**
 * Replay mixed ops. POSITIVE increases branch + company qty and may change WAC.
 * NEGATIVE decreases branch + company qty without changing WAC.
 * TRANSFER moves between branches; company WAC and company on-hand stay put.
 */
export function replayOps(
  initialBranches: BranchStockSnapshot[],
  initialCompanyWac: number,
  initialCompanyOnHand: number,
  ops: MixedInventoryOp[]
): { branches: Map<string, number>; companyWac: number; companyOnHand: number; issues: TransferWacIssue[] } {
  const branches = cloneBranches(initialBranches);
  let companyWac = roundCost(initialCompanyWac);
  let companyOnHand = initialCompanyOnHand;
  const issues: TransferWacIssue[] = [];

  for (const op of ops) {
    const kind = op.kind;
    const branchId = String(op.branchId ?? "").trim();
    const qty = Number(op.qty);
    if (!branchId || !Number.isFinite(qty) || qty <= 0) {
      issues.push({ code: "missing_leg", message: "invalid op skipped" });
      continue;
    }
    if (!branches.has(branchId)) branches.set(branchId, 0);

    if (kind === "POSITIVE") {
      const unitCost = Number(op.unitCost ?? companyWac);
      const before = companyOnHand;
      const after = before + qty;
      if (after > 0 && Number.isFinite(unitCost)) {
        companyWac = roundCost(((before * companyWac) + (qty * unitCost)) / after);
      }
      companyOnHand = after;
      branches.set(branchId, (branches.get(branchId) ?? 0) + qty);
      continue;
    }

    if (kind === "NEGATIVE") {
      companyOnHand = companyOnHand - qty;
      branches.set(branchId, (branches.get(branchId) ?? 0) - qty);
      continue;
    }

    if (kind === "TRANSFER") {
      const dest = String(op.destBranchId ?? "").trim();
      if (!dest) {
        issues.push({ code: "missing_leg", message: "transfer missing dest", branchId });
        continue;
      }
      const sourceOnHand = branches.get(branchId) ?? 0;
      const destOnHand = branches.get(dest) ?? 0;
      const result = calculateTransferLegs({
        productId: "audit",
        sourceBranchId: branchId,
        destBranchId: dest,
        qty,
        sourceOnHand,
        destOnHand,
        unitCost: companyWac,
        companyWac,
        companyOnHand,
      });
      if (!result.ok) {
        issues.push({ code: "missing_leg", message: result.reason, branchId });
        continue;
      }
      if (result.legs.length !== 2) {
        issues.push({ code: "missing_leg", message: "expected two transfer legs", branchId });
      }
      branches.set(branchId, result.sourceOnHandAfter);
      branches.set(dest, result.destOnHandAfter);
      // company WAC / on-hand intentionally unchanged
      continue;
    }

    issues.push({ code: "missing_leg", message: `unknown kind ${String(kind)}` });
  }

  return { branches, companyWac, companyOnHand, issues };
}

export function auditTransferWacDrift(input: TransferWacAuditInput): TransferWacAuditResult {
  const replayed = replayOps(
    input.initialBranches,
    input.initialCompanyWac,
    input.initialCompanyOnHand,
    input.ops
  );
  const issues: TransferWacIssue[] = [...replayed.issues];
  const expectedCompanyWac = replayed.companyWac;
  const expectedBranches = toSnapshots(replayed.branches);

  if (roundCost(input.companyWacStored) !== expectedCompanyWac) {
    issues.push({
      code: "company_wac_drift",
      message: `stored ${input.companyWacStored} expected ${expectedCompanyWac}`,
    });
  }

  const storedMap = cloneBranches(input.branches);
  for (const expected of expectedBranches) {
    const stored = storedMap.get(expected.branchId);
    if (stored === undefined || stored !== expected.onHand) {
      issues.push({
        code: "branch_onhand_mismatch",
        message: `branch ${expected.branchId} stored ${stored ?? "missing"} expected ${expected.onHand}`,
        branchId: expected.branchId,
      });
    }
  }
  for (const [branchId] of storedMap) {
    if (!replayed.branches.has(branchId)) {
      issues.push({
        code: "branch_onhand_mismatch",
        message: `unexpected stored branch ${branchId}`,
        branchId,
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    expectedCompanyWac,
    expectedBranches,
  };
}
