#!/usr/bin/env python3
"""Edit a still so the weather is already IN it, before anything animates it.

WHY

    Thirteen video takes agreed on one thing without being asked: the fire moved
    convincingly every single time, and the snow either arrived late, arrived
    indoors, or never arrived. The difference is that the fire is ON the
    photograph and the snow is not. These models animate what they can see; what
    they cannot see they have to invent, and inventing is where they put snow in
    the middle of a living room.

    So put the snow in the photograph. Then the video model has nothing to
    invent -- it has flakes, already sized, already lit, already on the correct
    side of the glass, and its whole job is to move them downward.

    This edits the APPROVED photograph rather than regenerating the house. The
    house passed the owner's gate once; a fresh generation would be a different
    room and would have to pass it again.

USAGE
        export $(grep '^FAL_KEY=' .env)
        python3 public/lab/snow.py blackwater-11 --variant heavy
        python3 public/lab/snow.py blackwater-11 --model seedream --variant medium
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

# The instruction is mostly a fence. An edit model will happily relight a whole
# room if the prompt leaves it room to, and the room is the part that is already
# approved.
BASE = (
    "Keep this photograph exactly as it is in every respect: the same room, the same "
    "furniture, the same fire, the same flue pipe and hood, the same lighting, the same "
    "colours, the same exposure, the same framing. Make exactly one change. "
)
FENCE = (
    " The falling snow appears only outdoors, on the far side of the glass, in the forest. "
    "Inside the room there is no snow at all. Everything else in the picture is untouched."
)
VARIANTS = {
    "light": "Outside the house, beyond the tall glass wall, add gentle falling snow in the "
             "air: sparse, small snowflakes drifting down among the spruce trees, lit softly "
             "by the dusk.",
    "medium": "Outside the house, beyond the tall glass wall, add steady falling snow in the "
              "air: clear, distinct snowflakes at several depths among the spruce trees, "
              "nearer flakes larger and softer, far flakes small and faint.",
    "heavy": "Outside the house, beyond the tall glass wall, add a heavy snowstorm in the "
             "air: dense snow driving through the spruce forest, thick enough to soften the "
             "far trees into haze, with large near flakes and countless small far ones.",
}

MODELS = {
    "nano": {
        "endpoint": "fal-ai/nano-banana-pro/edit",
        "cost": 0.30,   # $0.15 at 1K/2K, doubled at 4K
        "body": lambda url, p: {
            "image_urls": [url], "prompt": p, "resolution": "4K",
            "output_format": "jpeg", "num_images": 1, "aspect_ratio": "auto",
        },
        "res": "4K",
    },
    "seedream": {
        "endpoint": "bytedance/seedream/v5/pro/edit",
        "cost": 0.07,
        "body": lambda url, p: {
            "image_urls": [url], "prompt": p, "image_size": "auto_2K",
            "output_format": "jpeg", "num_images": 1,
        },
        "res": "2K",
    },
}


def queue_root(endpoint: str) -> str:
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


def run(endpoint: str, body: dict, key: str) -> dict:
    req = urllib.request.Request(
        f"https://queue.fal.run/{endpoint}", data=json.dumps(body).encode(),
        headers={"Authorization": f"Key {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120, context=SSL_CTX) as r:
        rid = json.load(r)["request_id"]
    print(f"request {rid}", flush=True)
    root, headers = queue_root(endpoint), {"Authorization": f"Key {key}"}
    for i in range(180):
        s = urllib.request.Request(f"{root}/requests/{rid}/status", headers=headers)
        with urllib.request.urlopen(s, timeout=60, context=SSL_CTX) as r:
            status = json.load(r).get("status")
        print(f"  {i * 5:4d}s  {status}", flush=True)
        if status in ("COMPLETED", "ERROR"):
            g = urllib.request.Request(f"{root}/requests/{rid}", headers=headers)
            with urllib.request.urlopen(g, timeout=120, context=SSL_CTX) as r:
                result = json.load(r)
            if status == "ERROR":
                sys.exit(f"fal returned ERROR: {json.dumps(result)[:1200]}")
            return result
        time.sleep(5)
    sys.exit("timed out")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("slug")
    ap.add_argument("--scene", default="interior")
    ap.add_argument("--model", choices=sorted(MODELS), default="nano")
    ap.add_argument("--variant", choices=sorted(VARIANTS), default="medium")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--max-cost", type=float, default=0.50)
    ap.add_argument("--yes", action="store_true")
    args = ap.parse_args()

    key = os.environ.get("FAL_KEY")
    if not key:
        sys.exit("FAL_KEY is not set — run: export $(grep '^FAL_KEY=' .env)")

    still = REPO / "public" / "stays" / args.slug / f"{args.scene}.jpg"
    if not still.exists():
        sys.exit(f"missing {still}")

    spec = MODELS[args.model]
    prompt = BASE + VARIANTS[args.variant] + FENCE
    print(f"{args.slug}/{args.scene} · {args.model} · {args.variant} · {spec['res']} "
          f" ->  ${spec['cost']:.2f}")
    if spec["cost"] > args.max_cost:
        sys.exit(f"refusing: over --max-cost ${args.max_cost:.2f}")
    if not args.yes and input("spend it? [y/N] ").strip().lower() != "y":
        sys.exit("nothing spent")

    out = LAB / "snow" / f"{args.slug}-{args.scene}-{args.model}-{args.variant}"
    out.mkdir(parents=True, exist_ok=True)
    (out / "prompt.txt").write_text(prompt)

    print("uploading...", flush=True)
    url = upload(still, "image/jpeg", key)
    body = spec["body"](url, prompt)
    if args.seed is not None:
        body["seed"] = args.seed
    (out / "request.json").write_text(json.dumps(body, indent=2))

    result = run(spec["endpoint"], body, key)
    (out / "result.json").write_text(json.dumps(result, indent=2))
    imgs = result.get("images") or []
    if not imgs or not imgs[0].get("url"):
        sys.exit(f"no image in the result: {json.dumps(result)[:800]}")
    dest = out / "snow.jpg"
    with urllib.request.urlopen(imgs[0]["url"], timeout=600, context=SSL_CTX) as r:
        dest.write_bytes(r.read())
    print(f"\n-> {dest}  ({dest.stat().st_size / 1024:.0f} KB)   spent ${spec['cost']:.2f}")


if __name__ == "__main__":
    main()
