import { createMemorySessionLeaseStore } from "#ours/backend/services/session_lease_store.ts";
import { nextLeaseVersion } from "#ours/backend/services/session_lease_policy.ts";
import type {
  MarkStateResult,
  SessionLeaseClockOptions,
  SessionLeaseRecord,
  SessionLeaseStore,
  SessionLeaseSweepResult,
  SessionLeaseView,
  SweepLeaseOptions,
  TouchActivityOptions,
  TouchActivityResult,
} from "#ours/backend/services/session_lease_types.ts";
import {
  clampDisconnectAfterSeconds,
  clampIdleAfterSeconds,
  normalizeChannelId,
  normalizeConnectionId,
  normalizeLeaseNickname,
  readSessionLeaseClock,
  sessionLeaseFailure,
  shouldMarkDisconnected,
  shouldMarkIdle,
  sortLeaseViews,
  toSessionLeaseView,
  uniqueSortedIds,
} from "#ours/backend/services/session_lease_utils.ts";

export class SessionLeaseService {
  private readonly store: SessionLeaseStore;

  constructor(store: SessionLeaseStore = createMemorySessionLeaseStore()) {
    this.store = store;
  }

  async touchActivity(
    channelId: string,
    nickname: string,
    connectionId: string,
    options: TouchActivityOptions = {},
  ): Promise<TouchActivityResult> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return sessionLeaseFailure("invalid_channel");
    }

    const user = normalizeLeaseNickname(nickname);
    if (!user) {
      return sessionLeaseFailure("invalid_nickname", { channelId: channel });
    }

    const connection = normalizeConnectionId(connectionId);
    if (!connection) {
      return sessionLeaseFailure("invalid_connection", { channelId: channel, nickname: user });
    }

    const now = readSessionLeaseClock(options.now);
    const current = await this.store.getLease(channel, user);

    const next: SessionLeaseRecord = {
      channelId: channel,
      nickname: user,
      connectionId: connection,
      state: "active",
      lastActiveAt: now,
      idleAt: null,
      disconnectedAt: null,
      version: current ? nextLeaseVersion(current.version) : 1,
    };

    const expectedVersion = current ? current.version : null;
    const swapped = await this.store.compareAndSetLease(channel, user, expectedVersion, next);
    if (!swapped) {
      return this.touchActivity(channelId, nickname, connectionId, options);
    }

    return {
      ok: true,
      channelId: channel,
      nickname: user,
      connectionId: connection,
      state: "active",
      lastActiveAt: now,
      version: next.version,
    };
  }

  async markIdle(
    channelId: string,
    nickname: string,
    options: SessionLeaseClockOptions = {},
  ): Promise<MarkStateResult> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return sessionLeaseFailure("invalid_channel");
    }

    const user = normalizeLeaseNickname(nickname);
    if (!user) {
      return sessionLeaseFailure("invalid_nickname", { channelId: channel });
    }

    const now = readSessionLeaseClock(options.now);
    const current = await this.store.getLease(channel, user);
    if (!current) {
      return sessionLeaseFailure("not_found", { channelId: channel, nickname: user });
    }

    if (current.state === "idle") {
      return {
        ok: true,
        channelId: channel,
        nickname: user,
        connectionId: current.connectionId,
        state: "idle",
        version: current.version,
      };
    }

    if (current.state === "disconnected") {
      return sessionLeaseFailure("not_found", { channelId: channel, nickname: user });
    }

    const next: SessionLeaseRecord = {
      ...current,
      state: "idle",
      idleAt: now,
      disconnectedAt: null,
      version: nextLeaseVersion(current.version),
    };

    const swapped = await this.store.compareAndSetLease(channel, user, current.version, next);
    if (!swapped) {
      return this.markIdle(channelId, nickname, options);
    }

    return {
      ok: true,
      channelId: channel,
      nickname: user,
      connectionId: current.connectionId,
      state: "idle",
      version: next.version,
    };
  }

  async markDisconnected(
    channelId: string,
    nickname: string,
    options: SessionLeaseClockOptions = {},
  ): Promise<MarkStateResult> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return sessionLeaseFailure("invalid_channel");
    }

    const user = normalizeLeaseNickname(nickname);
    if (!user) {
      return sessionLeaseFailure("invalid_nickname", { channelId: channel });
    }

    const now = readSessionLeaseClock(options.now);
    const current = await this.store.getLease(channel, user);
    if (!current) {
      return sessionLeaseFailure("not_found", { channelId: channel, nickname: user });
    }

    if (current.state === "disconnected") {
      return {
        ok: true,
        channelId: channel,
        nickname: user,
        connectionId: current.connectionId,
        state: "disconnected",
        version: current.version,
      };
    }

    const next: SessionLeaseRecord = {
      ...current,
      state: "disconnected",
      idleAt: current.idleAt ?? now,
      disconnectedAt: now,
      version: nextLeaseVersion(current.version),
    };

    const swapped = await this.store.compareAndSetLease(channel, user, current.version, next);
    if (!swapped) {
      return this.markDisconnected(channelId, nickname, options);
    }

    return {
      ok: true,
      channelId: channel,
      nickname: user,
      connectionId: current.connectionId,
      state: "disconnected",
      version: next.version,
    };
  }

  async getLease(
    channelId: string,
    nickname: string,
    options: SessionLeaseClockOptions = {},
  ): Promise<SessionLeaseView | null> {
    const channel = normalizeChannelId(channelId);
    const user = normalizeLeaseNickname(nickname);
    if (!channel || !user) {
      return null;
    }
    const now = readSessionLeaseClock(options.now);
    const record = await this.store.getLease(channel, user);
    return record ? toSessionLeaseView(record, now) : null;
  }

  async listChannelLeases(channelId: string, options: SessionLeaseClockOptions = {}): Promise<SessionLeaseView[]> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return [];
    }
    const now = readSessionLeaseClock(options.now);
    const views = (await this.store.listLeases(channel)).map((record) => toSessionLeaseView(record, now));
    return sortLeaseViews(views);
  }

  async listIdleNicknames(channelId: string, options: SessionLeaseClockOptions = {}): Promise<string[]> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return [];
    }
    const nicknames: string[] = [];
    for (const record of await this.store.listLeases(channel)) {
      if (record.state === "idle") {
        nicknames.push(record.nickname);
      }
    }
    return uniqueSortedIds(nicknames);
  }

  async sweepIdleLeases(
    channelId?: string,
    options: SweepLeaseOptions = {},
  ): Promise<SessionLeaseSweepResult> {
    const now = readSessionLeaseClock(options.now);
    const idleAfter = clampIdleAfterSeconds(options.idleAfterSeconds);
    const channel = channelId === undefined ? undefined : normalizeChannelId(channelId);
    if (channelId !== undefined && !channel) {
      return { transitioned: 0, nicknames: [] };
    }

    const nicknames: string[] = [];
    let transitioned = 0;

    for (const record of await this.store.listLeases(channel)) {
      if (!shouldMarkIdle(record, now, idleAfter)) {
        continue;
      }
      const next: SessionLeaseRecord = {
        ...record,
        state: "idle",
        idleAt: now,
        disconnectedAt: null,
        version: nextLeaseVersion(record.version),
      };
      const swapped = await this.store.compareAndSetLease(
        record.channelId,
        record.nickname,
        record.version,
        next,
      );
      if (!swapped) {
        continue;
      }
      transitioned += 1;
      nicknames.push(record.nickname);
    }

    return { transitioned, nicknames: uniqueSortedIds(nicknames) };
  }

  async sweepDisconnectedLeases(
    channelId?: string,
    options: SweepLeaseOptions = {},
  ): Promise<SessionLeaseSweepResult> {
    const now = readSessionLeaseClock(options.now);
    const disconnectAfter = clampDisconnectAfterSeconds(options.disconnectAfterSeconds);
    const channel = channelId === undefined ? undefined : normalizeChannelId(channelId);
    if (channelId !== undefined && !channel) {
      return { transitioned: 0, nicknames: [] };
    }

    const nicknames: string[] = [];
    let transitioned = 0;

    for (const record of await this.store.listLeases(channel)) {
      if (!shouldMarkDisconnected(record, now, disconnectAfter)) {
        continue;
      }
      const next: SessionLeaseRecord = {
        ...record,
        state: "disconnected",
        disconnectedAt: now,
        version: nextLeaseVersion(record.version),
      };
      const swapped = await this.store.compareAndSetLease(
        record.channelId,
        record.nickname,
        record.version,
        next,
      );
      if (!swapped) {
        continue;
      }
      transitioned += 1;
      nicknames.push(record.nickname);
    }

    return { transitioned, nicknames: uniqueSortedIds(nicknames) };
  }
}

export function createSessionLeaseService(store?: SessionLeaseStore): SessionLeaseService {
  return new SessionLeaseService(store ?? createMemorySessionLeaseStore());
}

export async function touchActivity(
  channelId: string,
  nickname: string,
  connectionId: string,
  options: TouchActivityOptions = {},
  store?: SessionLeaseStore,
): Promise<TouchActivityResult> {
  return createSessionLeaseService(store).touchActivity(channelId, nickname, connectionId, options);
}

export async function markIdle(
  channelId: string,
  nickname: string,
  options: SessionLeaseClockOptions = {},
  store?: SessionLeaseStore,
): Promise<MarkStateResult> {
  return createSessionLeaseService(store).markIdle(channelId, nickname, options);
}

export async function markDisconnected(
  channelId: string,
  nickname: string,
  options: SessionLeaseClockOptions = {},
  store?: SessionLeaseStore,
): Promise<MarkStateResult> {
  return createSessionLeaseService(store).markDisconnected(channelId, nickname, options);
}

export async function getLease(
  channelId: string,
  nickname: string,
  options: SessionLeaseClockOptions = {},
  store?: SessionLeaseStore,
): Promise<SessionLeaseView | null> {
  return createSessionLeaseService(store).getLease(channelId, nickname, options);
}

export async function listChannelLeases(
  channelId: string,
  options: SessionLeaseClockOptions = {},
  store?: SessionLeaseStore,
): Promise<SessionLeaseView[]> {
  return createSessionLeaseService(store).listChannelLeases(channelId, options);
}

export async function listIdleNicknames(
  channelId: string,
  options: SessionLeaseClockOptions = {},
  store?: SessionLeaseStore,
): Promise<string[]> {
  return createSessionLeaseService(store).listIdleNicknames(channelId, options);
}

export async function sweepIdleLeases(
  channelId?: string,
  options: SweepLeaseOptions = {},
  store?: SessionLeaseStore,
): Promise<SessionLeaseSweepResult> {
  return createSessionLeaseService(store).sweepIdleLeases(channelId, options);
}

export async function sweepDisconnectedLeases(
  channelId?: string,
  options: SweepLeaseOptions = {},
  store?: SessionLeaseStore,
): Promise<SessionLeaseSweepResult> {
  return createSessionLeaseService(store).sweepDisconnectedLeases(channelId, options);
}
