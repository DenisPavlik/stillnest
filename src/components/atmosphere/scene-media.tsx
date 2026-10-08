"use client";

import { useRef, useState, type ReactNode } from "react";

import { mediaUrl } from "@/lib/media";

import { useMayLoadVideo } from "./media-gate";

/**
 * A living scene: a still that is always there, and a loop that arrives if the
 * connection and the visitor both allow it.
 *
 * The order matters and is the whole design. The poster renders immediately as
 * an ordinary image, so the page is never blank and never shifts. The video is
 * only attached afterwards, and only swaps in once it can actually play through
 * — a loop that stutters on its first pass is worse than no loop, because the
 * one thing this layer sells is calm.
 *
 * ## When there is deliberately no video
 *
 * - **`prefers-reduced-motion`** — drifting fog is exactly the kind of ambient
 *   movement that setting exists to stop.
 * - **Save-Data, or a connection reporting 2g/3g** — several megabytes of
 *   atmosphere is not a fair trade on a metered connection.
 * - **No `video` prop** — most scenes will never need one. Fog and snow are
 *   cheaper and steadier as CSS over a still.
 *
 * In every one of those cases the poster is the finished result, not a
 * degraded one.
 */

interface SceneMediaProps {
  /** Media key for the still. Never optional — it is the fallback for everything. */
  poster: string;
  /** Media key for the loop, when this scene has one. */
  video?: string;
  alt: string;
  className?: string;
  /** Rendered above the media — scrims, type, instruments. */
  children?: ReactNode;
}

export function SceneMedia({ poster, video, alt, className, children }: SceneMediaProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const mayLoadVideo = useMayLoadVideo();

  // Never rendered on the server, so nothing about the loop can delay first
  // paint or cause a hydration mismatch — the first client render matches the
  // server exactly, and the video appears on the render after that.
  const src = video && mayLoadVideo ? mediaUrl(video) : null;

  return (
    <div className={className} data-scene>
      {/* eslint-disable-next-line @next/next/no-img-element -- the poster is a
          fixed-size media slot filled with object-fit; next/image's layout
          machinery buys nothing here and complicates the swap. */}
      <img
        src={mediaUrl(poster)}
        alt={alt}
        data-scene-poster
        aria-hidden={ready ? "true" : undefined}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          // Cross-fade to the loop rather than cutting: a hard swap draws the
          // eye to the machinery instead of the place.
          opacity: ready ? 0 : 1,
          transition: "opacity 900ms ease",
        }}
      />

      {src ? (
        <video
          ref={ref}
          src={src}
          poster={mediaUrl(poster)}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          onCanPlayThrough={() => setReady(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: ready ? 1 : 0,
            transition: "opacity 900ms ease",
          }}
        />
      ) : null}

      {children}
    </div>
  );
}
