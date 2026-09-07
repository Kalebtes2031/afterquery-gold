import { describe, expect, it } from "vitest";
import { resolveGifByUrl } from "#ours/backend/services/gif_service.ts";

describe("resolveGifByUrl", () => {
  it("throws for an unsupported provider host", async () => {
    await expect(resolveGifByUrl("https://example.com/cat.gif")).rejects.toThrow("Unsupported GIF provider");
  });

  it("throws for a malformed url", async () => {
    await expect(resolveGifByUrl("not-a-url")).rejects.toThrow();
  });

  it("throws when a Giphy page url has no extractable id", async () => {
    await expect(resolveGifByUrl("https://giphy.com/")).rejects.toThrow("Unable to extract Giphy id");
  });

  it("resolves a direct Giphy .gif url without a network call", async () => {
    await expect(resolveGifByUrl("https://media.giphy.com/media/abc123/giphy.gif")).resolves.toMatchObject({
      provider: "giphy",
      url: "https://media.giphy.com/media/abc123/giphy.gif",
    });
  });

  it("resolves a direct Tenor .gif url without a network call", async () => {
    await expect(resolveGifByUrl("https://media.tenor.com/xyz987.gif")).resolves.toMatchObject({
      provider: "tenor",
      url: "https://media.tenor.com/xyz987.gif",
    });
  });
});
