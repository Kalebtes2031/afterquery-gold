import { describe, expect, it } from "vitest";
import { CHAT_CHANNEL_ROLES, CHAT_REACTIONS, CHAT_USER_TYPES } from "#ours/backend/constants/index.ts";

describe("Existing chat constants", () => {
  it("keeps HEART mapped to HEART", () => expect(CHAT_REACTIONS.HEART).toBe("HEART"));
  it("keeps HANDS_UP mapped to HANDS_UP", () => expect(CHAT_REACTIONS.HANDS_UP).toBe("HANDS_UP"));
  it("keeps FIRE mapped to FIRE", () => expect(CHAT_REACTIONS.FIRE).toBe("FIRE"));
  it("keeps MUSIC mapped to MUSIC", () => expect(CHAT_REACTIONS.MUSIC).toBe("MUSIC"));
  it("keeps SURPRISED mapped to SURPRISED", () => expect(CHAT_REACTIONS.SURPRISED).toBe("SURPRISED"));
  it("keeps exactly five supported reaction keys", () => {
    expect(Object.keys(CHAT_REACTIONS).sort()).toEqual(["FIRE", "HANDS_UP", "HEART", "MUSIC", "SURPRISED"]);
  });
  it("keeps reaction values unique", () => expect(new Set(Object.values(CHAT_REACTIONS)).size).toBe(5));
  it("keeps TEMPORARY mapped to temporary", () => expect(CHAT_USER_TYPES.TEMPORARY).toBe("temporary"));
  it("keeps REGULAR mapped to regular", () => expect(CHAT_USER_TYPES.REGULAR).toBe("regular"));
  it("keeps ARTIST mapped to artist", () => expect(CHAT_USER_TYPES.ARTIST).toBe("artist"));
  it("keeps ADMIN mapped to admin", () => expect(CHAT_USER_TYPES.ADMIN).toBe("admin"));
  it("keeps MODERATOR mapped to moderator", () => expect(CHAT_USER_TYPES.MODERATOR).toBe("moderator"));
  it("keeps ANONYMOUS mapped to anonymous", () => expect(CHAT_USER_TYPES.ANONYMOUS).toBe("anonymous"));
  it("keeps exactly six user types", () => expect(Object.keys(CHAT_USER_TYPES)).toHaveLength(6));
  it("keeps user type values unique", () => expect(new Set(Object.values(CHAT_USER_TYPES)).size).toBe(6));
  it("keeps every user type value lowercase", () => {
    expect(Object.values(CHAT_USER_TYPES).every((value) => value === value.toLowerCase())).toBe(true);
  });
  it("keeps OWNER mapped to owner", () => expect(CHAT_CHANNEL_ROLES.OWNER).toBe("owner"));
  it("keeps VIEWER mapped to viewer", () => expect(CHAT_CHANNEL_ROLES.VIEWER).toBe("viewer"));
  it("keeps exactly two channel roles", () => expect(Object.keys(CHAT_CHANNEL_ROLES)).toHaveLength(2));
  it("keeps channel role values unique", () => expect(new Set(Object.values(CHAT_CHANNEL_ROLES)).size).toBe(2));
  it("keeps channel role keys uppercase", () => {
    expect(Object.keys(CHAT_CHANNEL_ROLES).every((key) => key === key.toUpperCase())).toBe(true);
  });
});
