#!/usr/bin/env python3
"""Upscale a generated still through fal.ai AuraSR, then land it at a target width.

WHY THIS EXISTS
    GPT Image 2 stops at 1536px on the long edge. The home hero is full-bleed,
    so on a 2560px ultrawide the file is stretched 1.67x and reads as soft —
    measurably, not subjectively. No prompt fixes that; the ceiling belongs to
    the model.

WHY AURASR AND NOT A DIFFUSION UPSCALER
    Clarity/SeedVR-style upscalers re-imagine detail, and this catalog cannot
    afford that: every view of a house has to stay the same building, and an
    upscaler that redraws a window frame breaks the thing the whole Phase 9
    workflow is built to protect. AuraSR is a GAN super-resolver trained on
    text-to-image output — it sharpens what is there instead of inventing.

WHY 4x THEN DOWN
    AuraSR only does 4x (1536 -> 6144). Downsampling that to the target with
    Lanczos is not waste: it averages away the upscaler's own artefacts and
    lands crisper than asking for the target size directly.

NO NEW DEPENDENCIES
    stdlib + Pillow only. `pyproject.toml` and `api/requirements.txt` are held
    identical by `api/tests/test_dependencies_agree.py`, and a tool that runs on
    a laptop twenty-four times has no business in the deployed service's
    dependency set.

USAGE
    python3 scripts/upscale.py public/stays/hollowmoss-04/exterior.jpg
    python3 scripts/upscale.py <in> --width 3072 --out <path> --quality 88
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

ENDPOINT = "https://fal.run/fal-ai/aura-sr"
REPO = Path(__file__).resolve().parent.parent


def tls_context() -> ssl.SSLContext:
    """A context that actually has root certificates.

    A python.org build on macOS does not use the system keychain, and ships
    with an empty trust store until someone runs `Install Certificates.command`
    by hand — so every HTTPS call fails with CERTIFICATE_VERIFY_FAILED on a
    machine where curl works fine. certifi is already installed as a transitive
    dependency; pointing at it makes the script work regardless.
    """
    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


def load_fal_key() -> str:
    """Read FAL_KEY from the environment, falling back to .env then .env.local.

    Same precedence as `api/stillnest/env.py`: a real environment variable always
    wins, so CI or a shell export is never quietly overridden by a dotfile.
    """
    key = os.environ.get("FAL_KEY", "").strip()
    if key:
        return key

    for name in (".env", ".env.local"):
        path = REPO / name
        if not path.exists():
            continue
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line.startswith("FAL_KEY="):
                continue
            value = line.split("=", 1)[1].strip().strip('"').strip("'")
            if value:
                return value

    sys.exit("FAL_KEY is not set — put it in .env or export it.")


def to_data_uri(path: Path) -> str:
    """fal accepts a base64 data URI, which saves hosting the source anywhere."""
    raw = path.read_bytes()
    mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    return f"data:{mime};base64,{base64.b64encode(raw).decode()}"


def upscale(image_path: Path, key: str) -> bytes:
    ctx = tls_context()
    body = json.dumps(
        {
            "image_url": to_data_uri(image_path),
            "upscale_factor": 4,
            # Without this the tiles AuraSR works in leave faint seams, and on a
            # dark misty photograph a seam is the one thing the eye finds.
            "overlapping_tiles": True,
            "checkpoint": "v2",
        }
    ).encode()

    request = urllib.request.Request(
        ENDPOINT,
        data=body,
        headers={"Authorization": f"Key {key}", "Content-Type": "application/json"},
    )

    started = time.time()
    try:
        with urllib.request.urlopen(request, timeout=600, context=ctx) as response:
            payload = json.loads(response.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"fal.ai returned {e.code}: {e.read().decode()[:500]}")

    url = payload.get("image", {}).get("url")
    if not url:
        sys.exit(f"unexpected response from fal.ai: {json.dumps(payload)[:500]}")

    print(
        f"  fal.ai: {payload['image'].get('width')}x{payload['image'].get('height')} "
        f"in {time.time() - started:.1f}s"
    )
    with urllib.request.urlopen(url, timeout=600, context=ctx) as response:
        return response.read()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("image", type=Path)
    ap.add_argument("--width", type=int, default=3072, help="final width in px")
    ap.add_argument("--out", type=Path, help="defaults to overwriting the input")
    ap.add_argument("--quality", type=int, default=88)
    args = ap.parse_args()

    if not args.image.exists():
        sys.exit(f"no such file: {args.image}")

    source = Image.open(args.image)
    print(f"{args.image}: {source.width}x{source.height}")

    raw = upscale(args.image, load_fal_key())
    big = Image.open(io.BytesIO(raw)).convert("RGB")

    if big.width != args.width:
        big = big.resize(
            (args.width, round(big.height * args.width / big.width)), Image.LANCZOS
        )

    out = args.out or args.image
    out.parent.mkdir(parents=True, exist_ok=True)
    big.save(out, "JPEG", quality=args.quality, optimize=True, progressive=True)
    print(f"  -> {out}: {big.width}x{big.height}, {out.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
