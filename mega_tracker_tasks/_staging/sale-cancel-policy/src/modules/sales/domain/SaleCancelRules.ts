import {
  BLOCKED_STATUSES,
  CANCELABLE_STATUSES,
  SaleCancelOrderSnapshot,
  SaleCancelStatus,
} from "./SaleCancelTypes";

export function normalizeOrderId(orderId: unknown): string | null {
  if (typeof orderId !== "string") return null;
  const trimmed = orderId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isKnownStatus(status: unknown): status is SaleCancelStatus {
  return (
    status === "OPEN" ||
    status === "PARTIALLY_SHIPPED" ||
    status === "SHIPPED" ||
    status === "CANCELLED" ||
    status === "COMPLETED"
  );
}

export function validateOrderSnapshot(
  order: SaleCancelOrderSnapshot | null | undefined
): { ok: true; orderId: string; status: SaleCancelStatus } | { ok: false; reason: "invalid_order" } {
  if (!order || typeof order !== "object") {
    return { ok: false, reason: "invalid_order" };
  }
  const orderId = normalizeOrderId(order.orderId);
  if (!orderId) {
    return { ok: false, reason: "invalid_order" };
  }
  if (!isKnownStatus(order.status)) {
    return { ok: false, reason: "invalid_order" };
  }
  if (!Array.isArray(order.items) || !Array.isArray(order.payments) || !Array.isArray(order.shipments)) {
    return { ok: false, reason: "invalid_order" };
  }
  return { ok: true, orderId, status: order.status };
}

export function statusAllowsCancel(status: SaleCancelStatus): boolean {
  if (BLOCKED_STATUSES.has(status)) return false;
  return CANCELABLE_STATUSES.has(status);
}

export function collectCancelBlockReasons(status: SaleCancelStatus): string[] {
  const reasons: string[] = [];
  if (status === "CANCELLED") reasons.push("already_cancelled");
  if (status === "COMPLETED") reasons.push("already_completed");
  if (status === "SHIPPED") reasons.push("fully_shipped");
  if (!statusAllowsCancel(status) && reasons.length === 0) {
    reasons.push("status_not_cancelable");
  }
  return reasons;
}

export function explainStatus(status: SaleCancelStatus): string {
  switch (status) {
    case "OPEN":
      return "open and cancelable";
    case "PARTIALLY_SHIPPED":
      return "partially shipped; inventory reversal may be required";
    case "SHIPPED":
      return "fully shipped; cancel blocked";
    case "CANCELLED":
      return "already cancelled";
    case "COMPLETED":
      return "already completed";
    default:
      return "unknown";
  }
}

export function isTerminalStatus(status: SaleCancelStatus): boolean {
  return status === "CANCELLED" || status === "COMPLETED";
}

export function isShippedLike(status: SaleCancelStatus): boolean {
  return status === "SHIPPED" || status === "PARTIALLY_SHIPPED";
}
