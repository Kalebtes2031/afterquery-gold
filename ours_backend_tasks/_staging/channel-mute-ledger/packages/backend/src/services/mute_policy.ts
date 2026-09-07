import {
  MAX_MUTE_REASON_LENGTH,
  MAX_MUTE_SECONDS,
  MIN_MUTE_SECONDS,
  type ChannelMuteRecord,
} from "#ours/backend/services/mute_types.ts";
import { muteEffectiveExpiry } from "#ours/backend/services/mute_utils.ts";

export interface MuteDurationPolicy {
  minSeconds: number;
  maxSeconds: number;
  maxReasonLength: number;
}

export const DEFAULT_MUTE_DURATION_POLICY: MuteDurationPolicy = {
  minSeconds: MIN_MUTE_SECONDS,
  maxSeconds: MAX_MUTE_SECONDS,
  maxReasonLength: MAX_MUTE_REASON_LENGTH,
};

export function resolveTimedMuteSeconds(
  durationSeconds: number,
  policy: MuteDurationPolicy = DEFAULT_MUTE_DURATION_POLICY,
): number {
  return Math.min(policy.maxSeconds, Math.max(policy.minSeconds, Math.trunc(durationSeconds)));
}

export function shouldExtendMute(current: ChannelMuteRecord, nextExpiresAt: number | null): boolean {
  const nextRank = nextExpiresAt === null ? Number.POSITIVE_INFINITY : nextExpiresAt;
  return nextRank > muteEffectiveExpiry(current);
}

export function describeMutePolicy(policy: MuteDurationPolicy = DEFAULT_MUTE_DURATION_POLICY): string {
  return `mute timed ${policy.minSeconds}-${policy.maxSeconds}s or permanent; reason <= ${policy.maxReasonLength}`;
}
