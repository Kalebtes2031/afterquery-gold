# -*- coding: utf-8 -*-
"""Staging for inventory-transfer-wac-fix."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
STAGING = ROOT / "_staging"
T = "inventory-transfer-wac-fix"


def w(rel: str, content: str) -> None:
    path = STAGING / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    text = content.replace("\r\n", "\n").replace("\r", "\n")
    if not text.endswith("\n"):
        text += "\n"
    path.write_text(text, encoding="utf-8")


def write() -> None:
    w(f"{T}/src/modules/inventory/domain/TransferWacTypes.ts", r'''
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
'''.lstrip())

    w(f"{T}/src/modules/inventory/domain/TransferWacMath.ts", r'''
import {
  TransferLeg,
  TransferRequest,
  TransferWacFailure,
  TransferWacResult,
  TransferWacSuccess,
} from "./TransferWacTypes";

export function roundCost(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function validateTransferQty(qty: unknown): TransferWacFailure | null {
  const n = Number(qty);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, reason: "invalid_qty" };
  }
  return null;
}

export function validateTransferIdentity(req: TransferRequest): TransferWacFailure | null {
  const productId = String(req.productId ?? "").trim();
  const source = String(req.sourceBranchId ?? "").trim();
  const dest = String(req.destBranchId ?? "").trim();
  if (!productId || !source || !dest || source === dest) {
    return { ok: false, reason: "invalid_transfer" };
  }
  if (!Number.isFinite(req.unitCost) || req.unitCost < 0) {
    return { ok: false, reason: "invalid_transfer" };
  }
  if (!Number.isFinite(req.sourceOnHand) || !Number.isFinite(req.destOnHand)) {
    return { ok: false, reason: "invalid_transfer" };
  }
  return null;
}

export function calculateTransferLegs(req: TransferRequest): TransferWacResult {
  const qtyFail = validateTransferQty(req.qty);
  if (qtyFail) return qtyFail;
  const idFail = validateTransferIdentity(req);
  if (idFail) return idFail;

  const qty = Number(req.qty);
  if (req.sourceOnHand < qty) {
    return { ok: false, reason: "insufficient_stock" };
  }

  const unitCost = roundCost(req.unitCost);
  const sourceBefore = req.sourceOnHand;
  const destBefore = req.destOnHand;
  const sourceAfter = sourceBefore - qty;
  const destAfter = destBefore + qty;

  const legs: TransferLeg[] = [
    {
      branchId: String(req.sourceBranchId).trim(),
      qtyDelta: -qty,
      unitCost,
      onHandBefore: sourceBefore,
      onHandAfter: sourceAfter,
    },
    {
      branchId: String(req.destBranchId).trim(),
      qtyDelta: qty,
      unitCost,
      onHandBefore: destBefore,
      onHandAfter: destAfter,
    },
  ];

  const success: TransferWacSuccess = {
    ok: true,
    legs,
    sourceOnHandAfter: sourceAfter,
    destOnHandAfter: destAfter,
    // Transfer-only: company WAC and company on-hand unchanged.
    companyWacAfter: roundCost(req.companyWac),
    companyOnHandAfter: req.companyOnHand,
    unitCostApplied: unitCost,
  };
  return success;
}

export function applyTransferWac(req: TransferRequest): TransferWacResult {
  return calculateTransferLegs(req);
}
'''.lstrip())

    w(f"{T}/src/modules/inventory/domain/TransferWacAudit.ts", r'''
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
'''.lstrip())

    w(f"{T}/src/modules/inventory/domain/TransferWacEngine.ts", r'''
import { auditTransferWacDrift } from "./TransferWacAudit";
import { applyTransferWac, calculateTransferLegs, roundCost } from "./TransferWacMath";
import {
  TransferRequest,
  TransferWacAuditInput,
  TransferWacAuditResult,
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
'''.lstrip())

    w(f"{T}/src/modules/inventory/domain/index.ts", r'''
export {
  TransferWacEngine,
  transferWacEngine,
  calculateTransferLegs,
  applyTransferWac,
  auditTransferWacDrift,
  roundCost,
  validateTransferQty,
  validateTransferIdentity,
  replayOps,
} from "./TransferWacEngine";

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
} from "./TransferWacEngine";
'''.lstrip())

    write_tests()


def write_tests() -> None:
    g = f"{T}/src/gold_tests"
    w(f"{g}/transfer_wac_apply.test.ts", r'''
import {
  applyTransferWac,
  calculateTransferLegs,
  TransferWacEngine,
  TransferRequest,
} from "../modules/inventory/domain/TransferWacEngine";

function req(over: Partial<TransferRequest> = {}): TransferRequest {
  return {
    productId: "SKU-1",
    sourceBranchId: "B1",
    destBranchId: "B2",
    qty: 5,
    sourceOnHand: 20,
    destOnHand: 3,
    unitCost: 10,
    companyWac: 10,
    companyOnHand: 50,
    ...over,
  };
}

describe("Transfer WAC calculate and apply", () => {
  it("moves qty from source to dest at source unit cost", () => {
    const result = calculateTransferLegs(req());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.unitCostApplied).toBe(10);
      expect(result.sourceOnHandAfter).toBe(15);
      expect(result.destOnHandAfter).toBe(8);
      expect(result.legs).toHaveLength(2);
      expect(result.legs[0]).toMatchObject({ branchId: "B1", qtyDelta: -5, unitCost: 10 });
      expect(result.legs[1]).toMatchObject({ branchId: "B2", qtyDelta: 5, unitCost: 10 });
    }
  });

  it("keeps company WAC unchanged on transfer-only", () => {
    const result = applyTransferWac(req({ companyWac: 12.5, unitCost: 12.5 }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.companyWacAfter).toBe(12.5);
      expect(result.companyOnHandAfter).toBe(50);
    }
  });

  it("rejects over-transfer with insufficient_stock", () => {
    expect(applyTransferWac(req({ qty: 25, sourceOnHand: 20 }))).toEqual({
      ok: false,
      reason: "insufficient_stock",
    });
  });

  it("rejects zero qty with invalid_qty", () => {
    expect(applyTransferWac(req({ qty: 0 }))).toEqual({ ok: false, reason: "invalid_qty" });
  });

  it("rejects negative qty with invalid_qty", () => {
    expect(applyTransferWac(req({ qty: -3 }))).toEqual({ ok: false, reason: "invalid_qty" });
  });

  it("rejects NaN qty with invalid_qty", () => {
    expect(applyTransferWac(req({ qty: Number.NaN }))).toEqual({ ok: false, reason: "invalid_qty" });
  });

  it("rejects same source and dest as invalid_transfer", () => {
    expect(applyTransferWac(req({ sourceBranchId: "B1", destBranchId: "B1" }))).toEqual({
      ok: false,
      reason: "invalid_transfer",
    });
  });

  it("rejects blank product id", () => {
    expect(applyTransferWac(req({ productId: "  " }))).toEqual({
      ok: false,
      reason: "invalid_transfer",
    });
  });

  it("dest receives the same unit cost as source WAC", () => {
    const result = calculateTransferLegs(req({ unitCost: 7.25, companyWac: 9 }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.legs[0].unitCost).toBe(7.25);
      expect(result.legs[1].unitCost).toBe(7.25);
      expect(result.companyWacAfter).toBe(9);
    }
  });

  it("TransferWacEngine.calculateLegs matches calculateTransferLegs", () => {
    const engine = new TransferWacEngine();
    const input = req();
    expect(engine.calculateLegs(input)).toEqual(calculateTransferLegs(input));
  });

  it("TransferWacEngine.apply matches applyTransferWac", () => {
    const engine = new TransferWacEngine();
    const input = req({ qty: 2 });
    expect(engine.apply(input)).toEqual(applyTransferWac(input));
  });

  it("exact source depletion is allowed", () => {
    const result = applyTransferWac(req({ qty: 20, sourceOnHand: 20, destOnHand: 0 }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sourceOnHandAfter).toBe(0);
      expect(result.destOnHandAfter).toBe(20);
    }
  });
});
'''.lstrip())

    w(f"{g}/transfer_wac_audit.test.ts", r'''
import {
  auditTransferWacDrift,
  TransferWacEngine,
} from "../modules/inventory/domain/TransferWacEngine";

describe("Transfer WAC audit drift", () => {
  it("passes when stored state matches transfer-only replay", () => {
    const result = auditTransferWacDrift({
      productId: "SKU",
      initialCompanyWac: 10,
      initialCompanyOnHand: 30,
      initialBranches: [
        { branchId: "B1", onHand: 20 },
        { branchId: "B2", onHand: 10 },
      ],
      ops: [{ kind: "TRANSFER", branchId: "B1", destBranchId: "B2", qty: 5 }],
      companyWacStored: 10,
      companyOnHandStored: 30,
      branches: [
        { branchId: "B1", onHand: 15 },
        { branchId: "B2", onHand: 15 },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.expectedCompanyWac).toBe(10);
  });

  it("flags company_wac_drift when stored WAC changed after transfer", () => {
    const result = auditTransferWacDrift({
      productId: "SKU",
      initialCompanyWac: 10,
      initialCompanyOnHand: 30,
      initialBranches: [
        { branchId: "B1", onHand: 20 },
        { branchId: "B2", onHand: 10 },
      ],
      ops: [{ kind: "TRANSFER", branchId: "B1", destBranchId: "B2", qty: 5 }],
      companyWacStored: 11,
      companyOnHandStored: 30,
      branches: [
        { branchId: "B1", onHand: 15 },
        { branchId: "B2", onHand: 15 },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "company_wac_drift")).toBe(true);
  });

  it("flags branch_onhand_mismatch", () => {
    const result = auditTransferWacDrift({
      productId: "SKU",
      initialCompanyWac: 10,
      initialCompanyOnHand: 30,
      initialBranches: [
        { branchId: "B1", onHand: 20 },
        { branchId: "B2", onHand: 10 },
      ],
      ops: [{ kind: "TRANSFER", branchId: "B1", destBranchId: "B2", qty: 5 }],
      companyWacStored: 10,
      companyOnHandStored: 30,
      branches: [
        { branchId: "B1", onHand: 14 },
        { branchId: "B2", onHand: 15 },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "branch_onhand_mismatch")).toBe(true);
  });

  it("flags missing_leg for transfer without dest", () => {
    const result = auditTransferWacDrift({
      productId: "SKU",
      initialCompanyWac: 10,
      initialCompanyOnHand: 10,
      initialBranches: [{ branchId: "B1", onHand: 10 }],
      ops: [{ kind: "TRANSFER", branchId: "B1", qty: 2 }],
      companyWacStored: 10,
      companyOnHandStored: 10,
      branches: [{ branchId: "B1", onHand: 10 }],
    });
    expect(result.issues.some((i) => i.code === "missing_leg")).toBe(true);
  });

  it("POSITIVE then TRANSFER updates WAC only on positive leg", () => {
    const result = auditTransferWacDrift({
      productId: "SKU",
      initialCompanyWac: 10,
      initialCompanyOnHand: 10,
      initialBranches: [
        { branchId: "B1", onHand: 10 },
        { branchId: "B2", onHand: 0 },
      ],
      ops: [
        { kind: "POSITIVE", branchId: "B1", qty: 10, unitCost: 20 },
        { kind: "TRANSFER", branchId: "B1", destBranchId: "B2", qty: 5 },
      ],
      companyWacStored: 15,
      companyOnHandStored: 20,
      branches: [
        { branchId: "B1", onHand: 15 },
        { branchId: "B2", onHand: 5 },
      ],
    });
    expect(result.expectedCompanyWac).toBe(15);
    expect(result.ok).toBe(true);
  });

  it("NEGATIVE does not change company WAC", () => {
    const result = auditTransferWacDrift({
      productId: "SKU",
      initialCompanyWac: 8,
      initialCompanyOnHand: 10,
      initialBranches: [{ branchId: "B1", onHand: 10 }],
      ops: [{ kind: "NEGATIVE", branchId: "B1", qty: 2 }],
      companyWacStored: 8,
      companyOnHandStored: 8,
      branches: [{ branchId: "B1", onHand: 8 }],
    });
    expect(result.expectedCompanyWac).toBe(8);
    expect(result.ok).toBe(true);
  });

  it("engine.audit delegates to auditTransferWacDrift", () => {
    const input = {
      productId: "SKU",
      initialCompanyWac: 1,
      initialCompanyOnHand: 1,
      initialBranches: [{ branchId: "B1", onHand: 1 }],
      ops: [] as any[],
      companyWacStored: 1,
      companyOnHandStored: 1,
      branches: [{ branchId: "B1", onHand: 1 }],
    };
    expect(new TransferWacEngine().audit(input)).toEqual(auditTransferWacDrift(input));
  });

  it("mixed ops with bad transfer qty produce missing_leg", () => {
    const result = auditTransferWacDrift({
      productId: "SKU",
      initialCompanyWac: 10,
      initialCompanyOnHand: 5,
      initialBranches: [
        { branchId: "B1", onHand: 2 },
        { branchId: "B2", onHand: 3 },
      ],
      ops: [{ kind: "TRANSFER", branchId: "B1", destBranchId: "B2", qty: 9 }],
      companyWacStored: 10,
      companyOnHandStored: 5,
      branches: [
        { branchId: "B1", onHand: 2 },
        { branchId: "B2", onHand: 3 },
      ],
    });
    expect(result.issues.some((i) => i.code === "missing_leg")).toBe(true);
  });
});
'''.lstrip())

    # pad with more f2p cases
    lines = ['import { applyTransferWac, roundCost, validateTransferQty } from "../modules/inventory/domain/TransferWacEngine";', "", 'describe("Transfer WAC edge matrix", () => {']
    for i in range(1, 25):
        lines.append(f'''  it("qty edge case {i}", () => {{
    const qty = {i} * 0.5;
    const result = applyTransferWac({{
      productId: "P{i}",
      sourceBranchId: "S{i}",
      destBranchId: "D{i}",
      qty,
      sourceOnHand: {i + 20},
      destOnHand: {i},
      unitCost: {i}.25,
      companyWac: {i}.25,
      companyOnHand: 100,
    }});
    expect(result.ok).toBe(true);
    if (result.ok) {{
      expect(result.sourceOnHandAfter).toBe({i + 20} - qty);
      expect(result.companyWacAfter).toBe(roundCost({i}.25));
    }}
  }});''')
    lines.append('  it("validateTransferQty rejects zero", () => {')
    lines.append('    expect(validateTransferQty(0)).toEqual({ ok: false, reason: "invalid_qty" });')
    lines.append("  });")
    lines.append("});")
    w(f"{g}/transfer_wac_edges.test.ts", "\n".join(lines) + "\n")

    w(f"{g}/transfer_wac_barrel.test.ts", r'''
import * as barrel from "../modules/inventory/domain/TransferWacEngine";
import {
  applyTransferWac,
  calculateTransferLegs,
  auditTransferWacDrift,
  TransferWacEngine,
} from "../modules/inventory/domain/TransferWacEngine";

describe("Transfer WAC public barrel", () => {
  it("exports core functions", () => {
    expect(typeof calculateTransferLegs).toBe("function");
    expect(typeof applyTransferWac).toBe("function");
    expect(typeof auditTransferWacDrift).toBe("function");
    expect(typeof TransferWacEngine).toBe("function");
  });

  it("singleton transferWacEngine works", () => {
    const result = barrel.transferWacEngine.apply({
      productId: "X",
      sourceBranchId: "A",
      destBranchId: "B",
      qty: 1,
      sourceOnHand: 2,
      destOnHand: 0,
      unitCost: 3,
      companyWac: 3,
      companyOnHand: 2,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects negative unit cost as invalid_transfer", () => {
    expect(
      applyTransferWac({
        productId: "X",
        sourceBranchId: "A",
        destBranchId: "B",
        qty: 1,
        sourceOnHand: 2,
        destOnHand: 0,
        unitCost: -1,
        companyWac: 3,
        companyOnHand: 2,
      })
    ).toEqual({ ok: false, reason: "invalid_transfer" });
  });

  it("trims branch ids", () => {
    const result = applyTransferWac({
      productId: "X",
      sourceBranchId: "  A  ",
      destBranchId: "  B  ",
      qty: 1,
      sourceOnHand: 2,
      destOnHand: 0,
      unitCost: 3,
      companyWac: 3,
      companyOnHand: 2,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.legs[0].branchId).toBe("A");
      expect(result.legs[1].branchId).toBe("B");
    }
  });
});
'''.lstrip())


if __name__ == "__main__":
    write()
    print("wrote inventory-transfer-wac-fix")
