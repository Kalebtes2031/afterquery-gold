import { describe, expect, it } from "vitest";
import {
  ChannelPinBoard,
  MemoryChannelPinStore,
  getPin,
  listPins,
  unpinMessage,
} from "#ours/backend/services/pins.ts";

const NOW = 1_700_000_000_000;

const board = () => new ChannelPinBoard(new MemoryChannelPinStore());

describe("Channel pin unpin and lookup", () => {
  it("unpins an existing message and shifts later positions", async () => {
    const pins = board();
    await pins.pinMessage("room-1", "msg-1", "mod-1", { now: NOW });
    await pins.pinMessage("room-1", "msg-2", "mod-1", { now: NOW + 1 });
    await pins.pinMessage("room-1", "msg-3", "mod-1", { now: NOW + 2 });
    await expect(pins.unpinMessage("room-1", "msg-2")).resolves.toEqual({
      ok: true,
      channelId: "room-1",
      messageId: "msg-2",
      unpinned: true,
      version: 4,
    });
    const listed = await pins.listPins("room-1");
    expect(listed.map((row) => row.messageId)).toEqual(["msg-1", "msg-3"]);
    expect(listed.map((row) => row.position)).toEqual([0, 1]);
  });

  it("reports not_found when unpinning a missing message", async () => {
    const pins = board();
    await pins.pinMessage("room-1", "msg-1", "mod-1", { now: NOW });
    await expect(pins.unpinMessage("room-1", "missing")).resolves.toEqual({
      ok: false,
      reason: "not_found",
      channelId: "room-1",
      messageId: "missing",
    });
  });

  it("reports not_found when unpinning from an empty channel", async () => {
    await expect(board().unpinMessage("room-1", "msg-1")).resolves.toEqual({
      ok: false,
      reason: "not_found",
      channelId: "room-1",
      messageId: "msg-1",
    });
  });

  it("rejects unpin for invalid channel or message", async () => {
    const pins = board();
    await expect(pins.unpinMessage("  ", "msg-1")).resolves.toEqual({
      ok: false,
      reason: "invalid_channel",
    });
    await expect(pins.unpinMessage("room-1", " ")).resolves.toEqual({
      ok: false,
      reason: "invalid_message",
      channelId: "room-1",
    });
  });

  it("returns a pin view with position from getPin", async () => {
    const pins = board();
    await pins.pinMessage("room-1", "msg-1", "mod-1", { now: NOW });
    await pins.pinMessage("room-1", "msg-2", "mod-1", { now: NOW + 1, note: "keep" });
    await expect(pins.getPin("room-1", "msg-2")).resolves.toEqual({
      messageId: "msg-2",
      pinnedBy: "mod-1",
      pinnedAt: NOW + 1,
      note: "keep",
      position: 1,
    });
  });

  it("returns null from getPin for missing or invalid input", async () => {
    const pins = board();
    await pins.pinMessage("room-1", "msg-1", "mod-1", { now: NOW });
    await expect(pins.getPin("room-1", "missing")).resolves.toBeNull();
    await expect(pins.getPin("  ", "msg-1")).resolves.toBeNull();
    await expect(pins.getPin("room-1", " ")).resolves.toBeNull();
  });

  it("lists pins in board order", async () => {
    const pins = board();
    await pins.pinMessage("room-1", "z", "mod-1", { now: NOW });
    await pins.pinMessage("room-1", "a", "mod-1", { now: NOW + 1 });
    await expect(pins.listPins("room-1")).resolves.toMatchObject([
      { messageId: "z", position: 0 },
      { messageId: "a", position: 1 },
    ]);
  });

  it("returns an empty list for an invalid channel id", async () => {
    await expect(board().listPins("   ")).resolves.toEqual([]);
  });

  it("supports the lookup convenience functions", async () => {
    const store = new MemoryChannelPinStore();
    const pins = new ChannelPinBoard(store);
    await pins.pinMessage("room-1", "msg-1", "mod-1", { now: NOW });
    await expect(listPins("room-1", store)).resolves.toHaveLength(1);
    await expect(getPin("room-1", "msg-1", store)).resolves.toMatchObject({ messageId: "msg-1" });
    await expect(unpinMessage("room-1", "msg-1", {}, store)).resolves.toMatchObject({ unpinned: true });
  });

  it("keeps channel id case with colons when looking up pins", async () => {
    const pins = board();
    await pins.pinMessage("team:west", "Msg-1", "mod-1", { now: NOW });
    await expect(pins.getPin("  team:west  ", "Msg-1")).resolves.toMatchObject({
      messageId: "Msg-1",
      position: 0,
    });
  });
});
