import { beforeEach, describe, expect, it } from "vitest";
import { checkEnvVar } from "#ours/backend/utils/env_utils.ts";

const KEY = "OURS_TEST_ENV_UTILS_KEY";

describe("checkEnvVar", () => {
  beforeEach(() => {
    delete process.env[KEY];
  });

  it("returns the raw value when the variable is set", () => {
    process.env[KEY] = "hello";
    expect(checkEnvVar(KEY)).toBe("hello");
  });

  it("returns values that contain spaces unchanged", () => {
    process.env[KEY] = "  spaced value  ";
    expect(checkEnvVar(KEY)).toBe("  spaced value  ");
  });

  it("returns numeric-looking values as strings", () => {
    process.env[KEY] = "4000";
    expect(checkEnvVar(KEY)).toBe("4000");
  });

  it("returns the default when the variable is missing", () => {
    expect(checkEnvVar(KEY, "fallback")).toBe("fallback");
  });

  it("returns the default when the variable is an empty string", () => {
    process.env[KEY] = "";
    expect(checkEnvVar(KEY, "fallback")).toBe("fallback");
  });

  it("returns an empty-string default rather than throwing", () => {
    expect(checkEnvVar(KEY, "")).toBe("");
  });

  it("prefers the real value over the default when both exist", () => {
    process.env[KEY] = "real";
    expect(checkEnvVar(KEY, "fallback")).toBe("real");
  });

  it("throws when the variable is missing and no default is given", () => {
    expect(() => checkEnvVar(KEY)).toThrow(`process.env.${KEY} is not set`);
  });

  it("throws when the variable is an empty string and no default is given", () => {
    process.env[KEY] = "";
    expect(() => checkEnvVar(KEY)).toThrow(`process.env.${KEY} is not set`);
  });

  it("throws an Error instance", () => {
    expect(() => checkEnvVar(KEY)).toThrow(Error);
  });
});
