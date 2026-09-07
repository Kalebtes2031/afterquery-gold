import {
  isChannelTimeoutRecord,
  type ChannelTimeoutRecord,
  type ChannelTimeoutStore,
} from "#ours/backend/services/timeout_ledger_types.ts";

const timeoutKey = (channelId: string, nickname: string) => `${channelId}\u0000${nickname}`;

const cloneTimeout = (record: ChannelTimeoutRecord): ChannelTimeoutRecord => {
  const copy: ChannelTimeoutRecord = {
    channelId: record.channelId,
    nickname: record.nickname,
    moderatorId: record.moderatorId,
    expiresAt: record.expiresAt,
  };
  if (record.reason !== undefined) {
    copy.reason = record.reason;
  }
  return copy;
};

export class MemoryChannelTimeoutStore implements ChannelTimeoutStore {
  private readonly records = new Map<string, ChannelTimeoutRecord>();

  async getTimeout(channelId: string, nickname: string): Promise<ChannelTimeoutRecord | null> {
    const record = this.records.get(timeoutKey(channelId, nickname));
    return record ? cloneTimeout(record) : null;
  }

  async putTimeout(record: ChannelTimeoutRecord): Promise<void> {
    if (!isChannelTimeoutRecord(record)) {
      return;
    }
    this.records.set(timeoutKey(record.channelId, record.nickname), cloneTimeout(record));
  }

  async deleteTimeout(channelId: string, nickname: string): Promise<void> {
    this.records.delete(timeoutKey(channelId, nickname));
  }

  async listTimeouts(channelId?: string): Promise<ChannelTimeoutRecord[]> {
    const rows = [...this.records.values()].map(cloneTimeout);
    if (channelId === undefined) {
      return rows;
    }
    return rows.filter((record) => record.channelId === channelId);
  }

  async compareAndSetTimeout(
    channelId: string,
    nickname: string,
    expectedExpiresAt: number | null,
    record: ChannelTimeoutRecord,
  ): Promise<boolean> {
    if (!isChannelTimeoutRecord(record) || record.channelId !== channelId || record.nickname !== nickname) {
      return false;
    }

    const key = timeoutKey(channelId, nickname);
    const current = this.records.get(key);
    if (expectedExpiresAt === null) {
      if (current) {
        return false;
      }
    } else if (!current || current.expiresAt !== expectedExpiresAt) {
      return false;
    }

    this.records.set(key, cloneTimeout(record));
    return true;
  }

  clear(): void {
    this.records.clear();
  }

  size(): number {
    return this.records.size;
  }
}

export function createMemoryChannelTimeoutStore(): MemoryChannelTimeoutStore {
  return new MemoryChannelTimeoutStore();
}
