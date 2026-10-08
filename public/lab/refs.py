#!/usr/bin/env python3
"""Build the reference wall for the catalog re-shoot.

The twelve shipped stills are architecturally correct and emotionally empty — one
warm light, no soft goods, no trace that anyone has been in the room. Before any
prompt is rewritten the owner has to point at real photographs and say "that
feeling", because a written description of cosiness is exactly what produced the
current set.

So: collect real photography (operators, listings, editorial, social reposts),
never AI stock, into one wall he can scroll. Search URLs are harvested separately
by the browser into .playwright-mcp/refs-raw*.json; this script downloads,
verifies, de-duplicates and lays them out.

    uv run --with pillow --with certifi python public/lab/refs.py fetch
    uv run --with pillow --with certifi python public/lab/refs.py sheets
"""

from __future__ import annotations

import json
import ssl
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen

import certifi
from PIL import Image, ImageDraw, ImageFont

# uv's ephemeral interpreter carries no root store, so every https host fails
# CERTIFICATE_VERIFY_FAILED until one is handed to it explicitly.
SSL = ssl.create_default_context(cafile=certifi.where())

ROOT = Path(__file__).resolve().parents[2]
RAW = sorted((ROOT / ".playwright-mcp").glob("refs-raw*.json"))
POOL = ROOT / "public" / "lab" / "refs"
SHEETS = POOL / "sheets"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

PER_TAG = 22          # Search engines return in relevance order; the tail is noise.
LONG_EDGE = 1600      # plenty for judging a mood, cheap on disk.
MIN_EDGE = 780


def ahash(im: Image.Image) -> str:
    """Average hash — catches the same photograph reposted at three sizes."""
    g = im.convert("L").resize((8, 8), Image.LANCZOS)
    px = list(g.getdata())
    avg = sum(px) / len(px)
    bits = "".join("1" if p > avg else "0" for p in px)
    return f"{int(bits, 2):016x}"


def candidates() -> list[dict]:
    seen_url: set[str] = set()
    per_tag: dict[str, int] = {}
    out: list[dict] = []
    for f in RAW:
        for it in json.loads(f.read_text())["items"]:
            if it["u"] in seen_url:
                continue
            if per_tag.get(it["tag"], 0) >= PER_TAG:
                continue
            seen_url.add(it["u"])
            per_tag[it["tag"]] = per_tag.get(it["tag"], 0) + 1
            out.append(it)
    return out


def grab(job: tuple[int, dict]) -> dict | None:
    i, it = job
    tmp = POOL / f".tmp-{i}"
    try:
        req = Request(it["u"], headers={"User-Agent": UA, "Referer": "https://www.google.com/"})
        with urlopen(req, timeout=20, context=SSL) as r:
            tmp.write_bytes(r.read(12_000_000))
        im = Image.open(tmp)
        im.load()
    except Exception:
        tmp.unlink(missing_ok=True)
        return None

    w, h = im.size
    if min(w, h) < MIN_EDGE:
        tmp.unlink(missing_ok=True)
        return None
    ar = w / h
    if not 0.45 <= ar <= 2.6:
        tmp.unlink(missing_ok=True)
        return None

    if max(w, h) > LONG_EDGE:
        s = LONG_EDGE / max(w, h)
        im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
    im = im.convert("RGB")

    name = f"{it['tag']}-{i:03d}.jpg"
    im.save(POOL / name, quality=88, optimize=True)
    tmp.unlink(missing_ok=True)
    return {"file": name, "tag": it["tag"], "src": it["u"], "w": w, "h": h, "hash": ahash(im)}


def fetch() -> None:
    POOL.mkdir(parents=True, exist_ok=True)
    for f in POOL.glob("*.jpg"):   # names are index-based; a partial re-run leaves orphans
        f.unlink()
    cands = candidates()
    print(f"{len(cands)} candidates from {len(RAW)} harvests")

    with ThreadPoolExecutor(max_workers=16) as ex:
        got = [r for r in ex.map(grab, enumerate(cands)) if r]

    # Same photograph, three hosts: keep the first, drop the rest.
    kept, seen_hash = [], set()
    for r in got:
        if r["hash"] in seen_hash:
            (POOL / r["file"]).unlink(missing_ok=True)
            continue
        seen_hash.add(r["hash"])
        kept.append(r)

    (POOL / "pool.json").write_text(json.dumps({"items": kept}, indent=1))
    tags: dict[str, int] = {}
    for r in kept:
        tags[r["tag"]] = tags.get(r["tag"], 0) + 1
    print(f"{len(kept)} kept  " + "  ".join(f"{k}:{v}" for k, v in sorted(tags.items())))


def sheets(cols: int = 6, rows: int = 5, cell: int = 262) -> None:
    """Contact sheets, so the pool can be culled by eye before he ever sees it."""
    SHEETS.mkdir(parents=True, exist_ok=True)
    for f in SHEETS.glob("*.jpg"):
        f.unlink()
    items = json.loads((POOL / "pool.json").read_text())["items"]
    per = cols * rows
    for s in range(0, len(items), per):
        chunk = items[s : s + per]
        sheet = Image.new("RGB", (cols * cell, rows * (cell + 18)), (14, 18, 16))
        for n, it in enumerate(chunk):
            im = Image.open(POOL / it["file"]).convert("RGB")
            w, h = im.size
            sc = max(cell / w, cell / h)
            im = im.resize((round(w * sc), round(h * sc)), Image.LANCZOS)
            x = (im.width - cell) // 2
            y = (im.height - cell) // 2
            im = im.crop((x, y, x + cell, y + cell))
            cx = (n % cols) * cell
            cy = (n // cols) * (cell + 18)
            sheet.paste(im, (cx, cy + 18))
        out = SHEETS / f"sheet-{s // per:02d}.jpg"
        sheet.save(out, quality=86)
        print(out.name, " ".join(f"{s + n}" for n in range(len(chunk))))




def picked() -> None:
    """Lay out a named selection, large and numbered, so it can be read back.

    The owner answers in numbers; the art direction has to come out of the frames
    those numbers point at. Usage:

        ... refs.py picked <name> <cols> <cell> <i> <i> ...
    """
    name, cols, cell = sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    idx = [int(x) for x in sys.argv[5:]]
    items = json.loads((POOL / "pool.json").read_text())["items"]
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", max(18, cell // 18))
    except Exception:
        font = ImageFont.load_default()

    SHEETS.mkdir(parents=True, exist_ok=True)
    per_row = cols
    rows = 2 if cols <= 3 else 3
    per = per_row * rows
    for s in range(0, len(idx), per):
        chunk = idx[s : s + per]
        pad = 30
        sheet = Image.new("RGB", (cols * cell, rows * (cell + pad)), (14, 18, 16))
        d = ImageDraw.Draw(sheet)
        for n, i in enumerate(chunk):
            im = Image.open(POOL / items[i]["file"]).convert("RGB")
            w, h = im.size
            sc = max(cell / w, cell / h)
            im = im.resize((round(w * sc), round(h * sc)), Image.LANCZOS)
            im = im.crop(((im.width - cell) // 2, (im.height - cell) // 2,
                          (im.width - cell) // 2 + cell, (im.height - cell) // 2 + cell))
            cx, cy = (n % per_row) * cell, (n // per_row) * (cell + pad)
            sheet.paste(im, (cx, cy + pad))
            d.text((cx + 6, cy + 4), f"{i}  {items[i]['tag']}", fill=(255, 157, 77), font=font)
        out = SHEETS / f"{name}-{s // per}.jpg"
        sheet.save(out, quality=90)
        print(out.name, chunk)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "fetch"
    {"fetch": fetch, "sheets": sheets, "picked": picked}[cmd]()
