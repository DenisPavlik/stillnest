"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { mediaUrl } from "@/lib/media";

import { setSoundPreference, useSoundPreference } from "./sound-preference";

/**
 * The ambient sound bed, and the one switch that turns it on.
 *
 * ## Why this is Web Audio and not <audio>
 *
 * Scenes cross-fade. Two `<audio>` elements cannot be faded into each other
 * cleanly — `volume` is not automatable, so you get a stepped ramp on a timer
 * that stutters whenever the main thread is busy, which on a scroll-animated
 * page is constantly. A `GainNode` ramp is scheduled on the audio thread and is
 * unaffected by anything React is doing.
 *
 * ## Why nothing plays until a click
 *
 * Every browser blocks audio until a user gesture, and an `AudioContext` created
 * before one starts `suspended`. That is not an obstacle to work around — it is
 * the correct behaviour, and the design leans on it: a visitor *chooses* to
 * enter the atmosphere, which is precisely why they notice it.
 *
 * So the context is constructed lazily, on the first activation, and the choice
 * is remembered. On a later visit sound is armed but still requires one gesture
 * before it can start — the browser will not have it any other way.
 */

/** Ambient beds sit under the page, not on top of it. */
const MASTER_GAIN = 0.34;
const CROSSFADE_SECONDS = 1.6;

interface AmbienceValue {
  /** Has the visitor asked for sound? */
  enabled: boolean;
  toggle: () => void;
  /** True once a bed is actually audible — used to light the control. */
  playing: boolean;
  /** Point the mixer at a bed. Pass null for silence. */
  setBed: (key: string | null) => void;
}

const AmbienceContext = createContext<AmbienceValue | null>(null);

interface Layer {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export function AmbienceProvider({ children }: { children: ReactNode }) {
  const enabled = useSoundPreference();
  const [playing, setPlaying] = useState(false);
  const [bed, setBed] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const layerRef = useRef<Layer | null>(null);
  const buffers = useRef(new Map<string, AudioBuffer>());
  /** Guards against a slow fetch resolving after the visitor moved on. */
  const generation = useRef(0);

  const toggle = useCallback(() => {
    setSoundPreference(!enabled);
  }, [enabled]);

  /* --- the mixer -------------------------------------------------- */

  useEffect(() => {
    const mine = ++generation.current;

    async function run() {
      if (!enabled || !bed) {
        // Fade out rather than cut. A hard stop on an ambient bed is louder,
        // perceptually, than the bed itself.
        const ctx = ctxRef.current;
        const layer = layerRef.current;
        if (ctx && layer) {
          const now = ctx.currentTime;
          layer.gain.gain.cancelScheduledValues(now);
          layer.gain.gain.setValueAtTime(layer.gain.gain.value, now);
          layer.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE_SECONDS * 0.6);
          layer.source.stop(now + CROSSFADE_SECONDS);
          layerRef.current = null;
        }
        setPlaying(false);
        return;
      }

      if (!ctxRef.current) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctor) return; // No Web Audio: the page is simply silent.
        ctxRef.current = new Ctor();
        masterRef.current = ctxRef.current.createGain();
        masterRef.current.gain.value = MASTER_GAIN;
        masterRef.current.connect(ctxRef.current.destination);
      }

      const ctx = ctxRef.current;
      const master = masterRef.current;
      if (!ctx || !master) return;

      if (ctx.state === "suspended") await ctx.resume();

      let buffer = buffers.current.get(bed);
      if (!buffer) {
        try {
          const response = await fetch(mediaUrl(bed));
          if (!response.ok) return; // No bed for this scene yet. Stay silent.
          buffer = await ctx.decodeAudioData(await response.arrayBuffer());
          buffers.current.set(bed, buffer);
        } catch {
          return;
        }
      }

      // The visitor changed scene, or switched sound off, while this loaded.
      if (mine !== generation.current) return;

      const previous = layerRef.current;
      const gain = ctx.createGain();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      gain.connect(master);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + CROSSFADE_SECONDS);
      source.start(now);

      if (previous) {
        previous.gain.gain.cancelScheduledValues(now);
        previous.gain.gain.setValueAtTime(previous.gain.gain.value, now);
        previous.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE_SECONDS);
        previous.source.stop(now + CROSSFADE_SECONDS + 0.1);
      }

      layerRef.current = { source, gain };
      setPlaying(true);
    }

    void run();
  }, [enabled, bed]);

  useEffect(() => {
    return () => {
      /* The lint rule here guards against capturing a DOM node that React has
         since replaced. These refs are not nodes — they are the audio graph as
         it stands at unmount, and reading them *late* is precisely the point:
         whatever is playing when the provider goes away is what has to stop. */
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      layerRef.current?.source.stop();
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  const value = useMemo<AmbienceValue>(
    () => ({ enabled, toggle, playing, setBed }),
    [enabled, toggle, playing],
  );

  return <AmbienceContext.Provider value={value}>{children}</AmbienceContext.Provider>;
}

export function useAmbience(): AmbienceValue {
  const value = useContext(AmbienceContext);
  if (!value) {
    throw new Error("useAmbience must be used inside <AmbienceProvider>");
  }
  return value;
}
