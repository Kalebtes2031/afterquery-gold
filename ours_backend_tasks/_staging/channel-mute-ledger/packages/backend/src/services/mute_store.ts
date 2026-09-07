import {
  isChannelMuteRecord,
  type ChannelMuteRecord,
  type ChannelMuteStore,
} from "#ours/backend/services/mute_types.ts";

const muteKey = (channelId: string, nickname: string) => `${channelId}\u0000${nickname}`;

const cloneMute = (record: ChannelMuteRecord): ChannelMuteRecord => {
  const copy: ChannelMuteRecord = {
    channelId: record.channelId,
    nickname: record.nickname,
    moderatorId: record.moderatorId,
    expiresAt: record.expiresAt,
    mutedAt: record.mutedAt,
  };
  if (record.reason !== undefined) {
    copy.reason = record.reason;
  }
  return copy;
};

export class MemoryChannelMuteStore implements ChannelMuteStore {
  private readonly records = new Map<string, ChannelMuteRecord>();

  async getMute(channelId: string, nickname: string): Promise<ChannelMuteRecord | null> {
    const record = this.records.get(muteKey(channelId, nickname));
    return record ? cloneMute(record) : null;
  }

  async putMute(record: ChannelMuteRecord): Promise<void> {
    if (!isChannelMuteRecord(record)) {
      return;
    }
    this.records.set(muteKey(record.channelId, record.nickname), cloneMute(record));
  }

  async deleteMute(channelId: string, nickname: string): Promise<void> {
    this.records.delete(muteKey(channelId, nickname));
  }

  async listMutes(channelId?: string): Promise<ChannelMuteRecord[]> {
    const rows = [...this.records.values()].map(cloneMute);
    if (channelId === undefined) {
      return rows;
    }
    return rows.filter((record) => record.channelId === channelId);
  }

  async compareAndSetMute(
    channelId: string,
    nickname: string,
    expectedMutedAt: number | null,
    record: ChannelMuteRecord,
  ): Promise<boolean> {
    if (!isChannelMuteRecord(record) || record.channelId !== channelId || record.nickname !== nickname) {
      return false;
    }

    const key = muteKey(channelId, nickname);
    const current = this.records.get(key);
    if (expectedMutedAt === null) {
      if (current) {
        return false;
      }
    } else if (!current || current.mutedAt !== expectedMutedAt) {
      return false;
    }

    this.records.set(key, cloneMute(record));
    return true;
  }

  clear(): void {
    this.records.clear();
  }

  size(): number {
    return this.records.size;
  }
}

export function createMemoryChannelMuteStore(): MemoryChannelMuteStore {
  return new MemoryChannelMuteStore();
}
