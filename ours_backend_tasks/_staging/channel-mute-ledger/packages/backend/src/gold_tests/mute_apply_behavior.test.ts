import { describe, expect, it } from "vitest";
import {
  MAX_MUTE_SECONDS,
  MIN_MUTE_SECONDS,
  ChannelMuteLedger,
  MemoryChannelMuteStore,
  muteUser,
} from "#ours/backend/services/mutes.ts";

const NOW = 1_700_000_000_000;

const ledger = () => new ChannelMuteLedger(new MemoryChannelMuteStore());

describe("Channel mute apply", () => {
  it("applies a permanent mute when duration is omitted", async () => {
    const result = await ledger().muteUser("room-1", "alice", "mod-1", { now: NOW });
    expect(result).toEqual({
      ok: true,
      status: "applied",
      channelId: "room-1",
      nickname: "alice",
      moderatorId: "mod-1",
      expiresAt: null,
      remainingSeconds: null,
      permanent: true,
    });
  });

  it("stores the nickname in lowercase and keeps the channel id case", async () => {
    const mutes = ledger();
    const result = await mutes.muteUser("  Room:West  ", "  AlIce  ", "mod-1", { now: NOW });
    expect(result).toMatchObject({ ok: true, channelId: "Room:West", nickname: "alice" });
  });

  it("applies a timed mute when a finite duration is given", async () => {
    const result = await ledger().muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 60 });
    expect(result).toEqual({
      ok: true,
      status: "applied",
      channelId: "room-1",
      nickname: "alice",
      moderatorId: "mod-1",
      expiresAt: NOW + 60_000,
      remainingSeconds: 60,
      permanent: false,
    });
  });

  it("extends a live timed mute when the new expiry is later", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 30 });
    const result = await mutes.muteUser("room-1", "alice", "mod-2", {
      now: NOW + 1_000,
      durationSeconds: 80,
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
      permanent: false,
      reason: "spam",
    });
  });

  it("extends a timed mute into a permanent mute", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 40 });
    const result = await mutes.muteUser("room-1", "alice", "mod-2", { now: NOW + 1_000 });
    expect(result).toMatchObject({
      ok: true,
      status: "extended",
      permanent: true,
      expiresAt: null,
      remainingSeconds: null,
      moderatorId: "mod-2",
    });
  });

  it("keeps the existing row when the new expiry is not later", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 90, reason: "first" });
    const result = await mutes.muteUser("room-1", "alice", "mod-2", {
      now: NOW + 1_000,
      durationSeconds: 20,
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
      permanent: false,
      reason: "first",
    });
  });

  it("keeps a permanent mute when a shorter timed mute is requested", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, reason: "forever" });
    const result = await mutes.muteUser("room-1", "alice", "mod-2", {
      now: NOW + 1_000,
      durationSeconds: 60,
      reason: "temp",
    });
    expect(result).toMatchObject({
      ok: true,
      status: "kept",
      permanent: true,
      moderatorId: "mod-1",
      reason: "forever",
    });
  });

  it("applies again after the previous timed mute has expired", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 10 });
    const result = await mutes.muteUser("room-1", "alice", "mod-2", {
      now: NOW + 10_000,
      durationSeconds: 15,
    });
    expect(result).toMatchObject({ ok: true, status: "applied", moderatorId: "mod-2", remainingSeconds: 15 });
  });

  it("treats a non-finite duration as permanent", async () => {
    const mutes = ledger();
    const invalid = await mutes.muteUser("room-2", "bob", "mod-1", {
      now: NOW,
      durationSeconds: Number.POSITIVE_INFINITY,
    });
    expect(invalid).toMatchObject({ permanent: true, expiresAt: null, remainingSeconds: null });
  });

  it("truncates a fractional duration before clamping", async () => {
    const result = await ledger().muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 21.8 });
    expect(result).toMatchObject({ ok: true, remainingSeconds: 21, permanent: false });
  });

  it("clamps a duration below the minimum to ten seconds", async () => {
    const result = await ledger().muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 2 });
    expect(result).toMatchObject({ remainingSeconds: MIN_MUTE_SECONDS });
  });

  it("clamps a duration above the maximum to one day", async () => {
    const result = await ledger().muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 200_000 });
    expect(result).toMatchObject({ remainingSeconds: MAX_MUTE_SECONDS });
  });

  it("drops a blank reason and trims a long reason to eighty characters", async () => {
    const mutes = ledger();
    const blank = await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, reason: "   " });
    const long = await mutes.muteUser("room-2", "bob", "mod-1", { now: NOW, reason: "x".repeat(90) });
    expect(blank.ok).toBe(true);
    expect(blank).not.toHaveProperty("reason");
    expect(long).toMatchObject({ reason: "x".repeat(80) });
  });

  it("rejects an empty channel id", async () => {
    await expect(ledger().muteUser("   ", "alice", "mod-1", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "invalid_channel",
    });
  });

  it("rejects a nickname that fails the shared nickname rules", async () => {
    await expect(ledger().muteUser("room-1", "ab", "mod-1", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "invalid_nickname",
      channelId: "room-1",
    });
  });

  it("rejects a blank moderator id", async () => {
    await expect(ledger().muteUser("room-1", "alice", "  ", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "invalid_moderator",
      channelId: "room-1",
      nickname: "alice",
    });
  });

  it("supports the muteUser convenience function", async () => {
    const store = new MemoryChannelMuteStore();
    const result = await muteUser("room-1", "alice", "mod-1", { now: NOW }, store);
    expect(result).toMatchObject({ ok: true, status: "applied", permanent: true });
  });
});
