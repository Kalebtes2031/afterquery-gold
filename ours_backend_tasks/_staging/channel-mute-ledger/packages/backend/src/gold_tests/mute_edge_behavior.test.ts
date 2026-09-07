import { describe, expect, it } from "vitest";
import {
  ChannelMuteLedger,
  MemoryChannelMuteStore,
  createChannelMuteLedger,
} from "#ours/backend/services/mutes.ts";

const NOW = 1_700_000_000_000;

describe("Channel mute extra edges", () => {
  it("keeps colons inside a trimmed channel id", async () => {
    const mutes = createChannelMuteLedger(new MemoryChannelMuteStore());
    const result = await mutes.muteUser("  team:west  ", "alice", "mod-1", { now: NOW, durationSeconds: 20 });
    expect(result).toMatchObject({ ok: true, channelId: "team:west" });
  });

  it("trims a reason before storing it", async () => {
    const mutes = createChannelMuteLedger(new MemoryChannelMuteStore());
    const result = await mutes.muteUser("room-1", "alice", "mod-1", {
      now: NOW,
      durationSeconds: 20,
      reason: "  flood  ",
    });
    expect(result).toMatchObject({ reason: "flood" });
  });

  it("clamps a negative duration up to ten seconds", async () => {
    const mutes = createChannelMuteLedger(new MemoryChannelMuteStore());
    const result = await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: -40 });
    expect(result).toMatchObject({ ok: true, remainingSeconds: 10, permanent: false });
  });

  it("keeps the live row when the new timed expiry is exactly the same", async () => {
    const mutes = createChannelMuteLedger(new MemoryChannelMuteStore());
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 40, reason: "keep-me" });
    const result = await mutes.muteUser("room-1", "alice", "mod-2", {
      now: NOW,
      durationSeconds: 40,
      reason: "other",
    });
    expect(result).toMatchObject({
      ok: true,
      status: "kept",
      moderatorId: "mod-1",
      reason: "keep-me",
      expiresAt: NOW + 40_000,
    });
  });

  it("does not count an expired row after it has been swept", async () => {
    const mutes = createChannelMuteLedger(new MemoryChannelMuteStore());
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 10 });
    await mutes.sweepExpiredMutes("room-1", { now: NOW + 10_000 });
    await expect(mutes.countActiveMutes("room-1", { now: NOW + 10_000 })).resolves.toBe(0);
    await expect(mutes.listChannelMutes("room-1", { now: NOW + 10_000, includeExpired: true })).resolves.toEqual([]);
  });

  it("returns null from getMute for an invalid nickname", async () => {
    const mutes = createChannelMuteLedger(new MemoryChannelMuteStore());
    await expect(mutes.getMute("room-1", "ab", { now: NOW })).resolves.toBeNull();
  });

  it("does not treat an unmuted user as muted", async () => {
    const mutes = createChannelMuteLedger(new MemoryChannelMuteStore());
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 50 });
    await mutes.unmuteUser("room-1", "alice", "mod-1", { now: NOW + 1_000 });
    await expect(mutes.listMutedChannels({ now: NOW + 1_000 })).resolves.toEqual([]);
  });

  it("can construct the ledger through createChannelMuteLedger", async () => {
    const store = new MemoryChannelMuteStore();
    const mutes = createChannelMuteLedger(store);
    expect(mutes).toBeInstanceOf(ChannelMuteLedger);
    await expect(mutes.countActiveMutes(undefined, { now: NOW })).resolves.toBe(0);
  });

  it("keeps a permanent mute when both sides are permanent", async () => {
    const mutes = createChannelMuteLedger(new MemoryChannelMuteStore());
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, reason: "first" });
    const result = await mutes.muteUser("room-1", "alice", "mod-2", { now: NOW + 5_000, reason: "second" });
    expect(result).toMatchObject({ status: "kept", moderatorId: "mod-1", reason: "first", permanent: true });
  });
});
