import { createMemoryChannelPinStore } from "#ours/backend/services/pin_store.ts";
import type {
  ChannelPinBoardRecord,
  ChannelPinEntry,
  ChannelPinStore,
  ChannelPinView,
  ClearPinsResult,
  PinClockOptions,
  PinMessageOptions,
  PinMessageResult,
  ReorderPinsResult,
  UnpinMessageResult,
} from "#ours/backend/services/pin_types.ts";
import {
  atPinLimit,
  emptyBoard,
  findPinIndex,
  isExactPermutation,
  normalizeChannelId,
  normalizeMessageId,
  normalizePinNote,
  normalizePinnedBy,
  pinFailure,
  readPinClock,
  toPinViews,
} from "#ours/backend/services/pin_utils.ts";
import { nextBoardVersion } from "#ours/backend/services/pin_policy.ts";

export class ChannelPinBoard {
  private readonly store: ChannelPinStore;

  constructor(store: ChannelPinStore = createMemoryChannelPinStore()) {
    this.store = store;
  }

  private async loadBoard(channel: string): Promise<{
    stored: ChannelPinBoardRecord | null;
    current: ChannelPinBoardRecord;
    expectedVersion: number | null;
  }> {
    const stored = await this.store.getBoard(channel);
    if (stored) {
      return { stored, current: stored, expectedVersion: stored.version };
    }
    return { stored: null, current: emptyBoard(channel, 0), expectedVersion: null };
  }

  async pinMessage(
    channelId: string,
    messageId: string,
    pinnedBy: string,
    options: PinMessageOptions = {},
  ): Promise<PinMessageResult> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return pinFailure("invalid_channel");
    }

    const message = normalizeMessageId(messageId);
    if (!message) {
      return pinFailure("invalid_message", { channelId: channel });
    }

    const actor = normalizePinnedBy(pinnedBy);
    if (!actor) {
      return pinFailure("invalid_actor", { channelId: channel, messageId: message });
    }

    const now = readPinClock(options.now);
    const note = normalizePinNote(options.note);
    const { current, expectedVersion } = await this.loadBoard(channel);
    const existingIndex = findPinIndex(current, message);

    const entry: ChannelPinEntry = {
      messageId: message,
      pinnedBy: actor,
      pinnedAt: now,
    };
    if (note !== undefined) {
      entry.note = note;
    }

    if (existingIndex >= 0) {
      const next: ChannelPinBoardRecord = {
        channelId: channel,
        pins: current.pins.map((pin, index) => (index === existingIndex ? entry : pin)),
        version: nextBoardVersion(current.version),
      };
      const swapped = await this.store.compareAndSetBoard(channel, expectedVersion, next);
      if (!swapped) {
        return this.pinMessage(channelId, messageId, pinnedBy, options);
      }
      return {
        ok: true,
        status: "refreshed",
        channelId: channel,
        messageId: message,
        pinnedBy: actor,
        pinnedAt: now,
        position: existingIndex,
        version: next.version,
        ...(note !== undefined ? { note } : {}),
      };
    }

    if (atPinLimit(current)) {
      return pinFailure("pin_limit", { channelId: channel, messageId: message });
    }

    const next: ChannelPinBoardRecord = {
      channelId: channel,
      pins: [...current.pins, entry],
      version: nextBoardVersion(current.version),
    };

    const created = await this.store.compareAndSetBoard(channel, expectedVersion, next);
    if (!created) {
      return this.pinMessage(channelId, messageId, pinnedBy, options);
    }

    return {
      ok: true,
      status: "pinned",
      channelId: channel,
      messageId: message,
      pinnedBy: actor,
      pinnedAt: now,
      position: next.pins.length - 1,
      version: next.version,
      ...(note !== undefined ? { note } : {}),
    };
  }

  async unpinMessage(
    channelId: string,
    messageId: string,
    options: PinClockOptions = {},
  ): Promise<UnpinMessageResult> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return pinFailure("invalid_channel");
    }

    const message = normalizeMessageId(messageId);
    if (!message) {
      return pinFailure("invalid_message", { channelId: channel });
    }

    void options;
    const current = await this.store.getBoard(channel);
    if (!current) {
      return pinFailure("not_found", { channelId: channel, messageId: message });
    }

    const index = findPinIndex(current, message);
    if (index < 0) {
      return pinFailure("not_found", { channelId: channel, messageId: message });
    }

    const next: ChannelPinBoardRecord = {
      channelId: channel,
      pins: current.pins.filter((_, i) => i !== index),
      version: nextBoardVersion(current.version),
    };

    const swapped = await this.store.compareAndSetBoard(channel, current.version, next);
    if (!swapped) {
      return this.unpinMessage(channelId, messageId, options);
    }

    return {
      ok: true,
      channelId: channel,
      messageId: message,
      unpinned: true,
      version: next.version,
    };
  }

  async reorderPins(
    channelId: string,
    messageIds: string[],
    options: PinClockOptions = {},
  ): Promise<ReorderPinsResult> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return pinFailure("invalid_channel");
    }

    void options;
    const current = await this.store.getBoard(channel);
    if (!current) {
      return pinFailure("not_found", { channelId: channel });
    }

    const currentIds = current.pins.map((pin) => pin.messageId);
    const normalizedIds = messageIds.map((id) => (typeof id === "string" ? id.trim() : ""));
    if (normalizedIds.some((id) => id.length === 0) || !isExactPermutation(currentIds, normalizedIds)) {
      return pinFailure("invalid_order", { channelId: channel });
    }

    const byId = new Map(current.pins.map((pin) => [pin.messageId, pin]));
    const next: ChannelPinBoardRecord = {
      channelId: channel,
      pins: normalizedIds.map((id) => byId.get(id)!),
      version: nextBoardVersion(current.version),
    };

    const swapped = await this.store.compareAndSetBoard(channel, current.version, next);
    if (!swapped) {
      return this.reorderPins(channelId, messageIds, options);
    }

    return {
      ok: true,
      channelId: channel,
      messageIds: normalizedIds,
      version: next.version,
    };
  }

  async listPins(channelId: string): Promise<ChannelPinView[]> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return [];
    }
    const board = await this.store.getBoard(channel);
    return board ? toPinViews(board) : [];
  }

  async getPin(channelId: string, messageId: string): Promise<ChannelPinView | null> {
    const channel = normalizeChannelId(channelId);
    const message = normalizeMessageId(messageId);
    if (!channel || !message) {
      return null;
    }
    const board = await this.store.getBoard(channel);
    if (!board) {
      return null;
    }
    const index = findPinIndex(board, message);
    if (index < 0) {
      return null;
    }
    const entry = board.pins[index]!;
    return { ...entry, position: index };
  }

  async clearPins(channelId: string, options: PinClockOptions = {}): Promise<ClearPinsResult> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return pinFailure("invalid_channel");
    }

    void options;
    const current = await this.store.getBoard(channel);
    if (!current) {
      return { ok: true, channelId: channel, cleared: 0, version: 0 };
    }

    const cleared = current.pins.length;
    const next = emptyBoard(channel, nextBoardVersion(current.version));
    const swapped = await this.store.compareAndSetBoard(channel, current.version, next);
    if (!swapped) {
      return this.clearPins(channelId, options);
    }

    return { ok: true, channelId: channel, cleared, version: next.version };
  }
}

export function createChannelPinBoard(store?: ChannelPinStore): ChannelPinBoard {
  return new ChannelPinBoard(store ?? createMemoryChannelPinStore());
}

export async function pinMessage(
  channelId: string,
  messageId: string,
  pinnedBy: string,
  options: PinMessageOptions = {},
  store?: ChannelPinStore,
): Promise<PinMessageResult> {
  return createChannelPinBoard(store).pinMessage(channelId, messageId, pinnedBy, options);
}

export async function unpinMessage(
  channelId: string,
  messageId: string,
  options: PinClockOptions = {},
  store?: ChannelPinStore,
): Promise<UnpinMessageResult> {
  return createChannelPinBoard(store).unpinMessage(channelId, messageId, options);
}

export async function reorderPins(
  channelId: string,
  messageIds: string[],
  options: PinClockOptions = {},
  store?: ChannelPinStore,
): Promise<ReorderPinsResult> {
  return createChannelPinBoard(store).reorderPins(channelId, messageIds, options);
}

export async function listPins(channelId: string, store?: ChannelPinStore): Promise<ChannelPinView[]> {
  return createChannelPinBoard(store).listPins(channelId);
}

export async function getPin(
  channelId: string,
  messageId: string,
  store?: ChannelPinStore,
): Promise<ChannelPinView | null> {
  return createChannelPinBoard(store).getPin(channelId, messageId);
}

export async function clearPins(
  channelId: string,
  options: PinClockOptions = {},
  store?: ChannelPinStore,
): Promise<ClearPinsResult> {
  return createChannelPinBoard(store).clearPins(channelId, options);
}
