#!/usr/bin/env python3
"""Animate a whole photograph on fal.ai. No mask, no compositing, no shaders.

WHY THIS EXISTS

    The full-frame route was written off on ONE take: veo3.1/lite, low
    resolution, $0.60. That is a thin basis for killing a direction, and the
    owner said so. This script runs the same photograph through the models that
    actually compete at the top, at 4K, so the question is settled by looking
    rather than by arguing.

    Everything here is the opposite of falrun.py. There the model was fenced
    into 0.66% of the frame and the photograph was protected by construction.
    Here the model repaints every pixel and we find out whether it holds the
    room still because it is good enough to.

WHAT THE PRICES ARE, AND WHERE THEY CAME FROM

    Read off each model's own page on 2026-08-28. They move monthly -- re-read
    them before trusting this comment.

        kling-o3-4k   $0.42/s, audio or not          -> 5s = $2.10
        veo3.1-4k     $0.40/s without audio          -> 4s = $1.60
        ltx-native    $0.0024075 per megapixel       -> 3072x2048x121 = $1.83

USAGE
        export $(grep '^FAL_KEY=' .env)
        python3 public/lab/animate.py blackwater-11 --model kling-o3-4k
        python3 public/lab/animate.py blackwater-11 --model veo3.1-4k --yes
"""

from __future__ import annotations

import argparse
import json
import os
import ssl
import sys
import time
import urllib.request
from pathlib import Path

try:
    import certifi

    SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:  # pragma: no cover
    SSL_CTX = ssl.create_default_context()

REPO = Path(__file__).resolve().parent.parent.parent
LAB = REPO / "public" / "lab"

# WHY THIS PROMPT LOOKS THE WAY IT DOES
#
#   The first version was 14 sentences, 8 of them negations, and it produced a
#   camera push-in and no snow at all. Three rules, each with a source:
#
#   1. NO NEGATION PARTICLES. Runway's Gen-4 guide names our exact string as its
#      canonical bad example: "No camera movement. The camera doesn't move." ->
#      "Locked camera. The camera remains still." CLIP embeds "A not B" closer to
#      A+B than to A-B, so a prohibition is a request. Positive stillness --
#      "remain still", "motionless" -- is fine and is what the cinemagraph-trained
#      models are captioned with.
#   2. DESCRIBE MOTION ONLY. Google's image-to-video best practice: re-describing
#      the subject, background or lighting already in the image is "redundant" and
#      "leads to poor results". Our first prompt opened with a paragraph about the
#      room. That is the documented cause of the missing snow.
#   3. NAME THE CAMERA ONCE, WITH THE DOCUMENTED WORD. Google's camera vocabulary
#      lists exactly one static term: "Static shot (or fixed)". Never name a move
#      we do not want -- naming "zoom" is how a zoom gets generated.

PROMPT = (
    "Static shot. The camera remains completely still, holding the identical "
    "framing throughout. Flames rise and settle inside the suspended steel basin, "
    "and embers pulse deep orange along the logs. Beyond the glass, fine snow "
    "drifts down and spruce branches sway slightly. The room, the flue pipe, the "
    "furniture and the window frames remain still. Exposure, contrast and colour "
    "remain constant."
)

# Comma-separated nouns, never a sentence. Google, on negative prompts: "Not
# recommended: using instructive language or words such as 'no' or 'don't' ...
# Recommended: describe what you don't want to see. For example, 'wall, frame'."
NEGATIVE = (
    "camera movement, dolly, zoom, pan, tilt, handheld, parallax, "
    "snow indoors, sparks inside the room, dust, floating particles, "
    "swaying flue pipe, bending hood, warping, deformation, "
    "people, animals, text, watermark, exposure shift, colour shift"
)

# Kling ships its own default negative and it is short enough to lose things we
# care about, so it is replaced wholesale rather than appended to. The extra
# terms are the softness complaint, written as nouns.
NEGATIVE_KLING = NEGATIVE + ", blur, soft focus, smoothed texture, low detail, waxy, painterly"

MODELS = {
    "kling-o3-4k": {
        "endpoint": "fal-ai/kling-video/o3/4k/image-to-video",
        "rate": 0.42, "durations": [str(n) for n in range(3, 16)],
        # Kept only so an old take can be reproduced. fal's own page calls this
        # endpoint "tuned for expressive, stylized animation ... anime, cel-shaded,
        # painterly ... without flattening toward a photoreal bias". It is the
        # wrong model for a photograph, and it measured 21% softer than the source.
        "body": lambda url, d, o: {
            "image_url": url, "duration": str(d), "generate_audio": False,
        },
    },
    "kling-v3-4k": {
        "endpoint": "fal-ai/kling-video/v3/4k/image-to-video",
        "rate": 0.42, "durations": [str(n) for n in range(3, 16)],
        # The photoreal one, same price, and the only Kling with any levers.
        # NOTE the field is start_image_url, not image_url.
        "body": lambda url, d, o: {
            "start_image_url": url, "duration": str(d), "generate_audio": False,
            "negative_prompt": o["negative"] or NEGATIVE_KLING,
            "cfg_scale": o["cfg"],
            # 'intelligent' lets the model plan shot structure and camera angles --
            # a cut-and-move generator, the opposite of a locked-off frame.
            "shot_type": "customize",
        },
    },
    "veo3.1-4k": {
        "endpoint": "fal-ai/veo3.1/image-to-video",
        "rate": 0.40, "durations": ["4", "6", "8"],
        "body": lambda url, d, o: {
            "image_url": url, "duration": f"{d}s",
            "resolution": "4k", "aspect_ratio": "16:9", "generate_audio": False,
            "negative_prompt": o["negative"] or NEGATIVE,
            # A rewrite could quietly reinstate the camera move we are fighting.
            "auto_fix": False,
        },
    },
    "veo3.1-fast-4k": {
        "endpoint": "fal-ai/veo3.1/fast/image-to-video",
        "rate": 0.30, "durations": ["4", "6", "8"],
        # The cheap rung. Same knobs, $0.30/s instead of $0.40 -- calibrate here.
        "body": lambda url, d, o: {
            "image_url": url, "duration": f"{d}s",
            "resolution": "4k", "aspect_ratio": "16:9", "generate_audio": False,
            "negative_prompt": o["negative"] or NEGATIVE,
            "auto_fix": False,
        },
    },
    "veo3.1-loop-4k": {
        "endpoint": "fal-ai/veo3.1/first-last-frame-to-video",
        "rate": 0.40, "durations": ["4", "6", "8"],
        # The same photograph as both ends. Runway recommends this exact trick for
        # a shot that will not hold still: net camera displacement is forced to
        # zero, and the loop closes for free. The risk it carries is a boomerang --
        # motion that goes out and comes back -- which only looking can settle.
        "body": lambda url, d, o: {
            "first_frame_url": url, "last_frame_url": url, "duration": f"{d}s",
            "resolution": "4k", "aspect_ratio": "16:9", "generate_audio": False,
            "negative_prompt": o["negative"] or NEGATIVE,
            "auto_fix": False,
        },
    },
    # ---- the 720p sweep. The point is to find a model that can do WEATHER at
    # all; resolution is a second question and a cheap one. Every one of these
    # ships some form of automatic prompt rewriting turned ON by default --
    # disable it, or the prompt under test is not the prompt that ran.
    "wan26": {
        "endpoint": "wan/v2.6/image-to-video",
        "rate": 0.10, "durations": ["5", "10", "15"],
        "body": lambda url, d, o: {
            "image_url": url, "duration": str(d), "resolution": "720p",
            "negative_prompt": o["negative"] or NEGATIVE,
            "enable_prompt_expansion": False,
        },
    },
    "ltx25": {
        "endpoint": "lightricks/ltx-2.5/image-to-video/pro",
        "rate": 0.12, "durations": ["6", "8", "10"],
        # The only endpoint found with a real camera LOCK rather than a prompt
        # asking nicely: camera_motion is an enum and one of its values is
        # "static". Everything else in this project has been vocabulary.
        "body": lambda url, d, o: {
            "image_url": url, "duration": int(d), "resolution": "720p",
            "aspect_ratio": "16:9", "camera_motion": "static",
            "generate_audio": False,
        },
    },
    "hailuo23": {
        "endpoint": "fal-ai/minimax/hailuo-2.3/pro/image-to-video",
        "rate": None, "flat": 0.49, "durations": ["6"],
        "body": lambda url, d, o: {
            "image_url": url, "prompt_optimizer": False,
        },
    },
    "lumaray": {
        "endpoint": "luma/agent/ray/v3.2/image-to-video",
        "rate": None, "flat": 0.30, "durations": ["5"],
        "body": lambda url, d, o: {
            "image_url": url, "duration": "5s", "resolution": "720p",
            "aspect_ratio": "16:9", "loop": False, "hdr": False,
        },
    },
    "wan30": {
        "endpoint": "alibaba/wan-3.0-prime/image-to-video",
        "rate": 0.14, "durations": ["5"],
        "body": lambda url, d, o: {
            "start_image_url": url, "duration": int(d), "resolution": "720p",
            "aspect_ratio": "16:9", "audio": False,
            "enable_prompt_expansion": False, "enable_safety_checker": True,
        },
    },
    "grok15": {
        "endpoint": "xai/grok-imagine-video/v1.5/image-to-video",
        "rate": 0.14, "durations": ["5", "6"],
        "body": lambda url, d, o: {
            "image_url": url, "duration": int(d), "resolution": "720p",
        },
    },
    "h3max": {
        "endpoint": "minimax/h3-max/image-to-video",
        "rate": 0.04, "durations": ["5"],
        "body": lambda url, d, o: {
            "image_url": url, "duration": int(d), "resolution": "768P",
            "prompt_expansion_mode": "disabled",
        },
    },
    "seedance2-4k": {
        "endpoint": "bytedance/seedance-2.0/image-to-video",
        "rate": None, "durations": ["4", "5", "6", "7", "8"],
        "body": lambda url, d, o: {
            "image_url": url, "duration": str(d),
            "resolution": "4k", "aspect_ratio": "auto",
            "generate_audio": False, "bitrate_mode": "high",
        },
    },
}


def queue_root(endpoint: str) -> str:
    """fal's status URLs address the app, not the sub-path under it."""
    return "https://queue.fal.run/" + "/".join(endpoint.split("/")[:2])


def upload(path: Path, content_type: str, key: str) -> str:
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


def submit(endpoint: str, body: dict, key: str) -> str:
    req = urllib.request.Request(
        f"https://queue.fal.run/{endpoint}", data=json.dumps(body).encode(),
        headers={"Authorization": f"Key {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120, context=SSL_CTX) as r:
        return json.load(r)["request_id"]


def wait(endpoint: str, request_id: str, key: str) -> dict:
    root, headers = queue_root(endpoint), {"Authorization": f"Key {key}"}
    for i in range(360):
        req = urllib.request.Request(f"{root}/requests/{request_id}/status", headers=headers)
        with urllib.request.urlopen(req, timeout=60, context=SSL_CTX) as r:
            status = json.load(r).get("status")
        print(f"  {i * 10:4d}s  {status}", flush=True)
        if status in ("COMPLETED", "ERROR"):
            req = urllib.request.Request(f"{root}/requests/{request_id}", headers=headers)
            with urllib.request.urlopen(req, timeout=120, context=SSL_CTX) as r:
                result = json.load(r)
            if status == "ERROR":
                sys.exit(f"fal returned ERROR: {json.dumps(result)[:1500]}")
            return result
        time.sleep(10)
    sys.exit("timed out after an hour")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("slug")
    ap.add_argument("--model", choices=sorted(MODELS), required=True)
    ap.add_argument("--scene", default="interior")
    ap.add_argument("--image", type=Path, default=None,
                    help="send this image instead of the catalog still. Use it to hand the "
                         "model a framing WE chose: veo has no 3:2 and crops to 16:9 on its "
                         "own, taking 161 px off the bottom that the site actually shows")
    ap.add_argument("--prompt-file", type=Path, default=None)
    ap.add_argument("--negative-file", type=Path, default=None)
    ap.add_argument("--cfg", type=float, default=0.8,
                    help="Kling v3 only. fal: 'how close you want the model to stick "
                         "to your prompt', 0-1, default 0.5. Our prompt IS the stillness "
                         "instruction, so adherence is wanted -- but this is unsettled: "
                         "one source argues lower keeps it closer to the image")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--tag", default="", help="appended to the take directory name")
    ap.add_argument("--duration", type=int, default=5)
    ap.add_argument("--max-cost", type=float, default=3.00)
    ap.add_argument("--yes", action="store_true")
    args = ap.parse_args()

    key = os.environ.get("FAL_KEY")
    if not key:
        sys.exit("FAL_KEY is not set — run: export $(grep '^FAL_KEY=' .env)")

    spec = MODELS[args.model]
    if str(args.duration) not in spec["durations"]:
        sys.exit(f"{args.model} takes duration in {spec['durations']}, not {args.duration}")

    still = args.image or (REPO / "public" / "stays" / args.slug / f"{args.scene}.jpg")
    if not still.exists():
        sys.exit(f"missing {still}")
    prompt = args.prompt_file.read_text().strip() if args.prompt_file else PROMPT
    negative = args.negative_file.read_text().strip() if args.negative_file else None

    rate = spec["rate"]
    cost = rate * args.duration if rate else spec.get("flat")
    shown = f"${cost:.2f}" if cost is not None else "billed per token — see the model page"
    print(f"{args.slug}/{args.scene} · {args.model} · {args.duration}s  ->  {shown}")
    if cost is not None and cost > args.max_cost:
        sys.exit(f"refusing: ${cost:.2f} is over --max-cost ${args.max_cost:.2f}")
    if not args.yes and input("spend it? [y/N] ").strip().lower() != "y":
        sys.exit("nothing spent")

    name = f"{args.slug}-{args.scene}-{args.model}-{args.duration}s"
    if args.tag:
        name += f"-{args.tag}"
    out = LAB / "animate" / name
    out.mkdir(parents=True, exist_ok=True)

    print(f"uploading {still.name}...", flush=True)
    url = upload(still, "image/jpeg", key)
    body = spec["body"](url, args.duration, {"negative": negative, "cfg": args.cfg})
    body["prompt"] = prompt
    if args.seed is not None and "seed" not in body:
        body["seed"] = args.seed
    (out / "request.json").write_text(json.dumps(body, indent=2))

    print(f"submitting to {spec['endpoint']}...", flush=True)
    rid = submit(spec["endpoint"], body, key)
    print(f"request {rid}", flush=True)
    result = wait(spec["endpoint"], rid, key)
    (out / "result.json").write_text(json.dumps(result, indent=2))

    video = result.get("video") or (result.get("videos") or [{}])[0]
    vurl = video.get("url") if isinstance(video, dict) else None
    if not vurl:
        sys.exit(f"no video in the result: {json.dumps(result)[:800]}")
    raw = out / "raw.mp4"
    with urllib.request.urlopen(vurl, timeout=900, context=SSL_CTX) as r:
        raw.write_bytes(r.read())
    print(f"\n-> {raw}  ({raw.stat().st_size / 1024 / 1024:.1f} MB)")
    if cost is not None:
        print(f"   spent ${cost:.2f}")


if __name__ == "__main__":
    main()
