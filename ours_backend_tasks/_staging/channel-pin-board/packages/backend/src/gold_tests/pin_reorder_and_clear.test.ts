import { describe, expect, it } from "vitest";
import {
  ChannelPinBoard,
  MemoryChannelPinStore,
  clearPins,
  reorderPins,
} from "#ours/backend/services/pins.ts";

const NOW = 1_700_000_000_000;

const board = () => new ChannelPinBoard(new MemoryChannelPinStore());

describe("Channel pin reorder and clear", () => {
  it("reorders pins when given an exact permutation", async () => {
    const pins = board();
    await pins.pinMessage("room-1", "a", "mod-1", { now: NOW });
    await pins.pinMessage("room-1", "b", "mod-1", { now: NOW + 1 });
    await pins.pinMessage("room-1", "c", "mod-1", { now: NOW + 2 });
    await expect(pins.reorderPins("room-1", ["c", "a", "b"])).resolves.toEqual({
      ok: true,
      channelId: "room-1",
      messageIds: ["c", "a", "b"],
      version: 4,
    });
    await expect(pins.listPins("room-1")).resolves.toMatchObject([
      { messageId: "c", position: 0 },
      { messageId: "a", position: 1 },
      { messageId: "b", position: 2 },
    ]);
  });

  it("rejects reorder when the list is missing an id", async () => {
    const pins = board();
    await pins.pinMessage("room-1", "a", "mod-1", { now: NOW });
    await pins.pinMessage("room-1", "b", "mod-1", { now: NOW + 1 });
    await expect(pins.reorderPins("room-1", ["a"])).resolves.toEqual({
      ok: false,
      reason: "invalid_order",
      channelId: "room-1",
    });
  });

  it("rejects reorder when the list includes an unknown id", async () => {
    const pins = board();
    await pins.pinMessage("room-1", "a", "mod-1", { now: NOW });
    await pins.pinMessage("room-1", "b", "mod-1", { now: NOW + 1 });
    await expect(pins.reorderPins("room-1", ["a", "x"])).resolves.toEqual({
      ok: false,
      reason: "invalid_order",
      channelId: "room-1",
    });
  });

  it("rejects reorder when the list duplicates an id", async () => {
    const pins = board();
    await pins.pinMessage("room-1", "a", "mod-1", { now: NOW });
    await pins.pinMessage("room-1", "b", "mod-1", { now: NOW + 1 });
    await expect(pins.reorderPins("room-1", ["a", "a"])).resolves.toEqual({
      ok: false,
      reason: "invalid_order",
      channelId: "room-1",
    });
  });

  it("rejects reorder for an empty channel board", async () => {
    await expect(board().reorderPins("room-1", [])).resolves.toEqual({
      ok: false,
      reason: "not_found",
      channelId: "room-1",
    });
  });

  it("rejects reorder for an invalid channel id", async () => {
    await expect(board().reorderPins("  ", ["a"])).resolves.toEqual({
      ok: false,
      reason: "invalid_channel",
    });
  });

  it("trims message ids before validating a reorder permutation", async () => {
    const pins = board();
    await pins.pinMessage("room-1", "a", "mod-1", { now: NOW });
    await pins.pinMessage("room-1", "b", "mod-1", { now: NOW + 1 });
    await expect(pins.reorderPins("room-1", ["  b  ", " a "])).resolves.toMatchObject({
      ok: true,
      messageIds: ["b", "a"],
    });
  });

  it("clears every pin on a channel and reports the count", async () => {
    const pins = board();
    await pins.pinMessage("room-1", "a", "mod-1", { now: NOW });
    await pins.pinMessage("room-1", "b", "mod-1", { now: NOW + 1 });
    await expect(pins.clearPins("room-1")).resolves.toEqual({
      ok: true,
      channelId: "room-1",
      cleared: 2,
      version: 3,
    });
    await expect(pins.listPins("room-1")).resolves.toEqual([]);
  });

  it("clears an empty channel without error", async () => {
    await expect(board().clearPins("room-1")).resolves.toEqual({
      ok: true,
      channelId: "room-1",
      cleared: 0,
      version: 0,
    });
  });

  it("rejects clear for an invalid channel id", async () => {
    await expect(board().clearPins("   ")).resolves.toEqual({
      ok: false,
      reason: "invalid_channel",
    });
  });

  it("supports the reorder and clear convenience functions", async () => {
    const store = new MemoryChannelPinStore();
    const pins = new ChannelPinBoard(store);
    await pins.pinMessage("room-1", "a", "mod-1", { now: NOW });
    await pins.pinMessage("room-1", "b", "mod-1", { now: NOW + 1 });
    await expect(reorderPins("room-1", ["b", "a"], {}, store)).resolves.toMatchObject({ ok: true });
    await expect(clearPins("room-1", {}, store)).resolves.toMatchObject({ cleared: 2 });
  });
});
