import { describe, expect, it } from "vitest";
import {
  JoinPassService,
  MemoryJoinPassStore,
  consumeJoinPass,
  getJoinPass,
  revokeJoinPass,
} from "#ours/backend/services/join_passes.ts";

const NOW = 1_700_000_000_000;

const service = () => new JoinPassService(new MemoryJoinPassStore());

async function issue(
  passes: JoinPassService,
  passId = "pass_0123456789abcdef",
  ttlSeconds = 120,
) {
  return passes.issueJoinPass("room-1", "host-1", {
    now: NOW,
    ttlSeconds,
    createPassId: () => passId,
  });
}

describe("Join pass consume and revoke", () => {
  it("consumes a live pass exactly once", async () => {
    const passes = service();
    await issue(passes);
    await expect(passes.consumeJoinPass("pass_0123456789abcdef", "guest-1", { now: NOW + 1_000 })).resolves.toEqual({
      ok: true,
      passId: "pass_0123456789abcdef",
      channelId: "room-1",
      consumedBy: "guest-1",
      consumedAt: NOW + 1_000,
    });
    await expect(passes.consumeJoinPass("pass_0123456789abcdef", "guest-2", { now: NOW + 2_000 })).resolves.toEqual({
      ok: false,
      reason: "already_consumed",
      passId: "pass_0123456789abcdef",
      channelId: "room-1",
    });
  });

  it("reports not_found for a missing pass", async () => {
    await expect(service().consumeJoinPass("pass_missingmissing", "guest-1", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "not_found",
      passId: "pass_missingmissing",
    });
  });

  it("reports expired when consuming after the ttl", async () => {
    const passes = service();
    await issue(passes, "pass_aaaaaaaaaaaaaaaa", 30);
    await expect(
      passes.consumeJoinPass("pass_aaaaaaaaaaaaaaaa", "guest-1", { now: NOW + 30_000 }),
    ).resolves.toEqual({
      ok: false,
      reason: "expired",
      passId: "pass_aaaaaaaaaaaaaaaa",
      channelId: "room-1",
    });
  });

  it("lets only the issuer revoke a live pass", async () => {
    const passes = service();
    await issue(passes);
    await expect(passes.revokeJoinPass("pass_0123456789abcdef", "other", { now: NOW + 1 })).resolves.toEqual({
      ok: false,
      reason: "issuer_mismatch",
      passId: "pass_0123456789abcdef",
      channelId: "room-1",
    });
    await expect(passes.revokeJoinPass("pass_0123456789abcdef", "host-1", { now: NOW + 1 })).resolves.toEqual({
      ok: true,
      passId: "pass_0123456789abcdef",
      channelId: "room-1",
      revoked: true,
    });
  });

  it("does not allow consume after revoke", async () => {
    const passes = service();
    await issue(passes);
    await passes.revokeJoinPass("pass_0123456789abcdef", "host-1", { now: NOW + 1 });
    await expect(passes.consumeJoinPass("pass_0123456789abcdef", "guest-1", { now: NOW + 2 })).resolves.toEqual({
      ok: false,
      reason: "not_found",
      passId: "pass_0123456789abcdef",
      channelId: "room-1",
    });
  });

  it("rejects consume for invalid pass or consumer", async () => {
    const passes = service();
    await expect(passes.consumeJoinPass("  ", "guest-1")).resolves.toEqual({
      ok: false,
      reason: "invalid_pass",
    });
    await expect(passes.consumeJoinPass("pass_0123456789abcdef", " ")).resolves.toEqual({
      ok: false,
      reason: "invalid_consumer",
      passId: "pass_0123456789abcdef",
    });
  });

  it("rejects revoke for invalid pass or issuer", async () => {
    const passes = service();
    await expect(passes.revokeJoinPass("  ", "host-1")).resolves.toEqual({
      ok: false,
      reason: "invalid_pass",
    });
    await expect(passes.revokeJoinPass("pass_0123456789abcdef", " ")).resolves.toEqual({
      ok: false,
      reason: "invalid_issuer",
      passId: "pass_0123456789abcdef",
    });
  });

  it("returns the public view from getJoinPass", async () => {
    const passes = service();
    await issue(passes);
    await expect(passes.getJoinPass("pass_0123456789abcdef", { now: NOW + 5_000 })).resolves.toMatchObject({
      passId: "pass_0123456789abcdef",
      status: "issued",
      remainingSeconds: 115,
    });
  });

  it("marks a consumed pass in getJoinPass", async () => {
    const passes = service();
    await issue(passes);
    await passes.consumeJoinPass("pass_0123456789abcdef", "guest-1", { now: NOW + 1_000 });
    await expect(passes.getJoinPass("pass_0123456789abcdef", { now: NOW + 2_000 })).resolves.toMatchObject({
      status: "consumed",
      consumedBy: "guest-1",
    });
  });

  it("supports the consume revoke and get convenience functions", async () => {
    const store = new MemoryJoinPassStore();
    const passes = new JoinPassService(store);
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      createPassId: () => "pass_cccccccccccccccc",
    });
    await expect(getJoinPass("pass_cccccccccccccccc", { now: NOW }, store)).resolves.toMatchObject({
      status: "issued",
    });
    await expect(consumeJoinPass("pass_cccccccccccccccc", "guest-1", { now: NOW + 1 }, store)).resolves.toMatchObject({
      ok: true,
    });
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      createPassId: () => "pass_dddddddddddddddd",
    });
    await expect(revokeJoinPass("pass_dddddddddddddddd", "host-1", { now: NOW + 1 }, store)).resolves.toMatchObject({
      revoked: true,
    });
  });
});
