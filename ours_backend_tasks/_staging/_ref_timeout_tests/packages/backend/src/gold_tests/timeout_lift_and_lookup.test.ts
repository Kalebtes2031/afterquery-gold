import { describe, expect, it } from "vitest";
import {
  ChannelTimeoutLedger,
  MemoryChannelTimeoutStore,
  getTimeout,
  isTimedOut,
  liftChannelTimeout,
} from "#ours/backend/services/timeouts.ts";

const NOW = 1_700_000_000_000;

const ledger = () => new ChannelTimeoutLedger(new MemoryChannelTimeoutStore());

describe("Channel timeout lift and lookup", () => {
  it("lifts a live timeout even when another moderator asks", async () => {
    const timeouts = ledger();
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 40 });
    await expect(timeouts.liftChannelTimeout("room-1", "alice", "mod-2", { now: NOW + 1_000 })).resolves.toEqual({
      ok: true,
      channelId: "room-1",
      nickname: "alice",
      lifted: true,
    });
    await expect(timeouts.isTimedOut("room-1", "alice", { now: NOW + 1_000 })).resolves.toEqual({
      timedOut: false,
      remainingSeconds: 0,
    });
  });

  it("reports not_found when lifting a missing timeout", async () => {
    await expect(ledger().liftChannelTimeout("room-1", "alice", "mod-1", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "not_found",
      channelId: "room-1",
      nickname: "alice",
    });
  });

  it("treats an expired timeout as gone when lifting", async () => {
    const timeouts = ledger();
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 10 });
    await expect(timeouts.liftChannelTimeout("room-1", "alice", "mod-1", { now: NOW + 10_000 })).resolves.toEqual({
      ok: false,
      reason: "not_found",
      channelId: "room-1",
      nickname: "alice",
    });
  });

  it("rejects lift for invalid channel nickname or moderator", async () => {
    const timeouts = ledger();
    await expect(timeouts.liftChannelTimeout("  ", "alice", "mod-1")).resolves.toEqual({
      ok: false,
      reason: "invalid_channel",
    });
    await expect(timeouts.liftChannelTimeout("room-1", "ab", "mod-1")).resolves.toEqual({
      ok: false,
      reason: "invalid_nickname",
      channelId: "room-1",
    });
    await expect(timeouts.liftChannelTimeout("room-1", "alice", " ")).resolves.toEqual({
      ok: false,
      reason: "invalid_moderator",
      channelId: "room-1",
      nickname: "alice",
    });
  });

  it("reports a live timeout through isTimedOut", async () => {
    const timeouts = ledger();
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 30, reason: "spam" });
    const lookup = await timeouts.isTimedOut("room-1", "ALICE", { now: NOW + 2_000 });
    expect(lookup.timedOut).toBe(true);
    expect(lookup.remainingSeconds).toBe(28);
    expect(lookup.record).toEqual({
      channelId: "room-1",
      nickname: "alice",
      moderatorId: "mod-1",
      expiresAt: NOW + 30_000,
      remainingSeconds: 28,
      expired: false,
      reason: "spam",
    });
  });

  it("reports not timed out for missing expired or invalid lookups", async () => {
    const timeouts = ledger();
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 10 });
    await expect(timeouts.isTimedOut("room-1", "alice", { now: NOW + 10_000 })).resolves.toEqual({
      timedOut: false,
      remainingSeconds: 0,
    });
    await expect(timeouts.isTimedOut("room-1", "missing", { now: NOW })).resolves.toEqual({
      timedOut: false,
      remainingSeconds: 0,
    });
    await expect(timeouts.isTimedOut("  ", "alice", { now: NOW })).resolves.toEqual({
      timedOut: false,
      remainingSeconds: 0,
    });
  });

  it("returns only a live record from getTimeout", async () => {
    const timeouts = ledger();
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 12 });
    await expect(timeouts.getTimeout("room-1", "alice", { now: NOW })).resolves.toMatchObject({
      nickname: "alice",
      expired: false,
    });
    await expect(timeouts.getTimeout("room-1", "alice", { now: NOW + 12_000 })).resolves.toBeNull();
  });

  it("supports the lookup convenience functions", async () => {
    const store = new MemoryChannelTimeoutStore();
    const timeouts = new ChannelTimeoutLedger(store);
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 40 });
    await expect(isTimedOut("room-1", "alice", { now: NOW }, store)).resolves.toMatchObject({ timedOut: true });
    await expect(getTimeout("room-1", "alice", { now: NOW }, store)).resolves.toMatchObject({ nickname: "alice" });
    await expect(liftChannelTimeout("room-1", "alice", "mod-9", { now: NOW }, store)).resolves.toMatchObject({
      lifted: true,
    });
  });
});
