/**
 * The single place that turns a media key into a URL.
 *
 * Components must never hardcode a media URL. Everything — stills, video loops,
 * ambient audio — resolves through here, so the host can change in one line.
 *
 * Today: files sit under /public while the catalog is placeholder-sized.
 * Phase 9: NEXT_PUBLIC_MEDIA_BASE_URL points at Cloudflare R2 (10 GB free,
 * $0 egress at any volume) and nothing else in the app changes.
 */

const BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(/\/$/, "");

export type SceneKind = "exterior" | "interior" | "view" | "weather";

/** Resolve any stored media path to a fully-qualified URL. */
export function mediaUrl(path: string): string {
  const clean = path.replace(/^\//, "");
  return BASE ? `${BASE}/${clean}` : `/${clean}`;
}

/**
 * Houses whose real photography exists on disk.
 *
 * `property_scenes` has carried poster keys for all twelve since Phase 2 —
 * `stays/<slug>/exterior.jpg` and so on — because the seed wrote the paths the
 * catalog *would* use. Only the houses listed here actually have files behind
 * those keys; the rest still draw their generated scene, and reading the
 * database instead of this set would hang eleven broken images on the catalog.
 *
 * A hand-kept set rather than a filesystem check on purpose: when
 * `NEXT_PUBLIC_MEDIA_BASE_URL` points at R2 there is no local file to stat, and
 * a check that silently stops working is worse than a list somebody has to
 * remember to edit. **Add a slug here in the same commit as its files.**
 *
 * Exported so `tests/unit/photography.test.ts` can hold the list and the files
 * on disk to each other — the list being hand-kept is the reason it needs a
 * test, not a reason it cannot have one.
 */
export const PHOTOGRAPHED: ReadonlySet<string> = new Set([
  "hollowmoss-04",
  "blackwater-11",
  "tidebreak-03",
  "moss-verse-01",
  "sparv-04",
]);

export function hasPhotography(slug: string): boolean {
  return PHOTOGRAPHED.has(slug);
}

/**
 * The rungs a still is published at, widest last.
 *
 * 3072 exists because the hero is full-bleed and an ultrawide monitor asks for
 * 2560 device pixels; 1536 exists so a phone does not download 667 KB to paint
 * 375 CSS px. Keep in step with `scripts/upscale.py` and the derivative sizes
 * recorded in `content/CREDITS.md`.
 */
const RUNGS = [1536, 3072] as const;

export interface StillSources {
  jpeg: string;
  webp: string;
  fallback: string;
}

/**
 * Build the `srcSet` pair for a still stored as `<base>.jpg`.
 *
 * The naming convention is the contract: `<base>.jpg` is the widest rung and
 * `<base>-1536.jpg` the narrow one, with `.webp` beside each. Everything is
 * generated from one source by hand, so the convention is cheap to keep and
 * this function is the only place that knows it.
 */
export function stillSources(base: string): StillSources {
  const at = (rung: number, ext: string) =>
    mediaUrl(rung === RUNGS[RUNGS.length - 1] ? `${base}.${ext}` : `${base}-${rung}.${ext}`);

  return {
    jpeg: RUNGS.map((r) => `${at(r, "jpg")} ${r}w`).join(", "),
    webp: RUNGS.map((r) => `${at(r, "webp")} ${r}w`).join(", "),
    fallback: mediaUrl(`${base}.jpg`),
  };
}

/**
 * A living scene: a poster that renders immediately, an optional video loop
 * that swaps in once it can play through, and an optional ambient bed.
 *
 * The poster is never optional — it is what shows under prefers-reduced-motion,
 * on save-data connections, and for the split second before video is ready.
 */
export interface Scene {
  key: string;
  kind: SceneKind;
  poster: string;
  video?: string;
  audio?: string;
  caption?: string;
}

export interface ResolvedScene extends Omit<Scene, "poster" | "video" | "audio"> {
  poster: string;
  video?: string;
  audio?: string;
}

export function resolveScene(scene: Scene): ResolvedScene {
  return {
    ...scene,
    poster: mediaUrl(scene.poster),
    video: scene.video ? mediaUrl(scene.video) : undefined,
    audio: scene.audio ? mediaUrl(scene.audio) : undefined,
  };
}
