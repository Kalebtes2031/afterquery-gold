import {
  DEFAULT_TIMEOUT_SECONDS,
  MAX_TIMEOUT_REASON_LENGTH,
  MAX_TIMEOUT_SECONDS,
  MIN_TIMEOUT_SECONDS,
  type ChannelTimeoutRecord,
} from "#ours/backend/services/timeout_ledger_types.ts";

export interface TimeoutDurationPolicy {
  defaultSeconds: number;
  minSeconds: number;
  maxSeconds: number;
  maxReasonLength: number;
}

export const DEFAULT_TIMEOUT_DURATION_POLICY: TimeoutDurationPolicy = {
  defaultSeconds: DEFAULT_TIMEOUT_SECONDS,
  minSeconds: MIN_TIMEOUT_SECONDS,
  maxSeconds: MAX_TIMEOUT_SECONDS,
  maxReasonLength: MAX_TIMEOUT_REASON_LENGTH,
};

export function resolveTimeoutDuration(
  seconds: number | undefined,
  policy: TimeoutDurationPolicy = DEFAULT_TIMEOUT_DURATION_POLICY,
): number {
  const raw = typeof seconds === "number" && Number.isFinite(seconds) ? seconds : policy.defaultSeconds;
  return Math.min(policy.maxSeconds, Math.max(policy.minSeconds, Math.trunc(raw)));
}

export function shouldExtendTimeout(current: ChannelTimeoutRecord, nextExpiresAt: number): boolean {
  return nextExpiresAt > current.expiresAt;
}

export function describeTimeoutPolicy(policy: TimeoutDurationPolicy = DEFAULT_TIMEOUT_DURATION_POLICY): string {
  return `timeout ${policy.minSeconds}-${policy.maxSeconds}s (default ${policy.defaultSeconds}s); reason <= ${policy.maxReasonLength}`;
}
