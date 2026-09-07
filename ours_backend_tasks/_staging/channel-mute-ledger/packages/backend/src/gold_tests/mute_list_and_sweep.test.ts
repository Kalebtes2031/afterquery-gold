import { describe, expect, it } from "vitest";
import {
  ChannelMuteLedger,
  MemoryChannelMuteStore,
  countActiveMutes,
  listChannelMutes,
  listMutedChannels,
  sweepExpiredMutes,
} from "#ours/backend/services/mutes.ts";

const NOW = 1_700_000_000_000;

const ledger = () => new ChannelMuteLedger(new MemoryChannelMuteStore());

describe("Channel mute lists and sweep", () => {
  it("lists live mutes for a channel sorted by nickname", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "zoe", "mod-1", { now: NOW, durationSeconds: 40 });
    await mutes.muteUser("room-1", "amy", "mod-1", { now: NOW });
    await mutes.muteUser("room-1", "bob", "mod-1", { now: NOW, durationSeconds: 10 });
    const listed = await mutes.listChannelMutes("room-1", { now: NOW + 10_000 });
    expect(listed.map((row) => row.nickname)).toEqual(["amy", "zoe"]);
  });

  it("includes stored expired rows only when asked", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 10 });
    await mutes.muteUser("room-1", "bob", "mod-1", { now: NOW, durationSeconds: 40 });
    const live = await mutes.listChannelMutes("room-1", { now: NOW + 10_000 });
    const all = await mutes.listChannelMutes("room-1", { now: NOW + 10_000, includeExpired: true });
    expect(live.map((row) => row.nickname)).toEqual(["bob"]);
    expect(all.map((row) => row.nickname)).toEqual(["alice", "bob"]);
    expect(all.find((row) => row.nickname === "alice")?.expired).toBe(true);
  });

  it("returns an empty list for an invalid channel id", async () => {
    await expect(ledger().listChannelMutes("   ", { now: NOW })).resolves.toEqual([]);
  });

  it("lists muted channels in lexical order", async () => {
    const mutes = ledger();
    await mutes.muteUser("zeta", "alice", "mod-1", { now: NOW, durationSeconds: 40 });
    await mutes.muteUser("alpha", "bob", "mod-1", { now: NOW });
    await mutes.muteUser("gone", "carol", "mod-1", { now: NOW, durationSeconds: 10 });
    await expect(mutes.listMutedChannels({ now: NOW + 10_000 })).resolves.toEqual(["alpha", "zeta"]);
  });

  it("counts live mutes for one channel or across every channel", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 40 });
    await mutes.muteUser("room-1", "bob", "mod-1", { now: NOW, durationSeconds: 10 });
    await mutes.muteUser("room-2", "carol", "mod-1", { now: NOW });
    await expect(mutes.countActiveMutes("room-1", { now: NOW + 10_000 })).resolves.toBe(1);
    await expect(mutes.countActiveMutes(undefined, { now: NOW + 10_000 })).resolves.toBe(2);
    await expect(mutes.countActiveMutes("   ", { now: NOW })).resolves.toBe(0);
  });

  it("sweeps expired timed rows for one channel and reports that channel", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 10 });
    await mutes.muteUser("room-1", "bob", "mod-1", { now: NOW, durationSeconds: 40 });
    await expect(mutes.sweepExpiredMutes("room-1", { now: NOW + 10_000 })).resolves.toEqual({
      removed: 1,
      channelIds: ["room-1"],
    });
    await expect(mutes.listChannelMutes("room-1", { now: NOW + 5_000 })).resolves.toHaveLength(1);
  });

  it("never sweeps permanent mutes", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW });
    await mutes.muteUser("room-1", "bob", "mod-1", { now: NOW, durationSeconds: 10 });
    await expect(mutes.sweepExpiredMutes("room-1", { now: NOW + 10_000 })).resolves.toEqual({
      removed: 1,
      channelIds: ["room-1"],
    });
    await expect(mutes.isMuted("room-1", "alice", { now: NOW + 10_000 })).resolves.toMatchObject({
      muted: true,
      permanent: true,
    });
  });

  it("sweeps expired rows across every channel when no channel is given", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-b", "alice", "mod-1", { now: NOW, durationSeconds: 10 });
    await mutes.muteUser("room-a", "bob", "mod-1", { now: NOW, durationSeconds: 10 });
    await mutes.muteUser("room-a", "carol", "mod-1", { now: NOW, durationSeconds: 40 });
    await expect(mutes.sweepExpiredMutes(undefined, { now: NOW + 10_000 })).resolves.toEqual({
      removed: 2,
      channelIds: ["room-a", "room-b"],
    });
  });

  it("returns a zero sweep for an invalid channel selection", async () => {
    await expect(ledger().sweepExpiredMutes("  ", { now: NOW })).resolves.toEqual({
      removed: 0,
      channelIds: [],
    });
  });

  it("floors remaining time and never goes negative", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 10 });
    const view = await mutes.listChannelMutes("room-1", { now: NOW + 9_400, includeExpired: true });
    expect(view[0]?.remainingSeconds).toBe(0);
  });

  it("supports the list and sweep convenience functions", async () => {
    const store = new MemoryChannelMuteStore();
    const mutes = new ChannelMuteLedger(store);
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 40 });
    await expect(listChannelMutes("room-1", { now: NOW }, store)).resolves.toHaveLength(1);
    await expect(listMutedChannels({ now: NOW }, store)).resolves.toEqual(["room-1"]);
    await expect(countActiveMutes("room-1", { now: NOW }, store)).resolves.toBe(1);
    await expect(sweepExpiredMutes("room-1", { now: NOW }, store)).resolves.toEqual({
      removed: 0,
      channelIds: [],
    });
  });
});
