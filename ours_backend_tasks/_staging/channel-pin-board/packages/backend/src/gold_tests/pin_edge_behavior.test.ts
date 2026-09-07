import { describe, expect, it } from "vitest";
import {
  ChannelPinBoard,
  MemoryChannelPinStore,
  createChannelPinBoard,
} from "#ours/backend/services/pins.ts";

const NOW = 1_700_000_000_000;

describe("Channel pin extra edges", () => {
  it("keeps colons inside a trimmed channel id", async () => {
    const pins = createChannelPinBoard(new MemoryChannelPinStore());
    const result = await pins.pinMessage("  team:west  ", "msg-1", "mod-1", { now: NOW });
    expect(result).toMatchObject({ ok: true, channelId: "team:west" });
  });

  it("trims a note before storing it", async () => {
    const pins = createChannelPinBoard(new MemoryChannelPinStore());
    const result = await pins.pinMessage("room-1", "msg-1", "mod-1", {
      now: NOW,
      note: "  highlight  ",
    });
    expect(result).toMatchObject({ note: "highlight" });
  });

  it("can pin again after clearing the board", async () => {
    const pins = createChannelPinBoard(new MemoryChannelPinStore());
    await pins.pinMessage("room-1", "msg-1", "mod-1", { now: NOW });
    await pins.clearPins("room-1");
    const result = await pins.pinMessage("room-1", "msg-2", "mod-1", { now: NOW + 10 });
    expect(result).toMatchObject({ ok: true, status: "pinned", position: 0 });
  });

  it("can pin again after unpinning the only message", async () => {
    const pins = createChannelPinBoard(new MemoryChannelPinStore());
    await pins.pinMessage("room-1", "msg-1", "mod-1", { now: NOW });
    await pins.unpinMessage("room-1", "msg-1");
    const result = await pins.pinMessage("room-1", "msg-1", "mod-2", { now: NOW + 5 });
    expect(result).toMatchObject({ ok: true, status: "pinned", pinnedBy: "mod-2", position: 0 });
  });

  it("preserves message id case across refresh", async () => {
    const pins = createChannelPinBoard(new MemoryChannelPinStore());
    await pins.pinMessage("room-1", "MsgCase", "mod-1", { now: NOW });
    const result = await pins.pinMessage("room-1", "  MsgCase  ", "mod-2", { now: NOW + 1 });
    expect(result).toMatchObject({ status: "refreshed", messageId: "MsgCase" });
  });

  it("returns an empty list after every pin is unpinned", async () => {
    const pins = createChannelPinBoard(new MemoryChannelPinStore());
    await pins.pinMessage("room-1", "a", "mod-1", { now: NOW });
    await pins.pinMessage("room-1", "b", "mod-1", { now: NOW + 1 });
    await pins.unpinMessage("room-1", "a");
    await pins.unpinMessage("room-1", "b");
    await expect(pins.listPins("room-1")).resolves.toEqual([]);
  });

  it("accepts a single-item reorder as a no-op permutation", async () => {
    const pins = createChannelPinBoard(new MemoryChannelPinStore());
    await pins.pinMessage("room-1", "only", "mod-1", { now: NOW });
    await expect(pins.reorderPins("room-1", ["only"])).resolves.toMatchObject({
      ok: true,
      messageIds: ["only"],
    });
  });

  it("can construct the board through createChannelPinBoard", async () => {
    const store = new MemoryChannelPinStore();
    const pins = createChannelPinBoard(store);
    expect(pins).toBeInstanceOf(ChannelPinBoard);
    await expect(pins.listPins("room-1")).resolves.toEqual([]);
  });

  it("rejects a reorder that includes blank message ids", async () => {
    const pins = createChannelPinBoard(new MemoryChannelPinStore());
    await pins.pinMessage("room-1", "a", "mod-1", { now: NOW });
    await pins.pinMessage("room-1", "b", "mod-1", { now: NOW + 1 });
    await expect(pins.reorderPins("room-1", ["a", "  "])).resolves.toMatchObject({
      reason: "invalid_order",
    });
  });
});
