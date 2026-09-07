export const MAX_CHANNEL_PINS = 10;

export const PIN_STATUSES = ["pinned", "refreshed"] as const;
export type PinStatus = (typeof PIN_STATUSES)[number];

export const PIN_FAILURE_REASONS = [
  "invalid_channel",
  "invalid_message",
  "invalid_actor",
  "pin_limit",
  "not_found",
  "invalid_order",
  "version_conflict",
] as const;
export type PinFailureReason = (typeof PIN_FAILURE_REASONS)[number];

export interface ChannelPinEntry {
  messageId: string;
  pinnedBy: string;
  pinnedAt: number;
  note?: string;
}

export interface ChannelPinBoardRecord {
  channelId: string;
  pins: ChannelPinEntry[];
  version: number;
}

export interface ChannelPinView extends ChannelPinEntry {
  position: number;
}

export interface PinClockOptions {
  now?: number;
}

export interface PinMessageOptions extends PinClockOptions {
  note?: string;
}

export interface PinSuccess {
  ok: true;
  status: PinStatus;
  channelId: string;
  messageId: string;
  pinnedBy: string;
  pinnedAt: number;
  position: number;
  version: number;
  note?: string;
}

export interface PinFailure {
  ok: false;
  reason: PinFailureReason;
  channelId?: string;
  messageId?: string;
}

export type PinMessageResult = PinSuccess | PinFailure;

export interface UnpinSuccess {
  ok: true;
  channelId: string;
  messageId: string;
  unpinned: true;
  version: number;
}

export type UnpinMessageResult = UnpinSuccess | PinFailure;

export interface ReorderPinsSuccess {
  ok: true;
  channelId: string;
  messageIds: string[];
  version: number;
}

export type ReorderPinsResult = ReorderPinsSuccess | PinFailure;

export interface ClearPinsSuccess {
  ok: true;
  channelId: string;
  cleared: number;
  version: number;
}

export type ClearPinsResult = ClearPinsSuccess | PinFailure;

export interface ChannelPinStore {
  getBoard(channelId: string): Promise<ChannelPinBoardRecord | null>;
  putBoard(board: ChannelPinBoardRecord): Promise<void>;
  compareAndSetBoard(
    channelId: string,
    expectedVersion: number | null,
    board: ChannelPinBoardRecord,
  ): Promise<boolean>;
}

export function isChannelPinEntry(value: unknown): value is ChannelPinEntry {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const entry = value as Partial<ChannelPinEntry>;
  const noteOk = entry.note === undefined || (typeof entry.note === "string" && entry.note.length > 0);
  return (
    typeof entry.messageId === "string" &&
    entry.messageId.length > 0 &&
    typeof entry.pinnedBy === "string" &&
    entry.pinnedBy.length > 0 &&
    typeof entry.pinnedAt === "number" &&
    Number.isFinite(entry.pinnedAt) &&
    noteOk
  );
}

export function isChannelPinBoardRecord(value: unknown): value is ChannelPinBoardRecord {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const board = value as Partial<ChannelPinBoardRecord>;
  return (
    typeof board.channelId === "string" &&
    board.channelId.length > 0 &&
    typeof board.version === "number" &&
    Number.isFinite(board.version) &&
    Array.isArray(board.pins) &&
    board.pins.every(isChannelPinEntry)
  );
}
