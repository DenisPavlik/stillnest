/**
 * The media resolver is the seam that lets the whole catalog move from /public to
 * Cloudflare R2 in one line. If it joins paths wrong, every image 404s at once.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;

async function loadWithBase(base: string | undefined) {
  if (base === undefined) {
    delete process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL = base;
  }
  // The module reads the env var once at import time, so the registry has to be
  // cleared between cases. A ?query suffix would work in Node but breaks Vite's
  // extension-based transform pipeline.
  vi.resetModules();
  return import("@/lib/media");
}

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  else process.env.NEXT_PUBLIC_MEDIA_BASE_URL = ORIGINAL;
});

describe("mediaUrl", () => {
  it("serves from the app root when no base is configured", async () => {
    const { mediaUrl } = await loadWithBase(undefined);
    expect(mediaUrl("stays/aurora/exterior.jpg")).toBe("/stays/aurora/exterior.jpg");
  });

  it("does not double up the leading slash", async () => {
    const { mediaUrl } = await loadWithBase(undefined);
    expect(mediaUrl("/stays/aurora/exterior.jpg")).toBe("/stays/aurora/exterior.jpg");
  });

  it("prefixes the configured base", async () => {
    const { mediaUrl } = await loadWithBase("https://media.example.com");
    expect(mediaUrl("stays/aurora/exterior.jpg")).toBe(
      "https://media.example.com/stays/aurora/exterior.jpg",
    );
  });

  it("tolerates a trailing slash on the base and a leading slash on the path", async () => {
    const { mediaUrl } = await loadWithBase("https://media.example.com/");
    expect(mediaUrl("/stays/aurora/exterior.jpg")).toBe(
      "https://media.example.com/stays/aurora/exterior.jpg",
    );
  });
});

describe("resolveScene", () => {
  it("always resolves the poster and leaves optional media undefined", async () => {
    const { resolveScene } = await loadWithBase("https://media.example.com");

    const resolved = resolveScene({
      key: "aurora-exterior",
      kind: "exterior",
      poster: "stays/aurora/exterior.jpg",
    });

    expect(resolved.poster).toBe("https://media.example.com/stays/aurora/exterior.jpg");
    expect(resolved.video).toBeUndefined();
    expect(resolved.audio).toBeUndefined();
  });

  it("resolves video and audio when present", async () => {
    const { resolveScene } = await loadWithBase("https://media.example.com");

    const resolved = resolveScene({
      key: "aurora-interior",
      kind: "interior",
      poster: "stays/aurora/interior.jpg",
      video: "stays/aurora/interior.mp4",
      audio: "beds/fireplace.opus",
    });

    expect(resolved.video).toBe("https://media.example.com/stays/aurora/interior.mp4");
    expect(resolved.audio).toBe("https://media.example.com/beds/fireplace.opus");
  });
});
