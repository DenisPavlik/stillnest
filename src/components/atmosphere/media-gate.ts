"use client";

import { prefersReducedMotion } from "@/components/motion/prefers-reduced";
import { makeClientFlag } from "@/lib/use-client-flag";

/**
 * May this visitor be sent a video loop?
 *
 * Three separate "no"s, and none of them is a degraded experience — in every
 * one of them the still is the finished picture:
 *
 * - **`prefers-reduced-motion`** — drifting snow and flickering firelight are
 *   exactly the ambient movement that setting exists to stop.
 * - **Save-Data, or a connection reporting 2g/3g** — a megabyte of atmosphere
 *   is not a fair trade on a metered connection.
 *
 * Computed once on the client. The server always answers "no", which is also
 * the correct fallback if nothing else ever runs: the page ships the still.
 */
export const useMayLoadVideo = makeClientFlag(() => {
  if (prefersReducedMotion()) return false;

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const c = nav.connection;
  if (!c) return true;
  if (c.saveData) return false;
  return !(
    c.effectiveType === "slow-2g" ||
    c.effectiveType === "2g" ||
    c.effectiveType === "3g"
  );
});
