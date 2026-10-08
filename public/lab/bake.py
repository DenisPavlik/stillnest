#!/usr/bin/env python3
"""Bake the living-hearth layers for one house.

Everything here is derived from the approved photograph and a hand-authored
occluder/falloff mask. Nothing is generated, nothing is bought, and the
photograph itself is never rewritten — it ships exactly as it is today.

Writes into public/lab/ for the bake-off. If a direction is chosen this moves
to scripts/ and writes into public/stays/<slug>/.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

# Two levels up from public/lab/, so this runs from anywhere.
REPO = Path(__file__).resolve().parent.parent.parent
OUT = REPO / "public" / "lab"

# The hand-authored mask: R = everything in FRONT of the fire, G = where
# firelight is allowed to fall. Authored once per house; for blackwater-11 it
# came almost free from a luma key on the flue and hood against the window.
MASK = OUT / "mask-source.png"

SLUG = sys.argv[1] if len(sys.argv) > 1 else "blackwater-11"

# The hearth tile: generous enough to hold the whole ember travel, the hood and
# a good stretch of pipe, so every moving pixel and every occluder it must
# respect live inside one small canvas.
RECT = (0.42, 0.30, 0.72, 1.00)          # u0, v0, u1, v1 in photo uv
FLAME = (0.5677, 0.8145)                  # flame centre, photo uv

photo = Image.open(REPO / "public" / "stays" / SLUG / "interior.jpg").convert("RGB")
PW, PH = photo.size
print(f"photo {PW}x{PH}")

rgb = np.asarray(photo).astype(np.float32) / 255.0
R, G_, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
luma = 0.299 * R + 0.587 * G_ + 0.114 * B
warm = np.clip((R - B) * 1.6, 0, 1)

mask = Image.open(MASK).convert("RGB").resize((PW, PH), Image.LANCZOS)
mk = np.asarray(mask).astype(np.float32) / 255.0
occ, fall = mk[..., 0], mk[..., 1]

# Normalised coordinates, used by several of the masks below.
uu = np.linspace(0, 1, PW)[None, :]
vv = np.linspace(0, 1, PH)[:, None]

def save(img: Image.Image, name: str, quality: int | None = None) -> None:
    p = OUT / name
    if name.endswith(".jpg"):
        img.save(p, "JPEG", quality=quality or 92, optimize=True, progressive=True)
    else:
        img.save(p, optimize=True)
    print(f"  -> {name}: {img.size[0]}x{img.size[1]}, {p.stat().st_size/1024:.0f} KB")

# ---------------------------------------------------------------- layer 1
# The breathing-firelight plate. It is the photograph's OWN warm light, cut to
# where firelight is allowed to fall. Added with plus-lighter and only ever
# added, never subtracted: a fire flares up from its ember baseline, and a
# layer that can only brighten cannot darken the picture that was approved.
#
# A pixel with no warm content is black here, so the cold window, the blue snow
# and the shadowed timber are pinned to zero by construction.
breath = (rgb * (warm * fall)[..., None])
breath = Image.fromarray((np.clip(breath, 0, 1) * 255).astype(np.uint8))
breath = breath.resize((1536, 1024), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.1))
save(breath, "breath.png")

# ---------------------------------------------------------------- layer 2/3
# The hearth tile at NATIVE photo resolution. The canvas backing store is this
# size and CSS scales it down, so the shader samples 1:1 and the browser does
# the resample — which is the whole reason the full-frame prototype measured 14%
# softer than the still it was standing in for.
x0, y0 = int(RECT[0] * PW), int(RECT[1] * PH)
x1, y1 = int(RECT[2] * PW), int(RECT[3] * PH)
save(photo.crop((x0, y0, x1, y1)), "hearth-tile.jpg", 94)

# The occluder silhouette for the same rect: everything in FRONT of the fire.
# Embers multiply their alpha by (1 - this), in the vertex shader, so an ember
# behind the pipe is simply never drawn.
occ_img = Image.fromarray((np.clip(occ, 0, 1) * 255).astype(np.uint8), "L")
save(occ_img.crop((x0, y0, x1, y1)), "occ-tile.png")

# ---------------------------------------------------------------- layer 4 (mode 4)
# Where the world beyond the glass is: cool AND bright. Mullions, the flue and
# every warm interior surface fail one of the two tests, so they are zero here
# and become occluders for free — no second mask, no hand painting.
# ---------------------------------------------------------------- layer 4
# Where the world beyond the glass is.
#
# The first version tested for cool AND bright, which finds the sky and the
# lying snow and misses everything else: the trunks and the foliage in front
# of that sky are dark, so 85% of any snow died exactly where falling snow
# reads best — against something dark.
#
# The right test is one subtraction. THE ROOM IS THE ONLY WARM THING IN THIS
# PHOTOGRAPH. Timber, floor, fire, and the frames the firelight catches are
# all R > B; the forest, the snow and the sky are all B > R. So `B - R` is
# not a brightness key at all, it is an inside/outside key — and it returns
# the mullions and the flue as crisp black silhouettes for free, which is the
# occlusion the snow layer needs and which nobody had to paint.
outside = np.clip((B - R - 0.004) * 60.0, 0, 1)

# The mezzanine, its rail and its wires are indoors, dark and very slightly
# cool, so the key lets them through — and they are the one place a stray
# flake would read as SNOW INSIDE THE ROOM, which is the exact failure this
# layer exists to avoid. They are also where a swaying handrail would read as
# a bug rather than as weather.
#
# It cannot be fixed with a height ramp: the visible frame starts at v≈0.37
# and the mezzanine is the top of it, so "above the mezzanine" is off-screen.
# So it is carved out here, in u and v, and the small pocket of real glazing
# seen behind the rail is given up with it.
indoor_zone = np.maximum(
    np.clip((0.315 - uu) * 40.0, 0, 1) * np.clip((0.52 - vv) * 40.0, 0, 1),
    np.clip((0.462 - uu) * 60.0, 0, 1) * np.clip((0.505 - vv) * 60.0, 0, 1),
)

win = np.clip(outside * (1.0 - occ) * (1.0 - indoor_zone), 0, 1)

win_img = Image.fromarray((win * 255).astype(np.uint8), "L").resize((1536, 1024), Image.LANCZOS)
win_img = win_img.filter(ImageFilter.GaussianBlur(0.6))
win_img = Image.fromarray(((np.asarray(win_img) // 8) * 8).astype(np.uint8), "L")
save(win_img, "window-mask.png")

# ---------------------------------------------------------------- the glass
# The rectangle the world beyond the glass actually occupies, measured from
# the mask rather than guessed, so the tree-sway tile is as small as it can be
# and still hold every pixel that is allowed to move.
# From where the mask carries real MASS, not from its outermost stray pixel:
# an inside/outside key finds a handful of cool specks in the room's shadows,
# and one of them would otherwise stretch this rectangle to the whole frame.
def _span(profile: np.ndarray, size: int) -> tuple[float, float]:
    keep = np.where(profile > profile.max() * 0.06)[0]
    return keep.min() / size, keep.max() / size

_solid = (win > 0.5).astype(np.float32)
gx0, gx1 = _span(_solid.sum(axis=0), PW)
gy0, gy1 = _span(_solid.sum(axis=1), PH)
gx0, gx1 = max(0.0, gx0 - 0.01), min(1.0, gx1 + 0.01)
gy0, gy1 = max(0.0, gy0 - 0.01), min(1.0, gy1 + 0.01)
GRECT = (round(gx0, 4), round(gy0, 4), round(gx1, 4), round(gy1, 4))
wx0, wy0 = int(GRECT[0] * PW), int(GRECT[1] * PH)
wx1, wy1 = int(GRECT[2] * PW), int(GRECT[3] * PH)

# Same contract as the hearth tile: native photo resolution in, CSS scales it
# down, so the shader samples 1:1 and the browser does the resample.
save(photo.crop((wx0, wy0, wx1, wy1)), "window-tile.jpg", 92)
_mt = win_img.resize((PW, PH), Image.LANCZOS).crop((wx0, wy0, wx1, wy1))
_mth = round(1200 * _mt.height / _mt.width)
save(_mt.resize((1200, _mth), Image.LANCZOS), "window-mask-tile.png")

# ------------------------------------------------------- the inpaint mask
# For fal's masked video inpainting: WHITE is regenerated, BLACK is preserved
# from the source video. The source video is this photograph held still, so
# every black pixel comes back bit-identical — the flue cannot sway and a
# spark cannot be drawn in front of it, because that region is never handed
# to the model at all.
#
# White is therefore drawn as tightly as it can be while still giving the fire
# room to breathe and throw sparks: an ellipse over the hearth, reaching up to
# the hood, MINUS the occluder silhouette.
ell = np.sqrt(
    ((uu - FLAME[0]) / 0.048) ** 2 + ((vv - (FLAME[1] - 0.030)) / 0.082) ** 2
)
fire_region = np.clip((1.0 - ell) * 6.0, 0, 1)
# Nothing below the basin rim: the pedestal, the rug and the floor are the
# photograph and stay that way.
fire_region *= np.clip((0.885 - vv) * 200.0, 0, 1)
inpaint = np.clip(fire_region * (1.0 - np.clip(occ * 2.0, 0, 1)), 0, 1)
inpaint = (inpaint > 0.5).astype(np.float32)          # hard edges: the model wants a binary mask
_im = Image.fromarray((inpaint * 255).astype(np.uint8), "L")
save(_im, "inpaint-mask.png")
print(f"inpaint mask: {100*inpaint.mean():.2f}% of frame is white (regenerated)")

meta = {
    "slug": SLUG,
    "flameEllipse": {"cx": FLAME[0], "cy": FLAME[1] - 0.030, "rx": 0.048, "ry": 0.082},
    "windowRect": GRECT,
    "photo": [PW, PH],
    "rect": RECT,
    "flame": FLAME,
    "flameInTile": [
        (FLAME[0] - RECT[0]) / (RECT[2] - RECT[0]),
        (FLAME[1] - RECT[1]) / (RECT[3] - RECT[1]),
    ],
    "tile": [x1 - x0, y1 - y0],
}
(OUT / "hearth.json").write_text(json.dumps(meta, indent=2))
print(json.dumps(meta, indent=2))
print(f"\nwindow mask covers {100*(win>0.15).mean():.1f}% of frame")
print(f"glass tile {wx1-wx0}x{wy1-wy0} at u {GRECT[0]}-{GRECT[2]}, v {GRECT[1]}-{GRECT[3]}")
print(f"breath plate lights {100*((warm*fall)>0.02).mean():.1f}% of frame")
