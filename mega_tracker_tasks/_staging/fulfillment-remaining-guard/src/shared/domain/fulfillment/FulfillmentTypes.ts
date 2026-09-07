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
