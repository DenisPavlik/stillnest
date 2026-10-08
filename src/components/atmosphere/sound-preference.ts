"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the visitor has asked for sound — an external store, not React state.
 *
 * It lives outside React because that is what it is: a value in localStorage,
 * shared by every component that cares, and changeable from another tab. Reading
 * it in an effect and calling `setState` would work, but it would also be a
 * cascading render on every mount and would not notice a change made elsewhere.
 *
 * Default is **off**, and that is not a technicality. Audio that starts on its
 * own is the single fastest way to make someone close a tab, and browsers block
 * it anyway. Sound here is something a visitor switches on deliberately — which
 * is exactly why they notice it when they do.
 */

const KEY = "stillnest:sound";

const listeners = new Set<() => void>();
let cached: boolean | null = null;

function read(): boolean {
  if (cached !== null) return cached;
  try {
    cached = window.localStorage.getItem(KEY) === "on";
  } catch {
    // Private mode, or storage disabled entirely. Silence is a safe default.
    cached = false;
  }
  return cached;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // Another tab changed the preference: honour it here too, rather than letting
  // two open tabs disagree about whether this site makes noise.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cached = event.newValue === "on";
    listeners.forEach((l) => l());
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setSoundPreference(on: boolean): void {
  cached = on;
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Not worth failing the interaction over — the choice still holds for
    // this page view, it simply will not survive a reload.
  }
  listeners.forEach((l) => l());
}

export function useSoundPreference(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
