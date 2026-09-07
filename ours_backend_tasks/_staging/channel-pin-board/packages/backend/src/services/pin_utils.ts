import { MAX_CHANNEL_PINS, type ChannelPinBoardRecord, type ChannelPinEntry, type ChannelPinView, type PinFailure, type PinFailureReason } from "#ours/backend/services/pin_types.ts";

export function readPinClock(now?: number): number {
  if (typeof now === "number" && Number.isFinite(now)) {
    return Math.trunc(now);
  }
  return Date.now();
}

export function normalizeChannelId(channelId: string): string | null {
  if (typeof channelId !== "string") {
    return null;
  }
  const trimmed = channelId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeMessageId(messageId: string): string | null {
  if (typeof messageId !== "string") {
    return null;
  }
  const trimmed = messageId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizePinnedBy(pinnedBy: string): string | null {
  if (typeof pinnedBy !== "string") {
    return null;
  }
  const trimmed = pinnedBy.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizePinNote(note?: string): string | undefined {
  if (typeof note !== "string") {
    return undefined;
  }
  const trimmed = note.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed.slice(0, 120);
}

export function emptyBoard(channelId: string, version = 0): ChannelPinBoardRecord {
  return { channelId, pins: [], version };
}

export function clonePinEntry(entry: ChannelPinEntry): ChannelPinEntry {
  const copy: ChannelPinEntry = {
    messageId: entry.messageId,
    pinnedBy: entry.pinnedBy,
    pinnedAt: entry.pinnedAt,
  };
  if (entry.note !== undefined) {
    copy.note = entry.note;
  }
  return copy;
}

export function cloneBoard(board: ChannelPinBoardRecord): ChannelPinBoardRecord {
  return {
    channelId: board.channelId,
    version: board.version,
    pins: board.pins.map(clonePinEntry),
  };
}

export function toPinViews(board: ChannelPinBoardRecord): ChannelPinView[] {
  return board.pins.map((entry, index) => ({
    ...clonePinEntry(entry),
    position: index,
  }));
}

export function pinFailure(
  reason: PinFailureReason,
  extra: Omit<PinFailure, "ok" | "reason"> = {},
): PinFailure {
  return { ok: false, reason, ...extra };
}

export function findPinIndex(board: ChannelPinBoardRecord, messageId: string): number {
  return board.pins.findIndex((entry) => entry.messageId === messageId);
}

export function isExactPermutation(currentIds: string[], nextIds: string[]): boolean {
  if (currentIds.length !== nextIds.length) {
    return false;
  }
  const counts = new Map<string, number>();
  for (const id of currentIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const id of nextIds) {
    const left = counts.get(id);
    if (!left) {
      return false;
    }
    if (left === 1) {
      counts.delete(id);
    } else {
      counts.set(id, left - 1);
    }
  }
  return counts.size === 0;
}

export function atPinLimit(board: ChannelPinBoardRecord): boolean {
  return board.pins.length >= MAX_CHANNEL_PINS;
}
