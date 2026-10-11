"""Style check for the building types (WORLD_DESIGN.md 8 "建物の種類を増やすとき").

    python tools/blender/openworld/make_buildings_preview.py

Needs Python 3.10+ with Pillow and numpy and the rendered assets (build_all.py --set buildings, plus the
ground tiles and props of --set all). Writes to tools/blender/openworld/preview/:

- buildings-roofs.jpg: every building type side by side at one scale (1 game px = 0.5 px). Rows: the
  roof as rendered, the roof at night the way the game draws it (roof ambient 0x98a0b9, roof_emit
  added), the south facade, its south_emit, and the street glow the game derives from south_emit
  (one pool per 96 px column: colour swatch, strength = pool alpha). Lumas are measured on the files.
- buildings-block-night.jpg / buildings-block-neutral.jpg: four blocks along two east-west streets,
  3840 x 3240 game px shown at 1/1.5. Buildings stand on the south sidewalk, west to east, 64 px
  apart, as layoutOpenWorldBlockBuildings places them; the ground around them is plaza or lot paving.
  Night: the light map of game.js (ambient 0x9ca5be, street lamp pools, the neon spill of each
  south_emit, the roof ambient over roofs), shadows, roof_emit and lamp glows added. No vignette (the
  view is larger than one screen).
"""

import json
import os
import sys

sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

import make_pilot_mock as mock  # noqa: E402
import make_step5_preview as step5  # noqa: E402

REPO_ROOT = mock.REPO_ROOT
ASSET_ROOT = mock.ASSET_ROOT
PREVIEW = mock.PREVIEW
BUILDING_KEYS = ["ow-bld-a01", "ow-bld-b01", "ow-bld-c01", "ow-bld-d01", "ow-bld-e01"]

# OPEN_WORLD_LIGHT_CONFIG / OPEN_WORLD_BUILDING_CONFIG in game.js.
AMBIENT = mock.hex_rgb(0x9CA5BE)
ROOF_AMBIENT = mock.hex_rgb(0x98A0B9)
WARM, COOL = mock.hex_rgb(0xFF9447), mock.hex_rgb(0x9EC4FF)
POOL_ALPHA, GLOW_RADIUS, GLOW_ALPHA = 0.9, 70, 0.3
SHADOWS = [(26, 34, 0.34), (54, 72, 0.16)]
GAP = 64
NEON = {"columnWidth": 96, "rows": 8, "minLevel": 0.025, "offsetY": 70, "radiusMin": 130, "radiusMax": 260,
        "levelForMaxRadius": 0.2, "alphaGain": 3.2, "maxAlpha": 0.85, "saturation": 1.8}

VIEW_W, VIEW_H = 3840, 3240
SCALE = 1 / 1.5
SIDEWALK = mock.SIDEWALK
FAR = step5.FAR
# Streets (game px). Two east-west streets with the blocks north of them; two north-south streets.
ROADS_X = [  # north-south
    {"start": 1212, "end": 1632, "arterial": False},
    {"start": 3088, "end": 3768, "arterial": True},
]
ROADS_Y = [  # east-west
    {"start": -300, "end": 120, "arterial": False},
    {"start": 1332, "end": 1752, "arterial": False},
    {"start": 2964, "end": 3384, "arterial": False},
]
# (block rect, ground, [(building key, x of its west wall)]): inner widths 1100 (x 56-1156) and
# 1344 px (x 1688-3032); the blocks to the west run off the view.
BLOCKS = [
    ((-FAR, 120, 1212, 1332), "plaza", [("ow-bld-c01", 62), ("ow-bld-e01", 62 + 512 + GAP)]),
    ((1632, 120, 3088, 1332), "plaza", [("ow-bld-a01", 1688), ("ow-bld-c01", 1688 + 768 + GAP)]),
    ((-FAR, 1752, 1212, 2964), "lot", [("ow-bld-d01", 96)]),
    ((1632, 1752, 3088, 2964), "plaza", [("ow-bld-b01", 1688), ("ow-bld-c01", 1688 + 768 + GAP)]),
    ((3768, 120, FAR, 1332), "plaza", []),
    ((3768, 1752, FAR, 2964), "plaza", []),
    ((-FAR, 3384, 1212, FAR), "plaza", []),
    ((1632, 3384, 3088, FAR), "plaza", []),
    ((3768, 3384, FAR, FAR), "plaza", []),
]
SHADE = {"ow-bld-a01": 0.96, "ow-bld-b01": 0.93, "ow-bld-c01": 0.98, "ow-bld-d01": 0.95, "ow-bld-e01": 0.91}
# Street lamps: luminaire over the road 52 px from the curb (pole 18 px inside the curb, 70 px arm).
LAMPS = [  # x, y, radius, colour, intensity, lit
    (400, 1384, 300, WARM, 1.0, True), (1360, 1384, 320, WARM, 1.1, True), (2320, 1384, 330, COOL, 0.95, True),
    (880, 1700, 310, WARM, 0.9, True), (2800, 1700, 300, WARM, 1.0, False),
    (300, 3016, 320, WARM, 1.05, True), (1260, 3016, 300, WARM, 0.9, False), (2220, 3016, 320, WARM, 1.0, True),
    (1264, 700, 300, COOL, 1.0, True), (1580, 2400, 320, WARM, 1.0, True),
    (3140, 900, 330, WARM, 1.1, True), (3716, 2300, 320, WARM, 1.0, True), (3140, 3100, 300, COOL, 0.9, True),
]
PROPS = [  # (key, x, y) on the streets
    ("ow-prop-puddle-b", 760, 1560), ("ow-prop-manhole", 2200, 1540), ("ow-prop-drain", 1700, 1720),
    ("ow-prop-car-a-h", 1980, 1690), ("ow-prop-car-c-v", 1290, 2450), ("ow-prop-puddle-a", 3400, 2200),
    ("ow-prop-trash", 1180, 1290), ("ow-prop-debris-a", 2650, 3150), ("ow-prop-car-b-h", 520, 3320),
]


def manifest():
    with open(os.path.join(PREVIEW, "build-manifest.json"), encoding="utf-8") as handle:
        return {a["key"]: a for a in json.load(handle)["assets"]}


def load_building(asset):
    return {field: mock.load_rgba(os.path.join(ASSET_ROOT, asset[field])) for field in ("roof", "roofEmit", "south", "southEmit")}


def luma(rgb):
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


# ---------------------------------------------------------------------------
# Street glow of a south_emit image: getOpenWorldBuildingNeon in game.js


def neon_lights(south_emit, width):
    columns = max(1, round(width / NEON["columnWidth"]))
    rows, cell = NEON["rows"], 4
    image = Image.fromarray((np.clip(south_emit, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
    data = np.asarray(image.resize((columns * cell, rows * cell), Image.BOX)).astype(np.float64) / 255.0
    lights = []
    ys = np.arange(rows * cell)
    weight = 0.25 + 0.75 * ((ys + 0.5) / (rows * cell)) ** 2
    for column in range(columns):
        block = data[:, column * cell:(column + 1) * cell]
        rgb, alpha = block[..., :3], block[..., 3]
        mx, mn = rgb.max(axis=-1), rgb.min(axis=-1)
        saturation = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-9), 0.0)
        w = weight[:, None]
        hue_weight = alpha * w * (0.15 + saturation)
        total = (rgb * (alpha * w)[..., None]).sum(axis=(0, 1))
        weights = w.sum() * cell
        level = total.max() / weights
        hue_sum = hue_weight.sum()
        if level < NEON["minLevel"] or hue_sum <= 0:
            continue
        mean = (rgb * hue_weight[..., None]).sum(axis=(0, 1)) / hue_sum
        grey = mean.mean()
        vivid = np.maximum(0.0, grey + (mean - grey) * NEON["saturation"])
        peak = vivid.max() or 1.0
        lights.append({
            "x": (column + 0.5) * width / columns,
            "radius": NEON["radiusMin"] + (NEON["radiusMax"] - NEON["radiusMin"]) * min(1.0, level / NEON["levelForMaxRadius"]),
            "color": np.round(vivid / peak * 255) / 255,
            "alpha": min(NEON["maxAlpha"], level * NEON["alphaGain"]),
            "level": level,
        })
    return lights, columns


# ---------------------------------------------------------------------------
# Block scene


def pool(light, x, y, radius, color, alpha):
    t, b = max(0, int(y - radius)), min(light.shape[0], int(y + radius) + 1)
    l, r = max(0, int(x - radius)), min(light.shape[1], int(x + radius) + 1)
    if b <= t or r <= l:
        return
    ys, xs = np.mgrid[t:b, l:r].astype(np.float32)
    d2 = ((xs - x) ** 2 + (ys - y) ** 2) / radius ** 2
    light[t:b, l:r] += (np.clip(1.0 - d2, 0, 1) ** 2)[..., None] * np.asarray(color, dtype=np.float32) * alpha


def glow(out, x, y, color, alpha):
    t, b = max(0, int(y - GLOW_RADIUS)), min(out.shape[0], int(y + GLOW_RADIUS) + 1)
    l, r = max(0, int(x - GLOW_RADIUS)), min(out.shape[1], int(x + GLOW_RADIUS) + 1)
    ys, xs = np.mgrid[t:b, l:r].astype(np.float32)
    d = np.sqrt((xs - x) ** 2 + (ys - y) ** 2) / GLOW_RADIUS
    out[t:b, l:r] += (np.clip(1.0 - d, 0, 1) ** 2.2)[..., None] * color * alpha


def placed_buildings(assets):
    placed = []
    for (_, _, _, bottom), _, row in BLOCKS:
        inner_bottom = bottom - SIDEWALK
        for key, left in row:
            w, h = assets[key]["footprint"]
            placed.append({"key": key, "left": left, "top": inner_bottom - h, "right": left + w, "bottom": inner_bottom})
    return placed


def compose_ground(tex):
    canvas = mock.Canvas(VIEW_W, VIEW_H)
    canvas.pattern((0, 0, VIEW_W, VIEW_H), tex["ow-asphalt-a"])
    canvas.pattern((ROADS_X[0]["start"], ROADS_Y[1]["end"], ROADS_X[0]["end"], ROADS_Y[2]["start"]), tex["ow-asphalt-b"])
    canvas.pattern((1632, ROADS_Y[1]["start"], 3088, ROADS_Y[1]["end"]), tex["ow-asphalt-b"])
    for rect, kind, _ in BLOCKS:
        step5.draw_block(canvas, kind, rect, tex)
    edges_x = [{"start": -FAR - 680, "end": -FAR, "arterial": True}] + ROADS_X + [{"start": FAR, "end": FAR + 680, "arterial": True}]
    edges_y = [{"start": -FAR - 420, "end": -FAR, "arterial": False}] + ROADS_Y + [{"start": FAR, "end": FAR + 420, "arterial": False}]
    for road in ROADS_X:
        step5.draw_markings(canvas, road, True, edges_y, tex)
    for road in ROADS_Y:
        step5.draw_markings(canvas, road, False, edges_x, tex)
    canvas.pattern((0, 0, VIEW_W, VIEW_H), tex["ow-grit"], alpha=step5.GRIT_ALPHA)
    return canvas


def render_block(assets, tex, buildings, night):
    canvas = compose_ground(tex)
    for key, x, y in PROPS:
        if assets[key].get("decal"):
            step5.place(canvas, tex[key], x, y)
    light = np.ones((VIEW_H, VIEW_W, 3), dtype=np.float32) * AMBIENT
    for x, y, radius, color, intensity, lit in LAMPS:
        if lit:
            pool(light, x, y, radius, color, POOL_ALPHA * intensity)
    add = np.zeros((VIEW_H, VIEW_W, 3), dtype=np.float32)
    for b in buildings:
        images = buildings_images[b["key"]]
        w, h = b["right"] - b["left"], b["bottom"] - b["top"]
        for dx, dy, alpha in SHADOWS:
            canvas.fill((b["left"] + dx, b["top"] + dy, b["right"] + dx, b["bottom"] + dy), (0.0, 0.0, 0.0), alpha)
        lights, _ = neon_lights(images["southEmit"], w)
        for neon in lights:
            pool(light, b["left"] + neon["x"], b["bottom"] + NEON["offsetY"], neon["radius"], neon["color"], neon["alpha"])
    for b in buildings:
        images = buildings_images[b["key"]]
        roof = images["roof"].copy()
        roof[..., :3] *= SHADE[b["key"]]
        canvas.image(b["left"], b["top"], roof)
        light[b["top"]:b["bottom"], b["left"]:b["right"]] = ROOF_AMBIENT
        emit = images["roofEmit"]
        add[b["top"]:b["bottom"], b["left"]:b["right"]] += emit[..., :3] * emit[..., 3:4]
    for key, x, y in sorted(PROPS, key=lambda item: item[2]):
        if not assets[key].get("decal"):
            step5.place(canvas, tex[key], x, y)
    if night:
        for x, y, _, color, intensity, lit in LAMPS:
            if lit:
                glow(add, x, y, color, GLOW_ALPHA * intensity)
        canvas.rgb = np.clip(canvas.rgb * np.clip(light, 0, 1) + add, 0, 1).astype(np.float32)
    image = Image.fromarray((np.clip(canvas.rgb, 0, 1) * 255 + 0.5).astype(np.uint8))
    return image.resize((round(VIEW_W * SCALE), round(VIEW_H * SCALE)), Image.LANCZOS)


# ---------------------------------------------------------------------------
# Roof line-up


def to_image(rgba, background=(0.08, 0.09, 0.11)):
    rgb = rgba[..., :3] * rgba[..., 3:4] + np.asarray(background) * (1 - rgba[..., 3:4]) if rgba.shape[2] == 4 else rgba
    return Image.fromarray((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8))


def lineup(assets):
    s = 0.5
    pad, label_h, gap = 24, 70, 18
    cols = []
    for key in BUILDING_KEYS:
        a = assets[key]
        imgs = buildings_images[key]
        w, h = a["footprint"]
        night = imgs["roof"].copy()
        night[..., :3] = np.clip(night[..., :3] * ROOF_AMBIENT + imgs["roofEmit"][..., :3] * imgs["roofEmit"][..., 3:4], 0, 1)
        emit_view = np.zeros_like(imgs["southEmit"])
        emit_view[..., :3] = imgs["southEmit"][..., :3] * imgs["southEmit"][..., 3:4]
        emit_view[..., 3] = 1.0
        lights, columns = neon_lights(imgs["southEmit"], w)
        stats = {
            "roof": float(luma(imgs["roof"][..., :3]).mean()),
            "south": float(luma(imgs["south"][..., :3]).mean()),
            "band": float(luma(imgs["south"][-64:, :, :3]).mean()),
        }
        cols.append((key, a, (w, h), [imgs["roof"], night, imgs["south"], emit_view], lights, columns, stats))
    widths = [round(c[2][0] * s) for c in cols]
    row_h = [max(round(c[3][i].shape[0] * s) for c in cols) for i in range(4)]
    swatch_h = 70
    total_w = pad * 2 + sum(widths) + gap * (len(cols) - 1)
    total_h = pad + label_h + sum(row_h) + gap * 4 + swatch_h + 150
    out = Image.new("RGB", (total_w, total_h), (12, 14, 18))
    draw = ImageDraw.Draw(out)
    f, small = mock.font(20), mock.font(15)
    x = pad
    for (key, a, (w, h), images, lights, columns, stats), width in zip(cols, widths):
        draw.text((x, pad), key, font=f, fill=(225, 232, 238))
        draw.text((x, pad + 28), f"{w}x{h} px  {a['floors']}F", font=small, fill=(170, 178, 186))
        y = pad + label_h
        for i, img in enumerate(images):
            pil = to_image(img).resize((width, round(img.shape[0] * s)), Image.LANCZOS)
            out.paste(pil, (x, y))
            y += row_h[i] + gap
        cw = width / columns
        lit = {round((n["x"] / w) * columns - 0.5): n for n in lights}
        for c in range(columns):
            n = lit.get(c)
            color = tuple(int(v) for v in (np.asarray(n["color"]) * n["alpha"] * 255 + 0.5)) if n else (20, 20, 22)
            draw.rectangle((x + c * cw + 1, y, x + (c + 1) * cw - 1, y + swatch_h), fill=color)
        y += swatch_h + 8
        lines = [f"roof {stats['roof']:.3f}  south {stats['south']:.3f}",
                 f"shop band {stats['band']:.3f}",
                 f"street glow: {len(lights)}/{columns} columns",
                 "max alpha " + (f"{max(n['alpha'] for n in lights):.2f}" if lights else "-")]
        for k, line in enumerate(lines):
            draw.text((x, y + k * 22), line, font=small, fill=(170, 178, 186))
        x += width + gap
    draw.text((pad, total_h - 34), "行: 屋上 / 夜の屋上（ゲームの描き方: 屋上の環境光 0x98a0b9 + roof_emit）/ 南面 / south_emit / "
              "通りの光（ゲームが south_emit から作る 96 px ごとの光だまり。色 x 強さ）", font=small, fill=(150, 160, 170))
    return out


buildings_images = {}


def main():
    assets = manifest()
    for key in BUILDING_KEYS:
        buildings_images[key] = load_building(assets[key])
    tex = {key: step5.load(assets, key) for key in assets if assets[key]["type"] in ("tile", "marking", "prop")}
    sheet = lineup(assets)
    path = os.path.join(PREVIEW, "buildings-roofs.jpg")
    sheet.save(path, quality=90)
    print(f"wrote {os.path.relpath(path, REPO_ROOT)} {sheet.size} {os.path.getsize(path) / 1024 / 1024:.2f} MB")
    for key in BUILDING_KEYS:
        lights, columns = neon_lights(buildings_images[key]["southEmit"], assets[key]["footprint"][0])
        desc = ", ".join(f"#{int(n['color'][0] * 255):02x}{int(n['color'][1] * 255):02x}{int(n['color'][2] * 255):02x} a{n['alpha']:.2f}" for n in lights)
        print(f"  {key}: {len(lights)}/{columns} glowing columns: {desc}")
    buildings = placed_buildings(assets)
    for name, night in (("buildings-block-night.jpg", True), ("buildings-block-neutral.jpg", False)):
        image = render_block(assets, tex, buildings, night)
        path = os.path.join(PREVIEW, name)
        image.save(path, quality=88)
        print(f"wrote {os.path.relpath(path, REPO_ROOT)} {image.size} {os.path.getsize(path) / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
