import {
  isChannelPinBoardRecord,
  type ChannelPinBoardRecord,
  type ChannelPinStore,
} from "#ours/backend/services/pin_types.ts";
import { cloneBoard } from "#ours/backend/services/pin_utils.ts";

export class MemoryChannelPinStore implements ChannelPinStore {
  private readonly boards = new Map<string, ChannelPinBoardRecord>();

  async getBoard(channelId: string): Promise<ChannelPinBoardRecord | null> {
    const board = this.boards.get(channelId);
    return board ? cloneBoard(board) : null;
  }

  async putBoard(board: ChannelPinBoardRecord): Promise<void> {
    if (!isChannelPinBoardRecord(board)) {
      return;
    }
    this.boards.set(board.channelId, cloneBoard(board));
  }

  async compareAndSetBoard(
    channelId: string,
    expectedVersion: number | null,
    board: ChannelPinBoardRecord,
  ): Promise<boolean> {
    if (!isChannelPinBoardRecord(board) || board.channelId !== channelId) {
      return false;
    }

    const current = this.boards.get(channelId);
    if (expectedVersion === null) {
      if (current) {
        return false;
      }
    } else if (!current || current.version !== expectedVersion) {
      return false;
    }

    this.boards.set(channelId, cloneBoard(board));
    return true;
  }

  clear(): void {
    this.boards.clear();
  }

  size(): number {
    return this.boards.size;
  }
}

export function createMemoryChannelPinStore(): MemoryChannelPinStore {
  return new MemoryChannelPinStore();
}
