import {
  isJoinPassRecord,
  type JoinPassRecord,
  type JoinPassStore,
} from "#ours/backend/services/join_pass_types.ts";

const clonePass = (record: JoinPassRecord): JoinPassRecord => {
  const copy: JoinPassRecord = {
    passId: record.passId,
    channelId: record.channelId,
    issuerId: record.issuerId,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    consumedAt: record.consumedAt,
    consumedBy: record.consumedBy,
    revokedAt: record.revokedAt,
  };
  if (record.note !== undefined) {
    copy.note = record.note;
  }
  return copy;
};

export class MemoryJoinPassStore implements JoinPassStore {
  private readonly records = new Map<string, JoinPassRecord>();

  async getPass(passId: string): Promise<JoinPassRecord | null> {
    const record = this.records.get(passId);
    return record ? clonePass(record) : null;
  }

  async putPass(record: JoinPassRecord): Promise<void> {
    if (!isJoinPassRecord(record)) {
      return;
    }
    this.records.set(record.passId, clonePass(record));
  }

  async deletePass(passId: string): Promise<void> {
    this.records.delete(passId);
  }

  async listPasses(channelId?: string): Promise<JoinPassRecord[]> {
    const rows = [...this.records.values()].map(clonePass);
    if (channelId === undefined) {
      return rows;
    }
    return rows.filter((record) => record.channelId === channelId);
  }

  async compareAndSetPass(
    passId: string,
    expectedConsumedAt: number | null,
    expectedRevokedAt: number | null,
    expectExists: boolean,
    record: JoinPassRecord,
  ): Promise<boolean> {
    if (!isJoinPassRecord(record) || record.passId !== passId) {
      return false;
    }

    const current = this.records.get(passId);
    if (!expectExists) {
      if (current) {
        return false;
      }
    } else if (
      !current ||
      current.consumedAt !== expectedConsumedAt ||
      current.revokedAt !== expectedRevokedAt
    ) {
      return false;
    }

    this.records.set(passId, clonePass(record));
    return true;
  }

  clear(): void {
    this.records.clear();
  }

  size(): number {
    return this.records.size;
  }
}

export function createMemoryJoinPassStore(): MemoryJoinPassStore {
  return new MemoryJoinPassStore();
}
