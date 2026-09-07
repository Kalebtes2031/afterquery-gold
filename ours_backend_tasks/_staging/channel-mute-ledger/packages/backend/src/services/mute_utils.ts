import { isValidNickname } from "#ours/shared/inputValidation.ts";
import {
  MAX_MUTE_REASON_LENGTH,
  MAX_MUTE_SECONDS,
  MIN_MUTE_SECONDS,
  type ChannelMuteRecord,
  type ChannelMuteView,
  type MuteFailure,
  type MuteFailureReason,
} from "#ours/backend/services/mute_types.ts";

export function readMuteClock(now?: number): number {
  if (typeof now === "number" && Number.isFinite(now)) {
    return Math.trunc(now);
  }
  return Date.now();
}

export function isPermanentMute(record: ChannelMuteRecord): boolean {
  return record.expiresAt === null;
}

export function isMuteExpired(record: ChannelMuteRecord, now: number): boolean {
  if (record.expiresAt === null) {
    return false;
  }
  return record.expiresAt <= now;
}

export function muteRemainingSeconds(expiresAt: number | null, now: number): number | null {
  if (expiresAt === null) {
    return null;
  }
  return Math.max(0, Math.floor((expiresAt - now) / 1000));
}

/** Missing or non-finite duration means permanent (null). Finite values are truncated and clamped. */
export function resolveMuteExpiry(now: number, durationSeconds?: number): number | null {
  if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds)) {
    return null;
  }
  const seconds = Math.min(MAX_MUTE_SECONDS, Math.max(MIN_MUTE_SECONDS, Math.trunc(durationSeconds)));
  return now + seconds * 1000;
}

export function normalizeChannelId(channelId: string): string | null {
  if (typeof channelId !== "string") {
    return null;
  }
  const trimmed = channelId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeMuteNickname(nickname: string): string | null {
  if (typeof nickname !== "string") {
    return null;
  }
  const trimmed = nickname.trim();
  if (!isValidNickname(trimmed)) {
    return null;
  }
  return trimmed.normalize("NFC").toLowerCase();
}

export function normalizeModeratorId(moderatorId: string): string | null {
  if (typeof moderatorId !== "string") {
    return null;
  }
  const trimmed = moderatorId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeMuteReason(reason?: string): string | undefined {
  if (typeof reason !== "string") {
    return undefined;
  }
  const trimmed = reason.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed.slice(0, MAX_MUTE_REASON_LENGTH);
}

export function toMuteView(record: ChannelMuteRecord, now: number): ChannelMuteView {
  const permanent = isPermanentMute(record);
  const expired = isMuteExpired(record, now);
  const view: ChannelMuteView = {
    channelId: record.channelId,
    nickname: record.nickname,
    moderatorId: record.moderatorId,
    expiresAt: record.expiresAt,
    mutedAt: record.mutedAt,
    remainingSeconds: muteRemainingSeconds(record.expiresAt, now),
    permanent,
    expired,
  };
  if (record.reason !== undefined) {
    view.reason = record.reason;
  }
  return view;
}

export function muteFailure(
  reason: MuteFailureReason,
  extra: Omit<MuteFailure, "ok" | "reason"> = {},
): MuteFailure {
  return { ok: false, reason, ...extra };
}

export function sortMuteViews(views: ChannelMuteView[]): ChannelMuteView[] {
  return [...views].sort((left, right) => {
    const channelOrder = left.channelId.localeCompare(right.channelId);
    if (channelOrder !== 0) {
      return channelOrder;
    }
    return left.nickname.localeCompare(right.nickname);
  });
}

export function uniqueSortedIds(ids: Iterable<string>): string[] {
  return [...new Set([...ids].filter((id) => id.length > 0))].sort((left, right) => left.localeCompare(right));
}

export function liveMute(record: ChannelMuteRecord | null, now: number): ChannelMuteRecord | null {
  if (!record || isMuteExpired(record, now)) {
    return null;
  }
  return record;
}

/** Effective ranking for extend comparisons: permanent outranks any timed expiry. */
export function muteEffectiveExpiry(record: ChannelMuteRecord): number {
  return record.expiresAt === null ? Number.POSITIVE_INFINITY : record.expiresAt;
}
