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

    The portrait has no rung on purpose. <Still> asks for exactly
    `<portraitBase>.jpg` and `.webp` on `max-aspect-ratio: 1/1`, and at 1400 wide
    it is already below the narrow rung — a 1536 portrait would be an upscale.

WHY THESE QUALITY NUMBERS
    JPEG 88 and WebP 82 (method 6) are not taste. They are the settings that
    reproduce Hollowmoss 04 — the house that was judged by eye and accepted — to
    within a kilobyte on every one of its seven derived files. The catalog has to
    look like one photographer's work, and that includes its compression.

WHY LANCZOS, AND WHY FROM THE 3072
    Every rung is resampled from the upscaled canonical file, never from the raw
    1536 the model produced. AuraSR's output downsampled with Lanczos is visibly
    cleaner than the model's own 1536, because the downsample averages away the
    upscaler's tile artefacts.

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
RUNGS = (1536, 3072)
WIDEST = RUNGS[-1]

JPEG_QUALITY = 88
WEBP_QUALITY = 82

# The stills a house is expected to have, and whether the narrow rung applies.
# `exterior-portrait` is mobile art direction, not a resolution rung.
SOURCES = (
    ("exterior", True),
    ("interior", True),
    ("exterior-portrait", False),
)


def save_jpeg(image: Image.Image, path: Path) -> None:
    image.save(path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)


def save_webp(image: Image.Image, path: Path) -> None:
    # method=6 is the slowest and smallest setting. These files are written once
    # on a laptop and served forever; there is no reason to trade size for speed.
    image.save(path, "WEBP", quality=WEBP_QUALITY, method=6)


def expected_files(name: str, runged: bool) -> list[str]:
    """Every filename the app can ask for, for one still."""
    files = [f"{name}.jpg", f"{name}.webp"]
    if runged:
        for rung in RUNGS:
            if rung != WIDEST:
                files += [f"{name}-{rung}.jpg", f"{name}-{rung}.webp"]
    return files


def derive_one(source: Path, name: str, runged: bool, force: bool) -> list[str]:
    """Write the derivatives for one canonical still. Returns what it wrote."""
    written: list[str] = []
    original = Image.open(source).convert("RGB")

    if runged and original.width != WIDEST:
        print(
            f"    ! {source.name} is {original.width}px, expected {WIDEST} — "
            f"run scripts/upscale.py on it first"
        )

    targets: list[tuple[Path, Image.Image, str]] = [
        (source.with_suffix(".webp"), original, "webp"),
    ]
    if runged:
        for rung in RUNGS:
            if rung == WIDEST or rung >= original.width:
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
    for name, runged in SOURCES:
        if not (folder / f"{name}.jpg").exists():
            missing.append(f"{name}.jpg (canonical — generate it)")
            continue
        missing += [f for f in expected_files(name, runged) if not (folder / f).exists()]
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
            for name, runged in SOURCES:
                source = folder / f"{name}.jpg"
                if not source.exists():
                    continue
                derive_one(source, name, runged, args.force)

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
