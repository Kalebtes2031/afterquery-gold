import { describe, expect, it } from "vitest";
import {
  ChannelTimeoutLedger,
  MemoryChannelTimeoutStore,
  createChannelTimeoutLedger,
} from "#ours/backend/services/timeouts.ts";

const NOW = 1_700_000_000_000;

describe("Channel timeout extra edges", () => {
  it("keeps colons inside a trimmed channel id", async () => {
    const timeouts = createChannelTimeoutLedger(new MemoryChannelTimeoutStore());
    const result = await timeouts.applyChannelTimeout("  team:west  ", "alice", "mod-1", { now: NOW, seconds: 20 });
    expect(result).toMatchObject({ ok: true, channelId: "team:west" });
  });

  it("trims a reason before storing it", async () => {
    const timeouts = createChannelTimeoutLedger(new MemoryChannelTimeoutStore());
    const result = await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", {
      now: NOW,
      seconds: 20,
      reason: "  flood  ",
    });
    expect(result).toMatchObject({ reason: "flood" });
  });

  it("clamps a negative duration up to ten seconds", async () => {
    const timeouts = createChannelTimeoutLedger(new MemoryChannelTimeoutStore());
    const result = await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: -40 });
    expect(result).toMatchObject({ ok: true, remainingSeconds: 10 });
  });

  it("keeps the live row when the new expiry is exactly the same", async () => {
    const timeouts = createChannelTimeoutLedger(new MemoryChannelTimeoutStore());
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 40, reason: "keep-me" });
    const result = await timeouts.applyChannelTimeout("room-1", "alice", "mod-2", {
      now: NOW,
      seconds: 40,
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
    const timeouts = createChannelTimeoutLedger(new MemoryChannelTimeoutStore());
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 10 });
    await timeouts.sweepExpiredTimeouts("room-1", { now: NOW + 10_000 });
    await expect(timeouts.countActiveTimeouts("room-1", { now: NOW + 10_000 })).resolves.toBe(0);
    await expect(timeouts.listChannelTimeouts("room-1", { now: NOW + 10_000, includeExpired: true })).resolves.toEqual([]);
  });

  it("returns null from getTimeout for an invalid nickname", async () => {
    const timeouts = createChannelTimeoutLedger(new MemoryChannelTimeoutStore());
    await expect(timeouts.getTimeout("room-1", "ab", { now: NOW })).resolves.toBeNull();
  });

  it("does not treat a lifted user as timed out", async () => {
    const timeouts = createChannelTimeoutLedger(new MemoryChannelTimeoutStore());
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 50 });
    await timeouts.liftChannelTimeout("room-1", "alice", "mod-1", { now: NOW + 1_000 });
    await expect(timeouts.listTimedOutChannels({ now: NOW + 1_000 })).resolves.toEqual([]);
  });

  it("can construct the ledger through createChannelTimeoutLedger", async () => {
    const store = new MemoryChannelTimeoutStore();
    const timeouts = createChannelTimeoutLedger(store);
    expect(timeouts).toBeInstanceOf(ChannelTimeoutLedger);
    await expect(timeouts.countActiveTimeouts(undefined, { now: NOW })).resolves.toBe(0);
  });
});
