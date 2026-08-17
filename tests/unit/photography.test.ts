/**
 * Holds `PHOTOGRAPHED` and the files on disk to each other.
 *
 * A house is published by two separate acts — dropping ten files into
 * public/stays/<slug>/ and adding the slug to `PHOTOGRAPHED` — and neither one
 * fails loudly without the other. Register a slug whose files are missing and
 * the detail page hangs a broken full-bleed hero; ship the files without the
 * slug and the house quietly keeps its generated placeholder. Both survive a
 * build, a typecheck and a lint. Eleven more houses go through this, so it is
 * worth a test rather than a rule in a note.
 *
 * The expected filenames are read out of `stillSources` rather than written out
 * here, so the day RUNGS changes this test follows it instead of contradicting
 * it. `scripts/derive.py` writes the same set from the Python side; if the two
 * ever disagree, this is the one that fails first.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PHOTOGRAPHED, stillSources } from "@/lib/media";

const PUBLIC = join(process.cwd(), "public");

/** Every path `stillSources` can hand to a browser, as a repo-relative file. */
function srcSetPaths(base: string): string[] {
  const sources = stillSources(base);
  return [sources.jpeg, sources.webp]
    .flatMap((set) => set.split(",").map((entry) => entry.trim().split(/\s+/)[0]))
    .concat(sources.fallback);
}

/**
 * The portrait pair is not part of `stillSources` — `<Still>` reaches for
 * `<portraitBase>.jpg` and `.webp` directly, because mobile art direction is a
 * different shape rather than a narrower rung. Named here for the same reason
 * it is named there.
 */
function portraitPaths(base: string): string[] {
  return [`/${base}.jpg`, `/${base}.webp`];
}

/**
 * Once the media base points at R2 there is no local file to stat, and this
 * check belongs to whatever uploads the bucket instead. Skipping loudly beats
 * asserting that `https://…/exterior.jpg` exists on the filesystem.
 */
const local = !process.env.NEXT_PUBLIC_MEDIA_BASE_URL;

describe.skipIf(!local)("every photographed house has the files the catalog asks for", () => {
  // Guards against the set being emptied by an accident and the suite going
  // green on nothing at all.
  it("has at least one photographed house", () => {
    expect(PHOTOGRAPHED.size).toBeGreaterThan(0);
  });

  it.each([...PHOTOGRAPHED])("%s", (slug) => {
    const wanted = [
      ...srcSetPaths(`stays/${slug}/exterior`),
      ...srcSetPaths(`stays/${slug}/interior`),
      ...portraitPaths(`stays/${slug}/exterior-portrait`),
    ];

    const missing = [...new Set(wanted)].filter((url) => !existsSync(join(PUBLIC, url)));

    expect(missing, `${slug} is in PHOTOGRAPHED but these files do not exist`).toEqual([]);
  });
});
