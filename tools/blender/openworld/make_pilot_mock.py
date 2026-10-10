"""Pilot style check (WORLD_DESIGN.md 6.9): compose one intersection with the pilot assets.

    python tools/blender/openworld/make_pilot_mock.py

Needs Python 3.10+ with Pillow and numpy, the rendered pilot assets (build_all.py) and the current
game captures (capture_game.cjs). Writes tools/blender/openworld/preview/pilot-mock.png:

    [current 1a open world]      [pilot, approximate night grade]
    [current Tokyo stage (ref)]  [pilot, neutral render]

The mock is built in game pixels (1536x864 = the area the camera shows at WORLD_VIEW_SCALE 1.2) and
shown at the game's display scale (1/1.2 = 0.83) as 1280x720. Roads, sidewalks, curbs and markings
follow the open-world drawing code in game.js (positions, tints, alphas); parts that are not in the
pilot (curbs, edge lines, the double centre line) keep the current flat colours. The night grade,
lamp pools and glow are a rough stand-in for the light layers planned in 6.11, not the final look.
"""

import json
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
ASSET_ROOT = os.path.join(REPO_ROOT, "画像", "openworld")
PREVIEW = os.path.join(HERE, "preview")
PLAYER_SPRITE = os.path.join(REPO_ROOT, "画像", "player", "boarding_robot", "bear_robot_down_idle.png")

VIEW_W, VIEW_H = 1536, 864  # game px visible at WORLD_VIEW_SCALE 1.2
OUT_W, OUT_H = 1280, 720

# OPEN_WORLD_CONFIG values from game.js.
SIDEWALK = 56
CURB = 6
EDGE_INSET, EDGE_WIDTH = 18, 6
CROSS_DEPTH, CROSS_GAP = 150, 26
COLORS = {
    "laneDash": 0xD6B45A,
    "edgeLine": 0xB8C1C6,
    "curb": 0x5C656B,
    "crosswalk": 0xD7DDE0,
}

# Layout in view pixels. The camera centre (768, 432) sits 164 px west of the arterial and
# 288 px north of the side road; capture_game.cjs frames the current game the same way.
ARTERIAL = {"start": 932, "end": 1612, "arterial": True}  # N-S, 680 px
SIDE_ROAD = {"start": 720, "end": 1140, "arterial": False}  # E-W, 420 px
BUILDING_POS = (100, 656)  # footprint left x, south edge y (8 px inside the block's sidewalk)
PLAYER_POS = (1190, 470)  # hitbox position on the arterial
LAMPS = [  # (x, y, radius, intensity) warm street lamps for the night approximation
    (900, 640, 330, 1.5),
    (900, -60, 330, 1.3),
    (420, 690, 300, 1.2),
    (1650, 330, 330, 1.3),
]
NIGHT_AMBIENT = np.array([0.40, 0.45, 0.62])  # linear multiplier
GROUND_AMBIENT, FACADE_AMBIENT, ROOF_AMBIENT = 0.85, 0.7, 0.8
LAMP_COLOR = np.array([1.0, 0.58, 0.28])
EMIT_GAIN = 1.6


def hex_rgb(value):
    return np.array([(value >> 16) & 255, (value >> 8) & 255, value & 255], dtype=np.float32) / 255.0


def srgb_to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c):
    c = np.clip(c, 0.0, 1.0)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1.0 / 2.4) - 0.055)


def load_rgba(path):
    return np.asarray(Image.open(path).convert("RGBA")).astype(np.float32) / 255.0


class Canvas:
    """sRGB float canvas in view pixels with Phaser-like image drawing (tint x alpha, normal blend)."""

    def __init__(self, w, h):
        self.rgb = np.zeros((h, w, 3), dtype=np.float32)
        self.w, self.h = w, h

    def _clip(self, left, top, right, bottom):
        l, t = max(0, int(left)), max(0, int(top))
        r, b = min(self.w, int(right)), min(self.h, int(bottom))
        return (l, t, r, b) if r > l and b > t else None

    def fill(self, rect, color, alpha=1.0):
        box = self._clip(*rect)
        if box:
            l, t, r, b = box
            self.rgb[t:b, l:r] = self.rgb[t:b, l:r] * (1 - alpha) + np.asarray(color, dtype=np.float32) * alpha

    def pattern(self, rect, texture, origin=(0, 0), tint=None, alpha=1.0, multiply=None):
        """Repeat `texture` (h, w, 4) over rect, anchored at origin, like addOpenWorldPattern."""
        box = self._clip(*rect)
        if not box:
            return
        l, t, r, b = box
        th, tw = texture.shape[:2]
        ys = (np.arange(t, b) - int(round(origin[1]))) % th
        xs = (np.arange(l, r) - int(round(origin[0]))) % tw
        tile = texture[ys[:, None], xs[None, :]]
        color = tile[..., :3] * (tint if tint is not None else 1.0)
        if multiply is not None:
            color = color * multiply
        a = tile[..., 3:4] * alpha
        self.rgb[t:b, l:r] = self.rgb[t:b, l:r] * (1 - a) + color * a

    def image(self, x, y, img, alpha_layer=None):
        h, w = img.shape[:2]
        box = self._clip(x, y, x + w, y + h)
        if not box:
            return
        l, t, r, b = box
        src = img[t - y:b - y, l - x:r - x]
        a = src[..., 3:4] if src.shape[2] == 4 else 1.0
        self.rgb[t:b, l:r] = self.rgb[t:b, l:r] * (1 - a) + src[..., :3] * a


def along_rect(vertical, start, end, a, b):
    return (a, start, b, end) if vertical else (start, a, end, b)


def draw_road_markings(canvas, road, vertical, cross_roads, tex):
    """Same placement as SurvivalScene.addOpenWorldRoadMarkings for the visible segments."""
    width = road["end"] - road["start"]
    center = (road["start"] + road["end"]) / 2
    edge = hex_rgb(COLORS["edgeLine"])
    lane = hex_rgb(COLORS["laneDash"])
    for i in range(len(cross_roads) - 1):
        seg_start, seg_end = cross_roads[i]["end"], cross_roads[i + 1]["start"]
        mark_start = seg_start + CROSS_GAP + CROSS_DEPTH + 36
        mark_end = seg_end - CROSS_GAP - CROSS_DEPTH - 36
        if mark_end > mark_start:
            for a, b in ((road["start"] + EDGE_INSET, road["start"] + EDGE_INSET + EDGE_WIDTH),
                         (road["end"] - EDGE_INSET - EDGE_WIDTH, road["end"] - EDGE_INSET)):
                canvas.fill(along_rect(vertical, mark_start, mark_end, a, b), edge, 0.55)
            lanes = [center - width * 0.25, center + width * 0.25] if road["arterial"] else [center]
            key = "ow-dash-v" if vertical else "ow-dash-h"
            for lc in lanes:
                rect = along_rect(vertical, mark_start, mark_end, lc - 8, lc + 8)
                origin = (lc - 8, 0) if vertical else (0, lc - 8)
                canvas.pattern(rect, tex[key], origin, tint=edge if road["arterial"] else lane, alpha=0.75)
            if road["arterial"]:
                for a, b in ((center - 12, center - 4), (center + 4, center + 12)):
                    canvas.fill(along_rect(vertical, mark_start, mark_end, a, b), lane, 0.8)
        if seg_end - seg_start >= CROSS_DEPTH * 2 + CROSS_GAP * 2:
            key = "ow-zebra-v" if vertical else "ow-zebra-h"
            for frm in (seg_start + CROSS_GAP, seg_end - CROSS_GAP - CROSS_DEPTH):
                rect = along_rect(vertical, frm, frm + CROSS_DEPTH, road["start"] + EDGE_INSET, road["end"] - EDGE_INSET)
                origin = (road["start"] + EDGE_INSET, frm) if vertical else (frm, road["start"] + EDGE_INSET)
                canvas.pattern(rect, tex[key], origin, tint=hex_rgb(COLORS["crosswalk"]), alpha=0.62)


def compose_ground(tex):
    canvas = Canvas(VIEW_W, VIEW_H)
    canvas.pattern((0, 0, VIEW_W, VIEW_H), tex["ow-asphalt-a"])
    far = 99999
    # NW block (the only block in view): curb ring, sidewalk band, inner lot.
    block = (-far, -far, ARTERIAL["start"], SIDE_ROAD["start"])
    canvas.fill(block, hex_rgb(COLORS["curb"]))
    canvas.pattern((block[0], block[1], block[2] - CURB, block[3] - CURB), tex["ow-sidewalk"])
    inner = (block[0], block[1], block[2] - SIDEWALK, block[3] - SIDEWALK)
    canvas.pattern(inner, tex["ow-sidewalk"], origin=(17, 31), multiply=0.82)  # forecourt paving, a shade darker
    # Roads: arterial between the off-screen side roads to the north/south, side road crossing it.
    north = {"start": -far - 420, "end": -far, "arterial": False}
    south = {"start": far, "end": far + 420, "arterial": False}
    west = {"start": -far - 680, "end": -far, "arterial": True}
    east = {"start": far, "end": far + 680, "arterial": True}
    draw_road_markings(canvas, ARTERIAL, True, [north, SIDE_ROAD, south], tex)
    draw_road_markings(canvas, SIDE_ROAD, False, [west, ARTERIAL, east], tex)
    return canvas


def building_layers(assets):
    """3/4 view: roof shifted up by the facade height, south facade below it (Phase 2 assembly)."""
    roof = load_rgba(os.path.join(ASSET_ROOT, assets["roof"]))
    south = load_rgba(os.path.join(ASSET_ROOT, assets["south"]))
    roof_emit = load_rgba(os.path.join(ASSET_ROOT, assets["roofEmit"]))
    south_emit = load_rgba(os.path.join(ASSET_ROOT, assets["southEmit"]))
    left, south_y = BUILDING_POS
    fh = south.shape[0]
    fd = roof.shape[0]
    roof_xy = (left, south_y - fd - fh)
    south_xy = (left, south_y - fh)
    return [(roof, roof_emit, roof_xy), (south, south_emit, south_xy)]


def blur(img, radius):
    """Approximate gaussian: three box blurs along each axis (cumsum, edge clamped)."""
    out = img
    r = max(1, int(radius))
    for _ in range(3):
        for axis in (0, 1):
            pad = [(0, 0)] * out.ndim
            pad[axis] = (r + 1, r)
            padded = np.pad(out, pad, mode="edge")
            c = np.cumsum(padded, axis=axis)
            hi = np.take(c, np.arange(2 * r + 1, padded.shape[axis]), axis=axis)
            lo = np.take(c, np.arange(0, padded.shape[axis] - 2 * r - 1), axis=axis)
            out = (hi - lo) / (2 * r + 1)
    return out


def light_map(lamps_only=False):
    ys, xs = np.mgrid[0:VIEW_H, 0:VIEW_W].astype(np.float32)
    light = np.zeros((VIEW_H, VIEW_W, 3), dtype=np.float32)
    for x, y, radius, intensity in LAMPS:
        d = np.sqrt((xs - x) ** 2 + (ys - y) ** 2) / radius
        falloff = np.clip(1.0 - d * d, 0.0, 1.0) ** 2
        light += falloff[..., None] * LAMP_COLOR * intensity
    return light


def vignette():
    ys, xs = np.mgrid[0:VIEW_H, 0:VIEW_W].astype(np.float32)
    nx, ny = (xs / VIEW_W - 0.5) * 2, (ys / VIEW_H - 0.5) * 2
    return 1.0 - 0.32 * np.clip(np.sqrt(nx * nx * 0.6 + ny * ny * 0.9) - 0.35, 0, 1)


def player_layer():
    sprite = Image.open(PLAYER_SPRITE).convert("RGBA")
    scale = 168.0 / sprite.size[1]  # PLAYER_ROBOT_DISPLAY_HEIGHT
    sprite = sprite.resize((round(sprite.size[0] * scale), 168), Image.LANCZOS)
    arr = np.asarray(sprite).astype(np.float32) / 255.0
    x = PLAYER_POS[0] - arr.shape[1] // 2
    y = PLAYER_POS[1] - 26 - arr.shape[0] // 2  # PLAYER_SPRITE_OFFSET_Y
    return arr, (x, y)


def draw_shadow(canvas_rgb, center, rx, ry, strength):
    ys, xs = np.mgrid[0:canvas_rgb.shape[0], 0:canvas_rgb.shape[1]].astype(np.float32)
    d = ((xs - center[0]) / rx) ** 2 + ((ys - center[1]) / ry) ** 2
    shade = np.clip(1.0 - d, 0, 1) ** 1.5 * strength
    canvas_rgb *= (1.0 - shade)[..., None]


def render_mock(tex, building, night):
    canvas = compose_ground(tex)
    emit_lin = np.zeros((VIEW_H, VIEW_W, 3), dtype=np.float32)
    # Which light each pixel gets in the night approximation: street lamps reach the ground and the
    # lower facade, the roof (19 m up) only gets the ambient sky.
    lamps = light_map(lamps_only=True)
    light = NIGHT_AMBIENT * GROUND_AMBIENT + lamps
    for index, (base, emit, (x, y)) in enumerate(building):
        canvas.image(x, y, base)
        h, w = emit.shape[:2]
        l, t = max(0, x), max(0, y)
        r, b = min(VIEW_W, x + w), min(VIEW_H, y + h)
        if r > l and b > t:
            e = emit[t - y:b - y, l - x:r - x]
            emit_lin[t:b, l:r] += srgb_to_linear(e[..., :3]) * e[..., 3:4]
            if index == 0:  # roof
                light[t:b, l:r] = NIGHT_AMBIENT * ROOF_AMBIENT
            else:  # south facade: lamp light fades towards the top
                rows = (np.arange(t, b) - y) / float(h)
                fade = (rows ** 2)[:, None, None]
                light[t:b, l:r] = NIGHT_AMBIENT * FACADE_AMBIENT + lamps[t:b, l:r] * fade
    sprite, (sx, sy) = player_layer()
    draw_shadow(canvas.rgb, (PLAYER_POS[0], PLAYER_POS[1] + 40), 46, 16, 0.55)

    if night:
        lin = srgb_to_linear(canvas.rgb) * light * vignette()[..., None]
        glow = emit_lin * EMIT_GAIN
        bloom = blur(glow, 3) * 0.55 + blur(glow, 12) * 0.45 + blur(glow, 36) * 0.35
        lin = lin + glow + bloom
        lin = lin / (1.0 + lin * 0.18)  # soft shoulder
        canvas.rgb = linear_to_srgb(lin).astype(np.float32)
    canvas.image(sx, sy, sprite)
    image = Image.fromarray((np.clip(canvas.rgb, 0, 1) * 255 + 0.5).astype(np.uint8))
    return image.resize((OUT_W, OUT_H), Image.LANCZOS)


def font(size):
    for path in ("C:/Windows/Fonts/meiryo.ttc", "C:/Windows/Fonts/YuGothM.ttc", "/System/Library/Fonts/ヒラギノ角ゴシック W4.ttc"):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size=size)


def sheet(panels, notes):
    label_h, pad = 40, 12
    w = OUT_W * 2 + pad * 3
    h = (OUT_H + label_h) * 2 + pad * 3 + 34
    out = Image.new("RGB", (w, h), (12, 14, 18))
    draw = ImageDraw.Draw(out)
    f, small = font(22), font(18)
    for index, (title, image) in enumerate(panels):
        col, row = index % 2, index // 2
        x = pad + col * (OUT_W + pad)
        y = pad + row * (OUT_H + label_h + pad)
        draw.text((x + 4, y + 8), title, font=f, fill=(225, 232, 238))
        out.paste(image, (x, y + label_h))
    draw.text((pad + 4, h - 30), notes, font=small, fill=(150, 160, 170))
    return out


def main():
    with open(os.path.join(PREVIEW, "build-manifest.json"), encoding="utf-8") as handle:
        manifest = {a["key"]: a for a in json.load(handle)["assets"]}
    tex = {}
    for key in ("ow-asphalt-a", "ow-sidewalk", "ow-dash-v", "ow-dash-h", "ow-zebra-v", "ow-zebra-h"):
        tex[key] = load_rgba(os.path.join(ASSET_ROOT, manifest[key]["file"]))
    building = building_layers(manifest["ow-bld-a01"])

    night = render_mock(tex, building, night=True)
    neutral = render_mock(tex, building, night=False)
    current = Image.open(os.path.join(PREVIEW, "current-openworld-1a.png")).convert("RGB").resize((OUT_W, OUT_H))
    tokyo = Image.open(os.path.join(PREVIEW, "current-tokyo-stage.png")).convert("RGB").resize((OUT_W, OUT_H))
    panels = [
        ("現在: 広域マップ 1a（?debugOpenWorld=1、同じ交差点の配置）", current),
        ("パイロット: 夜の色調の近似（街灯の光だまり・発光の加算・周辺減光はモック上の仮）", night),
        ("参考: 現在の東京ステージ（tokyo_stage_08）", tokyo),
        ("パイロット: 中立の明るさ（描き出したままの素材を配置）", neutral),
    ]
    notes = ("1280x720 = ゲームの表示倍率 0.83（1536x864 px の範囲）。道路 680/420 px・歩道 56 px・横断歩道 150 px、建物 768x1024・6 階を 3/4 ビューで配置。"
             "縁石・路肩線・中央線は未制作のため現在の単色。自機は 168 px。")
    out = sheet(panels, notes)
    path = os.path.join(PREVIEW, "pilot-mock.png")
    out.save(path, optimize=True)
    print(f"wrote {os.path.relpath(path, REPO_ROOT)} {out.size} {os.path.getsize(path) / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
