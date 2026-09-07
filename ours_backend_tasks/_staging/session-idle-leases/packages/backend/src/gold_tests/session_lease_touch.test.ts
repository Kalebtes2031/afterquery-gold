import { describe, expect, it } from "vitest";
import {
  DEFAULT_DISCONNECT_AFTER_SECONDS,
  DEFAULT_IDLE_AFTER_SECONDS,
  MAX_DISCONNECT_AFTER_SECONDS,
  MAX_IDLE_AFTER_SECONDS,
  MIN_DISCONNECT_AFTER_SECONDS,
  MIN_IDLE_AFTER_SECONDS,
  MemorySessionLeaseStore,
  SessionLeaseService,
  touchActivity,
} from "#ours/backend/services/session_leases.ts";

const NOW = 1_700_000_000_000;

const service = () => new SessionLeaseService(new MemorySessionLeaseStore());

describe("Session lease touch activity", () => {
  it("creates an active lease on first touch", async () => {
    const result = await service().touchActivity("room-1", "alice", "conn-1", { now: NOW });
    expect(result).toEqual({
      ok: true,
      channelId: "room-1",
      nickname: "alice",
      connectionId: "conn-1",
      state: "active",
      lastActiveAt: NOW,
      version: 1,
    });
  });

  it("stores the nickname in lowercase and keeps the channel id case", async () => {
    const leases = service();
    const result = await leases.touchActivity("  Room:West  ", "  AlIce  ", "  Conn-1  ", { now: NOW });
    expect(result).toMatchObject({
      ok: true,
      channelId: "Room:West",
      nickname: "alice",
      connectionId: "Conn-1",
    });
  });

  it("refreshes an idle lease back to active", async () => {
    const leases = service();
    await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW });
    await leases.markIdle("room-1", "alice", { now: NOW + 10_000 });
    const result = await leases.touchActivity("room-1", "alice", "conn-2", { now: NOW + 20_000 });
    expect(result).toMatchObject({
      ok: true,
      state: "active",
      connectionId: "conn-2",
      lastActiveAt: NOW + 20_000,
      version: 3,
    });
    await expect(leases.getLease("room-1", "alice", { now: NOW + 20_000 })).resolves.toMatchObject({
      idleAt: null,
      disconnectedAt: null,
      state: "active",
    });
  });

  it("refreshes a disconnected lease back to active", async () => {
    const leases = service();
    await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW });
    await leases.markDisconnected("room-1", "alice", { now: NOW + 5_000 });
    const result = await leases.touchActivity("room-1", "alice", "conn-9", { now: NOW + 6_000 });
    expect(result).toMatchObject({ ok: true, state: "active", connectionId: "conn-9" });
  });

  it("rejects an empty channel id", async () => {
    await expect(service().touchActivity("   ", "alice", "conn-1", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "invalid_channel",
    });
  });

  it("rejects a nickname that fails the shared nickname rules", async () => {
    await expect(service().touchActivity("room-1", "ab", "conn-1", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "invalid_nickname",
      channelId: "room-1",
    });
  });

  it("rejects a blank connection id", async () => {
    await expect(service().touchActivity("room-1", "alice", "  ", { now: NOW })).resolves.toEqual({
      ok: false,
      reason: "invalid_connection",
      channelId: "room-1",
      nickname: "alice",
    });
  });

  it("supports the touchActivity convenience function", async () => {
    const store = new MemorySessionLeaseStore();
    const result = await touchActivity("room-1", "alice", "conn-1", { now: NOW }, store);
    expect(result).toMatchObject({ ok: true, state: "active" });
  });

  it("exposes the default idle and disconnect thresholds", () => {
    expect(DEFAULT_IDLE_AFTER_SECONDS).toBe(300);
    expect(MIN_IDLE_AFTER_SECONDS).toBe(30);
    expect(MAX_IDLE_AFTER_SECONDS).toBe(3_600);
    expect(DEFAULT_DISCONNECT_AFTER_SECONDS).toBe(900);
    expect(MIN_DISCONNECT_AFTER_SECONDS).toBe(60);
    expect(MAX_DISCONNECT_AFTER_SECONDS).toBe(7_200);
  });

  it("bumps the version on each successful touch", async () => {
    const leases = service();
    const first = await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW });
    const second = await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW + 1 });
    expect(first).toMatchObject({ version: 1 });
    expect(second).toMatchObject({ version: 2 });
  });
});
