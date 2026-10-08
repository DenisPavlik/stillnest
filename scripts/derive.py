#!/usr/bin/env python3
"""Turn a house's canonical stills into every file the catalog actually asks for.

WHY THIS EXISTS
    A house is not published until ten files exist under public/stays/<slug>/,
    and only three of them come out of a model. The other seven are mechanical:
    a WebP beside every JPEG, and a 1536px rung beside every 3072px one. They
    were made by hand with a Pillow one-liner for the first house, which is fine
    once and a source of silent 404s eleven more times — a missing rung does not
    fail a build, it just makes a phone download the 3072 file, or breaks the
    <source> and shows nothing.

WHAT IT WRITES, PER HOUSE

    exterior.jpg           3072 wide, from scripts/upscale.py   <- you provide
    exterior.webp                                                  derived
    exterior-1536.jpg                                              derived
    exterior-1536.webp                                             derived
    exterior-portrait.jpg  1400 wide, from scripts/upscale.py   <- you provide
    exterior-portrait.webp                                         derived
    interior.jpg           3072 wide, from scripts/upscale.py   <- you provide
    interior.webp                                                  derived
    interior-1536.jpg                                              derived
    interior-1536.webp                                             derived

    The portrait gets one narrow rung, 900, for phones; its widest is the 1400
    file itself — a 1536 portrait would be an upscale.

NO NEW DEPENDENCIES
    stdlib + Pillow, same as scripts/upscale.py, for the same reason:
    `pyproject.toml` and `api/requirements.txt` are held identical by
    `api/tests/test_dependencies_agree.py`, and laptop tooling does not belong in
    the deployed service's dependency set.

USAGE
    python3 scripts/derive.py hollowmoss-04        # one house
    python3 scripts/derive.py --all                # every house with stills
    python3 scripts/derive.py --all --check        # report only, write nothing
    python3 scripts/derive.py blackwater-11 --force
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parent.parent
STAYS = REPO / "public" / "stays"

# Keep in step with RUNGS in src/lib/media.ts. The widest rung is stored under
# the bare name — `stillSources` builds `<base>.jpg` for it and `<base>-1536.jpg`
# for the rest — so the two lists have to agree or the srcSet points at nothing.
RUNGS = (768, 1536, 3072)
WIDEST = RUNGS[-1]

JPEG_QUALITY = 88
WEBP_QUALITY = 82

# The stills a house is expected to have, and the NARROW rungs each gets — the
# widest is always the bare name. The portrait is mobile art direction at 1400
# wide; Lighthouse caught a phone downloading all 590 KB of it to paint ~400 CSS
# px, so it gets a 900 rung of its own — 720 was one pixel short of Lighthouse's
# 412 x 1.75 phone and was never chosen (keep in step with PORTRAIT_RUNGS in
# src/lib/media.ts).
SOURCES = (
    ("exterior", (768, 1536)),
    ("interior", (768, 1536)),
    ("exterior-portrait", (900,)),
)

# The portrait is a dark, grainy frame painted on a small screen, where q72 is
# indistinguishable from q82 and a third lighter (hollowmoss: 593 -> 434 KB).
PORTRAIT_WEBP_QUALITY = 72


def save_jpeg(image: Image.Image, path: Path) -> None:
    image.save(path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)


def save_webp(image: Image.Image, path: Path) -> None:
    # method=6 is the slowest and smallest setting. These files are written once
    # on a laptop and served forever; there is no reason to trade size for speed.
    quality = PORTRAIT_WEBP_QUALITY if path.name.startswith("exterior-portrait") else WEBP_QUALITY
    image.save(path, "WEBP", quality=quality, method=6)


def expected_files(name: str, narrow: tuple[int, ...]) -> list[str]:
    """Every filename the app can ask for, for one still."""
    files = [f"{name}.jpg", f"{name}.webp"]
    for rung in narrow:
        files += [f"{name}-{rung}.jpg", f"{name}-{rung}.webp"]
    return files


def derive_one(source: Path, name: str, narrow: tuple[int, ...], force: bool) -> list[str]:
    """Write the derivatives for one canonical still. Returns what it wrote."""
    written: list[str] = []
    original = Image.open(source).convert("RGB")

    if name != "exterior-portrait" and original.width != WIDEST:
        print(
            f"    ! {source.name} is {original.width}px, expected {WIDEST} — "
            f"run scripts/upscale.py on it first"
        )

    targets: list[tuple[Path, Image.Image, str]] = [
        (source.with_suffix(".webp"), original, "webp"),
    ]
    for rung in narrow:
        if rung >= original.width:
            continue
        small = original.resize(
            (rung, round(original.height * rung / original.width)), Image.LANCZOS
        )
        base = source.with_name(f"{name}-{rung}")
        targets += [
            (base.with_suffix(".jpg"), small, "jpg"),
            (base.with_suffix(".webp"), small, "webp"),
        ]

    for path, image, kind in targets:
        if path.exists() and not force:
            print(f"    · {path.name} exists, skipped")
            continue
        if kind == "jpg":
            save_jpeg(image, path)
        else:
            save_webp(image, path)
        size = path.stat().st_size / 1024
        print(f"    → {path.name}: {image.width}x{image.height}, {size:.0f} KB")
        written.append(path.name)

    return written


def check_house(folder: Path) -> list[str]:
    """Names of files the app will ask for and not find."""
    missing = []
    for name, narrow in SOURCES:
        if not (folder / f"{name}.jpg").exists():
            missing.append(f"{name}.jpg (canonical — generate it)")
            continue
        missing += [f for f in expected_files(name, narrow) if not (folder / f).exists()]
    return missing


def houses(args: argparse.Namespace) -> list[Path]:
    if args.all:
        if not STAYS.exists():
            sys.exit(f"no such directory: {STAYS}")
        return sorted(p for p in STAYS.iterdir() if p.is_dir())
    folders = []
    for slug in args.slug:
        folder = STAYS / slug
        if not folder.is_dir():
            sys.exit(f"no such house: {folder}")
        folders.append(folder)
    return folders


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("slug", nargs="*", help="house slug, e.g. blackwater-11")
    ap.add_argument("--all", action="store_true", help="every house under public/stays")
    ap.add_argument("--check", action="store_true", help="report gaps, write nothing")
    ap.add_argument("--force", action="store_true", help="rewrite existing derivatives")
    args = ap.parse_args()

    if not args.slug and not args.all:
        ap.error("name at least one slug, or pass --all")

    incomplete = 0
    for folder in houses(args):
        print(folder.relative_to(REPO))

        if not args.check:
            for name, narrow in SOURCES:
                source = folder / f"{name}.jpg"
                if not source.exists():
                    continue
                derive_one(source, name, narrow, args.force)

        missing = check_house(folder)
        if missing:
            # The report belongs on stdout even when it is bad news — it is what
            # the script was asked for. Only the exit line goes to stderr, so the
            # two streams cannot interleave halfway through a house.
            incomplete += 1
            print(f"  incomplete — {len(missing)} missing:")
            for name in missing:
                print(f"    ✗ {name}")
        else:
            print("  complete — add the slug to PHOTOGRAPHED in src/lib/media.ts")

    if incomplete:
        sys.exit(f"\n{incomplete} house(s) incomplete")


if __name__ == "__main__":
    main()
