#!/usr/bin/env python3
"""Author the GENERATION mask for one cropped fal take.

WHY THIS IS NOT `inpaint-mask.png`

    That mask does two jobs with one file: it tells the model what it may draw,
    and it tells the composite what to keep. Those two want opposite things.

    The composite wants to be tight — every kept pixel is a pixel of the
    photograph thrown away. The model wants to be generous: a flame pinned to
    the plate along its own midline cannot move, and `inpaint-mask.png` pins it
    twice over. It carves a 14 px band straight through the flame where the deck
    rail passes behind (the flame is IN FRONT of the rail, so preserving the
    rail there preserves the fire), and it stops at the top of the logs, so the
    embers the prompt asks for are forbidden by construction.

    So: this file is the generous one. The composite gets its own gate, derived
    from what the take actually moves — see `patch.py`.

    Written in the CROP's coordinate frame, not the photograph's, because that
    is the frame the model is handed.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

REPO = Path(__file__).resolve().parent.parent.parent
LAB = REPO / "public" / "lab"

SLUG = sys.argv[1] if len(sys.argv) > 1 else "blackwater-11"
SIZE = int(sys.argv[2]) if len(sys.argv) > 2 else 1024

# The region, in crop pixels. Two ellipses: the flame's envelope, and the bed of
# logs under it. Union, no holes — the model gets one simply-connected region.
FLAME = (513, 600, 152, 108)      # cx, cy, rx, ry
LOGS = (513, 690, 133, 44)

# Hard ceiling and floor, also in crop pixels: the hood's lower lip, and the
# basin's inner rim. Nothing above or below these is the model's business.
TOP, BOTTOM = 505, 727


def build(size: int) -> Image.Image:
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    m = np.zeros((size, size), np.float32)
    for cx, cy, rx, ry in (FLAME, LOGS):
        m = np.maximum(m, (((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1.0).astype(np.float32))
    m[:TOP] = 0.0
    m[BOTTOM:] = 0.0
    img = Image.fromarray((m * 255).astype(np.uint8))
    # A hair of blur, then a hard threshold: rounds the union's seam without
    # leaving grey, which a yuv420p mask video would smear into the wrong answer.
    img = img.filter(ImageFilter.GaussianBlur(6))
    return img.point(lambda v: 255 if v > 110 else 0)


def main() -> None:
    mask = build(SIZE)
    out = LAB / f"genmask-{SLUG}-{SIZE}.png"
    mask.save(out)
    a = np.array(mask) > 127
    print(f"-> {out.name}  {SIZE}x{SIZE}, white {a.sum()} px ({100 * a.mean():.2f}% of the crop)")
    ys, xs = np.where(a)
    print(f"   bbox x {xs.min()}..{xs.max()}  y {ys.min()}..{ys.max()}")


if __name__ == "__main__":
    main()
