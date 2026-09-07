import { auditFulfillmentConsistency } from "../../../shared/domain/fulfillment/FulfillmentAudit";
import type { AuditableLine } from "../../../shared/domain/fulfillment/FulfillmentAudit";
import {
  deriveStatus,
  normalizeLineId,
  toRemainingView,
} from "../../../shared/domain/fulfillment/FulfillmentMath";
import {
  ApplyFulfillmentResult,
  ApplyFulfillmentSuccess,
  FulfillmentAuditResult,
  FulfillmentLine,
  FulfillmentLineStatus,
  RemainingView,
  ValidateDeltaResult,
} from "../../../shared/domain/fulfillment/FulfillmentTypes";

export type {
  FulfillmentLineStatus,
  FulfillmentLine,
  RemainingView,
  ValidateDeltaResult,
  ApplyFulfillmentResult,
  FulfillmentIssueCode,
  FulfillmentIssue,
  FulfillmentAuditResult,
} from "../../../shared/domain/fulfillment/FulfillmentTypes";

export {
  normalizeLineId,
  asNonNegativeNumber,
  deriveStatus,
  clampRemaining,
  toRemainingView,
} from "../../../shared/domain/fulfillment/FulfillmentMath";

export { auditFulfillmentConsistency } from "../../../shared/domain/fulfillment/FulfillmentAudit";
export type { AuditableLine } from "../../../shared/domain/fulfillment/FulfillmentAudit";

export class FulfillmentRemainingGuard {
  computeRemaining(line: FulfillmentLine): RemainingView | null {
    return computeRemaining(line);
  }

  validatePartialFulfillment(line: FulfillmentLine, delta: number): ValidateDeltaResult {
    return validatePartialFulfillment(line, delta);
  }

  applyFulfillmentDelta(line: FulfillmentLine, delta: number): ApplyFulfillmentResult {
    return applyFulfillmentDelta(line, delta);
  }

  audit(lines: AuditableLine[]): FulfillmentAuditResult {
    return auditFulfillmentConsistency(lines);
  }
}

export function computeRemaining(line: FulfillmentLine): RemainingView | null {
  return toRemainingView(line);
}

export function validatePartialFulfillment(
  line: FulfillmentLine,
  delta: number
): ValidateDeltaResult {
  const view = toRemainingView(line);
  if (!view) return { ok: false, reason: "invalid_line" };
  const d = Number(delta);
  if (!Number.isFinite(d) || d <= 0) {
    return { ok: false, reason: "invalid_delta", lineId: view.lineId };
  }
  if (d > view.remaining) {
    return { ok: false, reason: "over_fulfill", lineId: view.lineId };
  }
  return {
    ok: true,
    lineId: view.lineId,
    delta: d,
    remainingBefore: view.remaining,
  };
}

export function applyFulfillmentDelta(
  line: FulfillmentLine,
  delta: number
): ApplyFulfillmentResult {
  const validated = validatePartialFulfillment(line, delta);
  if (!validated.ok) return validated;
  const qtyFulfilled = line.qtyFulfilled + validated.delta;
  const status = deriveStatus(line.qtyOrdered, qtyFulfilled);
  const remaining = Math.max(0, line.qtyOrdered - qtyFulfilled);
  const success: ApplyFulfillmentSuccess = {
    ok: true,
    line: {
      lineId: normalizeLineId(line.lineId) ?? line.lineId,
      qtyOrdered: line.qtyOrdered,
      qtyFulfilled,
    },
    status,
    remaining,
  };
  return success;
}

export const fulfillmentRemainingGuard = new FulfillmentRemainingGuard();

export function summarizeRemaining(view: RemainingView | null): string {
  if (!view) return "invalid";
  return `${view.lineId}:${view.status}:rem=${view.remaining}`;
}

export function isComplete(view: RemainingView | null): boolean {
  return !!view && view.status === "FULFILLED" && view.remaining === 0;
}

export function canAcceptDelta(line: FulfillmentLine, delta: number): boolean {
  return validatePartialFulfillment(line, delta).ok;
}

export function remainingAfterDelta(line: FulfillmentLine, delta: number): number | null {
  const applied = applyFulfillmentDelta(line, delta);
  if (!applied.ok) return null;
  return applied.remaining;
}

export function statusAfterDelta(line: FulfillmentLine, delta: number): FulfillmentLineStatus | null {
  const applied = applyFulfillmentDelta(line, delta);
  if (!applied.ok) return null;
  return applied.status;
}

export function auditCodes(result: FulfillmentAuditResult): string[] {
  return [...new Set(result.issues.map((i) => i.code))].sort();
}

export function linesWithIssues(result: FulfillmentAuditResult): string[] {
  return [...new Set(result.issues.map((i) => i.lineId))].sort();
}

export function assertNoIssues(result: FulfillmentAuditResult): void {
  if (!result.ok || result.issues.length > 0) {
    throw new Error(`fulfillment audit failed: ${auditCodes(result).join(",")}`);
  }
}

export function buildLine(lineId: string, qtyOrdered: number, qtyFulfilled = 0): FulfillmentLine {
  return { lineId, qtyOrdered, qtyFulfilled };
}

export function progressRatio(line: FulfillmentLine): number | null {
  const view = computeRemaining(line);
  if (!view || view.qtyOrdered <= 0) return null;
  return Math.min(1, view.qtyFulfilled / view.qtyOrdered);
}

export function describeApply(result: ApplyFulfillmentResult): string {
  if (!result.ok) return `fail:${result.reason}`;
  return `ok:${result.status}:fulfilled=${result.line.qtyFulfilled}:rem=${result.remaining}`;
}

export function maxAcceptableDelta(line: FulfillmentLine): number {
  const view = computeRemaining(line);
  return view ? view.remaining : 0;
}

export function applyUntilFulfilled(line: FulfillmentLine, step: number): ApplyFulfillmentResult {
  let current = { ...line };
  let last: ApplyFulfillmentResult = { ok: false, reason: "invalid_delta" };
  while (true) {
    const view = computeRemaining(current);
    if (!view || view.remaining <= 0) break;
    const delta = Math.min(step, view.remaining);
    last = applyFulfillmentDelta(current, delta);
    if (!last.ok) return last;
    current = last.line;
    if (last.status === "FULFILLED") return last;
  }
  return last.ok
    ? last
    : {
        ok: true,
        line: current,
        status: deriveStatus(current.qtyOrdered, current.qtyFulfilled),
        remaining: Math.max(0, current.qtyOrdered - current.qtyFulfilled),
      };
}

export function validateMany(
  lines: FulfillmentLine[],
  delta: number
): Array<{ lineId: string; result: ValidateDeltaResult }> {
  return lines.map((line) => ({
    lineId: normalizeLineId(line.lineId) ?? String(line.lineId),
    result: validatePartialFulfillment(line, delta),
  }));
}

export function applyMany(
  lines: FulfillmentLine[],
  delta: number
): Array<{ lineId: string; result: ApplyFulfillmentResult }> {
  return lines.map((line) => ({
    lineId: normalizeLineId(line.lineId) ?? String(line.lineId),
    result: applyFulfillmentDelta(line, delta),
  }));
}

export function countByStatus(lines: FulfillmentLine[]): Record<FulfillmentLineStatus, number> {
  const counts: Record<FulfillmentLineStatus, number> = {
    UNFULFILLED: 0,
    PARTIAL: 0,
    FULFILLED: 0,
  };
  for (const line of lines) {
    const view = computeRemaining(line);
    if (!view) continue;
    counts[view.status] += 1;
  }
  return counts;
}

export function totalRemaining(lines: FulfillmentLine[]): number {
  return lines.reduce((sum, line) => {
    const view = computeRemaining(line);
    return sum + (view ? view.remaining : 0);
  }, 0);
}

export function totalOrdered(lines: FulfillmentLine[]): number {
  return lines.reduce((sum, line) => sum + (Number(line.qtyOrdered) || 0), 0);
}

export function totalFulfilled(lines: FulfillmentLine[]): number {
  return lines.reduce((sum, line) => sum + (Number(line.qtyFulfilled) || 0), 0);
}

export function findOverFulfilled(lines: FulfillmentLine[]): string[] {
  return auditFulfillmentConsistency(lines).issues
    .filter((i) => i.code === "over_fulfilled")
    .map((i) => i.lineId);
}

export function sameLineIdentity(a: FulfillmentLine, b: FulfillmentLine): boolean {
  return normalizeLineId(a.lineId) === normalizeLineId(b.lineId);
}

export function cloneLine(line: FulfillmentLine): FulfillmentLine {
  return {
    lineId: line.lineId,
    qtyOrdered: line.qtyOrdered,
    qtyFulfilled: line.qtyFulfilled,
  };
}

export function withFulfilled(line: FulfillmentLine, qtyFulfilled: number): FulfillmentLine {
  return { ...cloneLine(line), qtyFulfilled };
}
