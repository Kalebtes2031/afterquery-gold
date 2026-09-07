export const DEFAULT_JOIN_PASS_TTL_SECONDS = 120;
export const MIN_JOIN_PASS_TTL_SECONDS = 30;
export const MAX_JOIN_PASS_TTL_SECONDS = 600;

export const JOIN_PASS_STATUSES = ["issued", "consumed", "revoked", "expired"] as const;
export type JoinPassStatus = (typeof JOIN_PASS_STATUSES)[number];

export const JOIN_PASS_FAILURE_REASONS = [
  "invalid_channel",
  "invalid_issuer",
  "invalid_pass",
  "invalid_consumer",
  "not_found",
  "expired",
  "already_consumed",
  "issuer_mismatch",
] as const;
export type JoinPassFailureReason = (typeof JOIN_PASS_FAILURE_REASONS)[number];

export interface JoinPassRecord {
  passId: string;
  channelId: string;
  issuerId: string;
  createdAt: number;
  expiresAt: number;
  consumedAt: number | null;
  consumedBy: string | null;
  revokedAt: number | null;
  note?: string;
}

export interface JoinPassView {
  passId: string;
  channelId: string;
  issuerId: string;
  createdAt: number;
  expiresAt: number;
  remainingSeconds: number;
  status: JoinPassStatus;
  consumedAt: number | null;
  consumedBy: string | null;
  revokedAt: number | null;
  note?: string;
}

export interface JoinPassClockOptions {
  now?: number;
}

export interface IssueJoinPassOptions extends JoinPassClockOptions {
  ttlSeconds?: number;
  note?: string;
  /** injectable id factory for tests; default is pass_ + 16 hex */
  createPassId?: () => string;
}

export interface IssueJoinPassSuccess {
  ok: true;
  passId: string;
  channelId: string;
  issuerId: string;
  createdAt: number;
  expiresAt: number;
  remainingSeconds: number;
  note?: string;
}

export interface JoinPassFailure {
  ok: false;
  reason: JoinPassFailureReason;
  channelId?: string;
  passId?: string;
}

export type IssueJoinPassResult = IssueJoinPassSuccess | JoinPassFailure;

export interface ConsumeJoinPassSuccess {
  ok: true;
  passId: string;
  channelId: string;
  consumedBy: string;
  consumedAt: number;
}

export type ConsumeJoinPassResult = ConsumeJoinPassSuccess | JoinPassFailure;

export interface RevokeJoinPassSuccess {
  ok: true;
  passId: string;
  channelId: string;
  revoked: true;
}

export type RevokeJoinPassResult = RevokeJoinPassSuccess | JoinPassFailure;

export interface JoinPassSweepResult {
  removed: number;
  passIds: string[];
}

export interface JoinPassStore {
  getPass(passId: string): Promise<JoinPassRecord | null>;
  putPass(record: JoinPassRecord): Promise<void>;
  deletePass(passId: string): Promise<void>;
  listPasses(channelId?: string): Promise<JoinPassRecord[]>;
  compareAndSetPass(
    passId: string,
    expectedConsumedAt: number | null,
    expectedRevokedAt: number | null,
    expectExists: boolean,
    record: JoinPassRecord,
  ): Promise<boolean>;
}

export function isJoinPassRecord(value: unknown): value is JoinPassRecord {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const record = value as Partial<JoinPassRecord>;
  const noteOk = record.note === undefined || (typeof record.note === "string" && record.note.length > 0);
  return (
    typeof record.passId === "string" &&
    record.passId.length > 0 &&
    typeof record.channelId === "string" &&
    record.channelId.length > 0 &&
    typeof record.issuerId === "string" &&
    record.issuerId.length > 0 &&
    typeof record.createdAt === "number" &&
    Number.isFinite(record.createdAt) &&
    typeof record.expiresAt === "number" &&
    Number.isFinite(record.expiresAt) &&
    (record.consumedAt === null || (typeof record.consumedAt === "number" && Number.isFinite(record.consumedAt))) &&
    (record.consumedBy === null || (typeof record.consumedBy === "string" && record.consumedBy.length > 0)) &&
    (record.revokedAt === null || (typeof record.revokedAt === "number" && Number.isFinite(record.revokedAt))) &&
    noteOk
  );
}
