export const MIN_MUTE_SECONDS = 10;
export const MAX_MUTE_SECONDS = 86_400;
export const MAX_MUTE_REASON_LENGTH = 80;

export const MUTE_APPLY_STATUSES = ["applied", "extended", "kept"] as const;
export type MuteApplyStatus = (typeof MUTE_APPLY_STATUSES)[number];

export const MUTE_FAILURE_REASONS = [
  "invalid_channel",
  "invalid_nickname",
  "invalid_moderator",
  "not_found",
] as const;
export type MuteFailureReason = (typeof MUTE_FAILURE_REASONS)[number];

export interface ChannelMuteRecord {
  channelId: string;
  nickname: string;
  moderatorId: string;
  /** null means a permanent mute */
  expiresAt: number | null;
  mutedAt: number;
  reason?: string;
}

export interface ChannelMuteView {
  channelId: string;
  nickname: string;
  moderatorId: string;
  expiresAt: number | null;
  mutedAt: number;
  remainingSeconds: number | null;
  permanent: boolean;
  expired: boolean;
  reason?: string;
}

export interface MuteClockOptions {
  now?: number;
}

export interface MuteUserOptions extends MuteClockOptions {
  durationSeconds?: number;
  reason?: string;
}

export interface ListChannelMutesOptions extends MuteClockOptions {
  includeExpired?: boolean;
}

export interface MuteSuccess {
  ok: true;
  status: MuteApplyStatus;
  channelId: string;
  nickname: string;
  moderatorId: string;
  expiresAt: number | null;
  remainingSeconds: number | null;
  permanent: boolean;
  reason?: string;
}

export interface MuteFailure {
  ok: false;
  reason: MuteFailureReason;
  channelId?: string;
  nickname?: string;
}

export type MuteUserResult = MuteSuccess | MuteFailure;

export interface UnmuteSuccess {
  ok: true;
  channelId: string;
  nickname: string;
  unmuted: true;
}

export type UnmuteUserResult = UnmuteSuccess | MuteFailure;

export interface MutedLookup {
  muted: boolean;
  remainingSeconds: number | null;
  permanent: boolean;
  record?: ChannelMuteView;
}

export interface MuteSweepResult {
  removed: number;
  channelIds: string[];
}

export interface ChannelMuteStore {
  getMute(channelId: string, nickname: string): Promise<ChannelMuteRecord | null>;
  putMute(record: ChannelMuteRecord): Promise<void>;
  deleteMute(channelId: string, nickname: string): Promise<void>;
  listMutes(channelId?: string): Promise<ChannelMuteRecord[]>;
  compareAndSetMute(
    channelId: string,
    nickname: string,
    expectedMutedAt: number | null,
    record: ChannelMuteRecord,
  ): Promise<boolean>;
}

export function isChannelMuteRecord(value: unknown): value is ChannelMuteRecord {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<ChannelMuteRecord>;
  const reasonOk = record.reason === undefined || (typeof record.reason === "string" && record.reason.length > 0);
  const expiresOk =
    record.expiresAt === null || (typeof record.expiresAt === "number" && Number.isFinite(record.expiresAt));
  return (
    typeof record.channelId === "string" &&
    record.channelId.length > 0 &&
    typeof record.nickname === "string" &&
    record.nickname.length > 0 &&
    typeof record.moderatorId === "string" &&
    record.moderatorId.length > 0 &&
    typeof record.mutedAt === "number" &&
    Number.isFinite(record.mutedAt) &&
    expiresOk &&
    reasonOk
  );
}
