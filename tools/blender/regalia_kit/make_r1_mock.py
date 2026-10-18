"""Review images for the R1 style test (docs/regalia-kit-design.md 11 and 12).

Run after build_r1.py and capture_regalia.cjs (repository root, Python 3 with Pillow and numpy):

  python tools/blender/regalia_kit/make_r1_mock.py

Writes to tools/blender/regalia_kit/preview/:
  r1-<asset>-final.png        the render with its glow baked in (2x scale, straight alpha)
  r1-mock-territory-s1.jpg    the real game frame with the Aegis Wall S1 territory + Counter Pulse S1
  r1-mock-territory-s8.jpg    the same frame with the S8 territory + Counter Pulse S8
  r1-sheet.jpg                the new images next to the existing REGALIA art, and the icons at HUD size

Sizes follow the design doc: the renders are 2x (1 m = 80 px) and the game draws 1 m = 40 world
px, shown at the open world's camera zoom (read from game-regalia.json).
"""

import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
PREVIEW = os.path.join(HERE, "preview")
RENDER_TO_WORLD = 0.5  # 2x renders -> game world px

# docs/regalia-kit-design.md 4.4 / 5.2 (world px). The shields always ring the mech evenly; the
# inside of the ring is REGALIA's territory.
TERRITORY = {1: (4, 200), 2: (4, 210), 3: (5, 220), 4: (5, 235), 5: (6, 250), 6: (7, 265), 7: (8, 280), 8: (10, 300)}
PULSE_RADIUS = {1: 120, 4: 146, 8: 200}
TERRITORY_LINE = (159, 210, 255)  # PALETTE["energy"]

FONT_JP = "C:/Windows/Fonts/YuGothB.ttc"
FONT_HUD = "C:/Windows/Fonts/consolab.ttf"


def path(name):
    return os.path.join(PREVIEW, name)


def load(name):
    return np.asarray(Image.open(path(name)).convert("RGBA"), dtype=np.float32) / 255.0


def to_image(rgba):
    return Image.fromarray((np.clip(rgba, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8), "RGBA")


def blur(premult_rgb, radius):
    img = Image.fromarray((np.clip(premult_rgb, 0, 1) * 255).astype(np.uint8), "RGB")
    return np.asarray(img.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255.0


def bake_glow(main, emit, near=3.0, far=11.0, gain=(0.9, 0.75)):
    """Adds a bloom made from the emit pass. Returns straight-alpha RGBA."""
    emit_premult = emit[..., :3] * emit[..., 3:4]
    glow = blur(emit_premult, near) * gain[0] + blur(emit_premult, far) * gain[1]
    color = main[..., :3] * main[..., 3:4] + glow
    alpha = np.clip(np.maximum(main[..., 3], glow.max(axis=2) * 1.15), 0.0, 1.0)
    rgb = np.where(alpha[..., None] > 1e-4, color / np.maximum(alpha[..., None], 1e-4), 0.0)
    return np.dstack([np.clip(rgb, 0, 1), alpha])


def add_outline(rgba, width=2, color=(20, 16, 28), opacity=0.85):
    """Dark contour under the sprite, like the painted mech's outline (2 px at 2x = 1 game px)."""
    alpha = Image.fromarray((rgba[..., 3] * 255).astype(np.uint8), "L")
    grown = np.asarray(alpha.filter(ImageFilter.MaxFilter(width * 2 + 1)), dtype=np.float32) / 255.0
    under = np.zeros_like(rgba)
    under[..., :3] = np.array(color, dtype=np.float32) / 255.0
    under[..., 3] = grown * opacity
    a = rgba[..., 3:4]
    out_a = a + under[..., 3:4] * (1 - a)
    out_rgb = (rgba[..., :3] * a + under[..., :3] * under[..., 3:4] * (1 - a)) / np.maximum(out_a, 1e-4)
    return np.dstack([out_rgb, out_a[..., 0]])


def additive_to_rgba(rgb):
    """Emission on black -> straight alpha (alpha = brightest channel)."""
    alpha = rgb.max(axis=2)
    return np.dstack([np.where(alpha[..., None] > 1e-4, rgb / np.maximum(alpha[..., None], 1e-4), 0.0), alpha])


def finals():
    out = {}
    for key, outline in (("r1-shield", True), ("r1-crack", False), ("r1-icon-aegis", True), ("r1-icon-pulse", True)):
        rgba = bake_glow(load(f"{key}.png"), load(f"{key}_emit.png"))
        if outline:
            rgba = add_outline(rgba)
        out[key] = rgba
        to_image(rgba).save(path(f"{key}-final.png"))
    pulse_rgb = np.asarray(Image.open(path("r1-pulse.png")).convert("RGB"), dtype=np.float32) / 255.0
    glow = blur(pulse_rgb, 4.0) * 0.35
    pulse = additive_to_rgba(np.clip(pulse_rgb + glow, 0, 1))
    out["r1-pulse"] = pulse
    to_image(pulse).save(path("r1-pulse-final.png"))
    return out


# ---------------------------------------------------------------------------
# Compositing on the game frame (float RGB canvas)


def paste(canvas, rgba, center, pivot, scale, mode="normal", strength=1.0):
    """Draws rgba so that its pivot (in source px) lands on center (canvas px)."""
    h, w = rgba.shape[:2]
    size = (max(1, round(w * scale)), max(1, round(h * scale)))
    img = to_image(rgba).resize(size, Image.LANCZOS)
    src = np.asarray(img, dtype=np.float32) / 255.0
    x0 = round(center[0] - pivot[0] * scale)
    y0 = round(center[1] - pivot[1] * scale)
    ch, cw = canvas.shape[:2]
    sx0, sy0 = max(0, -x0), max(0, -y0)
    dx0, dy0 = max(0, x0), max(0, y0)
    dx1, dy1 = min(cw, x0 + size[0]), min(ch, y0 + size[1])
    if dx1 <= dx0 or dy1 <= dy0:
        return
    part = src[sy0:sy0 + dy1 - dy0, sx0:sx0 + dx1 - dx0]
    a = part[..., 3:4] * strength
    region = canvas[dy0:dy1, dx0:dx1]
    if mode == "add":
        region += part[..., :3] * a
    else:
        region *= 1 - a
        region += part[..., :3] * a
    np.clip(region, 0, 1, out=region)


def mech_layer():
    with_mech = np.asarray(Image.open(path("game-regalia.png")).convert("RGB"), dtype=np.float32) / 255.0
    without = np.asarray(Image.open(path("game-regalia-nomech.png")).convert("RGB"), dtype=np.float32) / 255.0
    diff = np.abs(with_mech - without).max(axis=2)
    mask = Image.fromarray(((diff > 6 / 255.0) * 255).astype(np.uint8), "L").filter(ImageFilter.MaxFilter(3))
    mask = np.asarray(mask.filter(ImageFilter.GaussianBlur(0.7)), dtype=np.float32) / 255.0
    return with_mech, without, mask[..., None]


def shield_positions(level, player, zoom, facing):
    """Evenly around the mech, one shield towards the nearest enemy."""
    count, radius = TERRITORY[level]
    return [(player[0] + math.cos(facing + math.tau * i / count) * radius * zoom,
             player[1] + math.sin(facing + math.tau * i / count) * radius * zoom) for i in range(count)]


def draw_territory_line(canvas, center, radius):
    """Proposal: a faint ground circle through the shields so the territory reads (no collision)."""
    h, w = canvas.shape[:2]
    layer = Image.new("RGB", (w, h), (0, 0, 0))
    draw = ImageDraw.Draw(layer)
    box = (center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius)
    draw.ellipse(box, outline=TERRITORY_LINE, width=7)
    soft = np.asarray(layer.filter(ImageFilter.GaussianBlur(5)), dtype=np.float32) / 255.0
    layer = Image.new("RGB", (w, h), (0, 0, 0))
    ImageDraw.Draw(layer).ellipse(box, outline=TERRITORY_LINE, width=2)
    thin = np.asarray(layer, dtype=np.float32) / 255.0
    canvas += soft * 0.55 + thin * 0.45
    np.clip(canvas, 0, 1, out=canvas)


def draw_hud_icons(canvas, icons):
    """Puts the two icons into the TORNADO / THUNDER slots of the captured HUD and relabels them.
    Slot geometry measured on the 1280x720 capture."""
    img = Image.fromarray((canvas * 255).astype(np.uint8), "RGB")
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT_HUD, 10)
    for (icon, label, icon_center, label_box) in (
        (icons["r1-icon-aegis"], "AEGIS", (488, 675), (510, 650, 566, 664)),
        (icons["r1-icon-pulse"], "PULSE", (608, 675), (630, 650, 686, 664)),
    ):
        draw.ellipse((icon_center[0] - 21, icon_center[1] - 21, icon_center[0] + 21, icon_center[1] + 21), fill=(27, 33, 38))
        draw.rectangle(label_box, fill=(27, 33, 38))
        draw.text((label_box[2] - 2, label_box[1] + 1), label, font=font, fill=(140, 152, 163), anchor="ra")
        icon_img = to_image(icon).resize((40, 40), Image.LANCZOS)
        img.paste(icon_img, (icon_center[0] - 20, icon_center[1] - 20), icon_img)
    return np.asarray(img, dtype=np.float32) / 255.0


def caption(canvas, text):
    img = Image.fromarray((canvas * 255).astype(np.uint8), "RGB")
    out = Image.new("RGB", (img.width, img.height + 44), (12, 14, 20))
    out.paste(img, (0, 0))
    ImageDraw.Draw(out).text((14, img.height + 11), text, font=ImageFont.truetype(FONT_JP, 18), fill=(220, 230, 240))
    return out


def mock(assets, meta, info, aegis_level, pulse_level, name, text):
    with_mech, without, mask = mech_layer()
    zoom = info["zoom"]
    player = (info["player"]["x"], info["player"]["y"])
    nearest = min(info["enemies"], key=lambda e: (e["x"] - player[0]) ** 2 + (e["y"] - player[1]) ** 2)
    facing = math.atan2(nearest["y"] - player[1], nearest["x"] - player[0])
    canvas = without.copy()
    draw_territory_line(canvas, player, TERRITORY[aegis_level][1] * zoom)
    pulse = assets["r1-pulse"]
    paste(canvas, pulse, player, (pulse.shape[1] / 2, pulse.shape[0] / 2),
          PULSE_RADIUS[pulse_level] * zoom / meta["pulse"]["ring_radius_px"], mode="add", strength=0.8)
    scale = RENDER_TO_WORLD * zoom
    spots = sorted(shield_positions(aegis_level, player, zoom, facing), key=lambda p: p[1])
    crack, shield = assets["r1-crack"], assets["r1-shield"]
    for spot in spots:
        paste(canvas, crack, spot, meta["crack"]["pivot"], scale)
    behind = [s for s in spots if s[1] < player[1]]
    front = [s for s in spots if s[1] >= player[1]]
    for spot in behind:
        paste(canvas, shield, spot, meta["shield"]["pivot"], scale)
    canvas = canvas * (1 - mask) + with_mech * mask
    for spot in front:
        paste(canvas, shield, spot, meta["shield"]["pivot"], scale)
    canvas = draw_hud_icons(canvas, assets)
    caption(canvas, text).save(path(name), quality=90)


def sheet(assets):
    """Existing art and the new images side by side, at sizes good for judging detail."""
    font = ImageFont.truetype(FONT_JP, 16)
    small = ImageFont.truetype(FONT_JP, 13)
    frame = Image.open(path("game-regalia-nomech.png")).convert("RGB")
    ground = frame.crop((780, 120, 1000, 340)).resize((260, 260), Image.LANCZOS)
    tiles = [
        ("既存：REGALIA 本体", Image.open(os.path.join(REPO, "画像/player/ALM-01_REGALIA_BASTION/ALM_000.png")).convert("RGBA"), 260),
        ("既存：キャノン爆発", Image.open(os.path.join(REPO, "画像/skills/regalia_bastion_cannon/impact_04.png")).convert("RGBA"), 260),
        ("新：盾（Aegis Wall）", to_image(assets["r1-shield"]), 260),
        ("新：地面のひび", to_image(assets["r1-crack"]), 240),
        ("新：反撃波 1コマ", to_image(assets["r1-pulse"]), 260),
        ("新：アイコン Aegis", to_image(assets["r1-icon-aegis"]), 200),
        ("新：アイコン Pulse", to_image(assets["r1-icon-pulse"]), 200),
    ]
    cell_w, cell_h = 290, 330
    out = Image.new("RGB", (cell_w * len(tiles) + 20, cell_h * 2 + 150), (18, 20, 28))
    draw = ImageDraw.Draw(out)
    for row, background in enumerate(("ground", "grey")):
        for i, (label, img, size) in enumerate(tiles):
            x, y = 10 + i * cell_w, 10 + row * cell_h
            cell = ground.resize((cell_w - 10, cell_h - 40)) if background == "ground" else Image.new("RGB", (cell_w - 10, cell_h - 40), (96, 96, 104))
            out.paste(cell, (x, y))
            ratio = size / max(img.size)
            fitted = img.resize((max(1, round(img.width * ratio)), max(1, round(img.height * ratio))), Image.LANCZOS)
            if label.startswith("新：反撃波"):
                base = np.asarray(out.crop((x, y, x + cell_w - 10, y + cell_h - 40)), dtype=np.float32) / 255.0
                arr = np.asarray(fitted, dtype=np.float32) / 255.0
                ox, oy = (cell_w - 10 - fitted.width) // 2, (cell_h - 40 - fitted.height) // 2
                region = base[oy:oy + fitted.height, ox:ox + fitted.width]
                region += arr[..., :3] * arr[..., 3:4]
                out.paste(Image.fromarray((np.clip(base, 0, 1) * 255).astype(np.uint8)), (x, y))
            else:
                out.paste(fitted, (x + (cell_w - 10 - fitted.width) // 2, y + (cell_h - 40 - fitted.height) // 2), fitted)
            if row == 0:
                draw.text((x + 4, y + cell_h - 34), label, font=font, fill=(225, 232, 240))
    # icons at the sizes the game will use
    y = 20 + cell_h * 2
    draw.text((14, y), "アイコンの実寸：HUD 40px / カード 96px（ゲーム内の表示サイズ）", font=small, fill=(200, 210, 220))
    x = 14
    for key in ("r1-icon-aegis", "r1-icon-pulse"):
        for px in (40, 96):
            icon = to_image(assets[key]).resize((px, px), Image.LANCZOS)
            out.paste(icon, (x, y + 28 + (96 - px)), icon)
            x += px + 24
        x += 40
    out.save(path("r1-sheet.jpg"), quality=90)


def main():
    with open(path("r1-assets.json"), encoding="utf-8") as handle:
        meta = json.load(handle)
    with open(path("game-regalia.json"), encoding="utf-8") as handle:
        info = json.load(handle)
    assets = finals()
    mock(assets, meta, info, 1, 1, "r1-mock-territory-s1.jpg",
         "テリトリー S1：盾4枚・半径200 ＋ Counter Pulse S1（半径120）。境界の光の線は提案（当たり判定なし）")
    mock(assets, meta, info, 8, 8, "r1-mock-territory-s8.jpg",
         "テリトリー S8：盾10枚・半径300 ＋ Counter Pulse S8（半径200）。実際のゲーム画面に等倍で合成")
    sheet(assets)
    print("wrote r1-*-final.png, r1-mock-territory-s1.jpg, r1-mock-territory-s8.jpg, r1-sheet.jpg")


if __name__ == "__main__":
    main()
