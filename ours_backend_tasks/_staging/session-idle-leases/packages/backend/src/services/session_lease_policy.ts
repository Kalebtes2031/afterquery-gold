import {
  DEFAULT_DISCONNECT_AFTER_SECONDS,
  DEFAULT_IDLE_AFTER_SECONDS,
  MAX_DISCONNECT_AFTER_SECONDS,
  MAX_IDLE_AFTER_SECONDS,
  MIN_DISCONNECT_AFTER_SECONDS,
  MIN_IDLE_AFTER_SECONDS,
} from "#ours/backend/services/session_lease_types.ts";

export interface SessionLeaseTimingPolicy {
  defaultIdleAfterSeconds: number;
  minIdleAfterSeconds: number;
  maxIdleAfterSeconds: number;
  defaultDisconnectAfterSeconds: number;
  minDisconnectAfterSeconds: number;
  maxDisconnectAfterSeconds: number;
}

export const DEFAULT_SESSION_LEASE_TIMING_POLICY: SessionLeaseTimingPolicy = {
  defaultIdleAfterSeconds: DEFAULT_IDLE_AFTER_SECONDS,
  minIdleAfterSeconds: MIN_IDLE_AFTER_SECONDS,
  maxIdleAfterSeconds: MAX_IDLE_AFTER_SECONDS,
  defaultDisconnectAfterSeconds: DEFAULT_DISCONNECT_AFTER_SECONDS,
  minDisconnectAfterSeconds: MIN_DISCONNECT_AFTER_SECONDS,
  maxDisconnectAfterSeconds: MAX_DISCONNECT_AFTER_SECONDS,
};

export function describeSessionLeasePolicy(
  policy: SessionLeaseTimingPolicy = DEFAULT_SESSION_LEASE_TIMING_POLICY,
): string {
  return `idle after ${policy.minIdleAfterSeconds}-${policy.maxIdleAfterSeconds}s (default ${policy.defaultIdleAfterSeconds}s); disconnect after ${policy.minDisconnectAfterSeconds}-${policy.maxDisconnectAfterSeconds}s (default ${policy.defaultDisconnectAfterSeconds}s)`;
}

export function nextLeaseVersion(currentVersion: number): number {
  return currentVersion + 1;
}
