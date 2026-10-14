"""V1 review images: the counter wave made distinct (docs/regalia-kit-design.md 12.5).

Run after build_r1.py (--only counter-ring,counter-emblem) and capture_counter.cjs (repository
root, Python 3 with Pillow and numpy):

  python tools/blender/regalia_kit/make_v1_counter.py

Writes to tools/blender/regalia_kit/preview/:
  v1-counter-ring-final.png    the gold ring with its glow baked in (straight alpha, drawn additively)
  v1-counter-emblem-final.png  the crest with its glow baked in (straight alpha, drawn additively)
  v1-mock-counter.jpg          today's counter next to the new one at 0.05 / 0.15 / 0.35 s
  v1-mock-counter-full.jpg     the whole screen at 0.15 s
  v1-sheet.jpg                 the two images on their own

Layers follow the game: the ground, then the waves and the crest (depth 16.3, under enemies at 18
and the mech at 20), then the enemies, the mech and the COUNTER text. Timings are the planned
game values (the ring tween is Cubic.easeOut; the fade is linear).
"""

import json
import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from make_r1_mock import FONT_JP, additive_to_rgba, blur, paste, path, to_image

S8_RADIUS = 200          # Counter Pulse S8 pulseRadius (world px)
AUTO_MS = 300            # REGALIA_COUNTER_PULSE_CONFIG.ringDurationMs (today, every wave)
COUNTER_MS = 450         # V1: the counter ring takes longer
SECOND_RING_DELAY_MS = 60
FLASH_MS = 100
FLASH_RADIUS = 120       # world px
EMBLEM_RADIUS = 150      # world px (the crest's outer rim; larger than the mech's footprint)
EMBLEM_IN_MS, EMBLEM_HOLD_MS, EMBLEM_OUT_MS = 80, 250, 550
EMBLEM_ALPHA = 0.85     # peak opacity, so the ground and the enemies at the mech's feet stay readable
TEXT_FONT = "C:/Windows/Fonts/segoeuib.ttf"
CROP = (360, 150, 920, 570)  # around the mech (screen px)


def ease_out_cubic(p):
    p = min(1.0, max(0.0, p))
    return 1.0 - (1.0 - p) ** 3


def ring_state(t_ms, duration, alpha):
    """Scale progress and alpha of a ring tween as in spawnRegaliaCounterPulseVisual."""
    p = ease_out_cubic(t_ms / duration)
    fade_start = duration * 0.45
    fade = 1.0 if t_ms <= fade_start else max(0.0, 1.0 - (t_ms - fade_start) / (duration * 0.55))
    return 0.35 + 0.65 * p, alpha * fade


def final_additive(name, glow_radius=4.0, glow_gain=0.35):
    rgb = np.asarray(Image.open(path(f"{name}.png")).convert("RGB"), dtype=np.float32) / 255.0
    rgba = additive_to_rgba(np.clip(rgb + blur(rgb, glow_radius) * glow_gain, 0, 1))
    to_image(rgba).save(path(f"{name}-final.png"))
    return rgba


def frame(name):
    return np.asarray(Image.open(path(name)).convert("RGB"), dtype=np.float32) / 255.0


def mask_between(a, b):
    diff = np.abs(a - b).max(axis=2)
    mask = Image.fromarray(((diff > 6 / 255.0) * 255).astype(np.uint8), "L").filter(ImageFilter.MaxFilter(3))
    return (np.asarray(mask.filter(ImageFilter.GaussianBlur(0.7)), dtype=np.float32) / 255.0)[..., None]


def add_circle_line(canvas, center, radius, width, color, strength):
    """A thin glowing circle, as the game would draw it with Graphics (additive)."""
    h, w = canvas.shape[:2]
    layer = Image.new("RGB", (w, h), (0, 0, 0))
    box = (center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius)
    ImageDraw.Draw(layer).ellipse(box, outline=color, width=width)
    line = np.asarray(layer, dtype=np.float32) / 255.0
    glow = np.asarray(layer.filter(ImageFilter.GaussianBlur(4)), dtype=np.float32) / 255.0
    canvas += (line + glow * 0.8) * strength
    np.clip(canvas, 0, 1, out=canvas)


def add_flash(canvas, center, radius, strength):
    h, w = canvas.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.hypot(xx - center[0], yy - center[1]) / radius
    falloff = np.clip(1.0 - d, 0.0, 1.0) ** 2
    canvas += falloff[..., None] * np.array([1.0, 0.95, 0.82], dtype=np.float32) * strength
    np.clip(canvas, 0, 1, out=canvas)


def draw_counter_text(img, anchor, t_ms):
    """COUNTER above the mech: pops from 1.35x to 1x in 0.1 s, rises 24 px and fades after 0.35 s."""
    if t_ms < 30:
        return img
    pop = 1.0 + 0.35 * (1.0 - ease_out_cubic((t_ms - 30) / 100.0))
    alpha = 1.0 if t_ms < 350 else max(0.0, 1.0 - (t_ms - 350) / 250.0)
    rise = 24.0 * min(1.0, t_ms / 600.0)
    font = ImageFont.truetype(TEXT_FONT, round(30 * pop))
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    xy = (anchor[0], anchor[1] - rise)
    draw.text(xy, "COUNTER", font=font, anchor="mm", fill=(255, 216, 107, round(255 * alpha)),
              stroke_width=4, stroke_fill=(42, 26, 8, round(235 * alpha)))
    base = img.convert("RGBA")
    base.alpha_composite(layer)
    return base.convert("RGB")


def compose(layers, assets, info, t_ms, kind):
    ground, nomech, noenemy, enemy_mask, mech_mask = layers
    zoom = info["zoom"]
    center = (info["player"]["x"], info["player"]["y"])
    canvas = ground.copy()
    ring_px = S8_RADIUS * zoom
    if kind == "today":
        scale, alpha = ring_state(t_ms, AUTO_MS, 1.0)
        ring = assets["blue"]
        paste(canvas, ring, center, (ring.shape[1] / 2, ring.shape[0] / 2), scale * ring_px / 200.0, mode="add", strength=alpha)
    else:
        add_flash(canvas, center, FLASH_RADIUS * zoom, max(0.0, 1.0 - t_ms / FLASH_MS) * 0.9)
        emblem = assets["emblem"]
        appear = min(1.0, t_ms / EMBLEM_IN_MS)
        fade = 1.0 if t_ms <= EMBLEM_HOLD_MS else max(0.0, 1.0 - (t_ms - EMBLEM_HOLD_MS) / (EMBLEM_OUT_MS - EMBLEM_HOLD_MS))
        emblem_scale = (0.8 + 0.2 * ease_out_cubic(t_ms / 100.0)) * EMBLEM_RADIUS * zoom / 184.0
        paste(canvas, emblem, center, (emblem.shape[1] / 2, emblem.shape[0] / 2), emblem_scale, mode="add", strength=appear * fade * EMBLEM_ALPHA)
        scale, alpha = ring_state(t_ms, COUNTER_MS, 1.0)
        ring = assets["gold"]
        paste(canvas, ring, center, (ring.shape[1] / 2, ring.shape[0] / 2), scale * ring_px / 200.0, mode="add", strength=alpha)
        if t_ms > SECOND_RING_DELAY_MS:
            scale2, alpha2 = ring_state(t_ms - SECOND_RING_DELAY_MS, COUNTER_MS, 0.9)
            add_circle_line(canvas, center, scale2 * ring_px, 3, (255, 243, 208), alpha2)
    canvas = canvas * (1 - enemy_mask) + nomech * enemy_mask
    canvas = canvas * (1 - mech_mask) + noenemy * mech_mask
    img = Image.fromarray((np.clip(canvas, 0, 1) * 255).astype(np.uint8), "RGB")
    if kind == "new":
        sprite = info["playerSprite"]
        img = draw_counter_text(img, (sprite["x"], sprite["y"] - sprite["height"] * 0.42), t_ms)
    return img


def labelled(img, text, font):
    out = Image.new("RGB", (img.width, img.height + 34), (12, 14, 20))
    out.paste(img, (0, 0))
    ImageDraw.Draw(out).text((10, img.height + 7), text, font=font, fill=(220, 230, 240))
    return out


def sheet(assets):
    font = ImageFont.truetype(FONT_JP, 16)
    ground = frame("v1-game-ground.png").copy()
    tiles = [("新：紋章（反撃の瞬間に地面へ）", assets["emblem"]), ("新：金の輪（反撃）", assets["gold"]), ("今：青い輪（自動・反撃とも）", assets["blue"])]
    cell = 360
    out = Image.new("RGB", (cell * len(tiles) + 20, cell * 2 + 60), (18, 20, 28))
    patch = Image.fromarray((ground[180:540, 460:820] * 255).astype(np.uint8), "RGB").resize((cell - 10, cell - 10))
    for i, (label, rgba) in enumerate(tiles):
        for row in range(2):
            x, y = 10 + i * cell, 10 + row * cell
            base = np.asarray(patch if row == 0 else Image.new("RGB", (cell - 10, cell - 10), (8, 8, 12)), dtype=np.float32) / 255.0
            paste(base, rgba, ((cell - 10) / 2, (cell - 10) / 2), (rgba.shape[1] / 2, rgba.shape[0] / 2), (cell - 30) / rgba.shape[0], mode="add")
            out.paste(Image.fromarray((np.clip(base, 0, 1) * 255).astype(np.uint8)), (x, y))
        ImageDraw.Draw(out).text((x + 4, 10 + cell * 2 + 4), label, font=font, fill=(225, 232, 240))
    out.save(path("v1-sheet.jpg"), quality=90)


def main():
    with open(path("v1-game.json"), encoding="utf-8") as handle:
        info = json.load(handle)
    assets = {
        "gold": final_additive("v1-counter-ring"),
        "emblem": final_additive("v1-counter-emblem", glow_radius=5.0, glow_gain=0.45),
        "blue": np.asarray(Image.open(path("r1-pulse-final.png")).convert("RGBA"), dtype=np.float32) / 255.0,
    }
    full, nomech, noenemy, ground = (frame(f"v1-game{suffix}.png") for suffix in ("", "-nomech", "-noenemy", "-ground"))
    layers = (ground, nomech, noenemy, mask_between(nomech, ground), mask_between(noenemy, ground))
    font = ImageFont.truetype(FONT_JP, 17)
    panels = [
        ("今の反撃：自動と同じ青い輪（0.15秒）", compose(layers, assets, info, 150, "today")),
        ("新しい反撃 0.05秒：閃光と紋章", compose(layers, assets, info, 50, "new")),
        ("0.15秒：金の輪 2 枚と COUNTER", compose(layers, assets, info, 150, "new")),
        ("0.35秒：消えていく", compose(layers, assets, info, 350, "new")),
    ]
    tiles = [labelled(img.crop(CROP), text, font) for text, img in panels]
    w, h = tiles[0].size
    grid = Image.new("RGB", (w * 2 + 10, h * 2 + 10), (12, 14, 20))
    for i, tile in enumerate(tiles):
        grid.paste(tile, ((i % 2) * (w + 10), (i // 2) * (h + 10)))
    grid.save(path("v1-mock-counter.jpg"), quality=90)
    labelled(panels[2][1], "新しい反撃 0.15秒（S8 半径200、敵 49 体）。自動の波は今の青い輪のまま", font).save(path("v1-mock-counter-full.jpg"), quality=90)
    sheet(assets)
    print("wrote v1-*-final.png, v1-mock-counter.jpg, v1-mock-counter-full.jpg, v1-sheet.jpg")


if __name__ == "__main__":
    main()
