import { describe, expect, it } from "vitest";
import {
  MemorySessionLeaseStore,
  SessionLeaseService,
  listChannelLeases,
  listIdleNicknames,
  sweepDisconnectedLeases,
  sweepIdleLeases,
} from "#ours/backend/services/session_leases.ts";

const NOW = 1_700_000_000_000;

const service = () => new SessionLeaseService(new MemorySessionLeaseStore());

describe("Session lease lists and sweep", () => {
  it("lists channel leases sorted by nickname", async () => {
    const leases = service();
    await leases.touchActivity("room-1", "zoe", "c1", { now: NOW });
    await leases.touchActivity("room-1", "amy", "c2", { now: NOW });
    const listed = await leases.listChannelLeases("room-1", { now: NOW });
    expect(listed.map((row) => row.nickname)).toEqual(["amy", "zoe"]);
  });

  it("lists idle nicknames in lexical order", async () => {
    const leases = service();
    await leases.touchActivity("room-1", "zoe", "c1", { now: NOW });
    await leases.touchActivity("room-1", "amy", "c2", { now: NOW });
    await leases.touchActivity("room-1", "bob", "c3", { now: NOW });
    await leases.markIdle("room-1", "zoe", { now: NOW + 1 });
    await leases.markIdle("room-1", "amy", { now: NOW + 1 });
    await expect(leases.listIdleNicknames("room-1", { now: NOW + 1 })).resolves.toEqual(["amy", "zoe"]);
  });

  it("returns empty lists for an invalid channel id", async () => {
    await expect(service().listChannelLeases("   ", { now: NOW })).resolves.toEqual([]);
    await expect(service().listIdleNicknames("   ", { now: NOW })).resolves.toEqual([]);
  });

  it("sweeps active leases into idle after the idle threshold", async () => {
    const leases = service();
    await leases.touchActivity("room-1", "alice", "c1", { now: NOW });
    await leases.touchActivity("room-1", "bob", "c2", { now: NOW + 100_000 });
    await expect(
      leases.sweepIdleLeases("room-1", { now: NOW + 300_000, idleAfterSeconds: 300 }),
    ).resolves.toEqual({
      transitioned: 1,
      nicknames: ["alice"],
    });
    await expect(leases.getLease("room-1", "alice", { now: NOW + 300_000 })).resolves.toMatchObject({
      state: "idle",
    });
    await expect(leases.getLease("room-1", "bob", { now: NOW + 300_000 })).resolves.toMatchObject({
      state: "active",
    });
  });

  it("clamps idleAfterSeconds when sweeping", async () => {
    const leases = service();
    await leases.touchActivity("room-1", "alice", "c1", { now: NOW });
    await expect(
      leases.sweepIdleLeases("room-1", { now: NOW + 30_000, idleAfterSeconds: 1 }),
    ).resolves.toEqual({
      transitioned: 1,
      nicknames: ["alice"],
    });
  });

  it("sweeps idle leases into disconnected after the disconnect threshold", async () => {
    const leases = service();
    await leases.touchActivity("room-1", "alice", "c1", { now: NOW });
    await leases.markIdle("room-1", "alice", { now: NOW + 1_000 });
    await expect(
      leases.sweepDisconnectedLeases("room-1", {
        now: NOW + 1_000 + 900_000,
        disconnectAfterSeconds: 900,
      }),
    ).resolves.toEqual({
      transitioned: 1,
      nicknames: ["alice"],
    });
    await expect(leases.getLease("room-1", "alice", { now: NOW + 1_000 + 900_000 })).resolves.toMatchObject({
      state: "disconnected",
    });
  });

  it("does not disconnect an active lease during disconnect sweep", async () => {
    const leases = service();
    await leases.touchActivity("room-1", "alice", "c1", { now: NOW });
    await expect(
      leases.sweepDisconnectedLeases("room-1", { now: NOW + 9_000_000, disconnectAfterSeconds: 60 }),
    ).resolves.toEqual({ transitioned: 0, nicknames: [] });
  });

  it("returns a zero sweep for an invalid channel selection", async () => {
    await expect(service().sweepIdleLeases("  ", { now: NOW })).resolves.toEqual({
      transitioned: 0,
      nicknames: [],
    });
    await expect(service().sweepDisconnectedLeases("  ", { now: NOW })).resolves.toEqual({
      transitioned: 0,
      nicknames: [],
    });
  });

  it("sweeps across every channel when no channel is given", async () => {
    const leases = service();
    await leases.touchActivity("room-b", "alice", "c1", { now: NOW });
    await leases.touchActivity("room-a", "bob", "c2", { now: NOW });
    await expect(
      leases.sweepIdleLeases(undefined, { now: NOW + 300_000, idleAfterSeconds: 300 }),
    ).resolves.toEqual({
      transitioned: 2,
      nicknames: ["alice", "bob"],
    });
  });

  it("supports the list and sweep convenience functions", async () => {
    const store = new MemorySessionLeaseStore();
    const leases = new SessionLeaseService(store);
    await leases.touchActivity("room-1", "alice", "c1", { now: NOW });
    await expect(listChannelLeases("room-1", { now: NOW }, store)).resolves.toHaveLength(1);
    await expect(listIdleNicknames("room-1", { now: NOW }, store)).resolves.toEqual([]);
    await expect(sweepIdleLeases("room-1", { now: NOW }, store)).resolves.toEqual({
      transitioned: 0,
      nicknames: [],
    });
    await expect(sweepDisconnectedLeases("room-1", { now: NOW }, store)).resolves.toEqual({
      transitioned: 0,
      nicknames: [],
    });
  });

  it("clamps disconnectAfterSeconds when sweeping", async () => {
    const leases = service();
    await leases.touchActivity("room-1", "alice", "c1", { now: NOW });
    await leases.markIdle("room-1", "alice", { now: NOW + 1 });
    await expect(
      leases.sweepDisconnectedLeases("room-1", {
        now: NOW + 1 + 60_000,
        disconnectAfterSeconds: 5,
      }),
    ).resolves.toEqual({
      transitioned: 1,
      nicknames: ["alice"],
    });
  });
});
