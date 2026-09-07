import { describe, expect, it } from "vitest";
import {
  MemorySessionLeaseStore,
  SessionLeaseService,
  createSessionLeaseService,
} from "#ours/backend/services/session_leases.ts";

const NOW = 1_700_000_000_000;

describe("Session lease extra edges", () => {
  it("keeps colons inside a trimmed channel id", async () => {
    const leases = createSessionLeaseService(new MemorySessionLeaseStore());
    const result = await leases.touchActivity("  team:west  ", "alice", "conn-1", { now: NOW });
    expect(result).toMatchObject({ ok: true, channelId: "team:west" });
  });

  it("normalizes a decomposed accent before storing the nickname", async () => {
    const leases = createSessionLeaseService(new MemorySessionLeaseStore());
    const decomposed = "e\u0301va";
    const result = await leases.touchActivity("room-1", decomposed, "conn-1", { now: NOW });
    expect(result).toMatchObject({ ok: true, nickname: "éva".normalize("NFC").toLowerCase() });
  });

  it("uses the default idle threshold when idleAfterSeconds is not finite", async () => {
    const leases = createSessionLeaseService(new MemorySessionLeaseStore());
    await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW });
    await expect(
      leases.sweepIdleLeases("room-1", {
        now: NOW + 300_000,
        idleAfterSeconds: Number.POSITIVE_INFINITY,
      }),
    ).resolves.toEqual({
      transitioned: 1,
      nicknames: ["alice"],
    });
  });

  it("uses the default disconnect threshold when disconnectAfterSeconds is not finite", async () => {
    const leases = createSessionLeaseService(new MemorySessionLeaseStore());
    await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW });
    await leases.markIdle("room-1", "alice", { now: NOW + 1 });
    await expect(
      leases.sweepDisconnectedLeases("room-1", {
        now: NOW + 1 + 900_000,
        disconnectAfterSeconds: Number.NaN,
      }),
    ).resolves.toEqual({
      transitioned: 1,
      nicknames: ["alice"],
    });
  });

  it("clamps an oversized idleAfterSeconds down to one hour", async () => {
    const leases = createSessionLeaseService(new MemorySessionLeaseStore());
    await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW });
    await expect(
      leases.sweepIdleLeases("room-1", {
        now: NOW + 3_600_000,
        idleAfterSeconds: 99_999,
      }),
    ).resolves.toEqual({
      transitioned: 1,
      nicknames: ["alice"],
    });
  });

  it("clamps an oversized disconnectAfterSeconds down to two hours", async () => {
    const leases = createSessionLeaseService(new MemorySessionLeaseStore());
    await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW });
    await leases.markIdle("room-1", "alice", { now: NOW + 1 });
    await expect(
      leases.sweepDisconnectedLeases("room-1", {
        now: NOW + 1 + 7_200_000,
        disconnectAfterSeconds: 99_999,
      }),
    ).resolves.toEqual({
      transitioned: 1,
      nicknames: ["alice"],
    });
  });

  it("never reports negative idle or disconnected durations", async () => {
    const leases = createSessionLeaseService(new MemorySessionLeaseStore());
    await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW });
    await leases.markIdle("room-1", "alice", { now: NOW + 5_000 });
    const view = await leases.getLease("room-1", "alice", { now: NOW + 4_000 });
    expect(view?.idleForSeconds).toBe(0);
  });

  it("can construct the service through createSessionLeaseService", async () => {
    const store = new MemorySessionLeaseStore();
    const leases = createSessionLeaseService(store);
    expect(leases).toBeInstanceOf(SessionLeaseService);
    await expect(leases.listChannelLeases("room-1", { now: NOW })).resolves.toEqual([]);
  });

  it("keeps disconnected nicknames out of the idle list", async () => {
    const leases = createSessionLeaseService(new MemorySessionLeaseStore());
    await leases.touchActivity("room-1", "alice", "conn-1", { now: NOW });
    await leases.markDisconnected("room-1", "alice", { now: NOW + 1 });
    await expect(leases.listIdleNicknames("room-1", { now: NOW + 1 })).resolves.toEqual([]);
  });
});
