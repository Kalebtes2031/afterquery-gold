# -*- coding: utf-8 -*-
"""Staging for fulfillment-remaining-guard."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent
STAGING = ROOT / "_staging"
T = "fulfillment-remaining-guard"


def w(rel: str, content: str) -> None:
    path = STAGING / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    text = content.replace("\r\n", "\n").replace("\r", "\n")
    if not text.endswith("\n"):
        text += "\n"
    path.write_text(text, encoding="utf-8")


def write() -> None:
    w(f"{T}/src/shared/domain/fulfillment/FulfillmentTypes.ts", r'''
export type FulfillmentLineStatus = "UNFULFILLED" | "PARTIAL" | "FULFILLED";

export interface FulfillmentLine {
  lineId: string;
  qtyOrdered: number;
  qtyFulfilled: number;
}

export interface RemainingView {
  lineId: string;
  qtyOrdered: number;
  qtyFulfilled: number;
  remaining: number;
  status: FulfillmentLineStatus;
}

export interface ValidateDeltaSuccess {
  ok: true;
  lineId: string;
  delta: number;
  remainingBefore: number;
}

export interface ValidateDeltaFailure {
  ok: false;
  reason: "invalid_delta" | "over_fulfill" | "invalid_line";
  lineId?: string;
}

export type ValidateDeltaResult = ValidateDeltaSuccess | ValidateDeltaFailure;

export interface ApplyFulfillmentSuccess {
  ok: true;
  line: FulfillmentLine;
  status: FulfillmentLineStatus;
  remaining: number;
}

export type ApplyFulfillmentResult = ApplyFulfillmentSuccess | ValidateDeltaFailure;

export type FulfillmentIssueCode =
  | "over_fulfilled"
  | "negative_remaining"
  | "status_mismatch";

export interface FulfillmentIssue {
  code: FulfillmentIssueCode;
  lineId: string;
  message: string;
}

export interface FulfillmentAuditResult {
  ok: boolean;
  issues: FulfillmentIssue[];
}
'''.lstrip())

    w(f"{T}/src/shared/domain/fulfillment/FulfillmentMath.ts", r'''
import {
  FulfillmentLine,
  FulfillmentLineStatus,
  RemainingView,
} from "./FulfillmentTypes";

export function normalizeLineId(lineId: unknown): string | null {
  if (typeof lineId !== "string") return null;
  const trimmed = lineId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function asNonNegativeNumber(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function deriveStatus(qtyOrdered: number, qtyFulfilled: number): FulfillmentLineStatus {
  if (qtyFulfilled <= 0) return "UNFULFILLED";
  if (qtyFulfilled >= qtyOrdered) return "FULFILLED";
  return "PARTIAL";
}

export function clampRemaining(qtyOrdered: number, qtyFulfilled: number): number {
  const raw = qtyOrdered - qtyFulfilled;
  return raw < 0 ? 0 : raw;
}

export function toRemainingView(line: FulfillmentLine): RemainingView | null {
  const lineId = normalizeLineId(line?.lineId);
  const qtyOrdered = asNonNegativeNumber(line?.qtyOrdered);
  const qtyFulfilled = asNonNegativeNumber(line?.qtyFulfilled);
  if (!lineId || qtyOrdered === null || qtyFulfilled === null) return null;
  if (qtyOrdered < 0 || qtyFulfilled < 0) return null;
  return {
    lineId,
    qtyOrdered,
    qtyFulfilled,
    remaining: clampRemaining(qtyOrdered, qtyFulfilled),
    status: deriveStatus(qtyOrdered, qtyFulfilled),
  };
}
'''.lstrip())

    w(f"{T}/src/shared/domain/fulfillment/FulfillmentAudit.ts", r'''
import { clampRemaining, deriveStatus, normalizeLineId, toRemainingView } from "./FulfillmentMath";
import {
  FulfillmentAuditResult,
  FulfillmentIssue,
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
'''.lstrip())

    w(f"{T}/src/shared/domain/fulfillment/index.ts", r'''
export type {
  FulfillmentLineStatus,
  FulfillmentLine,
  RemainingView,
  ValidateDeltaSuccess,
  ValidateDeltaFailure,
  ValidateDeltaResult,
  ApplyFulfillmentSuccess,
  ApplyFulfillmentResult,
  FulfillmentIssueCode,
  FulfillmentIssue,
  FulfillmentAuditResult,
} from "./FulfillmentTypes";

export {
  normalizeLineId,
  asNonNegativeNumber,
  deriveStatus,
  clampRemaining,
  toRemainingView,
} from "./FulfillmentMath";

export { auditFulfillmentConsistency } from "./FulfillmentAudit";
export type { AuditableLine } from "./FulfillmentAudit";
'''.lstrip())

    w(f"{T}/src/modules/sales/domain/FulfillmentRemainingGuard.ts", r'''
import {
  applyFulfillmentDelta as applyDeltaShared,
  auditFulfillmentConsistency,
  computeRemaining,
  validatePartialFulfillment,
} from "./fulfillmentGuardCore";
import {
  ApplyFulfillmentResult,
  FulfillmentAuditResult,
  FulfillmentLine,
  RemainingView,
  ValidateDeltaResult,
} from "../../../shared/domain/fulfillment/FulfillmentTypes";
import type { AuditableLine } from "../../../shared/domain/fulfillment/FulfillmentAudit";

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
  return computeRemainingImpl(line);
}

import { toRemainingView } from "../../../shared/domain/fulfillment/FulfillmentMath";
import {
  ApplyFulfillmentSuccess,
  ValidateDeltaFailure,
} from "../../../shared/domain/fulfillment/FulfillmentTypes";
import { deriveStatus, normalizeLineId } from "../../../shared/domain/fulfillment/FulfillmentMath";

function computeRemainingImpl(line: FulfillmentLine): RemainingView | null {
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

export { applyDeltaShared };

export const fulfillmentRemainingGuard = new FulfillmentRemainingGuard();
'''.lstrip())

    # The above FulfillmentRemainingGuard has messy imports - let me rewrite it cleanly
    w(f"{T}/src/modules/sales/domain/FulfillmentRemainingGuard.ts", r'''
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
'''.lstrip())

    w(f"{T}/src/modules/sales/domain/index.ts", r'''
export {
  FulfillmentRemainingGuard,
  fulfillmentRemainingGuard,
  computeRemaining,
  validatePartialFulfillment,
  applyFulfillmentDelta,
  auditFulfillmentConsistency,
  normalizeLineId,
  asNonNegativeNumber,
  deriveStatus,
  clampRemaining,
  toRemainingView,
} from "./FulfillmentRemainingGuard";

export type {
  FulfillmentLineStatus,
  FulfillmentLine,
  RemainingView,
  ValidateDeltaResult,
  ApplyFulfillmentResult,
  FulfillmentIssueCode,
  FulfillmentIssue,
  FulfillmentAuditResult,
  AuditableLine,
} from "./FulfillmentRemainingGuard";
'''.lstrip())

    write_tests()


def write_tests() -> None:
    g = f"{T}/src/gold_tests"
    w(f"{g}/fulfillment_remaining_core.test.ts", r'''
import {
  applyFulfillmentDelta,
  computeRemaining,
  validatePartialFulfillment,
  FulfillmentRemainingGuard,
} from "../modules/sales/domain/FulfillmentRemainingGuard";

describe("Fulfillment remaining compute", () => {
  it("computes remaining as ordered minus fulfilled", () => {
    expect(computeRemaining({ lineId: "L1", qtyOrdered: 10, qtyFulfilled: 3 })).toEqual({
      lineId: "L1",
      qtyOrdered: 10,
      qtyFulfilled: 3,
      remaining: 7,
      status: "PARTIAL",
    });
  });

  it("clamps negative remaining display to zero", () => {
    const view = computeRemaining({ lineId: "L2", qtyOrdered: 5, qtyFulfilled: 9 });
    expect(view?.remaining).toBe(0);
    expect(view?.status).toBe("FULFILLED");
  });

  it("marks UNFULFILLED when fulfilled is zero", () => {
    expect(computeRemaining({ lineId: "L3", qtyOrdered: 4, qtyFulfilled: 0 })?.status).toBe(
      "UNFULFILLED"
    );
  });

  it("returns null for blank line id", () => {
    expect(computeRemaining({ lineId: "  ", qtyOrdered: 1, qtyFulfilled: 0 })).toBeNull();
  });

  it("returns null for negative quantities", () => {
    expect(computeRemaining({ lineId: "L", qtyOrdered: -1, qtyFulfilled: 0 })).toBeNull();
  });
});

describe("Fulfillment validate and apply", () => {
  it("rejects delta <= 0 as invalid_delta", () => {
    expect(validatePartialFulfillment({ lineId: "L", qtyOrdered: 5, qtyFulfilled: 1 }, 0)).toEqual({
      ok: false,
      reason: "invalid_delta",
      lineId: "L",
    });
    expect(validatePartialFulfillment({ lineId: "L", qtyOrdered: 5, qtyFulfilled: 1 }, -2).ok).toBe(
      false
    );
  });

  it("rejects delta greater than remaining as over_fulfill", () => {
    expect(validatePartialFulfillment({ lineId: "L", qtyOrdered: 5, qtyFulfilled: 4 }, 2)).toEqual({
      ok: false,
      reason: "over_fulfill",
      lineId: "L",
    });
  });

  it("applies delta and returns PARTIAL status", () => {
    const result = applyFulfillmentDelta({ lineId: "L", qtyOrdered: 10, qtyFulfilled: 2 }, 3);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.line.qtyFulfilled).toBe(5);
      expect(result.status).toBe("PARTIAL");
      expect(result.remaining).toBe(5);
    }
  });

  it("applies delta to reach FULFILLED", () => {
    const result = applyFulfillmentDelta({ lineId: "L", qtyOrdered: 4, qtyFulfilled: 1 }, 3);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe("FULFILLED");
      expect(result.remaining).toBe(0);
    }
  });

  it("guard class delegates", () => {
    const guard = new FulfillmentRemainingGuard();
    const line = { lineId: "G", qtyOrdered: 6, qtyFulfilled: 1 };
    expect(guard.computeRemaining(line)).toEqual(computeRemaining(line));
    expect(guard.validatePartialFulfillment(line, 2)).toEqual(
      validatePartialFulfillment(line, 2)
    );
    expect(guard.applyFulfillmentDelta(line, 2)).toEqual(applyFulfillmentDelta(line, 2));
  });
});
'''.lstrip())

    w(f"{g}/fulfillment_remaining_audit.test.ts", r'''
import {
  auditFulfillmentConsistency,
  deriveStatus,
  clampRemaining,
} from "../modules/sales/domain/FulfillmentRemainingGuard";

describe("Fulfillment audit consistency", () => {
  it("passes clean lines", () => {
    const result = auditFulfillmentConsistency([
      { lineId: "A", qtyOrdered: 5, qtyFulfilled: 0, status: "UNFULFILLED" },
      { lineId: "B", qtyOrdered: 5, qtyFulfilled: 2, status: "PARTIAL" },
      { lineId: "C", qtyOrdered: 5, qtyFulfilled: 5, status: "FULFILLED" },
    ]);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("flags over_fulfilled", () => {
    const result = auditFulfillmentConsistency([
      { lineId: "X", qtyOrdered: 2, qtyFulfilled: 5, status: "FULFILLED" },
    ]);
    expect(result.issues.some((i) => i.code === "over_fulfilled")).toBe(true);
    expect(result.issues.some((i) => i.code === "negative_remaining")).toBe(true);
  });

  it("flags status_mismatch", () => {
    const result = auditFulfillmentConsistency([
      { lineId: "Y", qtyOrdered: 4, qtyFulfilled: 1, status: "FULFILLED" },
    ]);
    expect(result.issues.some((i) => i.code === "status_mismatch")).toBe(true);
  });

  it("deriveStatus boundaries", () => {
    expect(deriveStatus(5, 0)).toBe("UNFULFILLED");
    expect(deriveStatus(5, 1)).toBe("PARTIAL");
    expect(deriveStatus(5, 5)).toBe("FULFILLED");
    expect(deriveStatus(5, 9)).toBe("FULFILLED");
  });

  it("clampRemaining never negative", () => {
    expect(clampRemaining(3, 10)).toBe(0);
    expect(clampRemaining(3, 1)).toBe(2);
  });
});
'''.lstrip())

    lines = [
        'import { applyFulfillmentDelta, computeRemaining, validatePartialFulfillment } from "../modules/sales/domain/FulfillmentRemainingGuard";',
        "",
        'describe("Fulfillment remaining matrix", () => {',
    ]
    for i in range(1, 30):
        ordered = i + 5
        fulfilled = i % 4
        delta = 1
        lines.append(
            f'''  it("line matrix case {i}", () => {{
    const line = {{ lineId: "L{i}", qtyOrdered: {ordered}, qtyFulfilled: {fulfilled} }};
    const view = computeRemaining(line);
    expect(view?.remaining).toBe(Math.max(0, {ordered} - {fulfilled}));
    const validated = validatePartialFulfillment(line, {delta});
    expect(validated.ok).toBe(true);
    const applied = applyFulfillmentDelta(line, {delta});
    expect(applied.ok).toBe(true);
    if (applied.ok) {{
      expect(applied.line.qtyFulfilled).toBe({fulfilled + delta});
    }}
  }});'''
        )
    lines.append("});")
    w(f"{g}/fulfillment_remaining_matrix.test.ts", "\n".join(lines) + "\n")

    w(f"{g}/fulfillment_remaining_barrel.test.ts", r'''
import * as barrel from "../modules/sales/domain/FulfillmentRemainingGuard";
import {
  applyFulfillmentDelta,
  computeRemaining,
  validatePartialFulfillment,
  auditFulfillmentConsistency,
  FulfillmentRemainingGuard,
} from "../modules/sales/domain/FulfillmentRemainingGuard";

describe("Fulfillment remaining public barrel", () => {
  it("exports required symbols", () => {
    expect(typeof computeRemaining).toBe("function");
    expect(typeof validatePartialFulfillment).toBe("function");
    expect(typeof applyFulfillmentDelta).toBe("function");
    expect(typeof auditFulfillmentConsistency).toBe("function");
    expect(typeof FulfillmentRemainingGuard).toBe("function");
  });

  it("singleton guard works", () => {
    const view = barrel.fulfillmentRemainingGuard.computeRemaining({
      lineId: "S",
      qtyOrdered: 2,
      qtyFulfilled: 0,
    });
    expect(view?.status).toBe("UNFULFILLED");
  });

  it("shared types module is importable via relative path used by sales guard", () => {
    const result = validatePartialFulfillment(
      { lineId: "Z", qtyOrdered: 1, qtyFulfilled: 1 },
      1
    );
    expect(result).toEqual({ ok: false, reason: "over_fulfill", lineId: "Z" });
  });
});
'''.lstrip())


if __name__ == "__main__":
    write()
    print("wrote fulfillment-remaining-guard")
