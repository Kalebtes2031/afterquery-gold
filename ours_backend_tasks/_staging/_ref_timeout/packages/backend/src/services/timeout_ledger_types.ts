export const DEFAULT_TIMEOUT_SECONDS = 300;
export const MIN_TIMEOUT_SECONDS = 10;
export const MAX_TIMEOUT_SECONDS = 86_400;
export const MAX_TIMEOUT_REASON_LENGTH = 80;

export const TIMEOUT_APPLY_STATUSES = ["applied", "extended", "kept"] as const;
export type TimeoutApplyStatus = (typeof TIMEOUT_APPLY_STATUSES)[number];

export const TIMEOUT_FAILURE_REASONS = [
  "invalid_channel",
  "invalid_nickname",
  "invalid_moderator",
  "not_found",
] as const;
export type TimeoutFailureReason = (typeof TIMEOUT_FAILURE_REASONS)[number];

export interface ChannelTimeoutRecord {
  channelId: string;
  nickname: string;
  moderatorId: string;
  expiresAt: number;
  reason?: string;
}

export interface ChannelTimeoutView extends ChannelTimeoutRecord {
  remainingSeconds: number;
  expired: boolean;
}

export interface TimeoutClockOptions {
  now?: number;
}

export interface ApplyChannelTimeoutOptions extends TimeoutClockOptions {
  seconds?: number;
  reason?: string;
}

export interface ListChannelTimeoutsOptions extends TimeoutClockOptions {
  includeExpired?: boolean;
}

export interface ApplyTimeoutSuccess {
  ok: true;
  status: TimeoutApplyStatus;
  channelId: string;
  nickname: string;
  moderatorId: string;
  expiresAt: number;
  remainingSeconds: number;
  reason?: string;
}

export interface TimeoutFailure {
  ok: false;
  reason: TimeoutFailureReason;
  channelId?: string;
  nickname?: string;
}

export type ApplyChannelTimeoutResult = ApplyTimeoutSuccess | TimeoutFailure;

export interface LiftTimeoutSuccess {
  ok: true;
  channelId: string;
  nickname: string;
  lifted: true;
}

export type LiftChannelTimeoutResult = LiftTimeoutSuccess | TimeoutFailure;

export interface TimedOutLookup {
  timedOut: boolean;
  remainingSeconds: number;
  record?: ChannelTimeoutView;
}

export interface TimeoutSweepResult {
  removed: number;
  channelIds: string[];
}

export interface ChannelTimeoutStore {
  getTimeout(channelId: string, nickname: string): Promise<ChannelTimeoutRecord | null>;
  putTimeout(record: ChannelTimeoutRecord): Promise<void>;
  deleteTimeout(channelId: string, nickname: string): Promise<void>;
  listTimeouts(channelId?: string): Promise<ChannelTimeoutRecord[]>;
  compareAndSetTimeout(
    channelId: string,
    nickname: string,
    expectedExpiresAt: number | null,
    record: ChannelTimeoutRecord,
  ): Promise<boolean>;
}

export function isChannelTimeoutRecord(value: unknown): value is ChannelTimeoutRecord {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<ChannelTimeoutRecord>;
  const reasonOk = record.reason === undefined || (typeof record.reason === "string" && record.reason.length > 0);
  return (
    typeof record.channelId === "string" &&
    record.channelId.length > 0 &&
    typeof record.nickname === "string" &&
    record.nickname.length > 0 &&
    typeof record.moderatorId === "string" &&
    record.moderatorId.length > 0 &&
    typeof record.expiresAt === "number" &&
    Number.isFinite(record.expiresAt) &&
    reasonOk
  );
}
