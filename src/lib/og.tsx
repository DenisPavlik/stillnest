import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

/* ==================================================================== *
 *  The shared parts of every link preview.
 *
 *  Satori renders these, and Satori reads TrueType, not the woff2 that
 *  next/font serves the page — so the site's own faces are kept as static
 *  TTFs in assets/fonts (OFL, see content/CREDITS.md). Two faces only:
 *  display for the name, mono for what was measured. The same split the
 *  page makes.
 * ==================================================================== */

export const OG_SIZE = { width: 1200, height: 630 };

export const INK = {
  spruce: "#090e0a",
  linen: "#e6ece4",
  haze: "#9aab9f",
  lichen: "#93b382",
  ember: "#e9a85e",
};

const root = process.cwd();

export async function ogFonts() {
  const [display, displayItalic, mono] = await Promise.all([
    readFile(join(root, "assets/fonts/CormorantGaramond-Light.ttf")),
    readFile(join(root, "assets/fonts/CormorantGaramond-LightItalic.ttf")),
    readFile(join(root, "assets/fonts/DMMono-Regular.ttf")),
  ]);
  return [
    { name: "Display", data: display, weight: 300 as const, style: "normal" as const },
    { name: "Display", data: displayItalic, weight: 300 as const, style: "italic" as const },
    { name: "Mono", data: mono, weight: 400 as const, style: "normal" as const },
  ];
}

/**
 * A house's exterior as a data URL. The 1536 rung, JPEG: Satori takes neither
 * WebP nor a relative URL, and at 1200 px wide the 3072 master would only be
 * a slower way to draw the same preview.
 */
export async function exteriorDataUrl(slug: string): Promise<string | null> {
  try {
    const bytes = await readFile(join(root, "public/stays", slug, "exterior-1536.jpg"));
    return `data:image/jpeg;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}
