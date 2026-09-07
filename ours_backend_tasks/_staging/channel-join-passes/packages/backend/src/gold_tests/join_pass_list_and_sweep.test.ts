import { describe, expect, it } from "vitest";
import {
  JoinPassService,
  MemoryJoinPassStore,
  listJoinPasses,
  sweepExpiredJoinPasses,
} from "#ours/backend/services/join_passes.ts";

const NOW = 1_700_000_000_000;

const service = () => new JoinPassService(new MemoryJoinPassStore());

describe("Join pass lists and sweep", () => {
  it("lists passes for a channel sorted by pass id", async () => {
    const passes = service();
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      createPassId: () => "pass_bbbbbbbbbbbbbbbb",
    });
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      createPassId: () => "pass_aaaaaaaaaaaaaaaa",
    });
    const listed = await passes.listJoinPasses("room-1", { now: NOW });
    expect(listed.map((row) => row.passId)).toEqual(["pass_aaaaaaaaaaaaaaaa", "pass_bbbbbbbbbbbbbbbb"]);
  });

  it("returns an empty list for an invalid channel id", async () => {
    await expect(service().listJoinPasses("   ", { now: NOW })).resolves.toEqual([]);
  });

  it("includes consumed and revoked rows in the channel list", async () => {
    const passes = service();
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      createPassId: () => "pass_aaaaaaaaaaaaaaaa",
    });
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      createPassId: () => "pass_bbbbbbbbbbbbbbbb",
    });
    await passes.consumeJoinPass("pass_aaaaaaaaaaaaaaaa", "guest-1", { now: NOW + 1 });
    await passes.revokeJoinPass("pass_bbbbbbbbbbbbbbbb", "host-1", { now: NOW + 1 });
    const listed = await passes.listJoinPasses("room-1", { now: NOW + 2 });
    expect(listed.map((row) => row.status)).toEqual(["consumed", "revoked"]);
  });

  it("sweeps only expired unconsumed unreoked passes", async () => {
    const passes = service();
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      ttlSeconds: 30,
      createPassId: () => "pass_aaaaaaaaaaaaaaaa",
    });
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      ttlSeconds: 120,
      createPassId: () => "pass_bbbbbbbbbbbbbbbb",
    });
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      ttlSeconds: 30,
      createPassId: () => "pass_cccccccccccccccc",
    });
    await passes.consumeJoinPass("pass_cccccccccccccccc", "guest-1", { now: NOW + 1 });
    await expect(passes.sweepExpiredJoinPasses("room-1", { now: NOW + 30_000 })).resolves.toEqual({
      removed: 1,
      passIds: ["pass_aaaaaaaaaaaaaaaa"],
    });
    await expect(passes.getJoinPass("pass_bbbbbbbbbbbbbbbb", { now: NOW + 30_000 })).resolves.toMatchObject({
      status: "issued",
    });
    await expect(passes.getJoinPass("pass_cccccccccccccccc", { now: NOW + 30_000 })).resolves.toMatchObject({
      status: "consumed",
    });
  });

  it("sweeps across every channel when no channel is given", async () => {
    const passes = service();
    await passes.issueJoinPass("room-b", "host-1", {
      now: NOW,
      ttlSeconds: 30,
      createPassId: () => "pass_bbbbbbbbbbbbbbbb",
    });
    await passes.issueJoinPass("room-a", "host-1", {
      now: NOW,
      ttlSeconds: 30,
      createPassId: () => "pass_aaaaaaaaaaaaaaaa",
    });
    await expect(passes.sweepExpiredJoinPasses(undefined, { now: NOW + 30_000 })).resolves.toEqual({
      removed: 2,
      passIds: ["pass_aaaaaaaaaaaaaaaa", "pass_bbbbbbbbbbbbbbbb"],
    });
  });

  it("returns a zero sweep for an invalid channel selection", async () => {
    await expect(service().sweepExpiredJoinPasses("  ", { now: NOW })).resolves.toEqual({
      removed: 0,
      passIds: [],
    });
  });

  it("floors remaining time and never goes negative", async () => {
    const passes = service();
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      ttlSeconds: 30,
      createPassId: () => "pass_aaaaaaaaaaaaaaaa",
    });
    const view = await passes.getJoinPass("pass_aaaaaaaaaaaaaaaa", { now: NOW + 29_400 });
    expect(view?.remainingSeconds).toBe(0);
  });

  it("supports the list and sweep convenience functions", async () => {
    const store = new MemoryJoinPassStore();
    const passes = new JoinPassService(store);
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      createPassId: () => "pass_aaaaaaaaaaaaaaaa",
    });
    await expect(listJoinPasses("room-1", { now: NOW }, store)).resolves.toHaveLength(1);
    await expect(sweepExpiredJoinPasses("room-1", { now: NOW }, store)).resolves.toEqual({
      removed: 0,
      passIds: [],
    });
  });

  it("does not list passes from another channel", async () => {
    const passes = service();
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      createPassId: () => "pass_aaaaaaaaaaaaaaaa",
    });
    await passes.issueJoinPass("room-2", "host-1", {
      now: NOW,
      createPassId: () => "pass_bbbbbbbbbbbbbbbb",
    });
    await expect(passes.listJoinPasses("room-1", { now: NOW })).resolves.toHaveLength(1);
  });

  it("keeps a live pass after a sweep that finds nothing expired", async () => {
    const passes = service();
    await passes.issueJoinPass("room-1", "host-1", {
      now: NOW,
      ttlSeconds: 120,
      createPassId: () => "pass_aaaaaaaaaaaaaaaa",
    });
    await passes.sweepExpiredJoinPasses("room-1", { now: NOW + 10_000 });
    await expect(passes.listJoinPasses("room-1", { now: NOW + 10_000 })).resolves.toHaveLength(1);
  });
});
