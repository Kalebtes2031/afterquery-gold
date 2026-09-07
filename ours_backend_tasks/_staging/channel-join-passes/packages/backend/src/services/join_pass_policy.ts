import {
  DEFAULT_JOIN_PASS_TTL_SECONDS,
  MAX_JOIN_PASS_TTL_SECONDS,
  MIN_JOIN_PASS_TTL_SECONDS,
} from "#ours/backend/services/join_pass_types.ts";

export interface JoinPassTtlPolicy {
  defaultSeconds: number;
  minSeconds: number;
  maxSeconds: number;
}

export const DEFAULT_JOIN_PASS_TTL_POLICY: JoinPassTtlPolicy = {
  defaultSeconds: DEFAULT_JOIN_PASS_TTL_SECONDS,
  minSeconds: MIN_JOIN_PASS_TTL_SECONDS,
  maxSeconds: MAX_JOIN_PASS_TTL_SECONDS,
};

export function resolveJoinPassTtl(
  ttlSeconds: number | undefined,
  policy: JoinPassTtlPolicy = DEFAULT_JOIN_PASS_TTL_POLICY,
): number {
  const raw = typeof ttlSeconds === "number" && Number.isFinite(ttlSeconds) ? ttlSeconds : policy.defaultSeconds;
  return Math.min(policy.maxSeconds, Math.max(policy.minSeconds, Math.trunc(raw)));
}

export function describeJoinPassPolicy(policy: JoinPassTtlPolicy = DEFAULT_JOIN_PASS_TTL_POLICY): string {
  return `join pass ttl ${policy.minSeconds}-${policy.maxSeconds}s (default ${policy.defaultSeconds}s)`;
}

export function isValidPassIdShape(passId: string): boolean {
  return /^pass_[0-9a-f]{16}$/.test(passId);
}
