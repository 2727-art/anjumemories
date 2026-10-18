"""V2: Counter Pulse's guard shields (docs/regalia-kit-design.md 12.6).

Run after build_r1.py (--only guard-dirs) and capture_counter.cjs (repository root, Python 3 with
Pillow and numpy):

  python tools/blender/regalia_kit/make_v2_guard.py

Bakes the glow and the 1 px outline into each facing (as the wall shields), halves them (128x160;
the game draws them at REGALIA_COUNTER_PULSE_CONFIG.guard.scale) and writes them to
画像/skills/regalia_counter_pulse/guard_v2_<facing>.png. Also writes preview/v2-mock-guard.jpg: four
shields orbiting the mech in the crowded frame, north ones behind the mech and south ones in front.
"""

import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from make_r1_mock import FONT_JP, REPO, add_outline, bake_glow, load, paste, path, to_image
from make_v1_counter import frame, mask_between

FACINGS = ("se", "s", "sw")
GAME_DIR = os.path.join(REPO, "画像", "skills", "regalia_counter_pulse")
HALF = 0.5               # the game images are half the render size
GAME_SCALE = 0.75        # of the half-size image: about 62 x 78 world px
ORBIT_RADIUS = 125       # world px
ORBIT_SQUASH = 0.74      # the orbit is seen from above at an angle, as Orbit Core's
HOVER = 12               # world px between the orbit point and the shield's tip


def main():
    os.makedirs(GAME_DIR, exist_ok=True)
    with open(path("r1-assets.json"), encoding="utf-8") as handle:
        pivot = json.load(handle)["guard-dirs"]["s"]["pivot"]
    shields = {}
    for name in FACINGS:
        rgba = add_outline(bake_glow(load(f"v2-guard-{name}.png"), load(f"v2-guard-{name}_emit.png")))
        full = to_image(rgba)
        full.save(path(f"v2-guard-{name}-final.png"))
        half = full.resize((round(full.width * HALF), round(full.height * HALF)), Image.LANCZOS)
        half.save(os.path.join(GAME_DIR, f"guard_v2_{name}.png"), optimize=True)
        shields[name] = np.asarray(half, dtype=np.float32) / 255.0

    with open(path("v1-game.json"), encoding="utf-8") as handle:
        info = json.load(handle)
    full_frame, nomech, noenemy, ground = (frame(f"v1-game{suffix}.png") for suffix in ("", "-nomech", "-noenemy", "-ground"))
    enemy_mask, mech_mask = mask_between(nomech, ground), mask_between(noenemy, ground)
    zoom = info["zoom"]
    center = (info["player"]["x"], info["player"]["y"])
    half_pivot = (pivot[0] * HALF, pivot[1] * HALF)
    canvas = ground * (1 - enemy_mask) + nomech * enemy_mask
    spots = []
    for index in range(4):
        angle = math.radians(20) + math.tau * index / 4
        x = center[0] + math.cos(angle) * ORBIT_RADIUS * zoom
        y = center[1] + math.sin(angle) * ORBIT_RADIUS * ORBIT_SQUASH * zoom
        name = "se" if math.cos(angle) > 0.38 else ("sw" if math.cos(angle) < -0.38 else "s")
        spots.append((math.sin(angle) >= 0, (x, y - HOVER * zoom), name, index))
    for front, spot, name, index in spots:
        if not front:
            alpha = 1.0 if index != 3 else 0.3  # one shield used up, coming back
            paste(canvas, shields[name], spot, half_pivot, GAME_SCALE * zoom, strength=alpha)
    canvas = canvas * (1 - mech_mask) + noenemy * mech_mask
    for front, spot, name, index in spots:
        if front:
            paste(canvas, shields[name], spot, half_pivot, GAME_SCALE * zoom, strength=1.0 if index != 3 else 0.3)
    img = Image.fromarray((np.clip(canvas, 0, 1) * 255).astype(np.uint8), "RGB")
    crop = img.crop((360, 150, 920, 570))
    out = Image.new("RGB", (crop.width, crop.height + 34), (12, 14, 20))
    out.paste(crop, (0, 0))
    ImageDraw.Draw(out).text((10, crop.height + 7), "S8：4 枚が回る（1 枚は使用後で戻り待ち＝薄く表示）", font=ImageFont.truetype(FONT_JP, 17), fill=(220, 230, 240))
    out.save(path("v2-mock-guard.jpg"), quality=90)
    print("wrote v2-guard-*-final.png, the three game images and v2-mock-guard.jpg")


if __name__ == "__main__":
    main()
