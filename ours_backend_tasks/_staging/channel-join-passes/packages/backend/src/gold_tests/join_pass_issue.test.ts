import { describe, expect, it } from "vitest";
import {
  DEFAULT_JOIN_PASS_TTL_SECONDS,
  MAX_JOIN_PASS_TTL_SECONDS,
  MIN_JOIN_PASS_TTL_SECONDS,
  JoinPassService,
  MemoryJoinPassStore,
  issueJoinPass,
  isValidPassIdShape,
} from "#ours/backend/services/join_passes.ts";

const NOW = 1_700_000_000_000;

const service = () => new JoinPassService(new MemoryJoinPassStore());

describe("Join pass issue", () => {
  it("issues a pass with the default ttl", async () => {
    const result = await service().issueJoinPass("room-1", "host-1", {
      now: NOW,
      createPassId: () => "pass_0123456789abcdef",
    });
    expect(result).toEqual({
      ok: true,
      passId: "pass_0123456789abcdef",
      channelId: "room-1",
      issuerId: "host-1",
      createdAt: NOW,
      expiresAt: NOW + DEFAULT_JOIN_PASS_TTL_SECONDS * 1000,
      remainingSeconds: DEFAULT_JOIN_PASS_TTL_SECONDS,
    });
  });

  it("keeps channel id case and trims issuer id", async () => {
    const result = await service().issueJoinPass("  Room:West  ", "  Host-1  ", {
      now: NOW,
      createPassId: () => "pass_aaaaaaaaaaaaaaaa",
    });
    expect(result).toMatchObject({ ok: true, channelId: "Room:West", issuerId: "Host-1" });
  });

  it("uses the default ttl when the requested ttl is not finite", async () => {
    const result = await service().issueJoinPass("room-1", "host-1", {
      now: NOW,
      ttlSeconds: Number.NaN,
      createPassId: () => "pass_bbbbbbbbbbbbbbbb",
    });
    expect(result).toMatchObject({ remainingSeconds: DEFAULT_JOIN_PASS_TTL_SECONDS });
  });

  it("truncates a fractional ttl before clamping", async () => {
    const result = await service().issueJoinPass("room-1", "host-1", {
      now: NOW,
      ttlSeconds: 45.9,
      createPassId: () => "pass_cccccccccccccccc",
    });
    expect(result).toMatchObject({ remainingSeconds: 45 });
  });

  it("clamps a ttl below the minimum to thirty seconds", async () => {
    const result = await service().issueJoinPass("room-1", "host-1", {
      now: NOW,
      ttlSeconds: 5,
      createPassId: () => "pass_dddddddddddddddd",
    });
    expect(result).toMatchObject({ remainingSeconds: MIN_JOIN_PASS_TTL_SECONDS });
  });

  it("clamps a ttl above the maximum to six hundred seconds", async () => {
    const result = await service().issueJoinPass("room-1", "host-1", {
      now: NOW,
      ttlSeconds: 9_000,
      createPassId: () => "pass_eeeeeeeeeeeeeeee",
    });
    expect(result).toMatchObject({ remainingSeconds: MAX_JOIN_PASS_TTL_SECONDS });
  });

  it("creates a pass id shaped like pass_ plus sixteen hex digits by default", async () => {
    const result = await service().issueJoinPass("room-1", "host-1", { now: NOW });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(isValidPassIdShape(result.passId)).toBe(true);
    }
  });

  it("stores an optional trimmed note", async () => {
    const result = await service().issueJoinPass("room-1", "host-1", {
      now: NOW,
      note: "  guest seat  ",
      createPassId: () => "pass_ffffffffffffffff",
    });
    expect(result).toMatchObject({ note: "guest seat" });
  });

  it("rejects an empty channel id", async () => {
    await expect(service().issueJoinPass("   ", "host-1", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "invalid_channel",
    });
  });

  it("rejects a blank issuer id", async () => {
    await expect(service().issueJoinPass("room-1", "  ", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "invalid_issuer",
      channelId: "room-1",
    });
  });

  it("supports the issueJoinPass convenience function", async () => {
    const store = new MemoryJoinPassStore();
    const result = await issueJoinPass(
      "room-1",
      "host-1",
      { now: NOW, createPassId: () => "pass_1111111111111111" },
      store,
    );
    expect(result).toMatchObject({ ok: true, passId: "pass_1111111111111111" });
  });

  it("clamps a negative ttl up to thirty seconds", async () => {
    const result = await service().issueJoinPass("room-1", "host-1", {
      now: NOW,
      ttlSeconds: -20,
      createPassId: () => "pass_2222222222222222",
    });
    expect(result).toMatchObject({ remainingSeconds: MIN_JOIN_PASS_TTL_SECONDS });
  });
});
