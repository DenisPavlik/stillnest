#!/usr/bin/env python3
"""Generate the ambient sound bed behind each interior, with ElevenLabs.

    export $(grep '^ELEVENLABS_API_KEY=' .env)
    python3 scripts/beds.py                   # every house without a bed
    python3 scripts/beds.py sparv-12 --force  # one house, again

Writes public/stays/<slug>/interior-bed.mp3, which <AmbienceProvider> fetches
when the interior scrolls into view and sound is on.

WHY THE PROMPTS READ THE WAY THEY DO

    Each one names what is on that house's photograph and nothing else -- the
    stove that is lit, the weather beyond that glass. A bed that disagrees with
    the picture (surf behind a forest room) is worse than silence, because the
    visitor hears the lie before they can say what it is.

    The room is heard from inside. "Muffled through the glass" keeps rain and
    sea at the distance the picture puts them, and keeps the bed under the page
    rather than on top of it.

    `loop: true` asks the model for a clip whose end meets its start; the mixer
    then plays it with AudioBufferSourceNode.loop, so there is no seam to fix.
"""

from __future__ import annotations

import argparse
import json
import os
import ssl
import sys
import urllib.request
from pathlib import Path

try:
    import certifi

    SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:  # pragma: no cover
    SSL_CTX = ssl.create_default_context()

STAYS = Path(__file__).resolve().parents[1] / "public" / "stays"

INSIDE = "Heard from inside a quiet cabin, calm, no music, no voices."

BEDS = {
    "blackwater-11": (
        "A wood stove crackling softly, logs settling. Outside, a faint winter wind through "
        "snowy pines, muffled through the glass."
    ),
    "driftline-10": (
        "A wood stove crackling softly. Gentle water lapping against a wooden jetty outside, "
        "muffled through the glass."
    ),
    "hollow-cedar-07": (
        "Steady rain falling on a wooden roof and on bamboo leaves, water dripping from the "
        "eaves into a wooden tub."
    ),
    "hollowmoss-04": (
        "A wood stove crackling softly. A still forest lake at dawn outside, a few distant "
        "birds, muffled through the glass."
    ),
    "kaldbak-09": (
        "A wood stove crackling softly. Wind pressing against the windows of a house on a sea"
        " cliff, distant surf below."
    ),
    "meridian-05": (
        "Water trickling steadily from a spout into a stone pool, a warm dry desert breeze, a"
        " courtyard at midday."
    ),
    "moss-verse-01": (
        "A wood stove crackling softly. Light rain on a glass roof in a rainforest, a distant"
        " stream."
    ),
    "quiet-fern-06": (
        "A wood stove crackling softly. A soft evening wind over open moorland outside, "
        "muffled through the glass."
    ),
    "rimefall-02": (
        "A wood stove crackling softly. An arctic wind blowing low across a snowfield outside"
        " a mountain lodge, muffled through the glass."
    ),
    "sparv-12": (
        # "Deep winter night silence" was taken literally: -63 LUFS, a file of
        # nothing. Name sounds, never their absence.
        "A wood stove crackling steadily, logs shifting. A gentle winter wind through snowy"
        " pines over a frozen lake, muffled through the glass."
    ),
    "tidebreak-03": (
        "Heavy waves breaking on black rocks outside, rain against the window glass, heard "
        "muffled from inside a warm room."
    ),
    "whitehour-08": (
        "A geothermal hot spring bubbling gently, steam hissing softly, a cold highland wind,"
        " a wood stove crackling quietly."
    ),
}


def generate(text: str, key: str, seconds: float) -> bytes:
    body = {
        "text": f"{text} {INSIDE}",
        "duration_seconds": seconds,
        "prompt_influence": 0.45,
        "loop": True,
        "model_id": "eleven_text_to_sound_v2",
    }
    req = urllib.request.Request(
        "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128",
        data=json.dumps(body).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300, context=SSL_CTX) as r:
        return r.read()


TARGET_LUFS = -30.0


def normalise(path: Path) -> str:
    """Bring a bed to TARGET_LUFS so that moving between houses never changes
    the level -- the model's own output spread 40 dB, surf to near-silence.
    Two-pass loudnorm, linear, so the sound is scaled rather than compressed."""
    import subprocess

    first = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af",
         f"loudnorm=I={TARGET_LUFS}:TP=-2:LRA=11:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    ).stderr
    m = json.loads(first[first.rindex("{"):first.rindex("}") + 1])
    tmp = path.with_suffix(".tmp.mp3")
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(path), "-af",
         f"loudnorm=I={TARGET_LUFS}:TP=-2:LRA=11:linear=true"
         f":measured_I={m['input_i']}:measured_TP={m['input_tp']}"
         f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}"
         f":offset={m['target_offset']}",
         "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", str(tmp)],
        check=True,
    )
    tmp.replace(path)
    return f"{float(m['input_i']):.1f} -> {TARGET_LUFS:.0f} LUFS"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("slugs", nargs="*", help="default: every house")
    ap.add_argument("--force", action="store_true", help="regenerate an existing bed")
    ap.add_argument("--seconds", type=float, default=20.0)
    ap.add_argument("--normalise-only", action="store_true",
                    help="skip generation; level the beds already on disk")
    args = ap.parse_args()

    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("ELEVENLABS_API_KEY is not set — run: export $(grep '^ELEVENLABS_API_KEY=' .env)")

    if args.normalise_only:
        for slug in args.slugs or sorted(BEDS):
            print(f"  {slug}: {normalise(STAYS / slug / 'interior-bed.mp3')}")
        return

    for slug in args.slugs or sorted(BEDS):
        out = STAYS / slug / "interior-bed.mp3"
        if out.exists() and not args.force:
            print(f"  {slug}: exists, skipped")
            continue
        try:
            audio = generate(BEDS[slug], key, args.seconds)
        except urllib.error.HTTPError as e:
            sys.exit(f"{slug}: HTTP {e.code} {e.read().decode()[:400]}")
        out.write_bytes(audio)
        print(f"  {slug}: {len(audio) / 1024:.0f} KB, {normalise(out)}")


if __name__ == "__main__":
    main()
