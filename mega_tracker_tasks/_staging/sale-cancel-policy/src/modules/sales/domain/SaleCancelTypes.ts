export type SaleCancelStatus =
  | "OPEN"
  | "PARTIALLY_SHIPPED"
  | "SHIPPED"
  | "CANCELLED"
  | "COMPLETED";

export type SaleCancelPaymentMethod = "cash" | "transfer" | "partner_loan" | string;

export interface SaleCancelItemSnapshot {
  productId: string;
  qtyOrdered: number;
  qtyShipped: number;
}

export interface SaleCancelPaymentSnapshot {
  amount: number;
  method: SaleCancelPaymentMethod;
}

export interface SaleCancelShipmentSnapshot {
  qty: number;
}

export interface SaleCancelOrderSnapshot {
  orderId: string;
  status: SaleCancelStatus;
  items: SaleCancelItemSnapshot[];
  payments: SaleCancelPaymentSnapshot[];
  shipments: SaleCancelShipmentSnapshot[];
}

export interface InventoryReversalLine {
  productId: string;
  qty: number;
}

export interface SaleCancelSuccess {
  ok: true;
  canCancel: boolean;
  reasons: string[];
  inventoryReversals: InventoryReversalLine[];
  paymentReversalTotal: number;
  loanReversalTotal: number;
}

export interface SaleCancelFailure {
  ok: false;
  reason: "invalid_order";
}

export type SaleCancelDecision = SaleCancelSuccess | SaleCancelFailure;

export const CANCELABLE_STATUSES: ReadonlySet<SaleCancelStatus> = new Set([
  "OPEN",
  "PARTIALLY_SHIPPED",
]);

export const BLOCKED_STATUSES: ReadonlySet<SaleCancelStatus> = new Set([
  "SHIPPED",
  "CANCELLED",
  "COMPLETED",
]);
