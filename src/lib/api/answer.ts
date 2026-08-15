/**
 * The browser <-> Next.js contract for a date check.
 *
 * This is NOT the Python contract. That one lives in contracts.ts, is mirrored
 * by hand in api/stillnest/models.py, and never reaches a browser. This is the
 * narrower shape our own route handler hands to our own panel.
 *
 * It exists so that "the service did not answer" is a STATE the panel has to
 * render, rather than an exception it could accidentally show as a price. The
 * Python service is a separate process — during local development it is often
 * not running, and after deploy it is unreachable until it gets its own project.
 * A booking panel that quietly rendered $0 in that window would be lying about
 * the one number a guest came for.
 *
 * Client-safe: types and copy only, no server imports.
 */

import type { AvailabilityResponse } from "./contracts";

export type AvailabilityAnswer =
  /** The engine answered. `quote.available` says whether the dates are free. */
  | { state: "ok"; quote: AvailabilityResponse }
  /** The request did not describe a stay. Our own bug, or a hand-typed date. */
  | { state: "invalid"; message: string }
  /** Nobody answered, or answered something we do not understand. Never guess. */
  | { state: "offline"; message: string };

/** The `state` field already says "offline"; this says what that means for a guest. */
export const OFFLINE_MESSAGE =
  "The service that prices these dates is not answering. No number would be real right now, so none is shown — try again in a moment.";

/** Cheap shape check for a body that came back over the wire. */
export function isAvailabilityAnswer(value: unknown): value is AvailabilityAnswer {
  if (typeof value !== "object" || value === null) return false;
  const state = (value as { state?: unknown }).state;
  return state === "ok" || state === "invalid" || state === "offline";
}
