import { isValidNickname } from "#ours/shared/inputValidation.ts";
import {
  DEFAULT_TIMEOUT_SECONDS,
  MAX_TIMEOUT_REASON_LENGTH,
  MAX_TIMEOUT_SECONDS,
  MIN_TIMEOUT_SECONDS,
  type ChannelTimeoutRecord,
  type ChannelTimeoutView,
  type TimeoutFailure,
  type TimeoutFailureReason,
} from "#ours/backend/services/timeout_ledger_types.ts";

export function readTimeoutClock(now?: number): number {
  if (typeof now === "number" && Number.isFinite(now)) {
    return Math.trunc(now);
  }
  return Date.now();
}

export function timeoutRemainingSeconds(expiresAt: number, now: number): number {
  return Math.max(0, Math.floor((expiresAt - now) / 1000));
}

export function isTimeoutExpired(record: ChannelTimeoutRecord, now: number): boolean {
  return record.expiresAt <= now;
}

export function clampTimeoutSeconds(seconds?: number): number {
  const raw = typeof seconds === "number" && Number.isFinite(seconds) ? seconds : DEFAULT_TIMEOUT_SECONDS;
  return Math.min(MAX_TIMEOUT_SECONDS, Math.max(MIN_TIMEOUT_SECONDS, Math.trunc(raw)));
}

export function timeoutExpiry(now: number, seconds?: number): number {
  return now + clampTimeoutSeconds(seconds) * 1000;
}

export function normalizeChannelId(channelId: string): string | null {
  if (typeof channelId !== "string") {
    return null;
  }
  const trimmed = channelId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeTimeoutNickname(nickname: string): string | null {
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

export function normalizeTimeoutReason(reason?: string): string | undefined {
  if (typeof reason !== "string") {
    return undefined;
  }
  const trimmed = reason.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed.slice(0, MAX_TIMEOUT_REASON_LENGTH);
}

export function toTimeoutView(record: ChannelTimeoutRecord, now: number): ChannelTimeoutView {
  const expired = isTimeoutExpired(record, now);
  const view: ChannelTimeoutView = {
    channelId: record.channelId,
    nickname: record.nickname,
    moderatorId: record.moderatorId,
    expiresAt: record.expiresAt,
    remainingSeconds: timeoutRemainingSeconds(record.expiresAt, now),
    expired,
  };
  if (record.reason !== undefined) {
    view.reason = record.reason;
  }
  return view;
}

export function timeoutFailure(
  reason: TimeoutFailureReason,
  extra: Omit<TimeoutFailure, "ok" | "reason"> = {},
): TimeoutFailure {
  return { ok: false, reason, ...extra };
}

export function sortTimeoutViews(views: ChannelTimeoutView[]): ChannelTimeoutView[] {
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

export function liveTimeout(record: ChannelTimeoutRecord | null, now: number): ChannelTimeoutRecord | null {
  if (!record || isTimeoutExpired(record, now)) {
    return null;
  }
  return record;
}
