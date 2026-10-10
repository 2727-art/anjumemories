"""Style check for 6.10 step 5: the new tiles, strips, props and the relit building in a game-like view.

    python tools/blender/openworld/make_step5_preview.py

Needs Python 3.10+ with Pillow and numpy and the rendered assets (build_all.py --set all). Writes to
tools/blender/openworld/preview/:

- step5-mock-night.jpg / step5-mock-neutral.jpg: 3072x1728 game px (2x2 screens) around one crossing,
  shown at the game's display scale (1/1.2) as 2560x1440. NW: plaza with ow-bld-a01 (3/4 view),
  NE: park, SW: parking, SE: vacant lot. Roads alternate ow-asphalt-a / -b by section, with curbs,
  edge lines, lane and crosswalk markings, the ow-grit overlay and the props. Placement follows the
  open-world drawing code in game.js (sidewalk 56 px, curb 6 px, lamps 18 px from the curb with a
  70 px arm, ...); props and buildings are placed by hand because the game does not place them yet.
- The night version uses the light map formula of the game (WORLD_DESIGN.md 7): an sRGB multiply by
  the ambient 0x9ca5be plus lamp pools (1 - d^2)^2 x 0.9, additive lamp glows, emissive layers with a
  little bloom. Roofs get the ambient only, facades get the lamp light fading upwards (an assumption
  for 1b). There is no vignette because the view is larger than one screen.
- Puddles: the night version also tries the open-water masks (<key>_water.png): lamp light is added
  on the water only, as a soft reflection around each lit lamp (REFLECTION), the way the game could use
  them. This is a proposal for the game side, not something the game does yet.
- step5-assets.jpg: every new tile (2x2), strip, marking and prop (puddles with their water masks), and
  the building's south facade before and after the fill light (pass --before <old south.png>; default:
  the pilot render in git).
"""

import argparse
import json
import os
import subprocess
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

import make_pilot_mock as mock  # noqa: E402

HERE = mock.HERE
REPO_ROOT = mock.REPO_ROOT
ASSET_ROOT = mock.ASSET_ROOT
PREVIEW = mock.PREVIEW

VIEW_W, VIEW_H = 3072, 1728
SCALE = 1 / 1.2
FAR = 99999
ARTERIAL = {"start": 1200, "end": 1880, "arterial": True}  # N-S, 680 px
SIDE_ROAD = {"start": 700, "end": 1120, "arterial": False}  # E-W, 420 px
SIDEWALK, CURB = 56, 6
CURB_ROAD_PX = 10  # the strip's gutter part lies on the road, the 6 px curb top on the block
GRIT_ALPHA = 0.55  # OPEN_WORLD_CONFIG.noiseOverlayAlpha
EDGE_ALPHA = 0.7
AMBIENT = mock.hex_rgb(0x9CA5BE)  # OPEN_WORLD_LIGHT_CONFIG.ambient (sRGB multiply)
WARM, COOL = mock.hex_rgb(0xFF9447), mock.hex_rgb(0x9EC4FF)
POOL_ALPHA, GLOW_RADIUS, GLOW_ALPHA = 0.9, 70, 0.3
REFLECTION = {"radius": 220, "strength": 0.4, "falloff": 3.0}  # lamp light mirrored on open water (proposal)
BUILDING_POS = (300, 636)  # footprint left, south edge (8 px inside the plaza's sidewalk)
PLAYER_POS = (1520, 900)


def manifest():
    with open(os.path.join(PREVIEW, "build-manifest.json"), encoding="utf-8") as handle:
        return {a["key"]: a for a in json.load(handle)["assets"]}


def load(assets, key):
    return mock.load_rgba(os.path.join(ASSET_ROOT, assets[key]["file"]))


def rotate(img, quarter_turns):
    return np.rot90(img, k=quarter_turns).copy()


# ---------------------------------------------------------------------------
# Ground


def block_rects():
    return {
        "plaza": (-FAR, -FAR, ARTERIAL["start"], SIDE_ROAD["start"]),
        "park": (ARTERIAL["end"], -FAR, FAR, SIDE_ROAD["start"]),
        "parking": (-FAR, SIDE_ROAD["end"], ARTERIAL["start"], FAR),
        "lot": (ARTERIAL["end"], SIDE_ROAD["end"], FAR, FAR),
    }


def draw_block(canvas, kind, rect, tex):
    left, top, right, bottom = rect
    canvas.pattern((left + CURB, top + CURB, right - CURB, bottom - CURB), tex["ow-sidewalk"])
    inner = (left + SIDEWALK, top + SIDEWALK, right - SIDEWALK, bottom - SIDEWALK)
    if kind == "parking":
        # The stall pattern starts 40 px inside the block, like the runtime ow-stalls.
        canvas.pattern(inner, tex["ow-parking"], origin=(0, inner[1] + 40))
    else:
        canvas.pattern(inner, tex[f"ow-{kind}"], origin=(inner[0] if inner[0] > -FAR / 2 else 0, inner[1] if inner[1] > -FAR / 2 else 0))
    # Curb strips on the road edges of the block: road side towards the road.
    curb_h, curb_v = tex["ow-curb-h"], tex["ow-curb-v"]
    if top > -FAR / 2:  # road to the north
        canvas.pattern((left, top - CURB_ROAD_PX, right, top + CURB), curb_h, origin=(0, top - CURB_ROAD_PX))
    if bottom < FAR / 2:  # road to the south: flipped
        canvas.pattern((left, bottom - CURB, right, bottom + CURB_ROAD_PX), curb_h[::-1], origin=(0, bottom - CURB))
    if left > -FAR / 2:  # road to the west
        canvas.pattern((left - CURB_ROAD_PX, top, left + CURB, bottom), curb_v, origin=(left - CURB_ROAD_PX, 0))
    if right < FAR / 2:  # road to the east: flipped
        canvas.pattern((right - CURB, top, right + CURB_ROAD_PX, bottom), curb_v[:, ::-1], origin=(right - CURB, 0))


def draw_markings(canvas, road, vertical, cross_roads, tex):
    """addOpenWorldRoadMarkings, with the new edge-line strips instead of flat rectangles."""
    width = road["end"] - road["start"]
    center = (road["start"] + road["end"]) / 2
    edge, lane, white = mock.hex_rgb(mock.COLORS["edgeLine"]), mock.hex_rgb(mock.COLORS["laneDash"]), mock.hex_rgb(mock.COLORS["crosswalk"])
    for i in range(len(cross_roads) - 1):
        seg_start, seg_end = cross_roads[i]["end"], cross_roads[i + 1]["start"]
        mark_start = seg_start + mock.CROSS_GAP + mock.CROSS_DEPTH + 36
        mark_end = seg_end - mock.CROSS_GAP - mock.CROSS_DEPTH - 36
        if mark_end > mark_start:
            key = "ow-edgeline-v" if vertical else "ow-edgeline-h"
            for line_start in (road["start"] + mock.EDGE_INSET - 1, road["end"] - mock.EDGE_INSET - mock.EDGE_WIDTH - 1):
                rect = mock.along_rect(vertical, mark_start, mark_end, line_start, line_start + 8)
                canvas.pattern(rect, tex[key], (line_start, 0) if vertical else (0, line_start), tint=edge, alpha=EDGE_ALPHA)
            lanes = [center - width * 0.25, center + width * 0.25] if road["arterial"] else [center]
            key = "ow-dash-v" if vertical else "ow-dash-h"
            for lc in lanes:
                rect = mock.along_rect(vertical, mark_start, mark_end, lc - 8, lc + 8)
                canvas.pattern(rect, tex[key], (lc - 8, 0) if vertical else (0, lc - 8), tint=edge if road["arterial"] else lane, alpha=0.75)
            if road["arterial"]:
                for a, b in ((center - 12, center - 4), (center + 4, center + 12)):
                    canvas.fill(mock.along_rect(vertical, mark_start, mark_end, a, b), lane, 0.8)
        if seg_end - seg_start >= mock.CROSS_DEPTH * 2 + mock.CROSS_GAP * 2:
            key = "ow-zebra-v" if vertical else "ow-zebra-h"
            for frm in (seg_start + mock.CROSS_GAP, seg_end - mock.CROSS_GAP - mock.CROSS_DEPTH):
                rect = mock.along_rect(vertical, frm, frm + mock.CROSS_DEPTH, road["start"] + mock.EDGE_INSET, road["end"] - mock.EDGE_INSET)
                origin = (road["start"] + mock.EDGE_INSET, frm) if vertical else (frm, road["start"] + mock.EDGE_INSET)
                canvas.pattern(rect, tex[key], origin, tint=white, alpha=0.62)


def compose_ground(tex):
    canvas = mock.Canvas(VIEW_W, VIEW_H)
    canvas.pattern((0, 0, VIEW_W, VIEW_H), tex["ow-asphalt-a"])
    # Road sections alternate between the two asphalt tiles.
    canvas.pattern((ARTERIAL["start"], SIDE_ROAD["end"], ARTERIAL["end"], VIEW_H), tex["ow-asphalt-b"])
    canvas.pattern((0, SIDE_ROAD["start"], ARTERIAL["start"], SIDE_ROAD["end"]), tex["ow-asphalt-b"])
    for kind, rect in block_rects().items():
        draw_block(canvas, kind, rect, tex)
    north = {"start": -FAR - 420, "end": -FAR, "arterial": False}
    south = {"start": FAR, "end": FAR + 420, "arterial": False}
    west = {"start": -FAR - 680, "end": -FAR, "arterial": True}
    east = {"start": FAR, "end": FAR + 680, "arterial": True}
    draw_markings(canvas, ARTERIAL, True, [north, SIDE_ROAD, south], tex)
    draw_markings(canvas, SIDE_ROAD, False, [west, ARTERIAL, east], tex)
    canvas.pattern((0, 0, VIEW_W, VIEW_H), tex["ow-grit"], alpha=GRIT_ALPHA)
    return canvas


# ---------------------------------------------------------------------------
# Props, lamps, building


DECALS = [  # (key, x, y): flat props on the ground
    ("ow-prop-manhole", 1330, 330), ("ow-prop-manhole", 1720, 1480), ("ow-prop-manhole", 640, 990),
    ("ow-prop-drain", 1222, 420), ("ow-prop-drain", 1858, 1380),
    ("ow-prop-puddle-b", 520, 950), ("ow-prop-puddle-a", 1640, 1240), ("ow-prop-puddle-c", 2520, 1610),
    ("ow-prop-crack-a", 1560, 210), ("ow-prop-crack-b", 2230, 900), ("ow-prop-crack-c", 2760, 905),
]
STANDING = [  # (key, x, y): props with height, drawn after the building, north to south
    ("ow-prop-tree-c", 2330, 330), ("ow-prop-tree-a", 2130, 140), ("ow-prop-tree-b", 2560, 420),
    ("ow-prop-tree-a", 2880, 230), ("ow-prop-tree-b", 2760, 590),
    ("ow-prop-debris-b", 960, 668), ("ow-prop-trash", 1950, 1200),
    ("ow-prop-barricade-h", 2760, 742), ("ow-prop-barricade-h", 2760, 1078), ("ow-prop-barricade-v", 2520, 905), ("ow-prop-barricade-v", 3000, 905),
    ("ow-prop-car-c-h", 880, 860),
    ("ow-prop-car-a-v", 302, 1311), ("ow-prop-car-b-v", 662, 1601), ("ow-prop-car-a-v", 902, 1601),
    ("ow-prop-debris-a", 2160, 1320), ("ow-prop-debris-c", 2860, 1300), ("ow-prop-debris-d", 2440, 1440),
]
LAMPS = [  # (luminaire x, y, side the pole is on, colour, lit): 18 px from the curb, 70 px arm over the road
    (1252, 120, "w", WARM, True), (1252, 1560, "w", WARM, True), (1828, 600, "e", COOL, True), (1828, 1660, "e", WARM, False),
    (420, 752, "n", WARM, True), (2260, 752, "n", WARM, True), (980, 1068, "s", WARM, True), (2700, 1068, "s", COOL, True),
]
LAMP_RADIUS = 320


def place(canvas_rgb_obj, img, x, y):
    canvas_rgb_obj.image(int(round(x - img.shape[1] / 2)), int(round(y - img.shape[0] / 2)), img)


def lamp_sprite(lamp_img, side):
    # The sprite's arm points west (towards a pole on the west side).
    return {"w": lamp_img, "e": lamp_img[:, ::-1], "n": rotate(lamp_img, -1), "s": rotate(lamp_img, 1)}[side]


def light_map(lamps):
    ys, xs = np.mgrid[0:VIEW_H, 0:VIEW_W].astype(np.float32)
    light = np.ones((VIEW_H, VIEW_W, 3), dtype=np.float32) * AMBIENT
    glow = np.zeros((VIEW_H, VIEW_W, 3), dtype=np.float32)
    for x, y, _, color, lit in lamps:
        if not lit:
            continue
        d2 = ((xs - x) ** 2 + (ys - y) ** 2) / LAMP_RADIUS ** 2
        light += (np.clip(1.0 - d2, 0, 1) ** 2)[..., None] * color * POOL_ALPHA
        dg = np.sqrt((xs - x) ** 2 + (ys - y) ** 2) / GLOW_RADIUS
        glow += (np.clip(1.0 - dg, 0, 1) ** 2.2)[..., None] * color * GLOW_ALPHA
    return np.clip(light, 0.0, 1.0), glow


def water_layer(tex):
    """Open-water coverage of all placed puddles, in view pixels."""
    layer = mock.Canvas(VIEW_W, VIEW_H)
    for key, x, y in DECALS:
        mask = tex.get(key + "_water")
        if mask is not None:
            white = mask.copy()
            place(layer, white, x, y)
    return layer.rgb[..., 0]


def reflections(water, lamps):
    ys, xs = np.mgrid[0:VIEW_H, 0:VIEW_W].astype(np.float32)
    out = np.zeros((VIEW_H, VIEW_W, 3), dtype=np.float32)
    for x, y, _, color, lit in lamps:
        if lit:
            d2 = ((xs - x) ** 2 + (ys - y) ** 2) / REFLECTION["radius"] ** 2
            out += (np.clip(1.0 - d2, 0, 1) ** REFLECTION["falloff"])[..., None] * color * REFLECTION["strength"]
    return out * water[..., None]


def render(assets, tex, night, player=True):
    canvas = compose_ground(tex)
    for key, x, y in DECALS:
        place(canvas, tex[key], x, y)
    water = water_layer(tex)
    emit_lin = np.zeros((VIEW_H, VIEW_W, 3), dtype=np.float32)
    light, glow = light_map(LAMPS)
    lamp_only = light - AMBIENT
    # Building in 3/4 view: roof shifted up by the facade height.
    bld = assets["ow-bld-a01"]
    roof, south = (mock.load_rgba(os.path.join(ASSET_ROOT, bld[k])) for k in ("roof", "south"))
    roof_emit, south_emit = (mock.load_rgba(os.path.join(ASSET_ROOT, bld[k])) for k in ("roofEmit", "southEmit"))
    left, south_y = BUILDING_POS
    for index, (base, emit, top) in enumerate(((roof, roof_emit, south_y - south.shape[0] - roof.shape[0]), (south, south_emit, south_y - south.shape[0]))):
        canvas.image(left, top, base)
        h, w = base.shape[:2]
        t, b = max(0, top), min(VIEW_H, top + h)
        if b <= t:
            continue
        e = emit[t - top:b - top, :w]
        emit_lin[t:b, left:left + w] += mock.srgb_to_linear(e[..., :3]) * e[..., 3:4]
        if index == 0:
            light[t:b, left:left + w] = AMBIENT
        else:
            fade = (((np.arange(t, b) - top) / h) ** 2)[:, None, None]
            light[t:b, left:left + w] = np.clip(AMBIENT + lamp_only[t:b, left:left + w] * fade, 0, 1)
    for key, x, y in sorted(STANDING, key=lambda item: item[2]):
        place(canvas, tex[key], x, y)
    for x, y, side, _, _ in LAMPS:
        place(canvas, lamp_sprite(tex["ow-prop-lamp"], side), x, y)
    if night:
        out = canvas.rgb * light
        lin = mock.srgb_to_linear(out)
        glow_lin = emit_lin * mock.EMIT_GAIN
        lin = lin + glow_lin + mock.blur(glow_lin, 3) * 0.55 + mock.blur(glow_lin, 12) * 0.45 + mock.blur(glow_lin, 36) * 0.35
        lin = lin / (1.0 + lin * 0.18)
        canvas.rgb = np.clip(mock.linear_to_srgb(lin) + glow + reflections(water, LAMPS), 0, 1).astype(np.float32)
    if player:
        sprite, _ = mock.player_layer()
        mock.draw_shadow(canvas.rgb, (PLAYER_POS[0], PLAYER_POS[1] + 40), 46, 16, 0.55)
        canvas.image(PLAYER_POS[0] - sprite.shape[1] // 2, PLAYER_POS[1] - 26 - sprite.shape[0] // 2, sprite)
    image = Image.fromarray((np.clip(canvas.rgb, 0, 1) * 255 + 0.5).astype(np.uint8))
    return image.resize((round(VIEW_W * SCALE), round(VIEW_H * SCALE)), Image.LANCZOS)


# ---------------------------------------------------------------------------
# Asset sheet


def luma(img):
    a = np.asarray(img.convert("RGB")).astype(np.float32) / 255.0
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def asset_sheet(assets, before_path):
    big, small = mock.font(22), mock.font(16)
    width = 2400
    sheet = Image.new("RGB", (width, 2700), (14, 16, 20))
    draw = ImageDraw.Draw(sheet)
    asphalt = Image.open(os.path.join(ASSET_ROOT, assets["ow-asphalt-a"]["file"])).convert("RGBA")
    y = 16
    draw.text((16, y), "地面タイル（2x2 に並べて 1/2 表示。継ぎ目なしの確認）", font=big, fill=(230, 235, 240))
    y += 40
    for i, key in enumerate(("ow-asphalt-b", "ow-park", "ow-plaza", "ow-parking", "ow-lot")):
        tile = Image.open(os.path.join(ASSET_ROOT, assets[key]["file"])).convert("RGB")
        w, h = tile.size
        two = Image.new("RGB", (w * 2, h * 2))
        for a in range(2):
            for b in range(2):
                two.paste(tile, (a * w, b * h))
        two = two.resize((452, 452), Image.LANCZOS)
        x = 16 + i * 476
        sheet.paste(two, (x, y + 26))
        draw.text((x, y), f"{key}  {w}x{h}  luma {luma(tile).mean():.3f}", font=small, fill=(200, 205, 210))
    y += 26 + 452 + 24
    draw.text((16, y), "縁石・路肩線（4 倍）と ow-grit（灰色の上、等倍）", font=big, fill=(230, 235, 240))
    y += 40
    strip = Image.open(os.path.join(ASSET_ROOT, assets["ow-curb-h"]["file"])).convert("RGB").crop((0, 0, 400, 16)).resize((1600, 64), Image.NEAREST)
    sheet.paste(strip, (16, y + 22))
    draw.text((16, y), "ow-curb-h（上が道路側: 10 px の側溝 + 6 px の縁石）", font=small, fill=(200, 205, 210))
    edge = Image.open(os.path.join(ASSET_ROOT, assets["ow-edgeline-h"]["file"])).convert("RGBA")
    bg = asphalt.crop((0, 0, 400, 8)).copy()
    bg.alpha_composite(edge.crop((0, 0, 400, 8)))
    sheet.paste(bg.convert("RGB").resize((1600, 32), Image.NEAREST), (16, y + 120))
    draw.text((16, y + 96), "ow-edgeline-h（アスファルトの上）", font=small, fill=(200, 205, 210))
    grit = Image.open(os.path.join(ASSET_ROOT, assets["ow-grit"]["file"])).convert("RGBA")
    gray = Image.new("RGBA", grit.size, (118, 120, 124, 255))
    gray.alpha_composite(grit)
    sheet.paste(gray.convert("RGB").resize((300, 300), Image.LANCZOS), (1700, y))
    draw.text((1700, y + 304), "ow-grit 512x512（1/1.7 表示）", font=small, fill=(200, 205, 210))
    y += 340
    draw.text((16, y), "建物 ow-bld-a01 の南面（左: 描き直す前 / 右: 南からの補助光を足した後）", font=big, fill=(230, 235, 240))
    y += 40
    after = Image.open(os.path.join(ASSET_ROOT, assets["ow-bld-a01"]["south"])).convert("RGB")
    before = Image.open(before_path).convert("RGB") if before_path and os.path.exists(before_path) else None
    for i, (label, img) in enumerate((("前", before), ("後", after))):
        if img is None:
            continue
        x = 16 + i * 800
        sheet.paste(img, (x, y + 26))
        lum = luma(img)
        draw.text((x, y), f"{label}: 南面 {lum.mean():.3f} / 店舗帯（下 64 px）{lum[-64:].mean():.3f}", font=small, fill=(200, 205, 210))
    roof = Image.open(os.path.join(ASSET_ROOT, assets["ow-bld-a01"]["roof"])).convert("RGB")
    sheet.paste(roof.resize((288, 384), Image.LANCZOS), (1640, y + 26))
    draw.text((1640, y), f"屋上 {luma(roof).mean():.3f}（1/2.7 表示）", font=small, fill=(200, 205, 210))
    y += 26 + 384 + 24
    draw.text((16, y), "小物（アスファルトの上、等倍。96 px 以下は 2 倍で表示）", font=big, fill=(230, 235, 240))
    y += 40
    props = [k for k in assets if assets[k]["type"] == "prop"]
    props += [k + "_water" for k in props if assets[k].get("water")]
    cell = 300
    cols = width // cell
    for i, key in enumerate(props):
        if key.endswith("_water"):  # the puddle with its open-water mask in cyan
            img = Image.open(os.path.join(ASSET_ROOT, assets[key[:-6]]["file"])).convert("RGBA")
            mask = np.asarray(Image.open(os.path.join(ASSET_ROOT, assets[key[:-6]]["water"])).getchannel("A")).astype(np.float32) / 255.0
            cyan = np.zeros(mask.shape + (4,), dtype=np.uint8)
            cyan[..., 1], cyan[..., 2], cyan[..., 3] = 230, 255, (mask * 150).astype(np.uint8)
            img.alpha_composite(Image.fromarray(cyan))
        else:
            img = Image.open(os.path.join(ASSET_ROOT, assets[key]["file"])).convert("RGBA")
        factor = 2 if max(img.size) <= 96 else min(1.0, (cell - 24) / max(img.size))
        shown = img.resize((max(1, round(img.width * factor)), max(1, round(img.height * factor))), Image.LANCZOS)
        bg = asphalt.crop((0, 0, cell - 12, cell - 34)).copy()
        bg.alpha_composite(shown, ((bg.width - shown.width) // 2, (bg.height - shown.height) // 2))
        x, yy = 16 + (i % cols) * cell, y + (i // cols) * cell
        sheet.paste(bg.convert("RGB"), (x, yy + 22))
        tag = f"{key[8:]} {img.width}x{img.height}" + (" x2" if factor == 2 else (f" x{factor:.2f}" if factor < 1 else ""))
        draw.text((x, yy), tag, font=small, fill=(200, 205, 210))
    y += ((len(props) + cols - 1) // cols) * cell + 16
    return sheet.crop((0, 0, width, y))


def git_before(path_in_repo, out_path):
    try:
        data = subprocess.run(["git", "show", f"HEAD:{path_in_repo}"], cwd=REPO_ROOT, capture_output=True, check=True).stdout
    except (OSError, subprocess.CalledProcessError):
        return None
    with open(out_path, "wb") as handle:
        handle.write(data)
    return out_path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--before", default=None, help="south facade before the relight (default: HEAD in git)")
    args = parser.parse_args()
    assets = manifest()
    tex = {key: load(assets, key) for key in assets if assets[key]["type"] in ("tile", "marking", "prop")}
    for key, asset in assets.items():
        if asset.get("water"):
            tex[key + "_water"] = mock.load_rgba(os.path.join(ASSET_ROOT, asset["water"]))
    night = render(assets, tex, night=True)
    neutral = render(assets, tex, night=False)
    for name, image in (("step5-mock-night.jpg", night), ("step5-mock-neutral.jpg", neutral)):
        path = os.path.join(PREVIEW, name)
        image.save(path, quality=90)
        print(f"wrote {os.path.relpath(path, REPO_ROOT)} {image.size} {os.path.getsize(path) / 1024 / 1024:.2f} MB")
    before = args.before
    if before is None:
        import tempfile
        before = git_before("画像/openworld/buildings/ow-bld-a01-south.png", os.path.join(tempfile.gettempdir(), "ow-bld-a01-south-before.png"))
    sheet = asset_sheet(assets, before)
    path = os.path.join(PREVIEW, "step5-assets.jpg")
    sheet.save(path, quality=90)
    print(f"wrote {os.path.relpath(path, REPO_ROOT)} {sheet.size} {os.path.getsize(path) / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
