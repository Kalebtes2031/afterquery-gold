import { describe, expect, it } from "vitest";
import { invalidNicknameMessage, isValidNickname } from "#ours/shared/inputValidation.ts";

describe("isValidNickname", () => {
  it("accepts a three character latin nickname", () => {
    expect(isValidNickname("abc")).toBe(true);
  });

  it("accepts exactly twenty four characters", () => {
    expect(isValidNickname("a".repeat(24))).toBe(true);
  });

  it("rejects two character nicknames", () => {
    expect(isValidNickname("ab")).toBe(false);
  });

  it("rejects twenty five character nicknames", () => {
    expect(isValidNickname("a".repeat(25))).toBe(false);
  });

  it("rejects the empty string", () => {
    expect(isValidNickname("")).toBe(false);
  });

  it("accepts digits", () => {
    expect(isValidNickname("user123")).toBe(true);
  });

  it("accepts non-latin letters", () => {
    expect(isValidNickname("日本語")).toBe(true);
  });

  it("accepts accented letters", () => {
    expect(isValidNickname("José")).toBe(true);
  });

  it("normalizes decomposed combining marks before validating", () => {
    expect(isValidNickname("éric")).toBe(true);
  });

  it("accepts the period character", () => {
    expect(isValidNickname("a.b.c")).toBe(true);
  });

  it("accepts the underscore character", () => {
    expect(isValidNickname("a_b_c")).toBe(true);
  });

  it("accepts the hyphen character", () => {
    expect(isValidNickname("a-b-c")).toBe(true);
  });

  it("rejects spaces", () => {
    expect(isValidNickname("a b c")).toBe(false);
  });

  it("rejects emoji", () => {
    expect(isValidNickname("abc\u{1f600}")).toBe(false);
  });

  it("rejects punctuation such as exclamation marks", () => {
    expect(isValidNickname("abc!")).toBe(false);
  });

  it("rejects the at sign", () => {
    expect(isValidNickname("a@bc")).toBe(false);
  });

  it("rejects forward slashes", () => {
    expect(isValidNickname("a/bc")).toBe(false);
  });

  it("rejects leading and trailing whitespace around a valid core", () => {
    expect(isValidNickname(" abc ")).toBe(false);
  });
});

describe("invalidNicknameMessage", () => {
  it("is a non-empty string", () => {
    expect(typeof invalidNicknameMessage).toBe("string");
    expect(invalidNicknameMessage.length).toBeGreaterThan(0);
  });

  it("mentions the allowed length range", () => {
    expect(invalidNicknameMessage).toContain("3-24");
  });
});
