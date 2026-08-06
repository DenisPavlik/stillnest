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
