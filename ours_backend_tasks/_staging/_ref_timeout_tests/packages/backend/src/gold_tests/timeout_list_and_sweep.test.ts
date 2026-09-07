import { describe, expect, it } from "vitest";
import {
  ChannelTimeoutLedger,
  MemoryChannelTimeoutStore,
  countActiveTimeouts,
  listChannelTimeouts,
  listTimedOutChannels,
  sweepExpiredTimeouts,
} from "#ours/backend/services/timeouts.ts";

const NOW = 1_700_000_000_000;

const ledger = () => new ChannelTimeoutLedger(new MemoryChannelTimeoutStore());

describe("Channel timeout lists and sweep", () => {
  it("lists live timeouts for a channel sorted by nickname", async () => {
    const timeouts = ledger();
    await timeouts.applyChannelTimeout("room-1", "zoe", "mod-1", { now: NOW, seconds: 40 });
    await timeouts.applyChannelTimeout("room-1", "amy", "mod-1", { now: NOW, seconds: 40 });
    await timeouts.applyChannelTimeout("room-1", "bob", "mod-1", { now: NOW, seconds: 10 });
    const listed = await timeouts.listChannelTimeouts("room-1", { now: NOW + 10_000 });
    expect(listed.map((row) => row.nickname)).toEqual(["amy", "zoe"]);
  });

  it("includes stored expired rows only when asked", async () => {
    const timeouts = ledger();
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 10 });
    await timeouts.applyChannelTimeout("room-1", "bob", "mod-1", { now: NOW, seconds: 40 });
    const live = await timeouts.listChannelTimeouts("room-1", { now: NOW + 10_000 });
    const all = await timeouts.listChannelTimeouts("room-1", { now: NOW + 10_000, includeExpired: true });
    expect(live.map((row) => row.nickname)).toEqual(["bob"]);
    expect(all.map((row) => row.nickname)).toEqual(["alice", "bob"]);
    expect(all.find((row) => row.nickname === "alice")?.expired).toBe(true);
  });

  it("returns an empty list for an invalid channel id", async () => {
    await expect(ledger().listChannelTimeouts("   ", { now: NOW })).resolves.toEqual([]);
  });

  it("lists timed out channels in lexical order", async () => {
    const timeouts = ledger();
    await timeouts.applyChannelTimeout("zeta", "alice", "mod-1", { now: NOW, seconds: 40 });
    await timeouts.applyChannelTimeout("alpha", "bob", "mod-1", { now: NOW, seconds: 40 });
    await timeouts.applyChannelTimeout("gone", "carol", "mod-1", { now: NOW, seconds: 10 });
    await expect(timeouts.listTimedOutChannels({ now: NOW + 10_000 })).resolves.toEqual(["alpha", "zeta"]);
  });

  it("counts live timeouts for one channel or across every channel", async () => {
    const timeouts = ledger();
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 40 });
    await timeouts.applyChannelTimeout("room-1", "bob", "mod-1", { now: NOW, seconds: 10 });
    await timeouts.applyChannelTimeout("room-2", "carol", "mod-1", { now: NOW, seconds: 40 });
    await expect(timeouts.countActiveTimeouts("room-1", { now: NOW + 10_000 })).resolves.toBe(1);
    await expect(timeouts.countActiveTimeouts(undefined, { now: NOW + 10_000 })).resolves.toBe(2);
    await expect(timeouts.countActiveTimeouts("   ", { now: NOW })).resolves.toBe(0);
  });

  it("sweeps expired rows for one channel and reports that channel", async () => {
    const timeouts = ledger();
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 10 });
    await timeouts.applyChannelTimeout("room-1", "bob", "mod-1", { now: NOW, seconds: 40 });
    await expect(timeouts.sweepExpiredTimeouts("room-1", { now: NOW + 10_000 })).resolves.toEqual({
      removed: 1,
      channelIds: ["room-1"],
    });
    await expect(timeouts.listChannelTimeouts("room-1", { now: NOW + 5_000 })).resolves.toHaveLength(1);
  });

  it("sweeps expired rows across every channel when no channel is given", async () => {
    const timeouts = ledger();
    await timeouts.applyChannelTimeout("room-b", "alice", "mod-1", { now: NOW, seconds: 10 });
    await timeouts.applyChannelTimeout("room-a", "bob", "mod-1", { now: NOW, seconds: 10 });
    await timeouts.applyChannelTimeout("room-a", "carol", "mod-1", { now: NOW, seconds: 40 });
    await expect(timeouts.sweepExpiredTimeouts(undefined, { now: NOW + 10_000 })).resolves.toEqual({
      removed: 2,
      channelIds: ["room-a", "room-b"],
    });
  });

  it("returns a zero sweep for an invalid channel selection", async () => {
    await expect(ledger().sweepExpiredTimeouts("  ", { now: NOW })).resolves.toEqual({
      removed: 0,
      channelIds: [],
    });
  });

  it("floors remaining time and never goes negative", async () => {
    const timeouts = ledger();
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 10 });
    const view = await timeouts.listChannelTimeouts("room-1", { now: NOW + 9_400, includeExpired: true });
    expect(view[0]?.remainingSeconds).toBe(0);
  });

  it("supports the list and sweep convenience functions", async () => {
    const store = new MemoryChannelTimeoutStore();
    const timeouts = new ChannelTimeoutLedger(store);
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 40 });
    await expect(listChannelTimeouts("room-1", { now: NOW }, store)).resolves.toHaveLength(1);
    await expect(listTimedOutChannels({ now: NOW }, store)).resolves.toEqual(["room-1"]);
    await expect(countActiveTimeouts("room-1", { now: NOW }, store)).resolves.toBe(1);
    await expect(sweepExpiredTimeouts("room-1", { now: NOW }, store)).resolves.toEqual({
      removed: 0,
      channelIds: [],
    });
  });
});
