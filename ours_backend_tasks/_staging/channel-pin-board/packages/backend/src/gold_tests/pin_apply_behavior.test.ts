import { describe, expect, it } from "vitest";
import {
  MAX_CHANNEL_PINS,
  ChannelPinBoard,
  MemoryChannelPinStore,
  pinMessage,
} from "#ours/backend/services/pins.ts";

const NOW = 1_700_000_000_000;

const board = () => new ChannelPinBoard(new MemoryChannelPinStore());

describe("Channel pin apply", () => {
  it("pins a new message at the end of the board", async () => {
    const result = await board().pinMessage("room-1", "msg-1", "mod-1", { now: NOW });
    expect(result).toEqual({
      ok: true,
      status: "pinned",
      channelId: "room-1",
      messageId: "msg-1",
      pinnedBy: "mod-1",
      pinnedAt: NOW,
      position: 0,
      version: 1,
    });
  });

  it("trims message and actor ids while keeping message id case", async () => {
    const pins = board();
    const result = await pins.pinMessage("  Room:West  ", "  MsgABC  ", "  Mod-1  ", { now: NOW });
    expect(result).toMatchObject({
      ok: true,
      channelId: "Room:West",
      messageId: "MsgABC",
      pinnedBy: "Mod-1",
    });
  });

  it("refreshes an already pinned message in place", async () => {
    const pins = board();
    await pins.pinMessage("room-1", "msg-1", "mod-1", { now: NOW });
    await pins.pinMessage("room-1", "msg-2", "mod-1", { now: NOW + 1 });
    const result = await pins.pinMessage("room-1", "msg-1", "mod-2", {
      now: NOW + 5_000,
      note: "bump",
    });
    expect(result).toEqual({
      ok: true,
      status: "refreshed",
      channelId: "room-1",
      messageId: "msg-1",
      pinnedBy: "mod-2",
      pinnedAt: NOW + 5_000,
      position: 0,
      version: 3,
      note: "bump",
    });
  });

  it("rejects a pin when the channel already has ten pins", async () => {
    const pins = board();
    for (let i = 0; i < MAX_CHANNEL_PINS; i += 1) {
      await pins.pinMessage("room-1", `msg-${i}`, "mod-1", { now: NOW + i });
    }
    await expect(pins.pinMessage("room-1", "msg-overflow", "mod-1", { now: NOW + 100 })).resolves.toEqual({
      ok: false,
      reason: "pin_limit",
      channelId: "room-1",
      messageId: "msg-overflow",
    });
  });

  it("allows refreshing when the board is already at the pin limit", async () => {
    const pins = board();
    for (let i = 0; i < MAX_CHANNEL_PINS; i += 1) {
      await pins.pinMessage("room-1", `msg-${i}`, "mod-1", { now: NOW + i });
    }
    const result = await pins.pinMessage("room-1", "msg-0", "mod-9", { now: NOW + 50 });
    expect(result).toMatchObject({ ok: true, status: "refreshed", position: 0, pinnedBy: "mod-9" });
  });

  it("assigns increasing positions as messages are pinned", async () => {
    const pins = board();
    const first = await pins.pinMessage("room-1", "a", "mod-1", { now: NOW });
    const second = await pins.pinMessage("room-1", "b", "mod-1", { now: NOW + 1 });
    const third = await pins.pinMessage("room-1", "c", "mod-1", { now: NOW + 2 });
    expect(first).toMatchObject({ position: 0 });
    expect(second).toMatchObject({ position: 1 });
    expect(third).toMatchObject({ position: 2 });
  });

  it("drops a blank note and trims a long note", async () => {
    const pins = board();
    const blank = await pins.pinMessage("room-1", "msg-1", "mod-1", { now: NOW, note: "   " });
    const long = await pins.pinMessage("room-1", "msg-2", "mod-1", { now: NOW, note: "n".repeat(200) });
    expect(blank.ok).toBe(true);
    expect(blank).not.toHaveProperty("note");
    expect(long).toMatchObject({ note: "n".repeat(120) });
  });

  it("rejects an empty channel id", async () => {
    await expect(board().pinMessage("   ", "msg-1", "mod-1", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "invalid_channel",
    });
  });

  it("rejects a blank message id", async () => {
    await expect(board().pinMessage("room-1", "  ", "mod-1", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "invalid_message",
      channelId: "room-1",
    });
  });

  it("rejects a blank pinnedBy actor", async () => {
    await expect(board().pinMessage("room-1", "msg-1", "  ", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "invalid_actor",
      channelId: "room-1",
      messageId: "msg-1",
    });
  });

  it("supports the pinMessage convenience function", async () => {
    const store = new MemoryChannelPinStore();
    const result = await pinMessage("room-1", "msg-1", "mod-1", { now: NOW }, store);
    expect(result).toMatchObject({ ok: true, status: "pinned" });
  });

  it("bumps the board version on each successful pin", async () => {
    const pins = board();
    const first = await pins.pinMessage("room-1", "msg-1", "mod-1", { now: NOW });
    const second = await pins.pinMessage("room-1", "msg-2", "mod-1", { now: NOW + 1 });
    expect(first).toMatchObject({ version: 1 });
    expect(second).toMatchObject({ version: 2 });
  });
});
