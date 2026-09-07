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
