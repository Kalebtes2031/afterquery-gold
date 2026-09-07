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
