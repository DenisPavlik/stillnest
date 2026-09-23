#!/usr/bin/env python3
"""Put the living layer into a Stillnest still.

WHY

    The twelve shipped stills are architecturally correct and emotionally empty.
    The owner's verdict on the finished catalog was that there is no warmth in it
    at all, and the cause was three sentences we wrote ourselves in
    `content/prompts/README.md`: one warm light source, a room that is *spare*,
    and *nothing switched on*. See that file for the rules that replaced them and
    for the reference wall they came out of.

    Two routes are possible and they cost the same, so the only way to choose is
    to look at both:

    edit   -- take the approved photograph and redress it. Keeps the building,
              which already passed the owner's "would I rent it" gate, and keeps
              every other view of that house consistent with it. The snow test on
              2026-08-28 measured this route drifting ~20% in untouched regions,
              which was fatal for a surgical weather edit and is not fatal here:
              redressing a room is exactly the change we want.

    fresh  -- generate the room again from the rewritten charter. Buys full
              freedom, costs the house its consistency: a fresh interior is a
              different building, so the exterior and the portrait have to be
              redone with it and the whole house goes back through the gate.

USAGE
        export $(grep '^FAL_KEY=' .env)
        python3 public/lab/cosy.py hollow-cedar-07 --route edit  --variant medium
        python3 public/lab/cosy.py hollow-cedar-07 --route fresh
        python3 public/lab/cosy.py hollow-cedar-07 --scene exterior --route edit

    Output lands in public/lab/cosy/<slug>-<scene>-<route>-<variant>/ , which is
    git-ignored. Judge it at /lab/cosy.html.
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

ENDPOINT = "fal-ai/nano-banana-pro"          # /edit is appended for the edit route
COST_4K = 0.30                               # $0.15 base, doubled at 4K — re-read the
                                             # model page before trusting this.

# ---------------------------------------------------------------------------
# The edit route. The opening sentence is a fence: an edit model will relight and
# rebuild a whole room if the prompt leaves it room to, and the building is the
# part that is already approved.
# ---------------------------------------------------------------------------

FENCE = (
    "Keep this exact house and this exact photograph: the same architecture, the same "
    "room and its proportions, the same floor, the same posts and beams, the same "
    "screens and openings, the same view through them, the same camera position, the "
    "same framing, the same time of day, the same weather. Do not redesign, move or "
    "rebuild anything. Change only what is listed below, and keep the result "
    "photographic. "
)

# Each entry is additive: strong = medium plus more of it. The four blocks are the
# charter's four demands — layered warm light, soft goods, traces of use, living green.
EDIT = {
    "medium": (
        "Make this room look lived in and warm, as if someone stepped out ten minutes "
        "ago. "
        "LIGHT: add two or three more small warm light sources at different heights and "
        "different distances from the camera — a second paper lantern further back, a "
        "low lamp near the floor, and a cluster of lit candles on the low table — so the "
        "warmth is layered across the room instead of coming from one lamp. "
        "SOFT: add a quilted throw left rumpled and half-slipping, three or four floor "
        "cushions dented from use, and a patterned woven runner across the floor. "
        "TRACES: add a cup with steam still rising from it beside the teapot, a book left "
        "open face down, a pair of slippers at the edge of the floor, and a folded towel "
        "hanging on a peg. "
        "GREEN: add living plants — a ceramic jug of cut branches indoors, and potted "
        "ferns, moss and denser undergrowth just outside the opening. "
        "Keep the rain falling and the steam rising, and make both a little more visible."
    ),
    "strong": (
        "Make this room look thoroughly lived in and warm, as if someone stepped out ten "
        "minutes ago. "
        "LIGHT: add four or five more small warm light sources at different heights and "
        "different distances from the camera — paper lanterns near and far, a low lamp at "
        "floor level, a lit brazier, and a cluster of candles on the low table — so the "
        "room is lit in warm pools rather than by one lamp, and the far corners glow too. "
        "SOFT: add a thick folded futon with a quilted throw thrown across it and "
        "half-slipping, five or six floor cushions piled and dented from use, a sheepskin "
        "over a bench, and a patterned woven runner across the floor. "
        "TRACES: add a cup with steam still rising from it beside the teapot, a tray with "
        "a small meal on it, a book left open face down, a second book stacked with "
        "reading glasses on it, a pair of slippers at the edge of the floor, a folded "
        "towel and a cotton robe hanging on pegs. "
        "GREEN: add living plants generously — a ceramic jug of cut branches and a bowl of "
        "moss indoors, dried herbs hanging, and outside the opening potted ferns, thick "
        "moss, low shrubs and dense bamboo undergrowth crowding close to the building. "
        "Keep the rain falling and the steam rising, and make both clearly visible."
    ),
    # The owner approved take 8's room and objected only to the daylight outside it.
    # These two change the far side of the opening and state the indoors is untouched —
    # positively, because a fence phrased as a prohibition is what an edit model ignores.
    # House-agnostic on purpose. The first version of this was written for
    # hollow-cedar and hardcoded "the bamboo canopy and the rain above the roof",
    # which then went into every other house's portrait — harmless in the desert,
    # where the model ignored it, and not harmless at hollowmoss, where it painted
    # rain into a calm misty morning that the listing calls standing water. A
    # reframe fills empty air with weather unless the air is described, so --weather
    # says what the air actually holds, positively.
    #
    # --foreground has the same shape of problem and needs the same firmness. Twice
    # now the downward extension has invented a second, full reflection of the same
    # house in water that does not exist — at hollowmoss below a fallen log, at
    # whitehour below a geothermal pool. Naming a few materials is not enough when
    # the source already contains water; the string has to say the ground is SOLID
    # all the way down and that the water body appears exactly once, where it is.
    #
    # And when the source has nothing below the building — quiet-fern's `ext-spine`
    # ends at the plinth edge — the reframe MIRRORS the house downward instead of
    # inventing ground, every time. Four attempts there produced four mirrors,
    # including one floating upside down over dry moorland. Two things to do rather
    # than pay for a fifth: reframe from a take that already has deep foreground, and
    # if that mirrors too, CROP the mirror away. A 9:16 window cut above the mirror
    # line costs nothing and keeps the house.
    "portrait": (
        "Recompose this same photograph as a tall vertical image without changing the "
        "scene: the same building, the same lights, the same materials, the same "
        "weather, the same light, the same time of day, the same air. {weather} Extend "
        "the picture upward into whatever stands above the roof in this landscape, and "
        "downward into the near ground in front of the building — {foreground} — with "
        "the building reflected exactly once and nothing else repeated, keeping the "
        "building at "
        "the same size relative to its surroundings and centred in the frame. "
        "Everything already visible stays exactly as it is."
    ),
    "dark": (
        "Change only what is visible beyond the open screens, outdoors. The bamboo grove "
        "outside becomes late dusk: deep blue and nearly dark, the daylight gone out of "
        "it, so it reads as cold. Steady rain falls through it in bright thin threads, "
        "clearly visible against the dark, and the veranda boards are wet and reflect the "
        "lantern light. Everything indoors stays exactly as it is — the same furniture in "
        "the same places, the same lanterns at the same brightness, the same tatami, the "
        "same colours, the same warmth — and the room stays the brightest thing in the "
        "picture."
    ),
    "storm": (
        "Change only what is visible beyond the open screens, outdoors. The bamboo grove "
        "outside becomes late dusk in a downpour: deep blue and nearly dark, the daylight "
        "gone out of it. Heavy rain streams off the far-reaching eave in a bright curtain "
        "and falls through the grove in lit threads, the veranda boards are wet and throw "
        "back the lantern light in long reflections, and steam lifts off the cedar tub "
        "into the cold air. Everything indoors stays exactly as it is — the same furniture "
        "in the same places, the same lanterns at the same brightness, the same tatami, "
        "the same colours, the same warmth — and the room stays the brightest thing in "
        "the picture."
    ),
}

# ---------------------------------------------------------------------------
# The fresh route. Built from the charter's base prompt with its slots filled.
# Keep the second and third paragraphs verbatim across every house — they are the
# constants that make twelve pictures read as one catalog.
# ---------------------------------------------------------------------------

TAIL = (
    "\n\nShot on a 50mm lens at eye level from ground level, static camera, natural "
    "light only. Cinematic, restrained, quiet. Fine film grain."
    " Everything in the house is clean, new and well kept — recently used but "
    "undamaged."
    "\n\nNo people, no cars, no roads, no signs, no power lines, no text, no "
    "televisions, no phones. Not aerial, not a drone shot. No stain, tear, patch, "
    "fray, scuff, peeling paint, mould, damage."
)

# Composition, not dressing. The first round fixed what is in the room and the owner
# still said "не вистачає чогось" about the best of them. What every frame he marked
# has and ours did not: the camera stands in a CORNER rather than square-on, something
# warm sits close to the lens, and a second space is visible past the first — so the
# room recedes instead of presenting itself flat. Hollow Cedar gets its depth from the
# veranda and the next bay, never from a loft: the listing says one deep-eaved roof.

HOUSE_HC = (
    "A long Japanese off-grid house in a dense bamboo valley at late dusk in heavy rain, lifted a "
    "metre off the valley floor on cedar posts, under one deep-eaved tiled roof whose eave reaches "
    "far past the veranda that runs the building's whole length. Paper screens slid open along it "
    "glow warm amber from paper lanterns inside, several windows lit at once, and a lit stone "
    "lantern stands on the deck; at one end, under the same roof, a square cedar soaking tub "
    "steams "
    "into the cold air with a bamboo pipe running water into it. The house is the only warm object "
    "in the picture and the bamboo grove around it is deep blue and nearly dark, rain falling "
    "through it in bright thin threads and streaming off the eave. Dense bamboo and tall tree "
    "ferns "
    "rise well above the roofline on both sides; thick moss, low shrubs and wet stone crowd the "
    "building at three depths, with wet ground reflecting the light. Slippers and a folded towel "
    "on "
    "the deck. The house occupies about 30% of the image width and is clearly the subject."
)

HOUSE_MV = (
    "A long timber off-grid house in an ancient moss forest on Yakushima at late dusk "
    "in steady rain, lifted on slender posts above ground too wet to build on, over "
    "thick moss and granite boulders, under a deep-eaved roof with a veranda running "
    "its length. Warm amber light glows from several windows at once, a lantern burns "
    "on the deck, a wood stove's fire shows through the glass, and a cedar soaking tub "
    "steams at one end. The forest is deep blue-green and nearly dark, rain falling in "
    "bright thin threads and running off the eave, so the house is the only warm object "
    "in a cold picture. Giant moss-covered cedars rise well above the roofline on both "
    "sides; tree ferns, thick moss and a stream finding its way down among the boulders "
    "fill the foreground below the floor line. The house occupies about 30% of the "
    "image width and is clearly the subject."
)

HOUSE_BW = (
    "A house of two stacked volumes in a Finnish pine forest at late dusk in falling "
    "snow: a low concrete base set into the slope and, above it, a black timber upper "
    "volume cantilevered out over the drop, glazed from floor to roofline on the "
    "projecting end. Warm amber light glows from several windows at once, a lantern "
    "burns on the timber deck and a wood stove's fire shows through the glass; a small "
    "separate sauna of pale timber stands on the deck with its window lit and steam "
    "pouring from its door into the freezing air. The pine forest is deep blue and "
    "nearly dark and the sky is a deep unlit blue, so the windows and the lantern are "
    "the brightest points in the frame and every part of the forest and sky is darker "
    "than them. Snow falls steadily in the air. Black pines heavy with snow rise well "
    "above the roofline on both sides; snow-laden juniper, exposed granite and spruce "
    "boughs fill the foreground below the floor line. Everything of interest sits in "
    "the middle band of the frame. The house occupies about 30% of the image width and "
    "is clearly the subject."
)

HOUSE_TB = (
    "A house bolted to Icelandic basalt above open water at late dusk in heavy "
    "weather, stepping down the cliff in three stacked terraces of board-marked "
    "concrete and weathered timber, each one smaller than the one above, with a long "
    "wall of thick glass facing the sea on every level. Warm amber light glows from "
    "several windows at once, a lantern burns on the lowest terrace and a wood stove's "
    "fire shows through the glass; a stone soaking bath cut into the rock steams on "
    "that terrace. The sea heaves grey-green below, bursting white against black rock, "
    "and rain drives across in sheets. The sky is deep dark storm blue, well past "
    "sunset, so the lit windows and the lantern are by a clear margin the brightest "
    "points in the picture and the sky is darker than the sea foam. Thick moss on "
    "lava, tussock grass and sea thrift fill the foreground below the floor line, and "
    "black basalt rises above the roofline on the landward side. Everything of "
    "interest sits in the middle band of the frame. The house occupies about 30% of "
    "the image width and is clearly the subject."
)

HOUSE_MD = (
    "A low off-grid house in the Atacama desert in hard clear afternoon light, cast in "
    "concrete the colour of the gravel it stands on and pressed into the base of a rock "
    "escarpment, its bedrooms cut back into a thick wall and a walled court between "
    "them roofed in timber slats that throw hard stripes of shade. An external stair "
    "runs up one flank to a roof terrace with a telescope on it. The contrast here is "
    "shade against sun rather than warm against cold: the gravel plain blazes pale and "
    "the court and the deep-set glazing hold cool blue shadow, with lamps burning "
    "inside the shade. A channel of water runs along one wall and a plunge pool sits in "
    "the escarpment's shadow. The rock escarpment rises well above the roofline and "
    "fills the top of the frame; cacti, olive and desert shrubs in clay pots, tufts of "
    "dry grass and scattered stone fill the foreground below the floor line at three "
    "depths. Everything of interest sits in the middle band of the frame. The house "
    "occupies about 30% of the image width and is clearly the subject."
)

HOUSE_HM = (
    "A low off-grid house of two dark timber volumes joined by a glazed link, on the "
    "edge of black standing water in an old Swedish spruce forest on a misty morning: "
    "the larger volume on the bank under a shallow pitched roof, the smaller one a "
    "sauna standing out over the water on slender stilts, both with deep glazing to the "
    "water. Warm amber light glows from several windows at once, a lantern burns on the "
    "deck between them, a wood stove's fire shows through the glass and woodsmoke lifts "
    "from a black flue. The water is mirror-still and holds mist across its whole "
    "surface, doubling the lit windows; low morning sun comes through the old spruce in "
    "visible shafts and the forest behind stays deep blue-green, so the windows and the "
    "lantern are the brightest points in the frame. Old spruce rises well above the "
    "roofline on both sides; moss, ferns, bilberry and fallen logs fill the foreground "
    "below the floor line at three depths. Everything of interest sits in the middle "
    "band of the frame. The house occupies about 30% of the image width and is clearly "
    "the subject."
)

HOUSE_WH = (
    "A long low off-grid house in the Icelandic highlands on a cold clear morning, "
    "built as a single shallow curve of board-marked concrete and glass that follows "
    "the contour of a slope, its glazed face on the outside of the arc and its roof "
    "flat and turfed at the edges. Warm amber light glows from several windows at once "
    "along the curve, a lantern burns by the door and a wood stove's fire shows through "
    "the glass. Below it, a geothermal pool of milky blue water steams hard into the "
    "freezing air, with towels folded on the stone. Steam also rises straight out of "
    "the ground in several places across the slope. The hills are rhyolite — ochre, "
    "rust and sulphur-yellow — with snow lying in their shadows and low sun raking "
    "across a hard frost; the sky is a pale cold blue and holds only the upper quarter "
    "of the frame. Moss, frosted heath, scattered lava and dry grasses fill the "
    "foreground below the floor line at three depths. Everything of interest sits in "
    "the middle band of the frame. The house occupies about 30% of the image width and "
    "is clearly the subject."
)

HOUSE_SP = (
    "A tall narrow timber tower house of three stacked floors standing on a granite "
    "shelf above a frozen tarn in a Swedish forest reserve, on a clear cold night: dark "
    "vertical boards below, a fully glazed top floor above, a black flue running up one "
    "flank. Warm amber light glows from windows on every floor at once, brightest from "
    "the glazed top, with a lantern burning by the door and a wood stove's fire showing "
    "through the glass; a small timber sauna sits lower on the rock with its window lit "
    "and steam lifting from its door, and a wooden boat is drawn up on the granite. The "
    "sky is deep black and full of stars with a faint green aurora low over the "
    "treeline, and the pines and the ice are almost black — the lit windows and the "
    "lantern are by a clear margin the brightest points in the picture, brighter than "
    "the aurora and brighter than the snow. Black pines rise well above the roofline on "
    "both sides; rounded granite boulders, lichen, juniper and dry grasses fill the "
    "foreground below the floor line at three depths. Everything of interest sits in "
    "the middle band of the frame. The house occupies about 30% of the image width and "
    "is clearly the subject."
)

HOUSE_QF = (
    "A long low off-grid house standing alone on open button-grass moorland in "
    "Southwest Tasmania at clear dawn, built as two timber wings splayed at a shallow "
    "angle on one board-marked concrete plinth, with a continuous spine of glass "
    "running the entire length of the ridge so the roof itself is glazed. Warm amber "
    "light glows from windows along both wings at once and up through the glass spine, "
    "a lantern burns on the plinth and a wood stove's fire shows through the end glass. "
    "The moorland runs flat and unbroken to a bare horizon in every direction, with "
    "nothing built anywhere in sight; the dawn sky is cold blue with fast-moving cloud "
    "and low quartzite ranges far off, and the sky holds only the upper third of the "
    "frame. The land is darker than the lit house, which is the brightest thing in the "
    "picture. Button grass, heath, fern and tussock fill the foreground below the floor "
    "line at three depths. Everything of interest sits in the middle band of the frame. "
    "The house occupies about 30% of the image width and is clearly the subject."
)

HOUSE_RF = (
    "A low off-grid house alone on the open Hardangervidda plateau at blue hour after "
    "snowfall, built as one steep timber span whose roof reaches almost to the ground on "
    "the windward side, banked over with drifted snow, and flies out on the lee side over "
    "a sheltered terrace; two sleeping rooms are cut into the bank behind it with long "
    "windows at snow level. Warm amber light glows from a window the size of the end wall "
    "and from the long bank windows at once, a lantern burns on the terrace and a wood "
    "stove's fire shows through the glass; a small timber sauna stands a little apart with "
    "its window lit and steam pouring from its door, and a pair of skis is planted upright "
    "in the snow by the door. The plateau is empty white and deep blue in every direction "
    "with no other building in sight, the air still, rime frost on every edge and "
    "spindrift lifting off the crests of the drifts. The sky is a deep unlit blue holding "
    "only the upper third of the frame, so the lit windows and the lantern are by a clear "
    "margin the brightest points in the picture. Drifted snow, frosted heath, buried rock "
    "and dry grass blown clear fill the foreground below the floor line at three depths. "
    "Everything of interest sits in the middle band of the frame. The house occupies about "
    "30% of the image width and is clearly the subject."
)

HOUSE_KB = (
    "A turf-roofed off-grid house on a Faroese clifftop in rolling fog with breaks of "
    "sun, sixty metres of black cliff between it and a grey sound. Its roof is thick "
    "living sod, grassed and continuous with the hillside, and on the weather side it "
    "comes down almost to the grass so the building shows the wind a bare slope; on the "
    "sheltered side it stands up into a tall gable of tarred black boards with "
    "white-painted window frames. A terrace with a steaming wooden tub sits inside a "
    "curved bank of earth beside it, and a small wooden boat is drawn up on the grass. "
    "Warm amber light glows from several white-framed windows at once, a lantern burns "
    "by the door and a wood stove's fire shows through the glass, so the house is the "
    "warmest thing in a grey picture. Fog moves across the slope and a shaft of sun "
    "breaks through it onto the green; the sky is overcast and holds only the upper "
    "third of the frame. Wind-flattened grass, thrift, turf and black rock fill the "
    "foreground below the floor line at three depths. Everything of interest sits in "
    "the middle band of the frame. The house occupies about 30% of the image width and "
    "is clearly the subject."
)

HOUSE_DL = (
    "A floating off-grid house on a calm Lofoten fjord in clear golden evening light: "
    "the whole thing sits on a low timber deck on the water, with one long pale-timber "
    "room glazed down its entire length at one end, a separate small timber sauna at the "
    "other end of the same deck, and between them a sunken pool cut straight into the "
    "boards, steaming, with the black fjord a single step beyond its outer edge. A "
    "covered timber walkway runs from the deck to a shoulder of black rock on the shore, "
    "and a wooden boat is tied along the outer edge. Warm amber light glows from the "
    "long glazing and from the sauna window at once, lanterns burn on the deck and a "
    "wood stove's fire shows through the glass. The fjord is mirror-calm and holds the "
    "gold; dark Lofoten peaks stand across it, already in shadow, and the sky holds only "
    "the upper third of the frame. Kelp, wet black rock and coarse grass fill the "
    "foreground below the floor line at three depths. Everything of interest sits in the "
    "middle band of the frame. The house occupies about 30% of the image width and is "
    "clearly the subject."
)

FRESH = {
    # moss-verse-01 — Yakushima. The listing already carries the two things the charter
    # wants: "reading-room" in its amenities and "the sound of water finding its way
    # down" in its description, so this house is the library, and its motion is water.
    # Three compositions, one word apart: library, hearth, bath.
    # blackwater-11 — Kuusamo, Finland. Deliberately NOT another long low house on
    # posts: two stacked volumes, the upper one cantilevered over the slope, black
    # timber on concrete. Its motion is snow in the air — this is the house whose
    # thirteen video takes failed on snow that was not in the photograph, so every
    # frame here carries falling snow beyond the glass, plus fire and sauna steam.
    # tidebreak-03 — Westfjords, Iceland. Silhouette against the three before it:
    # not posts, not a cantilever, but a house that STEPS DOWN the basalt in three
    # terraces (the shape that passed his gate the first time round). No trees on
    # this coast, so the charter's three depths of green are moss on lava, tussock
    # grass and sea thrift in the cracks. Its motion is the sea.
    # meridian-05 — Atacama. The listing does the art direction by itself: concrete
    # cast with the sand, pressed into an escarpment; the living room set three metres
    # behind its own roof so the glass never meets the sun; a walled court roofed in
    # timber slats where "the light arrives in stripes"; a channel of water along one
    # wall; a plunge pool the escarpment shades at five. Weather per the charter table:
    # hard clear daylight, sharp shadows — rain here would contradict the listing,
    # which says the gravel has not seen rain since 1997. Warm light is LAMPLIGHT, not
    # fire. Compose with little sky: the escarpment and the slats fill the top, or
    # frame-check reads the sky as the brightest mass.
    # hollowmoss-04 — Jämtland, and the house on the home page, full-bleed. The
    # listing fixes it LOW, so no tower; the silhouette instead comes from the
    # charter's unused option — two volumes joined by a glazed link, the smaller
    # one out over black standing water on stilts, which is where the sauna in its
    # amenities goes. Weather per the table: morning mist and low sun through old
    # spruce, mist held on the water until noon. Motion is mist, smoke and
    # reflection. Declared daylight in frame-check.
    # whitehour-08 — Kerlingarfjoll. The listing names its own silhouette, and it is
    # one nothing else in the catalog has: "a long low curve of concrete and glass
    # following the slope". Geothermal: steam out of the ground, a pool fed by it
    # that never goes cold, and a wall the mountain heats. Weather per the table:
    # cold clear morning with frost — declared daylight in frame-check. Its motion
    # is ground steam, which is the strongest moving element available to any house.
    # sparv-04 — Rogen. The eighth silhouette, and the charter's last untried one
    # that suits a forest: a TOWER on granite, three floors stacked, the top one
    # glazed. Five guests over two bedrooms is what makes stacking credible. Weather
    # per the table: clear cold night with stars — the only night house in the
    # catalog, so rain and snowfall stay spent. Motion is fire, smoke and aurora.
    # NOT declared daylight: the lit windows must still beat the sky, aurora included.
    # quiet-fern-06 — Southwest Tasmania. Its row was fixed in an earlier session
    # (2 guests -> 4, "the house is small" struck out) because the old wording drew
    # capsules every time. The silhouette now comes from the listing itself: two
    # wings splayed on one concrete plinth with a continuous glass spine along the
    # whole ridge, so both bedrooms lie under the sky. Weather per the table: clear
    # dawn with fast cloud — the sky IS this house's moving element, which is why
    # the roof has to be in frame. Declared daylight in frame-check.
    # rimefall-02 — Hardangervidda. Its row was repaired the same day for the same
    # reason quiet-fern's was: "Inside: one room" plus 3 guests draws a capsule, and
    # capsules fail the owner's gate every time. Now 4/2, one great room under a
    # single span with two sleeping rooms cut into the bank. Silhouette: the
    # charter's unused "pitched roof that flies out over a terrace" — a steep span
    # reaching nearly to the ground on the windward side and cantilevering over a
    # sheltered terrace on the lee, which is also how you build on an exposed
    # plateau. Weather per the table: clear blue hour after snowfall, still air.
    # Snowfall itself is spent (blackwater owns it), so the motion here is smoke,
    # sauna steam and spindrift off the drifts.
    # kaldbak-09 — Streymoy. The listing is nearly a prompt already: a turf roof
    # whose weight is the only thing that holds against forty gales a winter,
    # sloping to the grass on the weather side and rising to a tall gable of tarred
    # black boards with white frames on the lee; one window seat cut deep into a
    # wall you could not reach across; a terrace and tub inside a curved bank of
    # earth. Weather per the table: fog rolling with breaks of sun, so the motion
    # is fog, grass in wind and steam off the tub. Declared daylight in frame-check.
    # driftline-10 — Lofoten, and the twelfth silhouette: the whole house FLOATS.
    # One long room glazed down its length, a separate sauna at the far end of the
    # deck, a sunken pool cut into the boards between them with the fjord a step
    # over the edge, a covered walkway to the rock and a boat tied along the outer
    # edge. Nothing else in the catalog sits on water. Weather per the table: clear
    # golden evening on a calm fjord — Lofoten's winter light lasts about three
    # hours, which is what makes a golden evening the honest choice here. Declared
    # daylight in frame-check. Motion is water, steam and the boat.
    "driftline-10": {
        "exterior": {
            "ext-plan": (
                HOUSE_DL + " Seen in three-quarter view from the water at deck level, "
                "the whole platform legible end to end — glazed room, then the steaming "
                "sunken pool, then the sauna — with the covered walkway running off to "
                "the rock behind it and the boat along the near edge."
            ),
            "ext-plan-big": (
                HOUSE_DL.replace(
                    "with one long pale-timber room glazed down its entire length at "
                    "one end",
                    "with a long pale-timber living room glazed down its entire length "
                    "at one end — long enough for six tall window bays — and behind it "
                    "a second, lower volume holding two bedrooms, so the house plainly "
                    "sleeps four"
                ).replace(
                    "The house occupies about 30% of the image width",
                    "The deck is broad and the house is generously sized, occupying "
                    "about 50% of the image width"
                ) + " Seen in three-quarter view from the water at deck level, the whole "
                "platform legible end to end — the long room and the bedroom volume "
                "behind it, then the steaming sunken pool, then the sauna — with the "
                "covered walkway running off to the rock behind it and the boat along "
                "the near edge."
            ),
            "ext-walkway": (
                HOUSE_DL + " Seen from the shore rock looking along the covered walkway "
                "toward the house, so the way in reads: the walkway leading the eye down "
                "its length to the lit door and the deck beyond it."
            ),
            "ext-fjord": (
                HOUSE_DL + " Seen from further out on the water at its level, the lit "
                "platform small and low against an enormous dark peak, its light and the "
                "peak both doubled in the mirror-calm fjord."
            ),
        },
        "interior": {
            "long": (
                "The interior of a floating off-grid house on a Lofoten fjord in clear "
                "golden evening light, immaculate and lived in but completely "
                "unoccupied, every seat empty including the one nearest the camera, shot "
                "from the corner at sitting height down the length of one long room that "
                "is glazed along its entire side, so low gold light rakes the whole way "
                "through it and the black water lies a step beyond the glass. Pale "
                "timber, a plank floor, a wood stove burning with firewood stacked "
                "beside it. Warm light comes from the fire, a floor lamp close to the "
                "camera, two pendants deeper in and candles on a low table, at four "
                "depths. A deep sofa with clean linen cushions piled and a fresh wool "
                "throw half-slipping, a sheepskin over a bench, a patterned rug, a cup "
                "with steam still rising beside an enamel pot, a book left open face "
                "down, sea boots by the door, a jug of cut grasses. Through the glass: a "
                "calm black fjord holding the gold, dark peaks across it, a boat tied "
                "along the outer edge. Kelp, grasses and wet black rock at three depths. "
                "Everything of interest sits in the middle band of the frame."
            ),
            "stove": (
                "The interior of a floating off-grid house on a Lofoten fjord in clear "
                "golden evening light, immaculate and lived in but completely "
                "unoccupied, shot from the corner at sitting height with a wood stove "
                "burning close to the camera and the glass meeting the deck at floor "
                "level just beyond it, so the black water of the fjord is almost at the "
                "level of the boards and reflects the gold. Pale timber, a plank floor, "
                "firewood stacked by the stove. Warm light comes from the fire, a floor "
                "lamp, one pendant deeper in and candles on a low table, at four depths. "
                "A deep sofa with clean linen cushions piled and a fresh wool throw "
                "half-slipping, sheepskins, a patterned rug, a cup with steam still "
                "rising beside an enamel pot, a book left open face down, sea boots and "
                "oilskins by the door, a jug of cut grasses. Beyond: a calm fjord, dark "
                "peaks catching the last light, a boat tied alongside. Kelp, grasses and "
                "wet black rock at three depths. Everything of interest sits in the "
                "middle band of the frame."
            ),
            "pool": (
                "The interior of a floating off-grid house on a Lofoten fjord in clear "
                "golden evening light, immaculate and lived in but completely "
                "unoccupied, shot from inside the long glazed room looking out along the "
                "deck, so the frame holds the warm room on the left and, on the right, a "
                "sunken pool cut straight into the timber boards steaming into the cold "
                "air with a lantern and folded towels beside it, the black fjord one "
                "step beyond its far edge and a small timber sauna glowing at the end of "
                "the deck. Inside: a wood stove burning, a deep sofa with clean linen "
                "cushions piled and a fresh wool throw half-slipping, a sheepskin, a "
                "floor lamp close to the camera, candles on a low table, a cup with "
                "steam still rising, a book left open face down, robes on pegs. Beyond: "
                "a calm fjord holding the gold, dark peaks across it, a boat tied along "
                "the outer edge. Kelp, grasses and wet black rock at three depths. "
                "Everything of interest sits in the middle band of the frame."
            ),
        },
    },
    "kaldbak-09": {
        "exterior": {
            "ext-turf": (
                HOUSE_KB + " Seen in three-quarter view from the weather side and "
                "slightly below, so the sod roof runs down into the hillside grass and "
                "the building reads as part of the slope."
            ),
            "ext-sound": (
                HOUSE_KB + " Seen from the sheltered side, the tall black gable and its "
                "white frames facing the camera with the terrace and its steaming tub "
                "inside the curved earth bank in front of it."
            ),
            "ext-cliff": (
                HOUSE_KB + " Seen from along the clifftop at eye level, the lit house "
                "small on the green edge with the black cliff falling away beyond it and "
                "fog pouring over the ridge behind."
            ),
        },
        "interior": {
            "seat": (
                "The interior of a turf-roofed off-grid house on a Faroese clifftop in "
                "rolling fog with breaks of sun, immaculate and lived in but completely "
                "unoccupied, every seat empty including the one nearest the camera, shot "
                "from the corner of the room at sitting height so the room runs "
                "diagonally away to a window seat cut deep into a wall a metre thick, "
                "with a white-painted frame and the sound beyond it. Tarred black boards "
                "outside, pale painted boards and exposed timber within, a flagstone "
                "floor. A wood stove burns close to the camera with peat and firewood "
                "stacked beside it; warm light also comes from a floor lamp, two small "
                "pendants deeper in and candles on the sill of the deep seat, at four "
                "depths. Clean linen cushions piled in the window seat with a fresh wool "
                "throw half-slipping, a sheepskin over a bench, a patterned rug, a cup "
                "with steam still rising beside an enamel pot, a book left open face "
                "down, oilskins and a rope on pegs, a jug of sea pinks. Through the deep "
                "window: fog moving across a black cliff and grey sound, a shaft of sun "
                "breaking through it. Turf, thrift and wind-flattened grass crowd the "
                "glass at three depths. Everything of interest sits in the middle band "
                "of the frame."
            ),
            "gable": (
                "The interior of a turf-roofed off-grid house on a Faroese clifftop in "
                "rolling fog with breaks of sun, immaculate and lived in but completely "
                "unoccupied, shot from the corner at sitting height in the tall room "
                "under the black gable, so the ceiling rises away from the camera to a "
                "ridge and tall white-framed windows fill the gable end. Pale painted "
                "boards, exposed timber, a flagstone floor. A wood stove burns with peat "
                "stacked beside it; warm light also comes from a floor lamp close to the "
                "camera, two pendants hung high and candles on a low table, at four "
                "depths. A deep sofa with clean linen cushions piled and a fresh wool "
                "throw half-slipping, a sheepskin over a bench, a patterned rug, a cup "
                "with steam still rising beside an enamel pot, a book left open face "
                "down, boots by the door, a jug of sea pinks. Through the gable windows: "
                "fog rolling over a black cliff and grey sound, a shaft of sun breaking "
                "through. Turf and wind-flattened grass at three depths. Everything of "
                "interest sits in the middle band of the frame."
            ),
            "porch": (
                "The wide flagstone entry room of a turf-roofed off-grid house on a "
                "Faroese clifftop in rolling fog with breaks of sun, immaculate and lived "
                "in but completely unoccupied, shot from the corner at sitting height "
                "with the outer door standing open on fog and wet grass. Pale painted "
                "boards, a low beamed ceiling, hooks along one wall with oilskins, a "
                "coiled rope and a lifebuoy on them, sea boots and clogs paired beneath, "
                "a drying rack with towels, a basket of peat. A small wood stove burns at "
                "the far end; warm light also comes from a lantern by the door, a wall "
                "lamp and candles, at four depths. A sheepskin on a bench, a cup with "
                "steam still rising on a stool, a book left open face down, a jug of sea "
                "pinks. Through the open door: fog moving across wet turf with a shaft of "
                "sun breaking through, and a steaming wooden tub on a terrace inside a "
                "curved earth bank. Turf, thrift and wind-flattened grass at three "
                "depths. Everything of interest sits in the middle band of the frame."
            ),
        },
    },
    "rimefall-02": {
        "exterior": {
            "ext-lee": (
                HOUSE_RF + " Seen in three-quarter view from the lee side, the span "
                "flying out over the sheltered terrace and the lit end wall facing the "
                "camera."
            ),
            "ext-drift": (
                HOUSE_RF + " Seen from the windward side and close, the roof running "
                "down into deep drifted snow so the building reads as part of the "
                "landform, the bank windows glowing at snow level."
            ),
            "ext-plateau": (
                HOUSE_RF + " Seen from far out on the snow at eye level, the lit house "
                "small and low in an enormous empty white plain, its light laid in a "
                "faint stain across the drifts."
            ),
        },
        "interior": {
            "span": (
                "The interior of an off-grid house on the Hardangervidda plateau at blue "
                "hour after snowfall, immaculate and lived in but completely unoccupied, "
                "every seat empty including the one nearest the camera, shot from the "
                "corner of one great room at sitting height so the room runs diagonally "
                "away under a single steep timber span that comes down almost to the "
                "floor on the far side. A wood stove burns at the middle of the room with "
                "firewood stacked beside it; a window the size of the whole end wall "
                "looks out on blue snow. Warm light comes from the fire, a floor lamp "
                "close to the camera, two pendants hung from the span and candles on a "
                "low table, at four depths, against the cold blue outside. A deep sofa "
                "with clean linen cushions piled and a fresh wool throw half-slipping, "
                "sheepskins on a warm stone floor, a patterned rug, a cup with steam "
                "still rising beside a kettle, a book left open face down, skis and boots "
                "by the door, a jug of cut birch. Beyond the glass: an empty white "
                "plateau at blue hour, drifted snow, spindrift lifting off the crests, "
                "and steam from a small sauna. Frosted heath and buried rock at three "
                "depths. Everything of interest sits in the middle band of the frame."
            ),
            "floor": (
                "The interior of an off-grid house on the Hardangervidda plateau at blue "
                "hour after snowfall, immaculate and unoccupied, shot low and close to a "
                "warm stone floor so the floor itself fills the near foreground, strewn "
                "with sheepskins, flat cushions and a fresh wool throw half-slipping off "
                "a low bench, a patterned rug, a tray with a steaming kettle and two "
                "cups, and a book left open face down. Behind them a wood stove burns "
                "under a single steep timber span, and a window the size of the whole end "
                "wall opens on blue snow. Warm light comes from the fire, a lantern on "
                "the floor, two pendants hung from the span and candles, at four depths. "
                "Beyond the glass: an empty white plateau at blue hour, drifted snow, "
                "spindrift lifting off the crests, steam from a small sauna. Frosted "
                "heath and buried rock at three depths. Everything of interest sits in "
                "the middle band of the frame."
            ),
            "bank": (
                "A sleeping room cut into the bank behind an off-grid house on the "
                "Hardangervidda plateau at blue hour after snowfall, immaculate and "
                "unoccupied, shot from the corner at sitting height. Timber lines the "
                "walls and the low ceiling; a long horizontal window sits at snow level "
                "so the drifts outside are almost at eye height, blue and still. A low "
                "bed is made with clean white linen and a fresh wool blanket "
                "half-slipping, cushions piled, sheepskins on a warm stone floor, books "
                "on a timber shelf. Warm light comes from two brass reading lamps, a "
                "lantern on the floor and candles, at four depths. A cup with steam still "
                "rising on a stool, a book left open face down, slippers on a patterned "
                "rug, a jug of cut birch. Through the window: drifted snow, spindrift "
                "lifting, an empty plateau, frosted heath and buried rock at three "
                "depths. Everything of interest sits in the middle band of the frame."
            ),
        },
    },
    "quiet-fern-06": {
        "exterior": {
            "ext-plinth": (
                HOUSE_QF + " Seen in three-quarter view from the moorland, both wings "
                "reading as two wings on one plinth and the glass spine catching the "
                "dawn along the whole ridge."
            ),
            "ext-moor": (
                HOUSE_QF + " Seen from far out on the button grass at eye level, the lit "
                "house low and small in an enormous flat emptiness, the horizon running "
                "clean from edge to edge behind it."
            ),
            "ext-spine": (
                HOUSE_QF + " Seen from close beside one wing looking along its length, "
                "the glazed spine running away from the camera and glowing from within, "
                "the plinth's edge in the near foreground."
            ),
        },
        "interior": {
            "ridge": (
                "The interior of a long low off-grid house on open button-grass moorland "
                "in Southwest Tasmania at clear dawn, immaculate and lived in but "
                "completely unoccupied, every seat empty including the one nearest the "
                "camera, shot from the corner of the living wing at sitting height and "
                "angled slightly up, so a continuous glass spine running the whole length "
                "of the ridge is open overhead and the dawn sky with fast-moving cloud "
                "fills it. Pale timber walls, a polished concrete floor, a wood stove "
                "burning with firewood stacked beside it. Warm light comes from the fire, "
                "a floor lamp close to the camera, two small pendants deeper in and "
                "candles on a low table, at four depths, against the cold blue of the "
                "morning. A deep sofa with clean linen cushions piled and a fresh wool "
                "throw half-slipping, a sheepskin over a bench, a patterned rug, a cup "
                "with steam still rising beside an enamel pot, a book left open face "
                "down, boots by the door, a jug of cut fern fronds. Through the end "
                "glass: button grass running flat to a bare horizon. Ferns, heath and "
                "tussock crowd the glass at three depths. Everything of interest sits in "
                "the middle band of the frame."
            ),
            "bed": (
                "A bedroom in a long low off-grid house on open button-grass moorland in "
                "Southwest Tasmania at clear dawn, immaculate and unoccupied, shot from "
                "the corner at sitting height and angled up, so the glass spine along the "
                "ridge runs directly over the bed and the dawn sky with fast-moving cloud "
                "is open above it. A low bed made with clean white linen and a fresh wool "
                "blanket half-slipping, cushions piled, a sheepskin on the concrete "
                "floor, books stacked on a timber shelf. Warm light comes from two brass "
                "reading lamps, a lantern on the floor and candles, at four depths. A cup "
                "with steam still rising on a stool, a book left open face down, slippers "
                "on a patterned rug, a jug of cut fern fronds. Through the end glass: "
                "button grass running flat to a bare horizon, heath and tussock at three "
                "depths. Everything of interest sits in the middle band of the frame."
            ),
            "horizon": (
                "The interior of a long low off-grid house on open button-grass moorland "
                "in Southwest Tasmania at clear dawn, immaculate and lived in but "
                "completely unoccupied, shot from the corner of the living wing at "
                "sitting height along a timber table set for four against a full-height "
                "end window, with the kitchen behind it and the glass spine visible "
                "overhead. Beyond the window, button grass runs flat and unbroken to a "
                "bare horizon under a dawn sky of fast-moving cloud, with quartzite "
                "ranges far off. On the table a steaming enamel pot, bowls, bread and a "
                "candle still burning; three pendants over it, an under-shelf glow in the "
                "kitchen and a wood stove burning at the far end, at four depths. A wool "
                "throw over a chair back, a sheepskin on a bench, a book left open face "
                "down, a jug of cut fern fronds. Ferns, heath and tussock at three "
                "depths. Everything of interest sits in the middle band of the frame."
            ),
        },
    },
    "sparv-04": {
        "exterior": {
            "ext-tower": (
                HOUSE_SP + " Seen in three-quarter view from the granite below and to "
                "one side, looking slightly up, so the tower's full height reads against "
                "the stars and the lit floors stack one above another."
            ),
            "ext-tarn": (
                HOUSE_SP + " Seen from out on the frozen tarn at its level, the tower "
                "standing on its rock shelf across the ice with its light stretched in a "
                "long streak over the frozen surface."
            ),
            "ext-granite": (
                HOUSE_SP + " Seen from among the boulders, the tower framed in the gap "
                "between two rounded granite erratics whose lichened flanks are dark in "
                "the near foreground at both edges."
            ),
        },
        "interior": {
            "top": (
                "The interior of the glazed top floor of a timber tower house on granite "
                "in a Swedish forest reserve on a clear cold night, immaculate and lived "
                "in but completely unoccupied, every seat empty including the one nearest "
                "the camera, shot from the corner at sitting height so the room runs "
                "diagonally away. Glass on three sides and a low timber ceiling; outside "
                "the sky is full of stars with a faint green aurora low over black pines, "
                "and a frozen tarn lies far below, but the room itself is clearly the "
                "brightest thing in the picture. Warm light comes from a small wood stove "
                "burning, a floor lamp close to the camera, a brass reading lamp by a "
                "deep window seat and a cluster of candles on a low table, at four "
                "depths. A deep window seat with clean linen cushions piled and a fresh "
                "wool throw half-slipping, a sheepskin over a stool, a patterned rug, a "
                "cup with steam still rising beside an enamel pot, a book left open face "
                "down, a jug of cut pine. Everything of interest sits in the middle band "
                "of the frame."
            ),
            "boulder": (
                "The interior of the ground floor of a timber tower house in a Swedish "
                "forest reserve on a clear cold night, immaculate and lived in but "
                "completely unoccupied, every seat empty including the one nearest the "
                "camera, shot from the corner at sitting height. A rounded granite "
                "boulder the house was built around comes through one wall and into the "
                "room, its rock face bare and lichened; a wood stove burns against it "
                "with firewood stacked beside it, and a timber stair rises out of frame "
                "to the floor above. Warm light comes from the fire, a floor lamp, one "
                "pendant deeper in and candles on a low table, at four depths, against "
                "the black night outside. A deep sofa with clean linen cushions piled and "
                "a fresh wool throw half-slipping, a sheepskin over a bench, a shelf of "
                "books, a cup with steam still rising, a book left open face down, boots "
                "by the door, a jug of cut pine. Through the window: black pines, stars "
                "and a frozen tarn, all darker than the room. Everything of interest sits "
                "in the middle band of the frame."
            ),
            "bunks": (
                "The interior of the sleeping floor of a timber tower house in a Swedish "
                "forest reserve on a clear cold night, immaculate and lived in but "
                "completely unoccupied, shot from the corner at sitting height. Built-in "
                "timber bunks are set into one wall in two tiers, each with its own "
                "linen curtain drawn half back, its own small brass reading lamp lit and "
                "its own shelf with a book and a candle; the beds are made with clean "
                "white linen and a fresh wool blanket folded across each. Opposite them a "
                "deep window looks out on stars over black pines and a frozen tarn, all "
                "darker than the room. Warm light comes from the four reading lamps, a "
                "lantern on the floor and candles, at four depths. A sheepskin on a "
                "patterned rug, slippers beside it, a cup with steam still rising on a "
                "stool, a jug of cut pine. Everything of interest sits in the middle band "
                "of the frame."
            ),
        },
    },
    "whitehour-08": {
        "exterior": {
            "ext-arc": (
                HOUSE_WH + " Seen in three-quarter view from below and to the side, so "
                "the whole curve reads as a curve against the slope and the steaming "
                "pool sits between the camera and it."
            ),
            "ext-pool": (
                HOUSE_WH + " Seen from the stone edge of the pool itself, close, the "
                "steam drifting across the frame and the lit curve of the house standing "
                "above it."
            ),
            "ext-ridge": (
                HOUSE_WH + " Seen from the opposite slope at eye level, the lit house "
                "small along its contour in a wide sweep of rhyolite, with columns of "
                "ground steam rising between the camera and it."
            ),
        },
        "interior": {
            # The first curve take put the occupant's own knees across the bottom of
            # the frame: "at sitting height" plus "left ten minutes ago" reads as a
            # first-person view, and the tail's "no people" does not undo an invited
            # point of view. The seat nearest the camera is now stated empty.
            "curve": (
                "The interior of a long low curved off-grid house in the Icelandic "
                "highlands on a cold clear morning, immaculate and lived in but "
                "completely unoccupied, every seat empty including the one nearest the "
                "camera, shot from the corner of the room at sitting height so the room "
                "follows its curve "
                "away from the camera and the far end disappears around it. Board-marked "
                "concrete walls and a glass wall running the whole outside of the arc. A "
                "wood stove burns close to the camera with firewood stacked beside it; "
                "warm light also comes from a floor lamp, two small pendants deeper round "
                "the curve and candles on a low table, at four depths, against the pale "
                "blue of the morning. A deep sofa with clean linen cushions piled and a "
                "fresh wool throw half-slipping, a sheepskin over a bench, a cup with "
                "steam still rising beside an enamel pot, a book left open face down, "
                "boots by the door, a jug of dried grasses. Through the glass: ochre, "
                "rust and sulphur-yellow rhyolite hills with steam rising out of the "
                "ground between them, snow lying in the shadows, low sun raking across "
                "frost. Moss, frosted heath and scattered stone crowd the glass at three "
                "depths. Everything of interest sits in the middle band of the frame."
            ),
            "pool": (
                "The interior of a long low curved off-grid house in the Icelandic "
                "highlands on a cold clear morning, immaculate and lived in, shot from "
                "inside the warm room looking out and down through a glass wall, so the "
                "frame holds the lit room on the left and, on the right and below, a "
                "geothermal pool of milky blue water steaming hard into the freezing air "
                "with a lantern and folded towels on the stone beside it. Inside: a wood "
                "stove burning, a deep sofa with clean linen cushions piled and a fresh "
                "wool throw half-slipping, a sheepskin, a floor lamp close to the camera, "
                "candles on a low table, a cup with steam still rising, a book left open "
                "face down, robes on pegs. Beyond: ochre and rust rhyolite hills with "
                "steam coming out of the ground, snow in the shadows, low sun on frost. "
                "Moss, frosted heath and stone at three depths. Everything of interest "
                "sits in the middle band of the frame."
            ),
            "wall": (
                "The interior of a long low curved off-grid house in the Icelandic "
                "highlands on a cold clear morning, immaculate and lived in, shot from "
                "the corner of a long room at sitting height along a deep built-in daybed "
                "that runs the whole length of a curved board-marked concrete wall — the "
                "wall the mountain itself heats — piled with clean linen cushions and "
                "sheepskins and a fresh wool throw half-slipping, with books stacked "
                "along it. Opposite it a glass wall looks out. Warm light comes from "
                "three small wall lamps spaced along the curve, a reading lamp at the "
                "daybed and candles on a low table, at four depths. A cup with steam "
                "still rising beside an enamel pot, a book left open face down, slippers "
                "on a patterned rug, a jug of dried grasses. Through the glass: ochre and "
                "sulphur-yellow hills with steam rising out of the ground, snow in the "
                "shadows, low sun raking across frost, moss and frosted heath at three "
                "depths. Everything of interest sits in the middle band of the frame."
            ),
        },
    },
    "hollowmoss-04": {
        "exterior": {
            "ext-water": (
                HOUSE_HM + " Seen from across the black water at its level, the two "
                "volumes and the link strung along the far bank and doubled whole in the "
                "still surface, mist lying between."
            ),
            "ext-clearing": (
                HOUSE_HM + " Seen from the misty clearing on the open side, the sun "
                "coming through the spruce behind the house in long shafts across the "
                "mist and the woodsmoke rising into them."
            ),
            "ext-link": (
                HOUSE_HM + " Seen in three-quarter view from the bank and close, the "
                "glazed link between the two volumes lit from within and the sauna "
                "standing out over the water on its stilts at the right."
            ),
        },
        "interior": {
            "reading": (
                "The interior of a low timber off-grid house in an old Swedish spruce "
                "forest on a misty morning, immaculate and lived in, shot from the corner "
                "of a reading room at sitting height so the room runs diagonally away and "
                "a glazed link to a second volume is visible beyond it. Floor-to-ceiling "
                "bookshelves fill one wall; opposite them a deep window seat runs along "
                "glass that looks straight out over black standing water, with clean "
                "linen cushions piled and a fresh wool throw half-slipping. A wood stove "
                "burns with firewood stacked beside it. Warm light comes from the fire, a "
                "reading lamp at the seat, a low lamp deeper in and candles on a table, "
                "at four depths, against the cool grey-green of the morning. A cup with "
                "steam still rising beside an enamel pot, a book left open face down, "
                "boots by the door, a jug of cut spruce branches, a patterned rug. "
                "Through the glass: mist standing on the black water, low sun coming "
                "through old spruce in shafts, moss and bilberry crowding the glass at "
                "three depths. Everything of interest sits in the middle band of the "
                "frame."
            ),
            "water": (
                "The interior of a low timber off-grid house in an old Swedish spruce "
                "forest on a misty morning, immaculate and lived in, shot from the corner "
                "of the living room at sitting height so the room runs diagonally away "
                "toward a wall of glass that meets black standing water at the floor "
                "line, the water mirror-still and holding mist. A wood stove burns close "
                "to the camera with firewood stacked beside it; warm light also comes "
                "from a floor lamp, two small pendants deeper in and candles on a low "
                "table, at four depths. A deep sofa with clean linen cushions piled and a "
                "fresh wool throw half-slipping, a sheepskin over a bench, a cup with "
                "steam still rising beside an enamel pot, a book left open face down, "
                "boots by the door, a jug of cut spruce branches, a patterned rug. "
                "Beyond: low sun in shafts through old spruce, mist drifting over the "
                "water, moss, ferns and bilberry at three depths. Everything of interest "
                "sits in the middle band of the frame."
            ),
            "morning": (
                "The interior of a low timber off-grid house in an old Swedish spruce "
                "forest on a misty morning, immaculate and lived in, shot from the corner "
                "of the room at sitting height along a timber table laid for breakfast "
                "against glass that looks out over black standing water, with the kitchen "
                "behind it and a glazed link to a second volume beyond. On the table a "
                "steaming enamel coffee pot, bowls, bread and berries, a candle still "
                "burning from the night. Warm light comes from three pendants over the "
                "table, an under-shelf glow in the kitchen, a wood stove burning at the "
                "far end and the candle, at four depths. A wool throw over a chair back, "
                "a sheepskin on a bench, a book left open face down, dried herbs hanging, "
                "a jug of cut spruce branches. Through the glass: mist standing on the "
                "water, low sun coming through old spruce in shafts, moss and bilberry at "
                "three depths. Everything of interest sits in the middle band of the "
                "frame."
            ),
        },
    },
    "meridian-05": {
        "exterior": {
            "ext-escarpment": (
                HOUSE_MD + " Seen in three-quarter view from the gravel, the long low "
                "mass running away to the left against the rock wall and the slatted "
                "court roof catching the sun above it."
            ),
            "ext-stair": (
                HOUSE_MD + " Seen closer from the side, the external stair climbing the "
                "flank to the roof terrace and its telescope, the stair's own shadow "
                "falling hard across the concrete."
            ),
            "ext-plain": (
                HOUSE_MD + " Seen from far out on the gravel plain, the house low and "
                "small at the foot of an enormous escarpment, heat shimmer rising off "
                "the ground between the camera and it."
            ),
        },
        "interior": {
            "stripes": (
                "The interior of a concrete off-grid house in the Atacama desert in hard "
                "clear afternoon light, immaculate and lived in, shot from the corner of "
                "a deep living room at sitting height so the room runs diagonally away. "
                "The room is set well back behind its own roof so the glass never meets "
                "the sun and the inside is in deep cool shade; beyond it a walled court "
                "roofed in timber slats throws hard stripes of light across a sand-toned "
                "concrete floor, and past the court a rock escarpment fills the top of "
                "the frame so almost no sky shows. Warm light comes from four lamps lit "
                "inside the shade — a floor lamp close to the camera, two low lamps "
                "deeper in and candles on a low table — pooling on plaster, a patterned "
                "woven rug and deep soft seating. A deep sofa with clean linen cushions "
                "piled and a fresh throw half-slipping, a sheepskin over a bench, a cup "
                "with steam still rising beside a clay jug, a book left open face down, "
                "sandals at the edge of the rug, a bowl of figs, dried chillies hanging, "
                "cacti and desert shrubs in clay pots at three depths in the court. "
                "Everything of interest sits in the middle band of the frame."
            ),
            "court": (
                "The walled court of a concrete off-grid house in the Atacama desert in "
                "hard clear afternoon light, immaculate and lived in, shot from under the "
                "timber slat roof at sitting height so the court runs away from the "
                "camera. The slats throw hard parallel stripes of light and shadow across "
                "sand-toned concrete, a narrow channel of running water runs the length "
                "of one wall with light moving on it, and a plunge pool sits in the shade "
                "at the far end. A long timber table is laid for four in the striped "
                "shade with clay bowls, a jug, figs and candles burning; lanterns hang "
                "from the slats and two lamps glow through the glass of the living room "
                "beyond. Linen cushions piled on a low bench, a throw half-slipping, a "
                "book left open face down, a towel folded by the pool, sandals on the "
                "step. Cacti, olive and desert shrubs in clay pots at three depths, and "
                "a rock escarpment fills the top of the frame so almost no sky shows. "
                "Everything of interest sits in the middle band of the frame."
            ),
            "bedroom": (
                "A bedroom cut back into the thick wall of a concrete off-grid house in "
                "the Atacama desert in hard clear afternoon light, immaculate and lived "
                "in, shot from the corner of the room at sitting height. Sliding timber "
                "shutters stand half drawn across a deep-set opening, letting one hard "
                "blade of sunlight fall across a sand-toned concrete floor and a "
                "patterned woven rug while the rest of the room stays in deep cool shade. "
                "Warm light comes from a bedside lamp, a low lamp deeper in, a lantern by "
                "the door and candles, at four depths. A low bed with clean white linen "
                "rumpled and a fresh woollen blanket half-slipping, cushions piled, a "
                "sheepskin on the floor, a cup with steam still rising beside a clay jug, "
                "a book left open face down, a hat and a linen shirt on pegs, a bowl of "
                "figs. Through the opening: the walled court in stripes of light and a "
                "rock escarpment filling the top of the frame so almost no sky shows, "
                "with cacti and desert shrubs in clay pots at three depths. Everything of "
                "interest sits in the middle band of the frame."
            ),
        },
    },
    "tidebreak-03": {
        "exterior": {
            "ext-terraces": (
                HOUSE_TB + " Seen in three-quarter view from the landward side and "
                "slightly above, so all three terraces step away down the cliff and the "
                "steaming bath on the lowest one is visible against the sea."
            ),
            "ext-sea": (
                HOUSE_TB + " Seen from lower down the rock on the seaward side, looking "
                "up at the house standing against the storm sky, a wave bursting white "
                "up the basalt in the near foreground below it."
            ),
            "ext-headland": (
                HOUSE_TB + " Seen from along the headland, the lit house small in a wide "
                "sweep of black basalt and open water, wet moss and tussock grass "
                "filling the near foreground."
            ),
        },
        "interior": {
            "storm": (
                "The interior of an off-grid house bolted to Icelandic basalt above open "
                "water, at late dusk in heavy weather, immaculate and lived in, shot from "
                "the corner of the room at sitting height so the room runs diagonally "
                "away and a second terrace of the house is visible a few steps down. A "
                "long seaward wall of thick glass runs the length of the room, and beyond "
                "it the sea heaves grey-green against black rock, spray bursting up the "
                "cliff and rain driving across the glass in streaks. Warm amber light "
                "comes from a wood stove burning close to the camera with firewood "
                "stacked beside it, a floor lamp, two pendants deeper in and candles on a "
                "low table, falling in separate pools at four depths. A deep sofa with "
                "clean linen cushions piled and a fresh wool throw half-slipping, a "
                "sheepskin over a bench, a cup with steam still rising beside a kettle, a "
                "book left open face down, boots and oilskins by the door. Everything of "
                "interest sits in the middle band of the frame. Thick moss on lava, "
                "tussock grass and sea thrift crowd the glass at three depths."
            ),
            "coffee": (
                "The interior of an off-grid house bolted to Icelandic basalt above open "
                "water, at late dusk in heavy weather, immaculate and lived in, shot from "
                "the corner of the room at sitting height along a timber table set for "
                "four against a long seaward wall of thick glass, with the kitchen behind "
                "it. On the table a steaming jug of coffee, cups, bread and candles "
                "burning; beyond the glass the sea heaves grey-green against black rock "
                "with spray bursting up the cliff and rain streaking the glass. Warm "
                "amber light comes from three pendants over the table, an under-shelf "
                "glow in the kitchen, a wood stove burning at the far end and the "
                "candles, falling in separate pools at four depths. A wool throw thrown "
                "over a chair back, a sheepskin on a bench, a book left open face down, "
                "dried herbs hanging, a jug of grasses. Everything of interest sits in "
                "the middle band of the frame. Moss on lava, tussock grass and sea thrift "
                "at three depths beyond the glass."
            ),
            "bath": (
                "The interior of an off-grid house bolted to Icelandic basalt above open "
                "water, at late dusk in heavy weather, immaculate and lived in, shot from "
                "inside the warm room looking out through thick glass onto a stone terrace "
                "one level down, so the frame holds the lit room on the left and, on the "
                "right, a steaming stone soaking bath cut into the basalt with a lantern "
                "and a folded towel beside it and the open sea beyond, heaving grey-green "
                "with spray bursting up the rock. Inside: a wood stove burning, a deep "
                "sofa with clean linen cushions piled and a fresh wool throw "
                "half-slipping, a sheepskin, a floor lamp close to the camera, candles on "
                "a low table, a cup with steam still rising, a book left open face down, "
                "oilskins on pegs. Everything of interest sits in the middle band of the "
                "frame. Moss on lava, tussock grass and sea thrift at three depths."
            ),
        },
    },
    "blackwater-11": {
        "exterior": {
            "ext-slope": (
                HOUSE_BW + " Seen in three-quarter view from below and to the left, so "
                "the cantilevered upper volume projects out over the snowy slope against "
                "the sky and the concrete base is half buried in drifted snow."
            ),
            "ext-clearing": (
                HOUSE_BW + " Seen from across an open snowfield, the whole house lit in "
                "the treeline, a pair of skis standing upright in the snow near the deck "
                "and one line of ski tracks curving in from the left edge."
            ),
            # frame-check failed the first clearing take: the open sky above the
            # treeline read 0.82 against a 0.28 warm core. An open snowfield is the
            # composition that exposes the most sky, so this one darkens it explicitly.
            "ext-clearing-dark": (
                HOUSE_BW + " Seen from across an open snowfield, the whole house lit in "
                "the treeline, a pair of skis standing upright in the snow near the deck "
                "and one line of ski tracks curving in from the left edge. The sky is "
                "deep dark blue, well past sunset, with heavy snowfall dimming it "
                "further, and the pines along the treeline are almost black, so the lit "
                "windows and the lantern are by a clear margin the brightest points in "
                "the picture and the sky is darker than the snow on the ground."
            ),
            "ext-deck": (
                HOUSE_BW + " Seen from the snow at deck level and close, looking along "
                "the length of the timber deck to the lit glass and the steaming sauna, "
                "the cantilever overhead at the top of the frame."
            ),
        },
        "interior": {
            "mezzanine": (
                "The interior of an off-grid house in a Finnish pine forest at late dusk "
                "in falling snow, immaculate and lived in, shot from the corner of a "
                "double-height room at sitting height so the room runs diagonally away "
                "and a sleeping mezzanine with a made bed and a rail is visible above, "
                "reached by a timber stair. Concrete floor under a large patterned rug, "
                "black timber walls, glass from floor to roofline. A wood stove burns "
                "with firewood stacked beside it; warm amber light also comes from a "
                "floor lamp close to the camera, two pendants over the room and candles "
                "on a low table, falling in separate pools at four depths. A deep sofa "
                "with clean linen cushions piled and a fresh wool throw half-slipping, a "
                "sheepskin over a bench, a cup with steam still rising beside a kettle, a "
                "book left open face down, boots by the door, a jug of cut spruce "
                "branches. Beyond the glass: black pines heavy with snow, snow falling "
                "steadily in the air, deep blue and nearly dark, spruce boughs and "
                "snow-covered juniper crowding the glass at three depths."
            ),
            # Round two. He put "mezzanine" and "table" ahead of "sauna" and asked for
            # one frame carrying both. Also his: a frame reads oddly full-bleed when its
            # content sits low, because the site's interior band is ~2.37:1 against the
            # photograph's 1.5:1 and throws away ~37% of the height. So this one is
            # composed to keep everything that matters in the central horizontal band.
            "hall": (
                "The interior of an off-grid house in a Finnish pine forest at late dusk "
                "in falling snow, immaculate and lived in, shot from the corner of a "
                "double-height hall at standing eye level so the room runs diagonally "
                "away and holds three things at once: a long timber table laid for four "
                "with candles burning along it and a kitchen behind, a sleeping mezzanine "
                "with a made bed and a timber rail above, and a wood stove burning with "
                "firewood stacked beside it. Everything of interest sits in the middle "
                "band of the frame, with only floor below it and only ceiling above it. "
                "Concrete floor under a large patterned rug, black timber walls, glass "
                "from floor to roofline along the whole left side. Warm amber light comes "
                "from the stove, three pendants over the table, an under-shelf glow in "
                "the kitchen, a floor lamp by a deep sofa and the candles, falling in "
                "separate pools at five depths. A deep sofa with clean linen cushions "
                "piled and a fresh wool throw half-slipping, a sheepskin over a bench, a "
                "cup with steam still rising beside a kettle, a pot steaming on the "
                "table, a book left open face down, boots by the door, a jug of cut "
                "spruce branches, dried herbs hanging. Beyond the glass: black pines "
                "heavy with snow, snow falling steadily in the air, deep blue and nearly "
                "dark, spruce boughs and snow-covered juniper at three depths."
            ),
            "table": (
                "The interior of an off-grid house in a Finnish pine forest at late dusk "
                "in falling snow, immaculate and lived in, shot from the corner of the "
                "room at sitting height along a long timber dining table laid for four "
                "with candles burning down its length, the kitchen behind it and a "
                "sleeping mezzanine above. Concrete floor, black timber walls, glass from "
                "floor to roofline. Warm amber light comes from the candles, three "
                "pendants over the table, an under-shelf glow in the kitchen and a wood "
                "stove burning at the far end, falling in separate pools at four depths. "
                "Bread and a pot on the table, a cup with steam still rising, a book left "
                "open face down on a bench, a wool throw thrown over a chair back, a jug "
                "of cut spruce branches, dried herbs hanging. Beyond the glass: black "
                "pines heavy with snow, snow falling steadily in the air, deep blue and "
                "nearly dark, spruce boughs and snow-covered juniper at three depths."
            ),
            "sauna": (
                "The interior of an off-grid house in a Finnish pine forest at late dusk "
                "in falling snow, immaculate and lived in, shot from inside the warm room "
                "looking out through glass onto a snow-covered deck, so the frame holds "
                "the lit room on the left and, on the right, a timber sauna with its "
                "small window glowing amber and steam pouring from its open door into the "
                "freezing air, a lantern and a wooden bucket beside it. Inside: a wood "
                "stove burning, a deep sofa with clean linen cushions piled and a fresh "
                "wool throw half-slipping, a sheepskin, a floor lamp close to the camera, "
                "candles on a low table, a cup with steam still rising, a book left open "
                "face down, towels and a robe on pegs, a jug of cut spruce branches. "
                "Beyond: black pines heavy with snow, snow falling steadily in the air, "
                "deep blue and nearly dark, spruce boughs at three depths."
            ),
        },
    },
    "moss-verse-01": {
        "exterior": {
            "ext-posts": (
                HOUSE_MV + " Seen in three-quarter view from the front left, the length "
                "of the veranda running away from the camera, the steaming tub at the "
                "near end and the slender posts clear above the moss."
            ),
            "ext-stream": (
                HOUSE_MV + " Seen from across the stream, the lit house above the far "
                "bank and its windows doubled in the moving water, wet mossy boulders "
                "filling the foreground below the floor line."
            ),
            # frame-check failed the first cedars take: a gap of pale sky top-right
            # measured brighter (0.88) than the lit windows (0.50), and the sky is
            # half the picture, so it is fixed in the prompt rather than in the file.
            "ext-cedars-dark": (
                HOUSE_MV + " Seen from among the giant moss-covered cedar trunks, the "
                "house framed in the gap between two of them, their bark and hanging "
                "moss dark in the near foreground at both edges. The canopy closes "
                "completely overhead and the forest behind the house is dark and deep, "
                "so the windows and the lantern are the brightest points in the frame "
                "and every part of the forest is darker than them."
            ),
            "ext-cedars": (
                HOUSE_MV + " Seen from among the giant moss-covered cedar trunks, the "
                "house framed in the gap between two of them, their bark and hanging "
                "moss dark in the near foreground at both edges."
            ),
        },
        "interior": {
            "library": (
                "The interior of a timber off-grid house in an ancient moss forest at "
                "late dusk, immaculate and lived in, shot from the corner of the room at "
                "sitting height so the room runs diagonally away. Floor-to-ceiling "
                "bookshelves fill the left wall, packed and warm; opposite them a deep "
                "window seat runs the length of a full-height glass wall, with clean "
                "linen cushions piled and a fresh quilted throw half-slipping. Warm amber "
                "light comes from a large paper lantern close to the camera, two small "
                "hanging lamps deeper in, a reading lamp at the window seat and candles "
                "on a low table, so the light falls in separate pools at four depths. A "
                "cup with steam still rising sits beside an iron teapot with a book left "
                "open face down, more books stacked on the floor, slippers at the edge of "
                "the rug, a jug of cut fern fronds. Beyond the glass the forest is deep "
                "blue-green and nearly dark, steady rain falling in bright thin threads "
                "and running off the eave, ancient cedars and thick moss crowding the "
                "glass at three depths."
            ),
            "hearth": (
                "The interior of a timber off-grid house in an ancient moss forest at "
                "late dusk, immaculate and lived in, shot from the corner of the room at "
                "sitting height. A wood stove burns close to the camera on the left, its "
                "fire clearly visible and firewood stacked beside it; past it a deep sofa "
                "with clean linen cushions piled and a fresh quilted throw half-slipping "
                "faces a full-height glass wall, and bookshelves line the far end of the "
                "room. Warm amber light comes from the fire, a large paper lantern, two "
                "small hanging lamps deeper in and candles on a low table, falling in "
                "separate pools at four depths. A cup with steam still rising beside an "
                "iron teapot, a book left open face down, slippers at the edge of a "
                "patterned rug, a jug of cut fern fronds. Beyond the glass the forest is "
                "deep blue-green and nearly dark, steady rain falling in bright thin "
                "threads, and a cedar tub steams on the veranda. Ancient cedars, tree "
                "ferns and thick moss crowd the glass at three depths."
            ),
            "bath": (
                "The interior of a timber off-grid house in an ancient moss forest at "
                "late dusk, immaculate and lived in, shot from inside the room looking "
                "out along a long veranda through a wide opening, so the frame holds the "
                "warm room on the left and, on the right, a cedar soaking tub steaming "
                "hard on the deck with a bamboo pipe running spring water into it and a "
                "lit lantern beside it. Inside: a deep sofa with clean linen cushions "
                "piled and a fresh quilted throw half-slipping, bookshelves behind it, a "
                "large paper lantern close to the camera, a reading lamp and candles on a "
                "low table, a cup with steam still rising beside an iron teapot, a book "
                "left open face down, a folded towel and a robe on pegs. Beyond, the "
                "forest is deep blue-green and nearly dark, steady rain falling in bright "
                "thin threads and running off the eave, a stream finding its way down "
                "among mossy granite boulders. Ancient cedars, tree ferns and thick moss "
                "at three depths."
            ),
        },
    },
    "hollow-cedar-07": {
        "exterior": {
            "ext-three-quarter": (
                HOUSE_HC + " Seen in three-quarter view from the front left, the full "
                "length of the "
                "veranda running away from the camera and the steaming tub at the near "
                "end."
            ),
            "ext-front-low": (
                HOUSE_HC + " Seen square from the front at ground level and close, the veranda "
                "along the whole frame, stepping stones leading in from the left edge."
            ),
            "ext-water": (
                HOUSE_HC + " Seen from across a shallow stream in the grove, the lit house and its "
                "eave doubled in the still black water, wet stone and moss in the "
                "foreground below the floor line."
            ),
            "ext-end-on": (
                HOUSE_HC + " Seen from the end of the building, the deep eave in strong "
                "perspective "
                "and the house receding into the bamboo, the steaming tub closest to the "
                "camera under the roof."
            ),
        },
        "interior": {
            "corner": (
                "The interior of a long Japanese off-grid house at dusk, lived in and left "
                "ten minutes ago, shot from the corner of the room at sitting height so the "
                "room runs diagonally away from the camera and a second bay of the house is "
                "visible beyond a half-open paper screen. Tatami floor, cedar posts and "
                "beams, screens slid fully open along the whole length onto a deep veranda "
                "under a far-reaching eave. A large paper floor lantern stands close to the "
                "camera on the left, glowing; behind it a low sofa on the tatami with "
                "cushions piled and dented and a quilted throw half-slipping off it; further "
                "back two smaller hanging lanterns, a low lamp at floor level and a cluster "
                "of candles on a black low table, so warm light falls in separate pools at "
                "four different depths. A cup with steam still rising sits beside an iron "
                "teapot with a book left open face down; slippers at the tatami edge, a robe "
                "and a folded towel on pegs, a ceramic jug of cut branches on the floor. "
                "Through the open screens: a dense bamboo grove in heavy rain, cold and blue "
                "against the warmth inside, with rain falling steadily and a cedar tub "
                "steaming at the far end of the veranda. Ferns, thick moss and low shrubs "
                "crowd the building at three depths."
            ),
            # Round two. The owner's shortlist was "corner" and the frontal "gen"; these
            # three push the corner, which is the one that answered "не вистачає чогось",
            # and vary only what he was still weighing: how much of the bath and the
            # second bay the frame admits, and how hard the weather is working.
            "corner-clean": (
                "The interior of a long Japanese off-grid house at dusk, immaculate and "
                "lived in, shot from the corner of the room at sitting height so the room "
                "runs diagonally away from the camera and a second bay of the house is "
                "visible beyond a half-open paper screen. Tatami floor, cedar posts and "
                "beams, screens slid fully open along the whole length onto a deep veranda "
                "under a far-reaching eave. A large paper floor lantern stands close to the "
                "camera on the left, glowing; behind it a deep low sofa on the tatami with "
                "clean linen cushions piled and a fresh quilted throw half-slipping off it; "
                "further back two paper lanterns hang at different heights, a low lamp sits "
                "at floor level and candles burn on a black lacquer table, so warm light "
                "falls in separate pools at four different depths. A cup with steam still "
                "rising sits beside an iron teapot with a book left open face down; "
                "slippers at the tatami edge, a clean folded towel and a robe on pegs, a "
                "ceramic jug of cut branches. Through the open screens: a dense bamboo "
                "grove in heavy rain, cold and blue against the warmth inside, rain falling "
                "steadily, and a cedar soaking tub steaming on the veranda to the right. "
                "Tree ferns, thick moss and low shrubs crowd the building at three depths."
            ),
            # Round three. He chose "corner-clean" and named one fault: the grove outside
            # reads too bright, so the room stops being the warm thing in a cold picture
            # — the brand's whole contrast. The reference he pointed at is the dusk in
            # the edit takes: near-dark blue grove, rain visible as bright threads.
            # These vary only the outside; the room is corner-clean, unchanged.
            "corner-dusk": (
                "The interior of a long Japanese off-grid house at late dusk, immaculate "
                "and lived in, shot from the corner of the room at sitting height so the "
                "room runs diagonally away from the camera and a second bay of the house is "
                "visible beyond a half-open paper screen. Tatami floor, cedar posts and "
                "beams, screens slid fully open along the whole length onto a deep veranda. "
                "The bamboo grove outside is deep blue and nearly dark, the light almost "
                "gone from it, with heavy rain falling in bright thin threads against the "
                "darkness — so the lit room is by far the brightest thing in the picture "
                "and the warm interior reads against a cold blue exterior. A large paper "
                "floor lantern stands close to the camera on the left, glowing; behind it a "
                "deep low sofa with clean linen cushions piled and a fresh quilted throw "
                "half-slipping; further back two paper lanterns hang at different heights, "
                "a low lamp at floor level and candles on a black lacquer table, so warm "
                "light falls in separate pools at four depths. A cup with steam still "
                "rising beside an iron teapot and a book left open face down; slippers at "
                "the tatami edge, a clean folded towel and a robe on pegs, a ceramic jug of "
                "cut branches. A cedar tub steams on the veranda to the right. Tree ferns, "
                "thick moss and low shrubs crowd the building at three depths."
            ),
            "corner-rain": (
                "The interior of a long Japanese off-grid house at late dusk in a downpour, "
                "immaculate and lived in, shot from the corner of the room at sitting height "
                "so the room runs diagonally away and a second bay is visible beyond a "
                "half-open paper screen. Tatami floor, cedar posts and beams, screens slid "
                "fully open onto a deep veranda. The rain is the weather of the picture: it "
                "streams off the far-reaching eave in a bright curtain, falls in thin lit "
                "threads against a bamboo grove that is deep blue and nearly dark, and the "
                "wet veranda boards throw back the lantern light in long reflections. The "
                "lit room is by far the brightest thing in the frame. A large paper floor "
                "lantern close to the camera on the left; a deep low sofa with clean linen "
                "cushions piled and a fresh quilted throw half-slipping; two hanging "
                "lanterns at different heights deeper in, a low lamp at floor level, candles "
                "on a black lacquer table, a steaming cup beside an iron teapot, a book left "
                "open face down, slippers at the tatami edge, a robe on a peg. A cedar tub "
                "steams on the veranda. Tree ferns, thick moss and wet bamboo at three "
                "depths."
            ),
            "corner-dusk-tub": (
                "The interior of a long Japanese off-grid house at late dusk, immaculate and "
                "lived in, shot from the corner of the room at sitting height and a step "
                "back, so the frame holds the room running diagonally away to a second bay "
                "beyond a half-open paper screen AND, along the right, the deep veranda with "
                "a cedar soaking tub steaming hard, a bamboo pipe pouring water into it and "
                "a lit stone lantern beside it. The bamboo grove beyond is deep blue and "
                "nearly dark, with heavy rain falling in bright thin threads against it, so "
                "the lit room and the glowing tub are the only warm things in a cold "
                "picture. Tatami floor, cedar posts and beams. A large paper floor lantern "
                "close to the camera on the left; a deep low sofa with clean linen cushions "
                "piled and a fresh quilted throw half-slipping; two hanging lanterns at "
                "different heights, a low lamp at floor level, candles on a black lacquer "
                "table, a steaming cup beside an iron teapot, a book left open face down. "
                "Tree ferns, thick moss and low shrubs at three depths."
            ),
            "corner-wide": (
                "The interior of a long Japanese off-grid house at dusk, immaculate and "
                "lived in, shot from the corner of the room at sitting height and a step "
                "further back, so the frame holds three things at once: the room running "
                "diagonally away to a second bay beyond a half-open paper screen, the deep "
                "veranda along the right, and a cedar soaking tub steaming on it with a "
                "bamboo pipe running water into it and a lit stone lantern beside it. "
                "Tatami floor, cedar posts and beams, paper screens slid fully open. A "
                "large paper floor lantern close to the camera on the left; a deep low sofa "
                "with clean linen cushions piled and a fresh quilted throw half-slipping; "
                "two hanging lanterns at different heights deeper in, a low lamp at floor "
                "level, candles on a black lacquer table, a steaming cup beside an iron "
                "teapot and a book left open face down. Warm light falls in separate pools "
                "at four depths. Beyond: a dense bamboo grove in heavy rain, cold and blue "
                "against the warmth inside. Tree ferns, thick moss and low shrubs at three "
                "depths."
            ),
            "corner-night": (
                "The interior of a long Japanese off-grid house after dark, immaculate and "
                "lived in, shot from the corner of the room at sitting height so the room "
                "runs diagonally away to a second bay beyond a half-open paper screen. The "
                "grove outside is nearly black and the rain is heavy, falling in bright "
                "threads past the far-reaching eave and streaming off it, so the room is a "
                "lantern in the dark. Tatami floor, cedar posts and beams, screens slid "
                "fully open onto a deep veranda. Six small warm sources at different "
                "heights and depths: a large paper floor lantern close to the camera, two "
                "hanging lanterns, a low lamp at floor level, a cluster of candles on a "
                "black lacquer table, and a lit stone lantern out on the veranda beside a "
                "cedar tub steaming hard into the cold air. A deep low sofa with clean "
                "linen cushions piled and a fresh quilted throw half-slipping, a steaming "
                "cup beside an iron teapot, a book left open face down, a ceramic jug of "
                "cut branches. Tree ferns, thick moss and wet bamboo crowd the building at "
                "three depths."
            ),
            "veranda": (
                "A long Japanese off-grid house at dusk seen from its own deep veranda, "
                "looking back in through paper screens slid fully open, lived in and left "
                "ten minutes ago. Close to the camera in the foreground, a cedar soaking tub "
                "steams heavily, water moving where a bamboo pipe runs into it, a folded "
                "towel and a lit stone lantern on the boards beside it. Past it the room "
                "glows: a large paper floor lantern, two smaller hanging lanterns deeper in, "
                "a low lamp at floor level, a cluster of candles on a black low table, "
                "cushions piled and dented on the tatami with a quilted throw thrown across "
                "them, a teapot and a steaming cup, a book left open face down. Heavy rain "
                "falls past the far-reaching eave in bright threads against the dark grove. "
                "Dense bamboo, tree ferns, thick moss and low shrubs crowd the veranda at "
                "three depths, wet and green."
            ),
            "low": (
                "The interior of a long Japanese off-grid house at dusk, lived in and left "
                "ten minutes ago, camera very low and close behind a black lacquer table so "
                "an iron teapot, a cup with steam still rising and a cluster of lit candles "
                "stand large in the near foreground, slightly out of focus, and the room "
                "recedes past them. Tatami floor, cedar posts and beams, paper screens slid "
                "fully open onto a deep veranda. Beyond the table: a low sofa with cushions "
                "piled and dented, a quilted throw half-slipping, a large paper floor "
                "lantern, two smaller hanging lanterns deeper in and a low lamp at floor "
                "level, so warm light falls in separate pools at four different depths, and "
                "a second bay of the house is visible past a half-open screen. Through the "
                "open screens: a dense bamboo grove in heavy rain, cold and blue against the "
                "warmth inside, with rain falling steadily and a cedar tub steaming at the "
                "end of the veranda. Ferns, thick moss and low shrubs at three depths."
            ),
        },
    },
}


def queue_root(endpoint: str) -> str:
    return "https://queue.fal.run/" + "/".join(endpoint.split("/")[:2])


def upload(path: Path, key: str) -> str:
    req = urllib.request.Request(
        "https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3",
        data=json.dumps({"content_type": "image/jpeg", "file_name": path.name}).encode(),
        headers={"Authorization": f"Key {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60, context=SSL_CTX) as r:
        info = json.load(r)
    put = urllib.request.Request(
        info["upload_url"], data=path.read_bytes(),
        headers={"Content-Type": "image/jpeg"}, method="PUT",
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
    print(f"  request {rid}", flush=True)
    root, headers = queue_root(endpoint), {"Authorization": f"Key {key}"}
    for i in range(180):
        s = urllib.request.Request(f"{root}/requests/{rid}/status", headers=headers)
        with urllib.request.urlopen(s, timeout=60, context=SSL_CTX) as r:
            status = json.load(r).get("status")
        if i % 3 == 0 or status in ("COMPLETED", "ERROR"):
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
    ap.add_argument("--route", choices=("edit", "fresh"), default="edit")
    ap.add_argument("--variant", choices=sorted(EDIT), default="medium")
    ap.add_argument("--shot", default=None, help="fresh only: which composition")
    ap.add_argument("--aspect", default=None,
                    help="fresh: default 3:2. edit: default auto — set 9:16 to reframe")
    ap.add_argument("--weather", default=None,
                    help="portrait reframe: one sentence stating what the air holds")
    ap.add_argument("--foreground", default=None,
                    help="portrait reframe: what the near ground is made of")
    ap.add_argument("--from", dest="src", default=None,
                    help="edit this file instead of public/stays/<slug>/<scene>.jpg")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--max-cost", type=float, default=0.35)
    ap.add_argument("--yes", action="store_true")
    args = ap.parse_args()

    key = os.environ.get("FAL_KEY")
    if not key:
        sys.exit("FAL_KEY is not set — run: export $(grep '^FAL_KEY=' .env)")

    if args.route == "edit":
        endpoint = f"{ENDPOINT}/edit"
        prompt = (FENCE + EDIT[args.variant]) \
            .replace("{weather}", args.weather or "") \
            .replace("{foreground}", args.foreground or "the ground at the camera's feet")
        tag = args.variant
    else:
        shots = FRESH.get(args.slug, {}).get(args.scene)
        if not shots:
            sys.exit(f"no fresh prompt for {args.slug}/{args.scene} — add one to FRESH")
        tag = args.shot if args.shot in shots else sorted(shots)[0]
        prompt = shots[tag] + TAIL
        endpoint = ENDPOINT

    print(f"{args.slug}/{args.scene} · {args.route} · {tag} · 4K  ->  ${COST_4K:.2f}")
    if COST_4K > args.max_cost:
        sys.exit(f"refusing: over --max-cost ${args.max_cost:.2f}")
    if not args.yes and input("spend it? [y/N] ").strip().lower() != "y":
        sys.exit("nothing spent")

    out = LAB / "cosy" / f"{args.slug}-{args.scene}-{args.route}-{tag}"
    out.mkdir(parents=True, exist_ok=True)
    (out / "prompt.txt").write_text(prompt)

    body: dict = {
        "prompt": prompt, "resolution": "4K",
        "output_format": "jpeg", "num_images": 1,
    }
    if args.route == "edit":
        still = Path(args.src) if args.src else (
            REPO / "public" / "stays" / args.slug / f"{args.scene}.jpg")
        if not still.exists():
            sys.exit(f"missing {still}")
        print("  uploading...", flush=True)
        body["image_urls"] = [upload(still, key)]
        body["aspect_ratio"] = args.aspect or "auto"
    else:
        body["aspect_ratio"] = args.aspect or "3:2"
    if args.seed is not None:
        body["seed"] = args.seed
    (out / "request.json").write_text(json.dumps(body, indent=2))

    result = run(endpoint, body, key)
    (out / "result.json").write_text(json.dumps(result, indent=2))
    imgs = result.get("images") or []
    if not imgs or not imgs[0].get("url"):
        sys.exit(f"no image in the result: {json.dumps(result)[:800]}")
    dest = out / "out.jpg"
    with urllib.request.urlopen(imgs[0]["url"], timeout=600, context=SSL_CTX) as r:
        dest.write_bytes(r.read())
    print(f"  -> {dest.relative_to(REPO)}  ({dest.stat().st_size / 1024:.0f} KB)"
          f"   spent ${COST_4K:.2f}")


# Labels are keyed BY HOUSE. They used to be one flat list matched on the take's
# suffix, and the moment two houses both had a "fresh-bath" the first label won for
# both — the same photograph appeared twice in one list under two names. He judges by
# calling out numbers, so a list that lies about which picture is which is worse than
# no list. Order inside a house is explicit and append-only for the same reason.
ORDER: dict[str, list[tuple[str, str]]] = {
    "hollow-cedar-07": [
        ("edit-medium",   "редагування помірно"),
        ("edit-strong",   "редагування сильно"),
        ("fresh-corner",  "нова генерація — камера з кута"),
        ("fresh-gen",     "нова генерація — в лоб"),
        ("fresh-low",     "нова генерація — низько, чайник біля об'єктива"),
        ("fresh-veranda", "нова генерація — з веранди, купіль спереду"),
        ("fresh-corner-clean", "з кута, чисто"),
        ("fresh-corner-wide",  "з кута, ширше — купіль у кадрі"),
        ("fresh-corner-night", "з кута, глупа ніч, злива"),
        ("fresh-corner-dusk",     "восьмий, темно за прорізом"),
        ("fresh-corner-rain",     "восьмий, темно + злива з даху"),
        ("fresh-corner-dusk-tub", "восьмий, темно + купіль у кадрі"),
        ("edit-dark",  "ВОСЬМИЙ, та сама кімната — темніше за прорізом"),
        ("edit-storm", "ВОСЬМИЙ, та сама кімната — злива з даху"),
        ("fresh-ext-three-quarter", "три чверті — вся веранда, купіль ближче"),
        ("fresh-ext-front-low",     "спереду, низько — купіль ліворуч"),
        ("fresh-ext-water",         "через струмок — будинок у відображенні"),
        ("fresh-ext-end-on",        "з торця — глибокий піддашок, будинок іде в бамбук"),
    ],
    "moss-verse-01": [
        ("fresh-library", "БІБЛІОТЕКА — стелажі й лежанка біля скла"),
        ("fresh-hearth",  "ПІЧ — вогонь зліва, диван, купіль за склом"),
        ("fresh-bath",    "КУПІЛЬ — веранда з чаном і струмок одразу за ним"),
        ("fresh-ext-posts",  "ПАЛІ — три чверті, вся веранда, чан ліворуч"),
        ("fresh-ext-stream", "СТРУМОК — з того берега, вікна у воді"),
        ("fresh-ext-cedars", "КЕДРИ — будинок у просвіті між двома стовбурами"),
        ("fresh-ext-cedars-dark", "КЕДРИ — крона закрита, небо не світиться"),
    ],
    "blackwater-11": [
        ("fresh-mezzanine", "МЕЗОНІН — двосвітна зала, ліжко нагорі, піч"),
        ("fresh-table",     "СТІЛ — накрито на чотирьох, кухня, піч праворуч"),
        ("fresh-sauna",     "САУНА — пара з дверей у мороз, свічки на снігу"),
        ("fresh-hall",      "ЗАЛА — мезонін + стіл + піч в одному кадрі"),
        ("fresh-ext-slope",    "СХИЛ — консоль над схилом, сауна парує праворуч"),
        ("fresh-ext-clearing", "ГАЛЯВИНА — увесь дім, лижі в снігу, слід лижні"),
        ("fresh-ext-deck",     "ТЕРАСА — зблизька вздовж настилу, сауна велика"),
        ("fresh-ext-clearing-dark", "ГАЛЯВИНА — небо темніше"),
    ],
    "driftline-10": [
        ("fresh-long",  "ДОВГА — кімната засклена наскрізь, піч посередині, човен за склом"),
        ("fresh-stove", "ПІЧ — скло сходить до настилу, фіорд на рівні дощок"),
        ("fresh-pool",  "БАСЕЙН — врізаний у дошки, парує; сауна світиться в кінці"),
        ("fresh-ext-plan",    "ПЛАН — уся платформа: кімната, басейн, сауна, місток, човен"),
        ("fresh-ext-walkway", "МІСТОК — уздовж критого переходу до входу"),
        ("fresh-ext-fjord",   "ФІОРД — здалеку, платформа під піками, все у дзеркалі"),
        ("fresh-ext-plan-big", "ПЛАН, АЛЕ ДІМ БІЛЬШИЙ — довга вітальня + об'єм зі спальнями"),
    ],
    "kaldbak-09": [
        ("fresh-seat",  "НІША — віконна лежанка в товстій стіні, промінь крізь туман"),
        ("fresh-gable", "ЩИПЕЦЬ — висока зала під чорними балками, вікно на сунд"),
        ("fresh-porch", "СІНИ — дощовики, чоботи, а за дверима чан парує в тумані"),
        ("fresh-ext-turf",  "ДЕРЕН — дах зливається зі схилом (є чужа садиба вдалині)"),
        ("fresh-ext-sound", "СУНД — чорний щипець (чан вийшов пластиковий)"),
        ("fresh-ext-cliff", "СКЕЛЯ — дім на зеленому краю, чан у земляному валу"),
    ],
    "rimefall-02": [
        ("fresh-span",  "ПРОЛІТ — вікно на всю стіну, піч, лижі біля дверей"),
        ("fresh-floor", "ПІДЛОГА — знизу: овчини й подушки просто на теплому камені"),
        ("fresh-bank",  "У СХИЛІ — спальня, вікно на рівні снігу, замети в очі"),
        ("fresh-ext-lee",     "ЗАВІТРЯ — проліт виноситься над терасою, лижі, сауна"),
        ("fresh-ext-drift",   "ЗАМЕТ — дах сходить у сніг, вікна спалень на рівні снігу"),
        ("fresh-ext-plateau", "ПЛАТО — здалеку, дім темною крапкою в білій пустці"),
    ],
    "quiet-fern-06": [
        ("fresh-ridge",   "ХРЕБЕТ — скляний гребінь над головою на всю довжину"),
        ("fresh-bed",     "ЛІЖКО — спальня під склом, свічки вздовж вікна"),
        ("fresh-horizon", "ОБРІЙ — накритий стіл, кухня, рівнина до гір"),
        ("fresh-ext-plinth", "ПЛИТА — три чверті, два крила на одному цоколі"),
        ("fresh-ext-moor",   "РІВНИНА — здалеку, дім маленький у пустці"),
        ("fresh-ext-spine",  "ГРЕБІНЬ — уздовж, скляний хребет світиться вглиб"),
    ],
    "sparv-04": [
        ("fresh-top",     "ВЕРХ — засклений верхній поверх, сяйво над замерзлим озером"),
        ("fresh-boulder", "ВАЛУН — граніт заходить у кімнату, піч, сходи нагору"),
        ("fresh-bunks",   "КОЙКИ — вбудовані ліжка з шторками й бра, зорі у вікні"),
        ("fresh-ext-tower",   "ВЕЖА — зблизька, три світлі поверхи один над одним"),
        ("fresh-ext-tarn",    "ОЗЕРО — з криги, світло тягнеться смугою по льоду"),
        ("fresh-ext-granite", "ВАЛУНИ — вежа в просвіті між двома брилами"),
    ],
    "whitehour-08": [
        ("fresh-curve", "ДУГА — бетонна стіна вигином, піч, пара з землі"),
        ("fresh-pool",  "БАСЕЙН — молочна вода парує просто за склом"),
        ("fresh-wall",  "СТІНА — лежанка на всю довжину теплої стіни, книжки"),
        ("fresh-ext-arc",   "ДУГА — вся крива видно, басейн парує в кадрі"),
        ("fresh-ext-pool",  "БАСЕЙН — з каменю біля води, пара впоперек кадру"),
        ("fresh-ext-ridge", "ХРЕБЕТ — з того схилу, стовпи пари між нами й домом"),
    ],
    "hollowmoss-04": [
        ("fresh-reading", "ЧИТАЛЬНЯ — стелажі, піч, лежанка над чорною водою"),
        ("fresh-water",   "ВОДА — скло до самої води, промені крізь ялини"),
        ("fresh-morning", "СНІДАНОК — стіл біля скла, кухня, мідні підвіси"),
        ("fresh-ext-water",    "ВОДА — з того берега, весь дім у відображенні"),
        ("fresh-ext-clearing", "ГАЛЯВИНА — промені й стовп диму крізь ялини"),
        ("fresh-ext-link",     "ПЕРЕХІД — засклений перехід світиться, сауна ліворуч"),
    ],
    "meridian-05": [
        ("fresh-stripes", "СМУГИ — вітальня в тіні, світло смугами з двору"),
        ("fresh-court",   "ДВІР — стіл під рейками, канал з водою, басейн"),
        ("fresh-bedroom", "СПАЛЬНЯ — віконниця напіввідсунута, клин сонця"),
        ("fresh-ext-escarpment", "СКЕЛЯ — в лоб, прохід у двір, канал і басейн до камери"),
        ("fresh-ext-stair",      "СХОДИ — три чверті, сходи на дах із телескопом"),
        ("fresh-ext-plain",      "РІВНИНА — згори, весь двір видно планом"),
    ],
    "tidebreak-03": [
        ("fresh-storm",  "ШТОРМ — піч, скло на все море, хвилі б'ють у скелю"),
        ("fresh-coffee", "КАВА — накритий стіл, кухня, вибух хвилі за вікном"),
        ("fresh-bath",   "КУПІЛЬ — кам'яна ванна над океаном, кімната крізь скло"),
        ("fresh-ext-terraces", "ТЕРАСИ — три рівні сходять скелею, купіль унизу парує"),
        ("fresh-ext-sea",      "МОРЕ — знизу зі скелі, хвиля вибухає під будинком"),
        ("fresh-ext-headland", "МИС — довгий скляний низ, дві коробки згори"),
    ],
}


def manifest() -> None:
    """Rebuild /lab/cosy.html's list for one house.

        python3 public/lab/cosy.py <slug> --scene interior manifest
    """
    slug = sys.argv[1]
    scene = "interior"
    if "--scene" in sys.argv:
        scene = sys.argv[sys.argv.index("--scene") + 1]

    takes = [{
        "label": "оригінал — те, що на сайті зараз",
        "src": f"/stays/{slug}/{scene}.jpg",
    }]
    prefix = f"{slug}-{scene}-"
    seen: set[str] = set()
    for suffix, label in ORDER.get(slug, []):
        d = LAB / "cosy" / f"{prefix}{suffix}"
        if d.name in seen or not (d / "out.jpg").exists():
            continue
        seen.add(d.name)
        takes.append({"label": label, "src": f"/lab/cosy/{d.name}/out.jpg"})
    for d in sorted((LAB / "cosy").glob(f"{prefix}*")):      # anything not yet named
        if d.name in seen or not (d / "out.jpg").exists():
            continue
        seen.add(d.name)
        takes.append({"label": d.name[len(prefix):], "src": f"/lab/cosy/{d.name}/out.jpg"})

    out = LAB / "cosy.json"
    out.write_text(json.dumps({"slug": slug, "scene": scene, "takes": takes}, indent=1,
                              ensure_ascii=False))
    print(f"{out.relative_to(REPO)}  ({len(takes)} takes)")
    for i, t in enumerate(takes, 1):
        print(f"  {i:2d}  {t['label']}")


if __name__ == "__main__":
    if "manifest" in sys.argv:
        manifest()
    else:
        main()
