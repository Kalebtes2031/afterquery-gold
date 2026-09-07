import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMEOUT_SECONDS,
  MAX_TIMEOUT_SECONDS,
  MIN_TIMEOUT_SECONDS,
  ChannelTimeoutLedger,
  MemoryChannelTimeoutStore,
  applyChannelTimeout,
} from "#ours/backend/services/timeouts.ts";

const NOW = 1_700_000_000_000;

const ledger = () => new ChannelTimeoutLedger(new MemoryChannelTimeoutStore());

describe("Channel timeout apply", () => {
  it("applies a new timeout with the default duration", async () => {
    const result = await ledger().applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW });
    expect(result).toEqual({
      ok: true,
      status: "applied",
      channelId: "room-1",
      nickname: "alice",
      moderatorId: "mod-1",
      expiresAt: NOW + DEFAULT_TIMEOUT_SECONDS * 1000,
      remainingSeconds: DEFAULT_TIMEOUT_SECONDS,
    });
  });

  it("stores the nickname in lowercase and keeps the channel id case", async () => {
    const timeouts = ledger();
    const result = await timeouts.applyChannelTimeout("  Room:West  ", "  AlIce  ", "mod-1", { now: NOW });
    expect(result).toMatchObject({ ok: true, channelId: "Room:West", nickname: "alice" });
  });

  it("extends a live timeout when the new expiry is later", async () => {
    const timeouts = ledger();
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 30 });
    const result = await timeouts.applyChannelTimeout("room-1", "alice", "mod-2", {
      now: NOW + 1_000,
      seconds: 80,
      reason: "spam",
    });
    expect(result).toEqual({
      ok: true,
      status: "extended",
      channelId: "room-1",
      nickname: "alice",
      moderatorId: "mod-2",
      expiresAt: NOW + 1_000 + 80_000,
      remainingSeconds: 80,
      reason: "spam",
    });
  });

  it("keeps the existing row when the new expiry is not later", async () => {
    const timeouts = ledger();
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 90, reason: "first" });
    const result = await timeouts.applyChannelTimeout("room-1", "alice", "mod-2", {
      now: NOW + 1_000,
      seconds: 20,
      reason: "ignored",
    });
    expect(result).toEqual({
      ok: true,
      status: "kept",
      channelId: "room-1",
      nickname: "alice",
      moderatorId: "mod-1",
      expiresAt: NOW + 90_000,
      remainingSeconds: 89,
      reason: "first",
    });
  });

  it("applies again after the previous timeout has expired", async () => {
    const timeouts = ledger();
    await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 10 });
    const result = await timeouts.applyChannelTimeout("room-1", "alice", "mod-2", { now: NOW + 10_000, seconds: 15 });
    expect(result).toMatchObject({ ok: true, status: "applied", moderatorId: "mod-2", remainingSeconds: 15 });
  });

  it("uses the default duration when seconds is missing or not finite", async () => {
    const timeouts = ledger();
    const missing = await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW });
    const invalid = await timeouts.applyChannelTimeout("room-2", "bob", "mod-1", { now: NOW, seconds: Number.POSITIVE_INFINITY });
    expect(missing).toMatchObject({ remainingSeconds: DEFAULT_TIMEOUT_SECONDS });
    expect(invalid).toMatchObject({ remainingSeconds: DEFAULT_TIMEOUT_SECONDS });
  });

  it("truncates a fractional duration before clamping", async () => {
    const result = await ledger().applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 21.8 });
    expect(result).toMatchObject({ ok: true, remainingSeconds: 21 });
  });

  it("clamps a duration below the minimum to ten seconds", async () => {
    const result = await ledger().applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 2 });
    expect(result).toMatchObject({ remainingSeconds: MIN_TIMEOUT_SECONDS });
  });

  it("clamps a duration above the maximum to one day", async () => {
    const result = await ledger().applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, seconds: 200_000 });
    expect(result).toMatchObject({ remainingSeconds: MAX_TIMEOUT_SECONDS });
  });

  it("drops a blank reason and trims a long reason to eighty characters", async () => {
    const timeouts = ledger();
    const blank = await timeouts.applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW, reason: "   " });
    const long = await timeouts.applyChannelTimeout("room-2", "bob", "mod-1", { now: NOW, reason: "x".repeat(90) });
    expect(blank.ok).toBe(true);
    expect(blank).not.toHaveProperty("reason");
    expect(long).toMatchObject({ reason: "x".repeat(80) });
  });

  it("rejects an empty channel id", async () => {
    await expect(ledger().applyChannelTimeout("   ", "alice", "mod-1", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "invalid_channel",
    });
  });

  it("rejects a nickname that fails the shared nickname rules", async () => {
    await expect(ledger().applyChannelTimeout("room-1", "ab", "mod-1", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "invalid_nickname",
      channelId: "room-1",
    });
  });

  it("rejects a blank moderator id", async () => {
    await expect(ledger().applyChannelTimeout("room-1", "alice", "  ", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "invalid_moderator",
      channelId: "room-1",
      nickname: "alice",
    });
  });

  it("supports the applyChannelTimeout convenience function", async () => {
    const store = new MemoryChannelTimeoutStore();
    const result = await applyChannelTimeout("room-1", "alice", "mod-1", { now: NOW }, store);
    expect(result).toMatchObject({ ok: true, status: "applied" });
  });
});
