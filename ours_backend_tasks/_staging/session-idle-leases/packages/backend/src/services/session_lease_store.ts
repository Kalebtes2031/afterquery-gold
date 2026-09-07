import {
  isSessionLeaseRecord,
  type SessionLeaseRecord,
  type SessionLeaseStore,
} from "#ours/backend/services/session_lease_types.ts";
import { cloneLease } from "#ours/backend/services/session_lease_utils.ts";

const leaseKey = (channelId: string, nickname: string) => `${channelId}\u0000${nickname}`;

export class MemorySessionLeaseStore implements SessionLeaseStore {
  private readonly records = new Map<string, SessionLeaseRecord>();

  async getLease(channelId: string, nickname: string): Promise<SessionLeaseRecord | null> {
    const record = this.records.get(leaseKey(channelId, nickname));
    return record ? cloneLease(record) : null;
  }

  async putLease(record: SessionLeaseRecord): Promise<void> {
    if (!isSessionLeaseRecord(record)) {
      return;
    }
    this.records.set(leaseKey(record.channelId, record.nickname), cloneLease(record));
  }

  async deleteLease(channelId: string, nickname: string): Promise<void> {
    this.records.delete(leaseKey(channelId, nickname));
  }

  async listLeases(channelId?: string): Promise<SessionLeaseRecord[]> {
    const rows = [...this.records.values()].map(cloneLease);
    if (channelId === undefined) {
      return rows;
    }
    return rows.filter((record) => record.channelId === channelId);
  }

  async compareAndSetLease(
    channelId: string,
    nickname: string,
    expectedVersion: number | null,
    record: SessionLeaseRecord,
  ): Promise<boolean> {
    if (!isSessionLeaseRecord(record) || record.channelId !== channelId || record.nickname !== nickname) {
      return false;
    }

    const key = leaseKey(channelId, nickname);
    const current = this.records.get(key);
    if (expectedVersion === null) {
      if (current) {
        return false;
      }
    } else if (!current || current.version !== expectedVersion) {
      return false;
    }

    this.records.set(key, cloneLease(record));
    return true;
  }

  clear(): void {
    this.records.clear();
  }

  size(): number {
    return this.records.size;
  }
}

export function createMemorySessionLeaseStore(): MemorySessionLeaseStore {
  return new MemorySessionLeaseStore();
}
