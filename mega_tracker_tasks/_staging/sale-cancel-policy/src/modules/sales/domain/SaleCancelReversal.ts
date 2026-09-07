import {
  InventoryReversalLine,
  SaleCancelItemSnapshot,
  SaleCancelPaymentSnapshot,
  SaleCancelShipmentSnapshot,
} from "./SaleCancelTypes";

export function hasPositiveShipmentQty(shipments: SaleCancelShipmentSnapshot[]): boolean {
  return shipments.some((s) => Number(s?.qty) > 0);
}

export function aggregateInventoryReversals(
  items: SaleCancelItemSnapshot[]
): InventoryReversalLine[] {
  const map = new Map<string, number>();
  for (const item of items) {
    if (!item || typeof item.productId !== "string") continue;
    const productId = item.productId.trim();
    if (!productId) continue;
    const qty = Number(item.qtyShipped);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    map.set(productId, (map.get(productId) ?? 0) + qty);
  }
  return [...map.entries()]
    .map(([productId, qty]) => ({ productId, qty }))
    .sort((a, b) => a.productId.localeCompare(b.productId));
}

export function sumPaymentTotal(payments: SaleCancelPaymentSnapshot[]): number {
  let total = 0;
  for (const payment of payments) {
    const amount = Number(payment?.amount);
    if (Number.isFinite(amount) && amount > 0) total += amount;
  }
  return roundMoney(total);
}

export function sumLoanPaymentTotal(payments: SaleCancelPaymentSnapshot[]): number {
  let total = 0;
  for (const payment of payments) {
    if (String(payment?.method ?? "").toLowerCase() !== "partner_loan") continue;
    const amount = Number(payment?.amount);
    if (Number.isFinite(amount) && amount > 0) total += amount;
  }
  return roundMoney(total);
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function inventoryReversalMap(items: SaleCancelItemSnapshot[]): Map<string, number> {
  const lines = aggregateInventoryReversals(items);
  return new Map(lines.map((line) => [line.productId, line.qty]));
}

export function paymentBreakdown(payments: SaleCancelPaymentSnapshot[]): {
  cashLike: number;
  loan: number;
  other: number;
} {
  let cashLike = 0;
  let loan = 0;
  let other = 0;
  for (const payment of payments) {
    const amount = Number(payment?.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const method = String(payment.method ?? "").toLowerCase();
    if (method === "partner_loan") loan += amount;
    else if (method === "cash" || method === "transfer") cashLike += amount;
    else other += amount;
  }
  return {
    cashLike: roundMoney(cashLike),
    loan: roundMoney(loan),
    other: roundMoney(other),
  };
}

export function shipmentHasActivity(shipments: SaleCancelShipmentSnapshot[]): boolean {
  return hasPositiveShipmentQty(shipments);
}
