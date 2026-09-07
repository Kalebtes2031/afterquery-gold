import { createMemoryChannelTimeoutStore } from "#ours/backend/services/timeout_ledger_store.ts";
import type {
  ApplyChannelTimeoutOptions,
  ApplyChannelTimeoutResult,
  ChannelTimeoutRecord,
  ChannelTimeoutStore,
  ChannelTimeoutView,
  LiftChannelTimeoutResult,
  ListChannelTimeoutsOptions,
  TimedOutLookup,
  TimeoutClockOptions,
  TimeoutSweepResult,
} from "#ours/backend/services/timeout_ledger_types.ts";
import {
  liveTimeout,
  normalizeChannelId,
  normalizeModeratorId,
  normalizeTimeoutNickname,
  normalizeTimeoutReason,
  readTimeoutClock,
  sortTimeoutViews,
  timeoutExpiry,
  timeoutFailure,
  timeoutRemainingSeconds,
  toTimeoutView,
  uniqueSortedIds,
} from "#ours/backend/services/timeout_ledger_utils.ts";

export class ChannelTimeoutLedger {
  private readonly store: ChannelTimeoutStore;

  constructor(store: ChannelTimeoutStore = createMemoryChannelTimeoutStore()) {
    this.store = store;
  }

  async applyChannelTimeout(
    channelId: string,
    nickname: string,
    moderatorId: string,
    options: ApplyChannelTimeoutOptions = {},
  ): Promise<ApplyChannelTimeoutResult> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return timeoutFailure("invalid_channel");
    }

    const user = normalizeTimeoutNickname(nickname);
    if (!user) {
      return timeoutFailure("invalid_nickname", { channelId: channel });
    }

    const moderator = normalizeModeratorId(moderatorId);
    if (!moderator) {
      return timeoutFailure("invalid_moderator", { channelId: channel, nickname: user });
    }

    const now = readTimeoutClock(options.now);
    const expiresAt = timeoutExpiry(now, options.seconds);
    const reason = normalizeTimeoutReason(options.reason);
    const current = await this.store.getTimeout(channel, user);
    const live = liveTimeout(current, now);

    const next: ChannelTimeoutRecord = {
      channelId: channel,
      nickname: user,
      moderatorId: moderator,
      expiresAt,
    };
    if (reason !== undefined) {
      next.reason = reason;
    }

    if (live) {
      if (expiresAt > live.expiresAt) {
        const swapped = await this.store.compareAndSetTimeout(channel, user, live.expiresAt, next);
        if (!swapped) {
          return this.applyChannelTimeout(channelId, nickname, moderatorId, options);
        }
        return {
          ok: true,
          status: "extended",
          channelId: channel,
          nickname: user,
          moderatorId: moderator,
          expiresAt,
          remainingSeconds: timeoutRemainingSeconds(expiresAt, now),
          ...(reason !== undefined ? { reason } : {}),
        };
      }

      return {
        ok: true,
        status: "kept",
        channelId: live.channelId,
        nickname: live.nickname,
        moderatorId: live.moderatorId,
        expiresAt: live.expiresAt,
        remainingSeconds: timeoutRemainingSeconds(live.expiresAt, now),
        ...(live.reason !== undefined ? { reason: live.reason } : {}),
      };
    }

    if (current && !live) {
      await this.store.deleteTimeout(channel, user);
    }

    const created = await this.store.compareAndSetTimeout(channel, user, null, next);
    if (!created) {
      return this.applyChannelTimeout(channelId, nickname, moderatorId, options);
    }

    return {
      ok: true,
      status: "applied",
      channelId: channel,
      nickname: user,
      moderatorId: moderator,
      expiresAt,
      remainingSeconds: timeoutRemainingSeconds(expiresAt, now),
      ...(reason !== undefined ? { reason } : {}),
    };
  }

  async liftChannelTimeout(
    channelId: string,
    nickname: string,
    moderatorId: string,
    options: TimeoutClockOptions = {},
  ): Promise<LiftChannelTimeoutResult> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return timeoutFailure("invalid_channel");
    }

    const user = normalizeTimeoutNickname(nickname);
    if (!user) {
      return timeoutFailure("invalid_nickname", { channelId: channel });
    }

    const moderator = normalizeModeratorId(moderatorId);
    if (!moderator) {
      return timeoutFailure("invalid_moderator", { channelId: channel, nickname: user });
    }

    const now = readTimeoutClock(options.now);
    const current = await this.store.getTimeout(channel, user);
    if (!current) {
      return timeoutFailure("not_found", { channelId: channel, nickname: user });
    }
    if (current.expiresAt <= now) {
      await this.store.deleteTimeout(channel, user);
      return timeoutFailure("not_found", { channelId: channel, nickname: user });
    }

    await this.store.deleteTimeout(channel, user);
    return { ok: true, channelId: channel, nickname: user, lifted: true };
  }

  async isTimedOut(channelId: string, nickname: string, options: TimeoutClockOptions = {}): Promise<TimedOutLookup> {
    const view = await this.getTimeout(channelId, nickname, options);
    if (!view || view.expired) {
      return { timedOut: false, remainingSeconds: 0 };
    }
    return { timedOut: true, remainingSeconds: view.remainingSeconds, record: view };
  }

  async getTimeout(
    channelId: string,
    nickname: string,
    options: TimeoutClockOptions = {},
  ): Promise<ChannelTimeoutView | null> {
    const channel = normalizeChannelId(channelId);
    const user = normalizeTimeoutNickname(nickname);
    if (!channel || !user) {
      return null;
    }

    const now = readTimeoutClock(options.now);
    const live = liveTimeout(await this.store.getTimeout(channel, user), now);
    return live ? toTimeoutView(live, now) : null;
  }

  async listChannelTimeouts(
    channelId: string,
    options: ListChannelTimeoutsOptions = {},
  ): Promise<ChannelTimeoutView[]> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return [];
    }

    const now = readTimeoutClock(options.now);
    const includeExpired = options.includeExpired === true;
    const views: ChannelTimeoutView[] = [];

    for (const record of await this.store.listTimeouts(channel)) {
      const view = toTimeoutView(record, now);
      if (view.expired && !includeExpired) {
        continue;
      }
      views.push(view);
    }

    return sortTimeoutViews(views);
  }

  async listTimedOutChannels(options: TimeoutClockOptions = {}): Promise<string[]> {
    const now = readTimeoutClock(options.now);
    const channelIds: string[] = [];

    for (const record of await this.store.listTimeouts()) {
      if (liveTimeout(record, now)) {
        channelIds.push(record.channelId);
      }
    }

    return uniqueSortedIds(channelIds);
  }

  async countActiveTimeouts(channelId?: string, options: TimeoutClockOptions = {}): Promise<number> {
    const now = readTimeoutClock(options.now);
    const channel = channelId === undefined ? undefined : normalizeChannelId(channelId);
    if (channelId !== undefined && !channel) {
      return 0;
    }

    let count = 0;
    for (const record of await this.store.listTimeouts(channel)) {
      if (liveTimeout(record, now)) {
        count += 1;
      }
    }
    return count;
  }

  async sweepExpiredTimeouts(channelId?: string, options: TimeoutClockOptions = {}): Promise<TimeoutSweepResult> {
    const now = readTimeoutClock(options.now);
    const channel = channelId === undefined ? undefined : normalizeChannelId(channelId);
    if (channelId !== undefined && !channel) {
      return { removed: 0, channelIds: [] };
    }

    const removedChannels: string[] = [];
    let removed = 0;

    for (const record of await this.store.listTimeouts(channel)) {
      if (record.expiresAt > now) {
        continue;
      }
      await this.store.deleteTimeout(record.channelId, record.nickname);
      removed += 1;
      removedChannels.push(record.channelId);
    }

    return { removed, channelIds: uniqueSortedIds(removedChannels) };
  }
}

export function createChannelTimeoutLedger(store?: ChannelTimeoutStore): ChannelTimeoutLedger {
  return new ChannelTimeoutLedger(store ?? createMemoryChannelTimeoutStore());
}

export async function applyChannelTimeout(
  channelId: string,
  nickname: string,
  moderatorId: string,
  options: ApplyChannelTimeoutOptions = {},
  store?: ChannelTimeoutStore,
): Promise<ApplyChannelTimeoutResult> {
  return createChannelTimeoutLedger(store).applyChannelTimeout(channelId, nickname, moderatorId, options);
}

export async function liftChannelTimeout(
  channelId: string,
  nickname: string,
  moderatorId: string,
  options: TimeoutClockOptions = {},
  store?: ChannelTimeoutStore,
): Promise<LiftChannelTimeoutResult> {
  return createChannelTimeoutLedger(store).liftChannelTimeout(channelId, nickname, moderatorId, options);
}

export async function isTimedOut(
  channelId: string,
  nickname: string,
  options: TimeoutClockOptions = {},
  store?: ChannelTimeoutStore,
): Promise<TimedOutLookup> {
  return createChannelTimeoutLedger(store).isTimedOut(channelId, nickname, options);
}

export async function getTimeout(
  channelId: string,
  nickname: string,
  options: TimeoutClockOptions = {},
  store?: ChannelTimeoutStore,
): Promise<ChannelTimeoutView | null> {
  return createChannelTimeoutLedger(store).getTimeout(channelId, nickname, options);
}

export async function listChannelTimeouts(
  channelId: string,
  options: ListChannelTimeoutsOptions = {},
  store?: ChannelTimeoutStore,
): Promise<ChannelTimeoutView[]> {
  return createChannelTimeoutLedger(store).listChannelTimeouts(channelId, options);
}

export async function listTimedOutChannels(
  options: TimeoutClockOptions = {},
  store?: ChannelTimeoutStore,
): Promise<string[]> {
  return createChannelTimeoutLedger(store).listTimedOutChannels(options);
}

export async function countActiveTimeouts(
  channelId?: string,
  options: TimeoutClockOptions = {},
  store?: ChannelTimeoutStore,
): Promise<number> {
  return createChannelTimeoutLedger(store).countActiveTimeouts(channelId, options);
}

export async function sweepExpiredTimeouts(
  channelId?: string,
  options: TimeoutClockOptions = {},
  store?: ChannelTimeoutStore,
): Promise<TimeoutSweepResult> {
  return createChannelTimeoutLedger(store).sweepExpiredTimeouts(channelId, options);
}
