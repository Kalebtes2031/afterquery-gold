import { MAX_CHANNEL_PINS } from "#ours/backend/services/pin_types.ts";

export interface PinBoardPolicy {
  maxPins: number;
  maxNoteLength: number;
}

export const DEFAULT_PIN_BOARD_POLICY: PinBoardPolicy = {
  maxPins: MAX_CHANNEL_PINS,
  maxNoteLength: 120,
};

export function describePinPolicy(policy: PinBoardPolicy = DEFAULT_PIN_BOARD_POLICY): string {
  return `max ${policy.maxPins} pins per channel; note <= ${policy.maxNoteLength}`;
}

export function canAcceptNewPin(currentCount: number, policy: PinBoardPolicy = DEFAULT_PIN_BOARD_POLICY): boolean {
  return currentCount < policy.maxPins;
}

export function nextBoardVersion(currentVersion: number): number {
  return currentVersion + 1;
}
