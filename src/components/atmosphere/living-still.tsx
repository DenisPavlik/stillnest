"use client";

import { useState } from "react";

import { Still } from "@/components/still";
import { mediaUrl } from "@/lib/media";

import { useMayLoadVideo } from "./media-gate";
import s from "./living-still.module.css";

/* -------------------------------------------------------------------- *
 *  LIVING STILL — a photograph that keeps moving.
 *
 *  <SceneMedia> is the generic version and takes one poster key. This one
 *  wraps <Still>, so the picture underneath the loop is the full rung set
 *  with its art-directed portrait crop — which matters here because the
 *  still is what most visitors see: everyone on a metered connection,
 *  everyone who asked for reduced motion, and everyone for the second
 *  before the loop has buffered.
 *
 *  The loop is a decoration over a finished picture, never the picture
 *  itself. It is muted, has no audio track in the file at all (the bed is
 *  separate, mixed in Web Audio so scenes can cross-fade), and it is only
 *  faded in on `canplaythrough` — a loop that stutters on its first pass
 *  is worse than no loop, because the one thing this layer sells is calm.
 * -------------------------------------------------------------------- */

export interface LivingStillProps {
  /** Still base without extension — `stays/blackwater-11/interior`. */
  base: string;
  /**
   * Loop base without extension, when this scene has one. Both `.webm` and
   * `.mp4` are expected to exist beside it; Safari takes the second.
   */
  loop?: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export function LivingStill({
  base,
  loop,
  alt,
  className,
  sizes,
  priority,
}: LivingStillProps) {
  const [ready, setReady] = useState(false);
  const mayLoadVideo = useMayLoadVideo();

  // Never true on the server, so the loop cannot delay first paint or cause a
  // hydration mismatch: the first client render matches the server exactly and
  // the video is attached on the render after it.
  const play = Boolean(loop) && mayLoadVideo;

  return (
    <div className={className ? `${s.root} ${className}` : s.root} data-scene>
      <Still
        base={base}
        alt={alt}
        sizes={sizes}
        priority={priority}
        className={s.poster}
      />

      {play && loop ? (
        <div className={s.frame}>
          <video
            className={s.loop}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            /* The still underneath IS the poster. Handing the same frame to the
             video element as well would fetch a third copy of it. */
            aria-hidden="true"
            tabIndex={-1}
            data-ready={ready ? "" : undefined}
            onCanPlayThrough={() => setReady(true)}
          >
            <source src={mediaUrl(`${loop}.webm`)} type="video/webm" />
            <source src={mediaUrl(`${loop}.mp4`)} type="video/mp4" />
          </video>
        </div>
      ) : null}
    </div>
  );
}
