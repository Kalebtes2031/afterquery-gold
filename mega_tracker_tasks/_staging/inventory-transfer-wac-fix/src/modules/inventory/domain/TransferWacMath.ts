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

export function mirrorLegs(result: TransferWacResult): TransferLeg[] {
  if (!result.ok) return [];
  return result.legs.map((leg) => ({ ...leg }));
}

export function netQtyMoved(result: TransferWacResult): number {
  if (!result.ok) return 0;
  return result.legs.filter((l) => l.qtyDelta > 0).reduce((s, l) => s + l.qtyDelta, 0);
}
