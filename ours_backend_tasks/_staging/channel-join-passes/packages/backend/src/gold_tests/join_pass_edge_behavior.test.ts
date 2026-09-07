import { describe, expect, it } from "vitest";
import {
  JoinPassService,
  MemoryJoinPassStore,
  createJoinPassService,
} from "#ours/backend/services/join_passes.ts";

const NOW = 1_700_000_000_000;

describe("Join pass extra edges", () => {
  it("keeps colons inside a trimmed channel id", async () => {
    const passes = createJoinPassService(new MemoryJoinPassStore());
    const result = await passes.issueJoinPass("  team:west  ", "host-1", {
      now: NOW,
      createPassId: () => "pass_aaaaaaaaaaaaaaaa",
    });
    expect(result).toMatchObject({ ok: true, channelId: "team:west" });
  });

  it("trims a note before storing it", async () => {
    const passes = createJoinPassService(new MemoryJoinPassStore());
    const result = await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      note: "  vip  ",
      createPassId: () => "pass_bbbbbbbbbbbbbbbb",
    });
    expect(result).toMatchObject({ note: "vip" });
  });

  it("drops a blank note", async () => {
    const passes = createJoinPassService(new MemoryJoinPassStore());
    const result = await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      note: "   ",
      createPassId: () => "pass_cccccccccccccccc",
    });
    expect(result.ok).toBe(true);
    expect(result).not.toHaveProperty("note");
  });

  it("reports expired when revoking after the ttl", async () => {
    const passes = createJoinPassService(new MemoryJoinPassStore());
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      ttlSeconds: 30,
      createPassId: () => "pass_dddddddddddddddd",
    });
    await expect(
      passes.revokeJoinPass("pass_dddddddddddddddd", "host-1", { now: NOW + 30_000 }),
    ).resolves.toMatchObject({ reason: "expired" });
  });

  it("reports already_consumed when revoking a consumed pass", async () => {
    const passes = createJoinPassService(new MemoryJoinPassStore());
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      createPassId: () => "pass_eeeeeeeeeeeeeeee",
    });
    await passes.consumeJoinPass("pass_eeeeeeeeeeeeeeee", "guest-1", { now: NOW + 1 });
    await expect(
      passes.revokeJoinPass("pass_eeeeeeeeeeeeeeee", "host-1", { now: NOW + 2 }),
    ).resolves.toMatchObject({ reason: "already_consumed" });
  });

  it("returns null from getJoinPass for an invalid pass id", async () => {
    const passes = createJoinPassService(new MemoryJoinPassStore());
    await expect(passes.getJoinPass("  ", { now: NOW })).resolves.toBeNull();
  });

  it("lets exactly one consumer win when two consume the same pass", async () => {
    const store = new MemoryJoinPassStore();
    const passes = createJoinPassService(store);
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      createPassId: () => "pass_ffffffffffffffff",
    });
    const first = passes.consumeJoinPass("pass_ffffffffffffffff", "guest-a", { now: NOW + 1 });
    const second = passes.consumeJoinPass("pass_ffffffffffffffff", "guest-b", { now: NOW + 1 });
    const results = await Promise.all([first, second]);
    const winners = results.filter((row) => row.ok);
    const losers = results.filter((row) => !row.ok);
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(losers[0]).toMatchObject({ reason: "already_consumed" });
  });

  it("can construct the service through createJoinPassService", async () => {
    const store = new MemoryJoinPassStore();
    const passes = createJoinPassService(store);
    expect(passes).toBeInstanceOf(JoinPassService);
    await expect(passes.listJoinPasses("room-1", { now: NOW })).resolves.toEqual([]);
  });

  it("marks status expired in getJoinPass after the ttl without sweeping", async () => {
    const passes = createJoinPassService(new MemoryJoinPassStore());
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      ttlSeconds: 30,
      createPassId: () => "pass_9999999999999999",
    });
    await expect(passes.getJoinPass("pass_9999999999999999", { now: NOW + 30_000 })).resolves.toMatchObject({
      status: "expired",
      remainingSeconds: 0,
    });
  });
});
