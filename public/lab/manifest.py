#!/usr/bin/env python3
"""Write public/lab/alive.json from whatever full-frame takes exist on disk.

alive.html reads this and nothing else, so a take that failed or was never run
simply is not offered, and adding a model later means re-running this rather
than editing the page.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
LAB = REPO / "public" / "lab"

# Cost is not derivable from the file, so it is recorded here beside the model
# that produced it. Read off each model's page on 2026-08-28.
COST = {
    "kling-o3-4k": ("Kling o3 4K (аніме-модель)", 0.42),
    "kling-v3-4k": ("Kling v3 4K (фотореал)", 0.42),
    "veo3.1-4k": ("veo 3.1 4K", 0.40),
    "veo3.1-fast-4k": ("veo 3.1 fast 4K", 0.30),
    "veo3.1-loop-4k": ("veo 3.1 4K, петля", 0.40),
    "seedance2-4k": ("Seedance 2.0 4K", None),
    "wan26": ("Wan 2.6 · 720p", 0.10),
    "ltx25": ("LTX 2.5 pro · 720p · camera_motion=static", 0.12),
    "hailuo23": ("Hailuo 2.3 pro", None),
    "lumaray": ("Luma Ray v3.2 · 720p", None),
    "wan30": ("Wan 3.0 Prime · 720p", 0.14),
    "grok15": ("Grok Imagine 1.5 · 720p", 0.14),
    "h3max": ("Minimax H3-max · 768p", 0.04),
}

# What framing the take was given, for the label. Empty means the model chose.
TAG = {
    "169": "наш кроп 16:9, старий промпт",
    "v2": "новий промпт",
    "loop": "перший = останній кадр",
    "bliz": "промпт про хуртовину",
}


def duration(path: Path) -> float | None:
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=nw=1:nk=1", str(path)],
            check=True, capture_output=True, text=True,
        ).stdout.strip()
        return float(out)
    except Exception:
        return None


def main() -> None:
    slug = sys.argv[1] if len(sys.argv) > 1 else "blackwater-11"
    scene = sys.argv[2] if len(sys.argv) > 2 else "interior"

    takes = []
    for d in sorted((LAB / "animate").glob(f"{slug}-{scene}-*")):
        raw = d / "raw.mp4"
        if not raw.exists():
            continue
        # <slug>-<scene>-<model>-<N>s[-<tag>] — the model is everything before
        # the duration token, so an optional tag on the end cannot shift it.
        rest = d.name[len(f"{slug}-{scene}-"):].split("-")
        i = next((n for n, t in enumerate(rest) if re.fullmatch(r"\d+s", t)), len(rest))
        model, tag = "-".join(rest[:i]), "-".join(rest[i + 1:])
        label, rate = COST.get(model, (model, None))
        secs = duration(raw)
        cost = f"${rate * secs:.2f}" if rate and secs else ""
        mb = raw.stat().st_size / 1024 / 1024
        parts = [label]
        if secs:
            parts.append(f"{secs:.0f} с")
        parts.append(TAG.get(tag, tag) if tag else "кадрує сам")
        takes.append({
            "label": " · ".join(x for x in parts if x),
            "src": f"/lab/animate/{d.name}/raw.mp4",
            "cost": " · ".join(x for x in (cost, f"{mb:.1f} МБ") if x),
        })
        print(f"  {d.name}: {secs}s, {mb:.1f} MB, {cost}")

    if not takes:
        sys.exit(f"no takes under public/lab/animate/ for {slug}-{scene}")

    out = LAB / "alive.json"
    out.write_text(json.dumps({
        "photo": f"/stays/{slug}/{scene}.jpg", "slug": slug, "takes": takes,
    }, indent=2))
    print(f"-> {out.name}: {len(takes)} take(s)")


if __name__ == "__main__":
    main()
