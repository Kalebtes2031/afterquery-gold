export const DEFAULT_IDLE_AFTER_SECONDS = 300;
export const MIN_IDLE_AFTER_SECONDS = 30;
export const MAX_IDLE_AFTER_SECONDS = 3_600;

export const DEFAULT_DISCONNECT_AFTER_SECONDS = 900;
export const MIN_DISCONNECT_AFTER_SECONDS = 60;
export const MAX_DISCONNECT_AFTER_SECONDS = 7_200;

export const SESSION_LEASE_STATES = ["active", "idle", "disconnected"] as const;
export type SessionLeaseState = (typeof SESSION_LEASE_STATES)[number];

export const SESSION_LEASE_FAILURE_REASONS = [
  "invalid_channel",
  "invalid_nickname",
  "invalid_connection",
  "not_found",
] as const;
export type SessionLeaseFailureReason = (typeof SESSION_LEASE_FAILURE_REASONS)[number];

export interface SessionLeaseRecord {
  channelId: string;
  nickname: string;
  connectionId: string;
  state: SessionLeaseState;
  lastActiveAt: number;
  idleAt: number | null;
  disconnectedAt: number | null;
  version: number;
}

export interface SessionLeaseView extends SessionLeaseRecord {
  idleForSeconds: number | null;
  disconnectedForSeconds: number | null;
}

export interface SessionLeaseClockOptions {
  now?: number;
}

export interface TouchActivityOptions extends SessionLeaseClockOptions {
  idleAfterSeconds?: number;
  disconnectAfterSeconds?: number;
}

export interface SweepLeaseOptions extends SessionLeaseClockOptions {
  idleAfterSeconds?: number;
  disconnectAfterSeconds?: number;
}

export interface TouchActivitySuccess {
  ok: true;
  channelId: string;
  nickname: string;
  connectionId: string;
  state: "active";
  lastActiveAt: number;
  version: number;
}

export interface SessionLeaseFailure {
  ok: false;
  reason: SessionLeaseFailureReason;
  channelId?: string;
  nickname?: string;
}

export type TouchActivityResult = TouchActivitySuccess | SessionLeaseFailure;

export interface MarkStateSuccess {
  ok: true;
  channelId: string;
  nickname: string;
  connectionId: string;
  state: SessionLeaseState;
  version: number;
}

export type MarkStateResult = MarkStateSuccess | SessionLeaseFailure;

export interface SessionLeaseSweepResult {
  transitioned: number;
  nicknames: string[];
}

export interface SessionLeaseStore {
  getLease(channelId: string, nickname: string): Promise<SessionLeaseRecord | null>;
  putLease(record: SessionLeaseRecord): Promise<void>;
  deleteLease(channelId: string, nickname: string): Promise<void>;
  listLeases(channelId?: string): Promise<SessionLeaseRecord[]>;
  compareAndSetLease(
    channelId: string,
    nickname: string,
    expectedVersion: number | null,
    record: SessionLeaseRecord,
  ): Promise<boolean>;
}

export function isSessionLeaseRecord(value: unknown): value is SessionLeaseRecord {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record = value as Partial<SessionLeaseRecord>;
  const stateOk = record.state === "active" || record.state === "idle" || record.state === "disconnected";
  return (
    typeof record.channelId === "string" &&
    record.channelId.length > 0 &&
    typeof record.nickname === "string" &&
    record.nickname.length > 0 &&
    typeof record.connectionId === "string" &&
    record.connectionId.length > 0 &&
    stateOk &&
    typeof record.lastActiveAt === "number" &&
    Number.isFinite(record.lastActiveAt) &&
    (record.idleAt === null || (typeof record.idleAt === "number" && Number.isFinite(record.idleAt))) &&
    (record.disconnectedAt === null ||
      (typeof record.disconnectedAt === "number" && Number.isFinite(record.disconnectedAt))) &&
    typeof record.version === "number" &&
    Number.isFinite(record.version)
  );
}
