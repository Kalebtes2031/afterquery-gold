import { createMemoryChannelMuteStore } from "#ours/backend/services/mute_store.ts";
import type {
  ChannelMuteRecord,
  ChannelMuteStore,
  ChannelMuteView,
  ListChannelMutesOptions,
  MuteClockOptions,
  MuteSweepResult,
  MuteUserOptions,
  MuteUserResult,
  MutedLookup,
  UnmuteUserResult,
} from "#ours/backend/services/mute_types.ts";
import {
  liveMute,
  muteEffectiveExpiry,
  muteFailure,
  muteRemainingSeconds,
  normalizeChannelId,
  normalizeModeratorId,
  normalizeMuteNickname,
  normalizeMuteReason,
  readMuteClock,
  resolveMuteExpiry,
  sortMuteViews,
  toMuteView,
  uniqueSortedIds,
} from "#ours/backend/services/mute_utils.ts";

export class ChannelMuteLedger {
  private readonly store: ChannelMuteStore;

  constructor(store: ChannelMuteStore = createMemoryChannelMuteStore()) {
    this.store = store;
  }

  async muteUser(
    channelId: string,
    nickname: string,
    moderatorId: string,
    options: MuteUserOptions = {},
  ): Promise<MuteUserResult> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return muteFailure("invalid_channel");
    }

    const user = normalizeMuteNickname(nickname);
    if (!user) {
      return muteFailure("invalid_nickname", { channelId: channel });
    }

    const moderator = normalizeModeratorId(moderatorId);
    if (!moderator) {
      return muteFailure("invalid_moderator", { channelId: channel, nickname: user });
    }

    const now = readMuteClock(options.now);
    const expiresAt = resolveMuteExpiry(now, options.durationSeconds);
    const reason = normalizeMuteReason(options.reason);
    const current = await this.store.getMute(channel, user);
    const live = liveMute(current, now);

    const next: ChannelMuteRecord = {
      channelId: channel,
      nickname: user,
      moderatorId: moderator,
      expiresAt,
      mutedAt: now,
    };
    if (reason !== undefined) {
      next.reason = reason;
    }

    if (live) {
      const nextRank = expiresAt === null ? Number.POSITIVE_INFINITY : expiresAt;
      if (nextRank > muteEffectiveExpiry(live)) {
        const swapped = await this.store.compareAndSetMute(channel, user, live.mutedAt, next);
        if (!swapped) {
          return this.muteUser(channelId, nickname, moderatorId, options);
        }
        return {
          ok: true,
          status: "extended",
          channelId: channel,
          nickname: user,
          moderatorId: moderator,
          expiresAt,
          remainingSeconds: muteRemainingSeconds(expiresAt, now),
          permanent: expiresAt === null,
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
        remainingSeconds: muteRemainingSeconds(live.expiresAt, now),
        permanent: live.expiresAt === null,
        ...(live.reason !== undefined ? { reason: live.reason } : {}),
      };
    }

    if (current && !live) {
      await this.store.deleteMute(channel, user);
    }

    const created = await this.store.compareAndSetMute(channel, user, null, next);
    if (!created) {
      return this.muteUser(channelId, nickname, moderatorId, options);
    }

    return {
      ok: true,
      status: "applied",
      channelId: channel,
      nickname: user,
      moderatorId: moderator,
      expiresAt,
      remainingSeconds: muteRemainingSeconds(expiresAt, now),
      permanent: expiresAt === null,
      ...(reason !== undefined ? { reason } : {}),
    };
  }

  async unmuteUser(
    channelId: string,
    nickname: string,
    moderatorId: string,
    options: MuteClockOptions = {},
  ): Promise<UnmuteUserResult> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return muteFailure("invalid_channel");
    }

    const user = normalizeMuteNickname(nickname);
    if (!user) {
      return muteFailure("invalid_nickname", { channelId: channel });
    }

    const moderator = normalizeModeratorId(moderatorId);
    if (!moderator) {
      return muteFailure("invalid_moderator", { channelId: channel, nickname: user });
    }

    const now = readMuteClock(options.now);
    const current = await this.store.getMute(channel, user);
    if (!current) {
      return muteFailure("not_found", { channelId: channel, nickname: user });
    }
    if (liveMute(current, now) === null) {
      await this.store.deleteMute(channel, user);
      return muteFailure("not_found", { channelId: channel, nickname: user });
    }

    await this.store.deleteMute(channel, user);
    return { ok: true, channelId: channel, nickname: user, unmuted: true };
  }

  async isMuted(channelId: string, nickname: string, options: MuteClockOptions = {}): Promise<MutedLookup> {
    const view = await this.getMute(channelId, nickname, options);
    if (!view || view.expired) {
      return { muted: false, remainingSeconds: 0, permanent: false };
    }
    return {
      muted: true,
      remainingSeconds: view.remainingSeconds,
      permanent: view.permanent,
      record: view,
    };
  }

  async getMute(
    channelId: string,
    nickname: string,
    options: MuteClockOptions = {},
  ): Promise<ChannelMuteView | null> {
    const channel = normalizeChannelId(channelId);
    const user = normalizeMuteNickname(nickname);
    if (!channel || !user) {
      return null;
    }

    const now = readMuteClock(options.now);
    const live = liveMute(await this.store.getMute(channel, user), now);
    return live ? toMuteView(live, now) : null;
  }

  async listChannelMutes(
    channelId: string,
    options: ListChannelMutesOptions = {},
  ): Promise<ChannelMuteView[]> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return [];
    }

    const now = readMuteClock(options.now);
    const includeExpired = options.includeExpired === true;
    const views: ChannelMuteView[] = [];

    for (const record of await this.store.listMutes(channel)) {
      const view = toMuteView(record, now);
      if (view.expired && !includeExpired) {
        continue;
      }
      views.push(view);
    }

    return sortMuteViews(views);
  }

  async listMutedChannels(options: MuteClockOptions = {}): Promise<string[]> {
    const now = readMuteClock(options.now);
    const channelIds: string[] = [];

    for (const record of await this.store.listMutes()) {
      if (liveMute(record, now)) {
        channelIds.push(record.channelId);
      }
    }

    return uniqueSortedIds(channelIds);
  }

  async countActiveMutes(channelId?: string, options: MuteClockOptions = {}): Promise<number> {
    const now = readMuteClock(options.now);
    const channel = channelId === undefined ? undefined : normalizeChannelId(channelId);
    if (channelId !== undefined && !channel) {
      return 0;
    }

    let count = 0;
    for (const record of await this.store.listMutes(channel)) {
      if (liveMute(record, now)) {
        count += 1;
      }
    }
    return count;
  }

  async sweepExpiredMutes(channelId?: string, options: MuteClockOptions = {}): Promise<MuteSweepResult> {
    const now = readMuteClock(options.now);
    const channel = channelId === undefined ? undefined : normalizeChannelId(channelId);
    if (channelId !== undefined && !channel) {
      return { removed: 0, channelIds: [] };
    }

    const removedChannels: string[] = [];
    let removed = 0;

    for (const record of await this.store.listMutes(channel)) {
      if (record.expiresAt === null) {
        continue;
      }
      if (record.expiresAt > now) {
        continue;
      }
      await this.store.deleteMute(record.channelId, record.nickname);
      removed += 1;
      removedChannels.push(record.channelId);
    }

    return { removed, channelIds: uniqueSortedIds(removedChannels) };
  }
}

export function createChannelMuteLedger(store?: ChannelMuteStore): ChannelMuteLedger {
  return new ChannelMuteLedger(store ?? createMemoryChannelMuteStore());
}

export async function muteUser(
  channelId: string,
  nickname: string,
  moderatorId: string,
  options: MuteUserOptions = {},
  store?: ChannelMuteStore,
): Promise<MuteUserResult> {
  return createChannelMuteLedger(store).muteUser(channelId, nickname, moderatorId, options);
}

export async function unmuteUser(
  channelId: string,
  nickname: string,
  moderatorId: string,
  options: MuteClockOptions = {},
  store?: ChannelMuteStore,
): Promise<UnmuteUserResult> {
  return createChannelMuteLedger(store).unmuteUser(channelId, nickname, moderatorId, options);
}

export async function isMuted(
  channelId: string,
  nickname: string,
  options: MuteClockOptions = {},
  store?: ChannelMuteStore,
): Promise<MutedLookup> {
  return createChannelMuteLedger(store).isMuted(channelId, nickname, options);
}

export async function getMute(
  channelId: string,
  nickname: string,
  options: MuteClockOptions = {},
  store?: ChannelMuteStore,
): Promise<ChannelMuteView | null> {
  return createChannelMuteLedger(store).getMute(channelId, nickname, options);
}

export async function listChannelMutes(
  channelId: string,
  options: ListChannelMutesOptions = {},
  store?: ChannelMuteStore,
): Promise<ChannelMuteView[]> {
  return createChannelMuteLedger(store).listChannelMutes(channelId, options);
}

export async function listMutedChannels(
  options: MuteClockOptions = {},
  store?: ChannelMuteStore,
): Promise<string[]> {
  return createChannelMuteLedger(store).listMutedChannels(options);
}

export async function countActiveMutes(
  channelId?: string,
  options: MuteClockOptions = {},
  store?: ChannelMuteStore,
): Promise<number> {
  return createChannelMuteLedger(store).countActiveMutes(channelId, options);
}

export async function sweepExpiredMutes(
  channelId?: string,
  options: MuteClockOptions = {},
  store?: ChannelMuteStore,
): Promise<MuteSweepResult> {
  return createChannelMuteLedger(store).sweepExpiredMutes(channelId, options);
}
