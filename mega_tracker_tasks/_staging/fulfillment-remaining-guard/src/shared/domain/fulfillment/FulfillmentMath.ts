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

export function formatRemainingView(view: RemainingView): string {
  return `${view.lineId} ordered=${view.qtyOrdered} fulfilled=${view.qtyFulfilled} remaining=${view.remaining} status=${view.status}`;
}

export function isPartialView(view: RemainingView): boolean {
  return view.status === "PARTIAL";
}

export function isUnfulfilledView(view: RemainingView): boolean {
  return view.status === "UNFULFILLED";
}

export function isFulfilledView(view: RemainingView): boolean {
  return view.status === "FULFILLED";
}

export function remainingPercent(view: RemainingView): number {
  if (view.qtyOrdered <= 0) return 0;
  return Math.round((view.remaining / view.qtyOrdered) * 10000) / 100;
}
