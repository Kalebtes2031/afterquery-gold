import { describe, expect, it } from "vitest";
import {
  MemorySessionLeaseStore,
  SessionLeaseService,
  getLease,
  markDisconnected,
  markIdle,
} from "#ours/backend/services/session_leases.ts";

const NOW = 1_700_000_000_000;

const service = () => new SessionLeaseService(new MemorySessionLeaseStore());

describe("Session lease mark and lookup", () => {
  it("marks an active lease idle", async () => {
    const leases = service();
    await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW });
    await expect(leases.markIdle("room-1", "alice", { now: NOW + 1_000 })).resolves.toEqual({
      ok: true,
      channelId: "room-1",
      nickname: "alice",
      connectionId: "conn-1",
      state: "idle",
      version: 2,
    });
  });

  it("is idempotent when marking an already idle lease", async () => {
    const leases = service();
    await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW });
    await leases.markIdle("room-1", "alice", { now: NOW + 1_000 });
    await expect(leases.markIdle("room-1", "alice", { now: NOW + 2_000 })).resolves.toMatchObject({
      ok: true,
      state: "idle",
      version: 2,
    });
  });

  it("marks a lease disconnected from active or idle", async () => {
    const leases = service();
    await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW });
    await expect(leases.markDisconnected("room-1", "alice", { now: NOW + 1_000 })).resolves.toMatchObject({
      ok: true,
      state: "disconnected",
    });
    await leases.touchActivity("room-1", "bob", "conn-2", { now: NOW });
    await leases.markIdle("room-1", "bob", { now: NOW + 1_000 });
    await expect(leases.markDisconnected("room-1", "bob", { now: NOW + 2_000 })).resolves.toMatchObject({
      ok: true,
      state: "disconnected",
    });
  });

  it("reports not_found when marking a missing lease", async () => {
    await expect(service().markIdle("room-1", "alice", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "not_found",
      channelId: "room-1",
      nickname: "alice",
    });
  });

  it("does not mark a disconnected lease idle", async () => {
    const leases = service();
    await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW });
    await leases.markDisconnected("room-1", "alice", { now: NOW + 1 });
    await expect(leases.markIdle("room-1", "alice", { now: NOW + 2 })).resolves.toEqual({
      ok: false,
      reason: "not_found",
      channelId: "room-1",
      nickname: "alice",
    });
  });

  it("rejects mark helpers for invalid channel or nickname", async () => {
    const leases = service();
    await expect(leases.markIdle("  ", "alice")).resolves.toEqual({
      ok: false,
      reason: "invalid_channel",
    });
    await expect(leases.markDisconnected("room-1", "ab")).resolves.toEqual({
      ok: false,
      reason: "invalid_nickname",
      channelId: "room-1",
    });
  });

  it("returns a lease view from getLease", async () => {
    const leases = service();
    await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW });
    await leases.markIdle("room-1", "alice", { now: NOW + 5_000 });
    await expect(leases.getLease("room-1", "ALICE", { now: NOW + 8_000 })).resolves.toEqual({
      channelId: "room-1",
      nickname: "alice",
      connectionId: "conn-1",
      state: "idle",
      lastActiveAt: NOW,
      idleAt: NOW + 5_000,
      disconnectedAt: null,
      version: 2,
      idleForSeconds: 3,
      disconnectedForSeconds: null,
    });
  });

  it("returns null from getLease for missing or invalid lookups", async () => {
    const leases = service();
    await expect(leases.getLease("room-1", "missing", { now: NOW })).resolves.toBeNull();
    await expect(leases.getLease("  ", "alice", { now: NOW })).resolves.toBeNull();
    await expect(leases.getLease("room-1", "ab", { now: NOW })).resolves.toBeNull();
  });

  it("supports the mark and get convenience functions", async () => {
    const store = new MemorySessionLeaseStore();
    const leases = new SessionLeaseService(store);
    await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW });
    await expect(markIdle("room-1", "alice", { now: NOW + 1 }, store)).resolves.toMatchObject({ state: "idle" });
    await expect(getLease("room-1", "alice", { now: NOW + 1 }, store)).resolves.toMatchObject({ state: "idle" });
    await expect(markDisconnected("room-1", "alice", { now: NOW + 2 }, store)).resolves.toMatchObject({
      state: "disconnected",
    });
  });

  it("is idempotent when marking an already disconnected lease", async () => {
    const leases = service();
    await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW });
    await leases.markDisconnected("room-1", "alice", { now: NOW + 1 });
    await expect(leases.markDisconnected("room-1", "alice", { now: NOW + 2 })).resolves.toMatchObject({
      ok: true,
      state: "disconnected",
      version: 2,
    });
  });
});
