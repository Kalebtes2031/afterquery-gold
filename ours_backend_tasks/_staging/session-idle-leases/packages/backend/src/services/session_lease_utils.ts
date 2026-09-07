import { isValidNickname } from "#ours/shared/inputValidation.ts";
import {
  DEFAULT_DISCONNECT_AFTER_SECONDS,
  DEFAULT_IDLE_AFTER_SECONDS,
  MAX_DISCONNECT_AFTER_SECONDS,
  MAX_IDLE_AFTER_SECONDS,
  MIN_DISCONNECT_AFTER_SECONDS,
  MIN_IDLE_AFTER_SECONDS,
  type SessionLeaseFailure,
  type SessionLeaseFailureReason,
  type SessionLeaseRecord,
  type SessionLeaseView,
} from "#ours/backend/services/session_lease_types.ts";

export function readSessionLeaseClock(now?: number): number {
  if (typeof now === "number" && Number.isFinite(now)) {
    return Math.trunc(now);
  }
  return Date.now();
}

export function clampIdleAfterSeconds(seconds?: number): number {
  const raw =
    typeof seconds === "number" && Number.isFinite(seconds) ? seconds : DEFAULT_IDLE_AFTER_SECONDS;
  return Math.min(MAX_IDLE_AFTER_SECONDS, Math.max(MIN_IDLE_AFTER_SECONDS, Math.trunc(raw)));
}

export function clampDisconnectAfterSeconds(seconds?: number): number {
  const raw =
    typeof seconds === "number" && Number.isFinite(seconds) ? seconds : DEFAULT_DISCONNECT_AFTER_SECONDS;
  return Math.min(MAX_DISCONNECT_AFTER_SECONDS, Math.max(MIN_DISCONNECT_AFTER_SECONDS, Math.trunc(raw)));
}

export function normalizeChannelId(channelId: string): string | null {
  if (typeof channelId !== "string") {
    return null;
  }
  const trimmed = channelId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeLeaseNickname(nickname: string): string | null {
  if (typeof nickname !== "string") {
    return null;
  }
  const trimmed = nickname.trim();
  if (!isValidNickname(trimmed)) {
    return null;
  }
  return trimmed.normalize("NFC").toLowerCase();
}

export function normalizeConnectionId(connectionId: string): string | null {
  if (typeof connectionId !== "string") {
    return null;
  }
  const trimmed = connectionId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function sessionLeaseFailure(
  reason: SessionLeaseFailureReason,
  extra: Omit<SessionLeaseFailure, "ok" | "reason"> = {},
): SessionLeaseFailure {
  return { ok: false, reason, ...extra };
}

export function toSessionLeaseView(record: SessionLeaseRecord, now: number): SessionLeaseView {
  const idleForSeconds =
    record.idleAt === null ? null : Math.max(0, Math.floor((now - record.idleAt) / 1000));
  const disconnectedForSeconds =
    record.disconnectedAt === null
      ? null
      : Math.max(0, Math.floor((now - record.disconnectedAt) / 1000));
  return {
    channelId: record.channelId,
    nickname: record.nickname,
    connectionId: record.connectionId,
    state: record.state,
    lastActiveAt: record.lastActiveAt,
    idleAt: record.idleAt,
    disconnectedAt: record.disconnectedAt,
    version: record.version,
    idleForSeconds,
    disconnectedForSeconds,
  };
}

export function sortLeaseViews(views: SessionLeaseView[]): SessionLeaseView[] {
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

export function cloneLease(record: SessionLeaseRecord): SessionLeaseRecord {
  return {
    channelId: record.channelId,
    nickname: record.nickname,
    connectionId: record.connectionId,
    state: record.state,
    lastActiveAt: record.lastActiveAt,
    idleAt: record.idleAt,
    disconnectedAt: record.disconnectedAt,
    version: record.version,
  };
}

export function shouldMarkIdle(record: SessionLeaseRecord, now: number, idleAfterSeconds: number): boolean {
  if (record.state !== "active") {
    return false;
  }
  return now - record.lastActiveAt >= idleAfterSeconds * 1000;
}

export function shouldMarkDisconnected(
  record: SessionLeaseRecord,
  now: number,
  disconnectAfterSeconds: number,
): boolean {
  if (record.state !== "idle" || record.idleAt === null) {
    return false;
  }
  return now - record.idleAt >= disconnectAfterSeconds * 1000;
}
