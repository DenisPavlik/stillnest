"use client";

import { useSyncExternalStore } from "react";

/**
 * A capability the server cannot know about, read once on the client.
 *
 * The obvious version of this is `useState(false)` plus an effect that calls
 * `setState` — which works, and is also a synchronous setState inside an effect,
 * i.e. a cascading render on every mount and a lint error under React's newer
 * rules. `useSyncExternalStore` is what the pattern is actually for: it gives
 * the server a defined answer and the client its real one, in a single render.
 *
 * The value is computed once and cached. These flags — reduced motion,
 * Save-Data, whether audio exists at all — do not change during a page view in
 * any way worth re-rendering for, and a `getSnapshot` that returns a fresh
 * value each call would loop forever.
 */

const NEVER_CHANGES = () => () => {};

export function makeClientFlag(compute: () => boolean) {
  let cached: boolean | undefined;

  const getSnapshot = () => {
    if (cached === undefined) cached = compute();
    return cached;
  };

  // The server has no navigator and no media queries. `false` is the honest
  // answer there, and it is also the safe one: it means "render the plain
  // version", which is what must survive if nothing else runs.
  const getServerSnapshot = () => false;

  return () => useSyncExternalStore(NEVER_CHANGES, getSnapshot, getServerSnapshot);
}
