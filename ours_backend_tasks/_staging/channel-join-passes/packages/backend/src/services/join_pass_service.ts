import { createMemoryJoinPassStore } from "#ours/backend/services/join_pass_store.ts";
import type {
  ConsumeJoinPassResult,
  IssueJoinPassOptions,
  IssueJoinPassResult,
  JoinPassClockOptions,
  JoinPassRecord,
  JoinPassStore,
  JoinPassSweepResult,
  JoinPassView,
  RevokeJoinPassResult,
} from "#ours/backend/services/join_pass_types.ts";
import {
  createDefaultPassId,
  isLiveIssuedPass,
  joinPassExpiry,
  joinPassFailure,
  joinPassRemainingSeconds,
  normalizeActorId,
  normalizeChannelId,
  normalizeJoinPassNote,
  normalizePassId,
  readJoinPassClock,
  resolveJoinPassStatus,
  sortJoinPassViews,
  toJoinPassView,
  uniqueSortedIds,
} from "#ours/backend/services/join_pass_utils.ts";

export class JoinPassService {
  private readonly store: JoinPassStore;

  constructor(store: JoinPassStore = createMemoryJoinPassStore()) {
    this.store = store;
  }

  async issueJoinPass(
    channelId: string,
    issuerId: string,
    options: IssueJoinPassOptions = {},
  ): Promise<IssueJoinPassResult> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return joinPassFailure("invalid_channel");
    }

    const issuer = normalizeActorId(issuerId);
    if (!issuer) {
      return joinPassFailure("invalid_issuer", { channelId: channel });
    }

    const now = readJoinPassClock(options.now);
    const expiresAt = joinPassExpiry(now, options.ttlSeconds);
    const note = normalizeJoinPassNote(options.note);
    const createPassId = options.createPassId ?? createDefaultPassId;

    let passId = createPassId();
    let attempts = 0;
    while (await this.store.getPass(passId)) {
      attempts += 1;
      if (attempts > 8) {
        passId = createDefaultPassId();
        break;
      }
      passId = createPassId();
    }

    const record: JoinPassRecord = {
      passId,
      channelId: channel,
      issuerId: issuer,
      createdAt: now,
      expiresAt,
      consumedAt: null,
      consumedBy: null,
      revokedAt: null,
    };
    if (note !== undefined) {
      record.note = note;
    }

    const created = await this.store.compareAndSetPass(passId, null, null, false, record);
    if (!created) {
      return this.issueJoinPass(channelId, issuerId, {
        ...options,
        createPassId: createDefaultPassId,
      });
    }

    return {
      ok: true,
      passId,
      channelId: channel,
      issuerId: issuer,
      createdAt: now,
      expiresAt,
      remainingSeconds: joinPassRemainingSeconds(expiresAt, now),
      ...(note !== undefined ? { note } : {}),
    };
  }

  async consumeJoinPass(
    passId: string,
    consumerId: string,
    options: JoinPassClockOptions = {},
  ): Promise<ConsumeJoinPassResult> {
    const id = normalizePassId(passId);
    if (!id) {
      return joinPassFailure("invalid_pass");
    }

    const consumer = normalizeActorId(consumerId);
    if (!consumer) {
      return joinPassFailure("invalid_consumer", { passId: id });
    }

    const now = readJoinPassClock(options.now);
    const current = await this.store.getPass(id);
    if (!current) {
      return joinPassFailure("not_found", { passId: id });
    }

    const status = resolveJoinPassStatus(current, now);
    if (status === "revoked") {
      return joinPassFailure("not_found", { passId: id, channelId: current.channelId });
    }
    if (status === "consumed") {
      return joinPassFailure("already_consumed", { passId: id, channelId: current.channelId });
    }
    if (status === "expired") {
      return joinPassFailure("expired", { passId: id, channelId: current.channelId });
    }

    const next: JoinPassRecord = {
      ...current,
      consumedAt: now,
      consumedBy: consumer,
    };

    const swapped = await this.store.compareAndSetPass(
      id,
      current.consumedAt,
      current.revokedAt,
      true,
      next,
    );
    if (!swapped) {
      return this.consumeJoinPass(passId, consumerId, options);
    }

    return {
      ok: true,
      passId: id,
      channelId: current.channelId,
      consumedBy: consumer,
      consumedAt: now,
    };
  }

  async revokeJoinPass(
    passId: string,
    issuerId: string,
    options: JoinPassClockOptions = {},
  ): Promise<RevokeJoinPassResult> {
    const id = normalizePassId(passId);
    if (!id) {
      return joinPassFailure("invalid_pass");
    }

    const issuer = normalizeActorId(issuerId);
    if (!issuer) {
      return joinPassFailure("invalid_issuer", { passId: id });
    }

    const now = readJoinPassClock(options.now);
    const current = await this.store.getPass(id);
    if (!current) {
      return joinPassFailure("not_found", { passId: id });
    }

    if (current.issuerId !== issuer) {
      return joinPassFailure("issuer_mismatch", { passId: id, channelId: current.channelId });
    }

    const status = resolveJoinPassStatus(current, now);
    if (status === "consumed") {
      return joinPassFailure("already_consumed", { passId: id, channelId: current.channelId });
    }
    if (status === "expired") {
      return joinPassFailure("expired", { passId: id, channelId: current.channelId });
    }
    if (status === "revoked") {
      return joinPassFailure("not_found", { passId: id, channelId: current.channelId });
    }

    const next: JoinPassRecord = {
      ...current,
      revokedAt: now,
    };

    const swapped = await this.store.compareAndSetPass(
      id,
      current.consumedAt,
      current.revokedAt,
      true,
      next,
    );
    if (!swapped) {
      return this.revokeJoinPass(passId, issuerId, options);
    }

    return { ok: true, passId: id, channelId: current.channelId, revoked: true };
  }

  async getJoinPass(passId: string, options: JoinPassClockOptions = {}): Promise<JoinPassView | null> {
    const id = normalizePassId(passId);
    if (!id) {
      return null;
    }
    const now = readJoinPassClock(options.now);
    const record = await this.store.getPass(id);
    return record ? toJoinPassView(record, now) : null;
  }

  async listJoinPasses(channelId: string, options: JoinPassClockOptions = {}): Promise<JoinPassView[]> {
    const channel = normalizeChannelId(channelId);
    if (!channel) {
      return [];
    }
    const now = readJoinPassClock(options.now);
    const views = (await this.store.listPasses(channel)).map((record) => toJoinPassView(record, now));
    return sortJoinPassViews(views);
  }

  async sweepExpiredJoinPasses(
    channelId?: string,
    options: JoinPassClockOptions = {},
  ): Promise<JoinPassSweepResult> {
    const now = readJoinPassClock(options.now);
    const channel = channelId === undefined ? undefined : normalizeChannelId(channelId);
    if (channelId !== undefined && !channel) {
      return { removed: 0, passIds: [] };
    }

    const removedIds: string[] = [];
    let removed = 0;

    for (const record of await this.store.listPasses(channel)) {
      if (record.consumedAt !== null || record.revokedAt !== null) {
        continue;
      }
      if (record.expiresAt > now) {
        continue;
      }
      await this.store.deletePass(record.passId);
      removed += 1;
      removedIds.push(record.passId);
    }

    return { removed, passIds: uniqueSortedIds(removedIds) };
  }
}

export function createJoinPassService(store?: JoinPassStore): JoinPassService {
  return new JoinPassService(store ?? createMemoryJoinPassStore());
}

export async function issueJoinPass(
  channelId: string,
  issuerId: string,
  options: IssueJoinPassOptions = {},
  store?: JoinPassStore,
): Promise<IssueJoinPassResult> {
  return createJoinPassService(store).issueJoinPass(channelId, issuerId, options);
}

export async function consumeJoinPass(
  passId: string,
  consumerId: string,
  options: JoinPassClockOptions = {},
  store?: JoinPassStore,
): Promise<ConsumeJoinPassResult> {
  return createJoinPassService(store).consumeJoinPass(passId, consumerId, options);
}

export async function revokeJoinPass(
  passId: string,
  issuerId: string,
  options: JoinPassClockOptions = {},
  store?: JoinPassStore,
): Promise<RevokeJoinPassResult> {
  return createJoinPassService(store).revokeJoinPass(passId, issuerId, options);
}

export async function getJoinPass(
  passId: string,
  options: JoinPassClockOptions = {},
  store?: JoinPassStore,
): Promise<JoinPassView | null> {
  return createJoinPassService(store).getJoinPass(passId, options);
}

export async function listJoinPasses(
  channelId: string,
  options: JoinPassClockOptions = {},
  store?: JoinPassStore,
): Promise<JoinPassView[]> {
  return createJoinPassService(store).listJoinPasses(channelId, options);
}

export async function sweepExpiredJoinPasses(
  channelId?: string,
  options: JoinPassClockOptions = {},
  store?: JoinPassStore,
): Promise<JoinPassSweepResult> {
  return createJoinPassService(store).sweepExpiredJoinPasses(channelId, options);
}

void isLiveIssuedPass;
