#!/usr/bin/env python3
"""Measure whether a catalog still actually obeys the brand's one-warm-light rule.

WHY THIS EXISTS
    The palette has exactly one warm token and it means "lit or live". Every
    prompt says so, and it was still being broken: measured across the first four
    houses, the brightest mass in the frame is the SKY rather than the lit window
    in two of them (hollowmoss-04, moss-verse-01). Nobody saw it, because a dusk
    photograph of a house in a forest looks correct to the eye whichever thing in
    it happens to be brightest. It takes a number.

    This is the frame's equivalent of `derive.py --check`: it does not judge
    whether a picture is good, only whether it breaks a rule we have committed to.

WHAT IT MEASURES, AND WHAT IT CANNOT
    Measurable cheaply and reported here:
      - the warm core: where the warmest pixels are, and how bright they are
      - the bright peak: where the brightest pixels are
      - whether the bright peak is the warm core, or something else beating it

    NOT measured, deliberately, because it needs segmentation and would be a
    guess dressed as a figure: the building's bounding box, and therefore its
    share of frame width and area. Those stay an eye check against the prompt
    README until something can measure them honestly.

WHY CENTROIDS OF A QUANTILE, NOT max()
    One clipped pixel on a wave crest is not what an eye follows. Both readings
    are the centroid of the top 0.2% of pixels on their own metric, which is a
    mass rather than an accident. Warmth is R-B: at dusk everything in frame is
    lit by cold skylight except the one thing we care about.

USAGE
    python3 scripts/frame-check.py                    # every photographed house
    python3 scripts/frame-check.py blackwater-11
    python3 scripts/frame-check.py path/to/fresh.png  # before paying to upscale it
    python3 scripts/frame-check.py --strict            # exit 1 if any frame fails

Taking a bare path matters: the cheapest moment to reject a frame is before
scripts/upscale.py spends a fal.ai call on it, and while regenerating still costs
nothing but another prompt.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parent.parent
STAYS = REPO / "public" / "stays"

# Analysis width. Small on purpose: this asks where the light sits, not what the
# grain looks like, and a 300px pass makes a sweep of twelve houses instant.
WIDTH = 300
QUANTILE = 0.002

# Above this fraction of frame height, a bright mass in a dusk landscape is sky
# or open water reflecting it, never the house. Derived from the four shipped
# frames, where every house's own glazing sits below 0.35 and both failures sat
# above it.
SKY_BAND = 0.35


def load(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGB")
    return im.resize((WIDTH, round(WIDTH * im.height / im.width)), Image.LANCZOS)


def centroid(values: list[float], w: int, h: int) -> tuple[float, float, float]:
    """Centroid and mean value of the top QUANTILE of `values`, as fractions."""
    n = max(1, int(len(values) * QUANTILE))
    top = sorted(range(len(values)), key=lambda i: -values[i])[:n]
    x = sum(i % w for i in top) / n / w
    y = sum(i // w for i in top) / n / h
    return x, y, sum(values[i] for i in top) / n


def check(path: Path) -> tuple[bool, str]:
    im = load(path)
    w, h = im.size
    # tobytes rather than getdata(): getdata is deprecated in Pillow 14, and a
    # flat buffer sliced by stride is faster anyway.
    raw = im.tobytes()
    r_, g_, b_ = raw[0::3], raw[1::3], raw[2::3]

    luma = [
        (r * 299 + g * 587 + b * 114) / 1000 for r, g, b in zip(r_, g_, b_, strict=True)
    ]
    warmth = [float(r) - float(b) for r, b in zip(r_, b_, strict=True)]

    bx, by, bl = centroid(luma, w, h)
    wx, wy, _ = centroid(warmth, w, h)

    # Luminance of the warm core itself, so the two can be compared directly.
    i = min(int(wy * h) * w + int(wx * w), len(luma) - 1)
    wl = luma[i]

    peak_is_sky = by < SKY_BAND
    warm_leads = wl >= bl - 8  # within a hair of the brightest mass

    ok = warm_leads or not peak_is_sky
    note = (
        f"warm core ({wx:.2f}, {wy:.2f}) L={wl / 255:.2f}   "
        f"bright peak ({bx:.2f}, {by:.2f}) L={bl / 255:.2f}   "
    )
    if ok:
        note += "ok"
    else:
        note += "FAIL — the sky is brighter than the lit window"
    return ok, note


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("target", nargs="*", help="house slugs, or paths to image files")
    ap.add_argument("--strict", action="store_true", help="exit 1 on any failure")
    args = ap.parse_args()

    # A slug names a published house; anything that exists as a file is measured
    # where it lies, so a fresh generation can be judged before it costs anything.
    sources: list[tuple[str, Path]] = []
    if args.target:
        for target in args.target:
            path = Path(target)
            if path.is_file():
                sources.append((path.stem, path))
            else:
                sources.append((target, STAYS / target / "exterior.jpg"))
    else:
        sources = [
            (p.name, p / "exterior.jpg") for p in sorted(STAYS.iterdir()) if p.is_dir()
        ]

    failures = 0
    for label, source in sources:
        if not source.exists():
            print(f"{label:16} no such file: {source}")
            continue
        ok, note = check(source)
        failures += not ok
        print(f"{label:16} {note}")

    if failures:
        print(f"\n{failures} frame(s) put the brightest mass in the sky.")
        print("Fix in the prompt — ask for a darker, deeper sky and a brighter")
        print("interior — not by editing the file; the sky is half the picture.")
        if args.strict:
            sys.exit(1)


if __name__ == "__main__":
    main()
