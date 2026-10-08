"use client";

import { useEffect, useRef } from "react";

import { scrollToId } from "@/components/motion/motion-provider";

import { useAmbience } from "./ambience";
import s from "./vibe.module.css";

/* -------------------------------------------------------------------- *
 *  FEEL THE VIBE — the way into the room, and the sound inside it.
 *
 *  Two controls and one rule between them: sound only ever starts from a
 *  click. "Feel the vibe" is that click — it is the visitor choosing to go
 *  in, so it both carries them down to the room and switches the bed on,
 *  inside the gesture, which is the only place Safari allows audio to begin.
 *  The switch over the scene is the way back out.
 * -------------------------------------------------------------------- */

/** Five thin bars. They breathe while sound plays and lie flat when it is off. */
function Bars({ live }: { live: boolean }) {
  return (
    <span className={s.bars} data-live={live ? "" : undefined} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

export function VibeButton({ target }: { target: string }) {
  const { unlock, playing } = useAmbience();

  return (
    <button
      type="button"
      className={s.vibe}
      onClick={() => {
        unlock();
        scrollToId(target);
      }}
    >
      <Bars live={playing} />
      <span className={s.vibeLabel}>Feel the vibe</span>
      <span className={s.vibeArrow} aria-hidden="true">
        ↓
      </span>
    </button>
  );
}

/**
 * The bed for one scene, and the switch for it. Renders the switch in the
 * scene's top-right corner and hands the mixer this scene's bed for as long as
 * the scene is on screen — scroll away and the room goes quiet behind you.
 */
export function SceneSound({ bed, scene }: { bed: string; scene: string }) {
  const { playing, unlock, toggle, setBed } = useAmbience();
  const seen = useRef(false);

  useEffect(() => {
    const el = document.getElementById(scene);
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting;
        if (inView === seen.current) return;
        seen.current = inView;
        setBed(inView ? bed : null);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      setBed(null);
    };
  }, [bed, scene, setBed]);

  return (
    <button
      type="button"
      className={s.sound}
      aria-pressed={playing}
      aria-label={playing ? "Turn sound off" : "Turn sound on"}
      onClick={() => (playing ? toggle() : unlock())}
    >
      <Bars live={playing} />
      <span className={s.soundLabel}>{playing ? "Sound on" : "Sound off"}</span>
    </button>
  );
}
