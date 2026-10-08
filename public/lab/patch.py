#!/usr/bin/env python3
"""Turn one fal take into the small looping patch the page would ship.

WHY A SCRIPT AND NOT A COMMAND

    The 20 August patch was assembled with an ffmpeg invocation nobody wrote
    down, which means the one artefact the owner is being asked to judge could
    not be rebuilt. This is that command, with its reasoning attached.

WHAT IT DOES, AND WHY EACH STEP EARNS ITS PLACE

    1. COLOUR FIT. "Black regions are preserved from the source video" measured,
       last time, as 64% of them moving. So the take's idea of the photograph is
       near but not equal to the photograph. Fitting take -> plate per channel on
       the pixels the model was never allowed to touch removes the contrast step
       that would otherwise make the picture visibly change the moment the loop
       fades in.

    2. THE COMPOSITE GATE, which is NOT the generation mask. The model was given
       a generous region so the flame could move; we keep only the part of it
       that actually moved. A pixel the take holds still is a pixel of the
       photograph we have no reason to replace -- and replacing it costs us
       anyway, because a re-encoded copy of an unchanged pixel is still a
       different pixel. Alpha is therefore tied to measured motion.

    3. CROSSFADE, not ping-pong. Fire has no time symmetry: run it backwards and
       it reads as wrong even when nobody can say why. Ping-pong is for fog.

    4. CROP to the gate. What ships is the bounding box of what moves.

USAGE
        python3 public/lab/patch.py public/lab/takes/blackwater-11-crop1024-1024-1101
        python3 public/lab/patch.py <take-dir> --install     # write it into the lab
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

REPO = Path(__file__).resolve().parent.parent.parent
LAB = REPO / "public" / "lab"


def decode(path: Path, w: int, h: int) -> np.ndarray:
    """Every frame of an mp4 as one (F, h, w, 3) uint8 array."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        check=True, capture_output=True,
    ).stdout
    if len(raw) % (w * h * 3):
        sys.exit(f"{path.name} does not decode to whole {w}x{h} frames")
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)


def encode(frames: np.ndarray, out: Path, fps: int, crf: int) -> None:
    f, h, w, _ = frames.shape
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{w}x{h}", "-r", str(fps), "-i", "-",
         "-c:v", "libx264", "-crf", str(crf), "-preset", "veryslow",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(out), "-y"],
        stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
    )
    p.communicate(frames.tobytes())
    if p.returncode:
        sys.exit(f"ffmpeg failed encoding {out.name}")


def luma(a: np.ndarray) -> np.ndarray:
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def smoothstep(lo: float, hi: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("take", type=Path, help="a directory written by falrun.py --crop")
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--crossfade", type=int, default=14, help="frames of loop overlap")
    ap.add_argument("--motion-lo", type=float, default=2.0,
                    help="luma deviation, /255, below which the plate is kept outright")
    ap.add_argument("--motion-hi", type=float, default=10.0,
                    help="luma deviation, /255, above which the take is kept outright")
    ap.add_argument("--margin", type=int, default=12, help="px of plate around the gate")
    ap.add_argument("--crf", type=int, default=20)
    ap.add_argument("--install", action="store_true",
                    help="also write public/lab/fire-patch-crop.mp4 and its rect")
    args = ap.parse_args()

    meta = json.loads((args.take / "crop.json").read_text())
    x0, y0, x1, y1 = meta["rect"]
    size = x1 - x0
    still = Image.open(REPO / meta["still"]).convert("RGB")
    pw, ph = still.size
    plate = np.asarray(still.crop((x0, y0, x1, y1))).astype(np.float32)
    gm = Image.open(args.take / "crop-mask.png").convert("L")
    genmask = np.asarray(gm).astype(np.float32) / 255.0

    frames = decode(args.take / "raw.mp4", size, size).astype(np.float32)
    print(f"take: {frames.shape[0]} frames of {size}x{size}")

    # ---- 1. colour fit, measured only where the model had no licence to draw
    outside = genmask < 0.02
    fitted = np.empty_like(frames)
    for c in range(3):
        src = frames[:, :, :, c].mean(axis=0)[outside]
        dst = plate[:, :, c][outside]
        a, b = np.polyfit(src, dst, 1)
        fitted[:, :, :, c] = frames[:, :, :, c] * a + b
        print(f"  channel {'RGB'[c]}: plate = {a:.4f} x take {b:+.2f}")
    fitted = np.clip(fitted, 0, 255)

    # ---- 2. the gate: how much each pixel actually moves, inside the licence
    ly = luma(fitted)
    dev = np.abs(ly - np.median(ly, axis=0)).max(axis=0)
    gate = smoothstep(args.motion_lo, args.motion_hi, dev) * genmask
    gate = np.asarray(
        Image.fromarray((gate * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
    ).astype(np.float32) / 255.0
    moving = gate > 0.02
    if not moving.any():
        sys.exit("nothing in this take moves inside the mask")
    print(f"  gate: {moving.sum()} px, {100 * moving.mean():.2f}% of the crop")

    # ---- 3. composite, then close the loop by crossfading the tail over the head
    a3 = gate[None, :, :, None]
    comp = plate[None] * (1.0 - a3) + fitted * a3

    k = args.crossfade
    n = comp.shape[0] - k
    if n <= k:
        sys.exit(f"--crossfade {k} is too long for {comp.shape[0]} frames")
    loop = comp[:n].copy()
    w = (np.arange(k, dtype=np.float32) / k)[:, None, None, None]
    loop[:k] = comp[:k] * w + comp[n:n + k] * (1.0 - w)
    print(f"  loop: {n} frames, {n / args.fps:.2f}s (crossfade {k})")

    # ---- 4. crop to what moves
    ys, xs = np.where(moving)
    cx0 = max(int(xs.min()) - args.margin, 0)
    cy0 = max(int(ys.min()) - args.margin, 0)
    cx1 = min(int(xs.max()) + 1 + args.margin, size)
    cy1 = min(int(ys.max()) + 1 + args.margin, size)
    cx1 -= (cx1 - cx0) % 2
    cy1 -= (cy1 - cy0) % 2
    patch = np.clip(loop[:, cy0:cy1, cx0:cx1] + 0.5, 0, 255).astype(np.uint8)

    # What the page needs: where this rectangle sits in the PHOTOGRAPH, normalised,
    # because the page lays it over the photograph and knows nothing of the crop.
    rect = [(x0 + cx0) / pw, (y0 + cy0) / ph, (x0 + cx1) / pw, (y0 + cy1) / ph]

    # ---- and the claim, checked rather than asserted: outside the gate the
    # patch must still be the photograph.
    still_px = gate[cy0:cy1, cx0:cx1] < 0.02
    if still_px.any():
        d = np.abs(patch.astype(np.float32) - plate[cy0:cy1, cx0:cx1][None]).max(axis=3)
        print(f"  outside the gate: max deviation {d[:, still_px].max():.0f}/255")
    d_all = np.abs(patch.astype(np.float32) - plate[cy0:cy1, cx0:cx1][None]).max()
    print(f"  inside  the gate: max deviation {d_all:.0f}/255")

    out = args.take / "patch.mp4"
    encode(patch, out, args.fps, args.crf)
    kb = out.stat().st_size / 1024
    print(f"\n-> {out}  {cx1 - cx0}x{cy1 - cy0}, {kb:.0f} KB")
    print("   rect in the photograph: [" + ", ".join(f"{v:.4f}" for v in rect) + "]")

    if args.install:
        dest = LAB / "fire-patch-crop.mp4"
        dest.write_bytes(out.read_bytes())
        (LAB / "fire-patch-crop.json").write_text(json.dumps({
            "rect": rect, "src": "/lab/fire-patch-crop.mp4", "take": args.take.name,
            "size": [cx1 - cx0, cy1 - cy0], "frames": int(n), "fps": args.fps,
        }, indent=2))
        print(f"   installed -> {dest.name} + fire-patch-crop.json")


if __name__ == "__main__":
    main()
