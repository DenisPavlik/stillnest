#!/usr/bin/env python3
"""Run one masked-inpaint take on fal.ai against a house's still.

WHY THIS SHAPE

    fal's `ltx-2.3-quality/inpaint` takes a source VIDEO and a mask VIDEO, and
    its contract is one sentence: "White regions are regenerated; black regions
    are preserved from the source video."

    So the source video is the photograph HELD STILL for N frames. Every black
    pixel of the mask therefore comes back as the photograph — the flue cannot
    sway, the mullions cannot breathe, and a spark cannot be drawn in front of
    the pipe, because that region is never handed to the model at all. The one
    failure that no prompt could fix is fixed by construction.

    That also means the only thing worth spending inference on is the ~0.7% of
    the frame the mask leaves white, which is why this is affordable at the
    photograph's native resolution.

PRICE
    The whole ltx-2.3-quality family bills $0.0024075 per megapixel of
    GENERATED video, counted as width x height x frames. This script prints the
    cost before it spends anything and refuses to run past --max-cost.

        1536x1024 x 121 frames = 190 MP = $0.46      <- calibrate here
        3072x2048 x 121 frames = 762 MP = $1.83      <- the native-resolution final
        3840x2160 x 121 frames = 1004 MP = $2.42

    Dimensions must be multiples of 32. All three rungs above already are.

THE CROP, AND WHY IT IS THE CHEAP ROW ABOVE

    --crop takes a square of N native pixels centred on the mask's white region
    and sends THAT, at its own size, as the whole take. Two things follow.

    Cost: the room is no longer paid for. 1024x1024 x 121 = 127 MP = $0.31.

    Resolution: because the crop is sent at its own size, one sent pixel is one
    photograph pixel. The fire comes back at the photograph's NATIVE density --
    which the full frame only reaches at 3072 wide, for $1.83. Six times less
    money for the same pixels on the only subject that survives the composite.

    It is also the one remaining answer to "the flue swayed": at 1536 the model
    was handed the pipe and asked not to move it. Cropped, the pipe is not in
    the picture at all.

        1024x1024 x 121 frames = 127 MP = $0.31      <- native fire, cropped

USAGE
        export $(grep '^FAL_KEY=' .env)
        python3 public/lab/falrun.py blackwater-11 --crop 1024
        python3 public/lab/falrun.py blackwater-11 --width 1536 --prompt-file p.txt
        python3 public/lab/falrun.py blackwater-11 --width 3072 --seed 41 --yes

    Writes into public/lab/takes/<slug>-<width>-<seed>/ and leaves every input
    it uploaded, so a take can be read back and argued with later.
"""

from __future__ import annotations

import argparse
import json
import os
import ssl
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

# A python.org framework build ships no CA bundle unless somebody double-clicks
# "Install Certificates.command", so every https call fails with
# CERTIFICATE_VERIFY_FAILED on an otherwise healthy machine. certifi is already
# present in this interpreter; use it, and fall back to the default context on
# a system python where it is not.
try:
    import certifi

    SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:  # pragma: no cover - depends on the interpreter, not on us
    SSL_CTX = ssl.create_default_context()

REPO = Path(__file__).resolve().parent.parent.parent
LAB = REPO / "public" / "lab"

ENDPOINT = "fal-ai/ltx-2.3-quality/inpaint"
QUEUE = "https://queue.fal.run"
# The queue's status/result URLs drop the sub-path, so they are built from the
# model root rather than from ENDPOINT.
QUEUE_ROOT = "https://queue.fal.run/fal-ai/ltx-2.3-quality"
PRICE_PER_MP = 0.0024075

DEFAULT_PROMPT = (
    "A log fire burning in a round steel basin. The flames lean, rise and settle; "
    "embers pulse deep orange in the logs; a few small sparks lift off the fire and "
    "die out in the air just above it. The fire keeps the same height and the same "
    "size from the first frame to the last. Quiet, cinematic, low-light interior "
    "photography at dusk. Nothing else in the room moves."
)

# The full frame's prompt spends half its words telling the model to leave a room
# alone. Cropped, there is no room to mention, and the words are better spent on
# what the mask newly allows: the bed of logs.
CROP_PROMPT = (
    "Close on a log fire burning in a round steel basin. The flames lean, rise and "
    "settle at a steady height; embers pulse and fade deep orange along the logs; a "
    "few small sparks lift off the flame and die out just above it. The logs lie "
    "still and keep their shape. The fire keeps the same height and the same spread "
    "from the first frame to the last. Quiet, cinematic, low-light photography at dusk."
)

NEGATIVE = (
    "camera movement, camera shake, zoom, pan, tilt, parallax, "
    "growing flames, flames spreading, smoke filling the frame, "
    "logs rolling, logs shifting, logs collapsing, the basin moving, "
    "falling snow, particles in the foreground, floating dust, white specks, "
    "people, hands, animals, text, watermark, "
    "exposure change, colour shift, brightness pulsing, strobing, flicker, "
    "blurry details, low quality, JPEG compression artifacts"
)


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, capture_output=True)


def crop_around_mask(mask_path: Path, size: int) -> tuple[int, int, int, int]:
    """A square of `size` native pixels centred on the mask's white region.

    The take is composited back through this same mask, so every pixel the model
    draws outside the white region is thrown away regardless. Feeding it the room
    buys nothing and hands it geometry to break.
    """
    import numpy as np
    from PIL import Image

    a = np.array(Image.open(mask_path).convert("L"))
    ph, pw = a.shape
    ys, xs = np.where(a > 127)
    if not len(xs):
        sys.exit(f"{mask_path.name} has no white region to centre a crop on")
    if size % 32:
        sys.exit(f"--crop must be a multiple of 32; {size} is not")
    if size > min(pw, ph):
        sys.exit(f"--crop {size} does not fit inside a {pw}x{ph} photograph")
    mw, mh = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
    if mw > size or mh > size:
        sys.exit(f"--crop {size} is smaller than the mask's own {mw}x{mh} white region")

    # Centred on the mask, then slid back inside the frame. Clamping rather than
    # padding keeps the 1:1 pixel mapping the whole point depends on.
    cx, cy = (xs.min() + xs.max()) // 2, (ys.min() + ys.max()) // 2
    x0 = min(max(int(cx) - size // 2, 0), pw - size)
    y0 = min(max(int(cy) - size // 2, 0), ph - size)
    print(f"crop {size}x{size} at ({x0},{y0}) — mask {mw}x{mh} sits at "
          f"({xs.min() - x0},{ys.min() - y0}) inside it")
    return (x0, y0, x0 + size, y0 + size)


def freeze(source: Path, out: Path, w: int, h: int, frames: int, fps: int, gray: bool) -> None:
    """One still, held for `frames` frames, at exactly w x h."""
    # `-loop 1` on an image input plus `-frames:v` is the only form that gives an
    # exact frame count; -t rounds and can land one frame either side, and the
    # mask video has to match the source video frame for frame.
    vf = f"scale={w}:{h}:flags=lanczos"
    if gray:
        # A binary mask must survive chroma subsampling, so it is written as a
        # grey ramp that is already either 0 or 255 and nothing between.
        vf += ",format=gray,format=yuv420p"
    else:
        vf += ",format=yuv420p"
    run([
        "ffmpeg", "-v", "error", "-loop", "1", "-i", str(source),
        "-vf", vf, "-frames:v", str(frames), "-r", str(fps),
        "-c:v", "libx264", "-crf", "6" if gray else "12", "-preset", "medium",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(out), "-y",
    ])


def upload(path: Path, content_type: str, key: str) -> str:
    """fal's two-step storage upload: initiate, then PUT the bytes."""
    req = urllib.request.Request(
        "https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3",
        data=json.dumps({"content_type": content_type, "file_name": path.name}).encode(),
        headers={"Authorization": f"Key {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60, context=SSL_CTX) as r:
        info = json.load(r)

    put = urllib.request.Request(
        info["upload_url"], data=path.read_bytes(),
        headers={"Content-Type": content_type}, method="PUT",
    )
    with urllib.request.urlopen(put, timeout=600, context=SSL_CTX) as r:
        if r.status not in (200, 201):
            sys.exit(f"upload failed: {r.status}")
    return info["file_url"]


def submit(body: dict, key: str) -> str:
    req = urllib.request.Request(
        f"{QUEUE}/{ENDPOINT}",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Key {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120, context=SSL_CTX) as r:
        return json.load(r)["request_id"]


def wait(request_id: str, key: str) -> dict:
    headers = {"Authorization": f"Key {key}"}
    for i in range(240):
        req = urllib.request.Request(f"{QUEUE_ROOT}/requests/{request_id}/status", headers=headers)
        with urllib.request.urlopen(req, timeout=60, context=SSL_CTX) as r:
            status = json.load(r).get("status")
        print(f"  {i * 10:4d}s  {status}")
        if status == "COMPLETED":
            req = urllib.request.Request(f"{QUEUE_ROOT}/requests/{request_id}", headers=headers)
            with urllib.request.urlopen(req, timeout=120, context=SSL_CTX) as r:
                return json.load(r)
        if status == "ERROR":
            req = urllib.request.Request(f"{QUEUE_ROOT}/requests/{request_id}", headers=headers)
            with urllib.request.urlopen(req, timeout=60, context=SSL_CTX) as r:
                sys.exit(f"fal returned ERROR: {json.dumps(json.load(r))[:1500]}")
        time.sleep(10)
    sys.exit("timed out after 40 minutes")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("slug")
    ap.add_argument("--width", type=int, default=None,
                    help="multiple of 32; height follows the source aspect. "
                         "Defaults to 1536 full-frame, or to --crop when cropping")
    ap.add_argument("--crop", type=int, default=None,
                    help="send only a square of N native px centred on the mask "
                         "(multiple of 32; 1024 is native-resolution fire for $0.31)")
    ap.add_argument("--mask", type=Path, default=None,
                    help="the mask actually sent to the model. Sized like the photograph "
                         "it is cropped to match; sized like the crop it is used as authored. "
                         "Defaults to genmask-<slug>-<crop>.png when cropping, "
                         "else inpaint-mask.png")
    ap.add_argument("--frames", type=int, default=121)
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--seed", type=int, default=1101)
    ap.add_argument("--steps", type=int, default=30, help="1..30; more is slower, not dearer")
    ap.add_argument("--video-strength", type=float, default=1.0)
    ap.add_argument("--guidance", type=float, default=1.0)
    ap.add_argument("--prompt-file", type=Path)
    ap.add_argument("--max-cost", type=float, default=2.50,
                    help="refuse to spend more than this in one take")
    ap.add_argument("--yes", action="store_true", help="skip the confirmation")
    args = ap.parse_args()

    key = os.environ.get("FAL_KEY")
    if not key:
        sys.exit("FAL_KEY is not set — run: export $(grep '^FAL_KEY=' .env)")

    still = REPO / "public" / "stays" / args.slug / "interior.jpg"
    # The anchor: it fixes WHERE the crop sits, and it is the frame genmask.py
    # authors in, so the two cannot drift apart.
    anchor = LAB / "inpaint-mask.png"
    for p in (still, anchor):
        if not p.exists():
            sys.exit(f"missing {p}")

    crop = crop_around_mask(anchor, args.crop) if args.crop else None

    mask = args.mask
    if mask is None and crop:
        cand = LAB / f"genmask-{args.slug}-{args.crop}.png"
        mask = cand if cand.exists() else anchor
    elif mask is None:
        mask = anchor
    if not mask.exists():
        sys.exit(f"missing {mask}")
    print(f"mask: {mask.name}")

    if args.width is None:
        args.width = args.crop if crop else 1536
    if args.width % 32:
        sys.exit(f"--width must be a multiple of 32; {args.width} is not")
    if crop:
        height = args.width          # the crop is square, so the take is too
    else:
        height = round(args.width * 2 / 3)
        height -= height % 32
    megapixels = args.width * height * args.frames / 1_000_000
    cost = megapixels * PRICE_PER_MP

    print(f"{args.slug} · {args.width}x{height} · {args.frames} frames @ {args.fps} fps "
          f"({args.frames / args.fps:.2f}s)")
    print(f"{megapixels:.0f} MP generated  ->  ${cost:.2f}")
    if cost > args.max_cost:
        sys.exit(f"refusing: ${cost:.2f} is over --max-cost ${args.max_cost:.2f}")
    if not args.yes:
        if input("spend it? [y/N] ").strip().lower() != "y":
            sys.exit("nothing spent")

    name = f"{args.slug}-crop{args.crop}-{args.width}-{args.seed}" if crop \
        else f"{args.slug}-{args.width}-{args.seed}"
    out = LAB / "takes" / name
    out.mkdir(parents=True, exist_ok=True)

    src, msk = still, mask
    if crop:
        from PIL import Image

        src, msk = out / "crop-source.png", out / "crop-mask.png"
        Image.open(still).convert("RGB").crop(crop).save(src)
        mi = Image.open(mask).convert("L")
        # Sized like the crop it was authored in the crop's frame; sized like the
        # photograph it has to be cut down to match. Anything else is a mistake
        # worth stopping on rather than resampling into something plausible.
        if mi.size == (args.crop, args.crop):
            mi.save(msk)
        elif mi.size == Image.open(still).size:
            mi.crop(crop).save(msk)
        else:
            sys.exit(f"{mask.name} is {mi.size}; expected the crop {(args.crop, args.crop)} "
                     f"or the photograph {Image.open(still).size}")
        # The composite has to put the result back exactly where it came from,
        # and "exactly" is not something to re-derive later from memory.
        (out / "crop.json").write_text(json.dumps({
            "rect": list(crop), "size": args.crop, "photo": list(Image.open(still).size),
            "still": str(still.relative_to(REPO)), "mask": str(mask.relative_to(REPO)),
            "anchor": str(anchor.relative_to(REPO)),
        }, indent=2))

    print("building the frozen source and the mask...")
    src_mp4, mask_mp4 = out / "source.mp4", out / "mask.mp4"
    freeze(src, src_mp4, args.width, height, args.frames, args.fps, gray=False)
    freeze(msk, mask_mp4, args.width, height, args.frames, args.fps, gray=True)

    print("uploading...")
    src_url = upload(src_mp4, "video/mp4", key)
    mask_url = upload(mask_mp4, "video/mp4", key)

    if args.prompt_file:
        prompt = args.prompt_file.read_text().strip()
    else:
        prompt = CROP_PROMPT if crop else DEFAULT_PROMPT
    body = {
        "video_url": src_url,
        "mask_video_url": mask_url,
        "prompt": prompt,
        "negative_prompt": NEGATIVE,
        "num_frames": args.frames,
        "frames_per_second": args.fps,
        "seed": args.seed,
        "video_strength": args.video_strength,
        "guidance_scale": args.guidance,
        "num_inference_steps": args.steps,
        "video_quality": "maximum",
        "generate_audio": False,
        # Prompt expansion rewrites what was carefully written. The last model
        # that was allowed to reinterpret a prompt put snow inside the room.
        "enable_prompt_expansion": False,
    }
    (out / "request.json").write_text(json.dumps(body, indent=2))

    print(f"submitting to {ENDPOINT}...")
    request_id = submit(body, key)
    print(f"request {request_id}")
    result = wait(request_id, key)
    (out / "result.json").write_text(json.dumps(result, indent=2))

    url = (result.get("video") or {}).get("url")
    if not url:
        sys.exit(f"no video in the result: {json.dumps(result)[:800]}")
    raw = out / "raw.mp4"
    with urllib.request.urlopen(url, timeout=600, context=SSL_CTX) as r:
        raw.write_bytes(r.read())
    print(f"\n-> {raw}  ({raw.stat().st_size / 1024:.0f} KB)")
    print(f"   spent ${cost:.2f}")


if __name__ == "__main__":
    main()
