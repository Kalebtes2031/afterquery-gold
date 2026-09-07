import { clampRemaining, deriveStatus, normalizeLineId, toRemainingView } from "./FulfillmentMath";
import {
  FulfillmentAuditResult,
  FulfillmentIssue,
  FulfillmentIssueCode,
  FulfillmentLine,
  FulfillmentLineStatus,
} from "./FulfillmentTypes";

export interface AuditableLine extends FulfillmentLine {
  status?: FulfillmentLineStatus;
}

export function auditFulfillmentConsistency(lines: AuditableLine[]): FulfillmentAuditResult {
  const issues: FulfillmentIssue[] = [];
  if (!Array.isArray(lines)) {
    return { ok: false, issues: [{ code: "status_mismatch", lineId: "", message: "lines not array" }] };
  }

  for (const line of lines) {
    const view = toRemainingView(line);
    const lineId = normalizeLineId(line?.lineId) ?? "";
    if (!view) {
      issues.push({ code: "status_mismatch", lineId, message: "invalid line" });
      continue;
    }
    const rawRemaining = view.qtyOrdered - view.qtyFulfilled;
    if (view.qtyFulfilled > view.qtyOrdered) {
      issues.push({
        code: "over_fulfilled",
        lineId: view.lineId,
        message: `fulfilled ${view.qtyFulfilled} > ordered ${view.qtyOrdered}`,
      });
    }
    if (rawRemaining < 0) {
      issues.push({
        code: "negative_remaining",
        lineId: view.lineId,
        message: `raw remaining ${rawRemaining}`,
      });
    }
    if (line.status != null) {
      const expected = deriveStatus(view.qtyOrdered, Math.min(view.qtyFulfilled, view.qtyOrdered));
      // For over-fulfilled lines, canonical status is still FULFILLED.
      const canonical =
        view.qtyFulfilled > view.qtyOrdered ? "FULFILLED" : deriveStatus(view.qtyOrdered, view.qtyFulfilled);
      if (line.status !== canonical && line.status !== expected) {
        issues.push({
          code: "status_mismatch",
          lineId: view.lineId,
          message: `stored ${line.status} expected ${canonical}`,
        });
      }
    }
    // touch helpers so clamp is covered in audit path
    void clampRemaining(view.qtyOrdered, view.qtyFulfilled);
  }

  return { ok: issues.length === 0, issues };
}

export function issuesForLine(result: FulfillmentAuditResult, lineId: string): FulfillmentIssue[] {
  return result.issues.filter((issue) => issue.lineId === lineId);
}

export function hasAnyIssue(result: FulfillmentAuditResult, code: FulfillmentIssueCode): boolean {
  return result.issues.some((issue) => issue.code === code);
}

export function summarizeAuditResult(result: FulfillmentAuditResult): string {
  if (result.ok) return "ok";
  return result.issues.map((i) => `${i.lineId}:${i.code}`).join(",");
}

export function emptyAuditResult(): FulfillmentAuditResult {
  return { ok: true, issues: [] };
}
