#!/usr/bin/env python3
"""Turn a generated take into a seamless, web-weight loop.

TWO PROBLEMS, AND WHY EACH IS SOLVED THE WAY IT IS

    SEAM. A generated clip starts and ends in unrelated states, so played on
    repeat it jumps once per cycle -- and the eye finds that jump immediately,
    because it is the only hard cut in an otherwise still picture. Two fixes
    exist. Ping-pong is free and exact, but it runs time backwards, and fire
    and falling snow both have a direction; reversed, they read as wrong before
    anyone can say why. So: crossfade the tail over the head. It costs the
    overlap in length and it ghosts anything moving fast, which here is nothing.

    WEIGHT. 4K at the model's own bitrate is megabytes per second, and this sits
    behind a photograph on a booking page. The output is therefore cut to the
    width the page actually paints and re-encoded, and the script prints the
    size of each rung so the choice is made on numbers.

SEAM QUALITY IS REPORTED, NOT ASSUMED
    The last frame of the loop and the first are compared directly, and the
    residual is printed. If it is not near the noise floor the crossfade is too
    short for this clip and the number says so.

USAGE
        python3 public/lab/loop.py public/lab/animate/<take-dir> --width 2560
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np


def probe(path: Path) -> tuple[int, int, float]:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,r_frame_rate", "-of", "json", str(path)],
        check=True, capture_output=True, text=True,
    ).stdout
    s = json.loads(out)["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return s["width"], s["height"], float(num) / float(den)


def decode(path: Path, w: int, h: int) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"scale={w}:{h}:flags=lanczos",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)


# The stills are untagged sRGB. A video tagged (or assumed) BT.709 is decoded
# by Chrome with the 709 transfer curve, which lifts the midtones: measured on
# blackwater-11 at 1440x900, loop 84.3 against still 78.4. Tagged with the
# sRGB curve (transfer 13) it read 79.2 -- the fade-in stops being a jump.
# libx264 drops -color_trc on a raw pipe, so the mp4 is stamped by bitstream
# filter; libvpx honours the flags.
COLOUR = [
    "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "iec61966-2-1",
    "-color_range", "tv",
    "-bsf:v", "h264_metadata=colour_primaries=1:transfer_characteristics=13:matrix_coefficients=1",
]


def encode(frames: np.ndarray, out: Path, fps: float, crf: int) -> None:
    f, h, w, _ = frames.shape
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{w}x{h}", "-r", f"{fps:g}", "-i", "-",
         *COLOUR,
         "-c:v", "libx264", "-crf", str(crf), "-preset", "veryslow", "-tune", "film",
         "-movflags", "+faststart", "-an", str(out), "-y"],
        stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
    )
    _, err = p.communicate(frames.tobytes())
    if p.returncode:
        sys.exit(f"ffmpeg failed on {out.name}: {err.decode()[:400]}")


def encode_webm(src: Path, out: Path, crf: int) -> None:
    """VP9 from the finished mp4, so both files are frame-identical. Chrome and
    Firefox take the webm first; at equal quality it is the smaller file."""
    r = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(src),
         "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "iec61966-2-1",
         "-color_range", "tv", "-c:v", "libvpx-vp9", "-crf", str(crf),
         "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "1",
         "-pix_fmt", "yuv420p", "-an", str(out), "-y"],
        capture_output=True,
    )
    if r.returncode:
        sys.exit(f"ffmpeg failed on {out.name}: {r.stderr.decode()[:400]}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("take", type=Path)
    ap.add_argument("--width", type=int, default=2560, help="output width; height follows")
    ap.add_argument("--crossfade", type=float, default=1.0, help="seconds of overlap")
    ap.add_argument("--crf", type=int, default=21)
    ap.add_argument("--poster", action="store_true", help="also write poster.jpg")
    ap.add_argument("--webm-crf", type=int, default=34)
    ap.add_argument("--publish", metavar="SLUG",
                    help="also write public/stays/<SLUG>/interior-loop.mp4 and .webm")
    args = ap.parse_args()

    src = args.take / "raw.mp4"
    if not src.exists():
        sys.exit(f"missing {src}")
    sw, sh, fps = probe(src)
    w = args.width - args.width % 2
    h = round(w * sh / sw)
    h -= h % 2
    print(f"source {sw}x{sh} @ {fps:g} fps  ->  {w}x{h}")

    f = decode(src, w, h).astype(np.float32)
    n0 = f.shape[0]
    k = max(2, int(round(args.crossfade * fps)))
    n = n0 - k
    if n <= k:
        sys.exit(f"--crossfade {args.crossfade}s is too long for {n0} frames")

    loop = f[:n].copy()
    ramp = (np.arange(k, dtype=np.float32) / k)[:, None, None, None]
    loop[:k] = f[:k] * ramp + f[n:n + k] * (1.0 - ramp)
    out_f = np.clip(loop + 0.5, 0, 255).astype(np.uint8)
    print(f"{n0} frames -> {n} ({n / fps:.2f}s), crossfade {k} frames ({k / fps:.2f}s)")

    # The seam, measured: last frame against first, against the clip's own noise.
    seam = np.abs(out_f[-1].astype(np.float32) - out_f[0].astype(np.float32)).mean()
    floor = np.abs(np.diff(out_f[len(out_f) // 2:len(out_f) // 2 + 2].astype(np.float32),
                           axis=0)).mean()
    print(f"seam {seam:.2f}/255 against a mid-clip frame-to-frame floor of {floor:.2f}"
          f"  -> {'seamless' if seam <= floor * 1.5 else 'STILL VISIBLE, raise --crossfade'}")

    out = args.take / f"loop-{w}.mp4"
    encode(out_f, out, fps, args.crf)
    kb = out.stat().st_size / 1024
    print(f"-> {out.name}  {w}x{h}, {kb / 1024:.2f} MB ({kb / (n / fps):.0f} KB/s)")

    if args.publish:
        import shutil

        dest = Path(__file__).resolve().parent.parent / "stays" / args.publish
        shutil.copyfile(out, dest / "interior-loop.mp4")
        encode_webm(out, dest / "interior-loop.webm", args.webm_crf)
        for f in ("interior-loop.mp4", "interior-loop.webm"):
            print(f"-> stays/{args.publish}/{f}  {(dest / f).stat().st_size / 1024 / 1024:.2f} MB")

    if args.poster:
        from PIL import Image

        p = args.take / "poster.jpg"
        Image.fromarray(out_f[0]).save(p, "JPEG", quality=86, optimize=True, progressive=True)
        print(f"-> {p.name}  {p.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
