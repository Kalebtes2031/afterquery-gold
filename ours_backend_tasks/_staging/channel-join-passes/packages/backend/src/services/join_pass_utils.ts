import {
  DEFAULT_JOIN_PASS_TTL_SECONDS,
  MAX_JOIN_PASS_TTL_SECONDS,
  MIN_JOIN_PASS_TTL_SECONDS,
  type JoinPassFailure,
  type JoinPassFailureReason,
  type JoinPassRecord,
  type JoinPassStatus,
  type JoinPassView,
} from "#ours/backend/services/join_pass_types.ts";

export function readJoinPassClock(now?: number): number {
  if (typeof now === "number" && Number.isFinite(now)) {
    return Math.trunc(now);
  }
  return Date.now();
}

export function clampJoinPassTtl(ttlSeconds?: number): number {
  const raw =
    typeof ttlSeconds === "number" && Number.isFinite(ttlSeconds) ? ttlSeconds : DEFAULT_JOIN_PASS_TTL_SECONDS;
  return Math.min(MAX_JOIN_PASS_TTL_SECONDS, Math.max(MIN_JOIN_PASS_TTL_SECONDS, Math.trunc(raw)));
}

export function joinPassExpiry(now: number, ttlSeconds?: number): number {
  return now + clampJoinPassTtl(ttlSeconds) * 1000;
}

export function joinPassRemainingSeconds(expiresAt: number, now: number): number {
  return Math.max(0, Math.floor((expiresAt - now) / 1000));
}

export function normalizeChannelId(channelId: string): string | null {
  if (typeof channelId !== "string") {
    return null;
  }
  const trimmed = channelId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeActorId(actorId: string): string | null {
  if (typeof actorId !== "string") {
    return null;
  }
  const trimmed = actorId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizePassId(passId: string): string | null {
  if (typeof passId !== "string") {
    return null;
  }
  const trimmed = passId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeJoinPassNote(note?: string): string | undefined {
  if (typeof note !== "string") {
    return undefined;
  }
  const trimmed = note.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed.slice(0, 80);
}

export function createDefaultPassId(): string {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `pass_${hex}`;
}

export function resolveJoinPassStatus(record: JoinPassRecord, now: number): JoinPassStatus {
  if (record.revokedAt !== null) {
    return "revoked";
  }
  if (record.consumedAt !== null) {
    return "consumed";
  }
  if (record.expiresAt <= now) {
    return "expired";
  }
  return "issued";
}

export function toJoinPassView(record: JoinPassRecord, now: number): JoinPassView {
  const view: JoinPassView = {
    passId: record.passId,
    channelId: record.channelId,
    issuerId: record.issuerId,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    remainingSeconds: joinPassRemainingSeconds(record.expiresAt, now),
    status: resolveJoinPassStatus(record, now),
    consumedAt: record.consumedAt,
    consumedBy: record.consumedBy,
    revokedAt: record.revokedAt,
  };
  if (record.note !== undefined) {
    view.note = record.note;
  }
  return view;
}

export function joinPassFailure(
  reason: JoinPassFailureReason,
  extra: Omit<JoinPassFailure, "ok" | "reason"> = {},
): JoinPassFailure {
  return { ok: false, reason, ...extra };
}

export function sortJoinPassViews(views: JoinPassView[]): JoinPassView[] {
  return [...views].sort((left, right) => {
    const channelOrder = left.channelId.localeCompare(right.channelId);
    if (channelOrder !== 0) {
      return channelOrder;
    }
    return left.passId.localeCompare(right.passId);
  });
}

export function uniqueSortedIds(ids: Iterable<string>): string[] {
  return [...new Set([...ids].filter((id) => id.length > 0))].sort((left, right) => left.localeCompare(right));
}

export function isLiveIssuedPass(record: JoinPassRecord, now: number): boolean {
  return resolveJoinPassStatus(record, now) === "issued";
}
