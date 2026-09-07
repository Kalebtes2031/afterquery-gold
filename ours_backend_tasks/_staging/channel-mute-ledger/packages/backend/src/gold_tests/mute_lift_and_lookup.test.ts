import { describe, expect, it } from "vitest";
import {
  ChannelMuteLedger,
  MemoryChannelMuteStore,
  getMute,
  isMuted,
  unmuteUser,
} from "#ours/backend/services/mutes.ts";

const NOW = 1_700_000_000_000;

const ledger = () => new ChannelMuteLedger(new MemoryChannelMuteStore());

describe("Channel mute lift and lookup", () => {
  it("unmutes a live mute even when another moderator asks", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 40 });
    await expect(mutes.unmuteUser("room-1", "alice", "mod-2", { now: NOW + 1_000 })).resolves.toEqual({
      ok: true,
      channelId: "room-1",
      nickname: "alice",
      unmuted: true,
    });
    await expect(mutes.isMuted("room-1", "alice", { now: NOW + 1_000 })).resolves.toEqual({
      muted: false,
      remainingSeconds: 0,
      permanent: false,
    });
  });

  it("unmutes a permanent mute", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW });
    await expect(mutes.unmuteUser("room-1", "alice", "mod-1", { now: NOW + 5_000 })).resolves.toMatchObject({
      unmuted: true,
    });
    await expect(mutes.isMuted("room-1", "alice", { now: NOW + 5_000 })).resolves.toMatchObject({ muted: false });
  });

  it("reports not_found when unmuting a missing mute", async () => {
    await expect(ledger().unmuteUser("room-1", "alice", "mod-1", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "not_found",
      channelId: "room-1",
      nickname: "alice",
    });
  });

  it("treats an expired mute as gone when unmuting", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 10 });
    await expect(mutes.unmuteUser("room-1", "alice", "mod-1", { now: NOW + 10_000 })).resolves.toEqual({
      ok: false,
      reason: "not_found",
      channelId: "room-1",
      nickname: "alice",
    });
  });

  it("rejects unmute for invalid channel nickname or moderator", async () => {
    const mutes = ledger();
    await expect(mutes.unmuteUser("  ", "alice", "mod-1")).resolves.toEqual({
      ok: false,
      reason: "invalid_channel",
    });
    await expect(mutes.unmuteUser("room-1", "ab", "mod-1")).resolves.toEqual({
      ok: false,
      reason: "invalid_nickname",
      channelId: "room-1",
    });
    await expect(mutes.unmuteUser("room-1", "alice", " ")).resolves.toEqual({
      ok: false,
      reason: "invalid_moderator",
      channelId: "room-1",
      nickname: "alice",
    });
  });

  it("reports a live timed mute through isMuted", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 30, reason: "spam" });
    const lookup = await mutes.isMuted("room-1", "ALICE", { now: NOW + 2_000 });
    expect(lookup.muted).toBe(true);
    expect(lookup.remainingSeconds).toBe(28);
    expect(lookup.permanent).toBe(false);
    expect(lookup.record).toEqual({
      channelId: "room-1",
      nickname: "alice",
      moderatorId: "mod-1",
      expiresAt: NOW + 30_000,
      mutedAt: NOW,
      remainingSeconds: 28,
      permanent: false,
      expired: false,
      reason: "spam",
    });
  });

  it("reports a permanent mute through isMuted", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW });
    const lookup = await mutes.isMuted("room-1", "alice", { now: NOW + 999_000 });
    expect(lookup).toMatchObject({ muted: true, permanent: true, remainingSeconds: null });
  });

  it("reports not muted for missing expired or invalid lookups", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 10 });
    await expect(mutes.isMuted("room-1", "alice", { now: NOW + 10_000 })).resolves.toEqual({
      muted: false,
      remainingSeconds: 0,
      permanent: false,
    });
    await expect(mutes.isMuted("room-1", "missing", { now: NOW })).resolves.toEqual({
      muted: false,
      remainingSeconds: 0,
      permanent: false,
    });
    await expect(mutes.isMuted("  ", "alice", { now: NOW })).resolves.toEqual({
      muted: false,
      remainingSeconds: 0,
      permanent: false,
    });
  });

  it("returns only a live record from getMute", async () => {
    const mutes = ledger();
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 12 });
    await expect(mutes.getMute("room-1", "alice", { now: NOW })).resolves.toMatchObject({
      nickname: "alice",
      expired: false,
    });
    await expect(mutes.getMute("room-1", "alice", { now: NOW + 12_000 })).resolves.toBeNull();
  });

  it("supports the lookup convenience functions", async () => {
    const store = new MemoryChannelMuteStore();
    const mutes = new ChannelMuteLedger(store);
    await mutes.muteUser("room-1", "alice", "mod-1", { now: NOW, durationSeconds: 40 });
    await expect(isMuted("room-1", "alice", { now: NOW }, store)).resolves.toMatchObject({ muted: true });
    await expect(getMute("room-1", "alice", { now: NOW }, store)).resolves.toMatchObject({ nickname: "alice" });
    await expect(unmuteUser("room-1", "alice", "mod-9", { now: NOW }, store)).resolves.toMatchObject({
      unmuted: true,
    });
  });
});
