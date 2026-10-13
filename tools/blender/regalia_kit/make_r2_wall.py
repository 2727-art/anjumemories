"""R2b: the Aegis Wall shield in 8 directions (docs/regalia-kit-design.md 4, 11).

Run after `build_r1.py -- --only shield-dirs` (repository root, Python 3 with Pillow and numpy):

  python tools/blender/regalia_kit/make_r2_wall.py

Bakes the glow and the 1 px outline into each direction (same treatment as the approved R1
shield), writes them to 画像/skills/regalia_aegis_wall/shield_r2_<dir>.png for the game, and a
review sheet preview/r2-shield-dirs.jpg with the directions laid out like a compass.
"""

import json
import os
import shutil

from PIL import Image, ImageDraw, ImageFont

from make_r1_mock import FONT_JP, PREVIEW, REPO, add_outline, bake_glow, load, path, to_image

DIRECTIONS = ("e", "se", "s", "sw", "w", "nw", "n", "ne")
GAME_DIR = os.path.join(REPO, "画像", "skills", "regalia_aegis_wall")
# Compass cell (column, row) of each direction on the review sheet; the mech sits in the middle.
LAYOUT = {"nw": (0, 0), "n": (1, 0), "ne": (2, 0), "w": (0, 1), "e": (2, 1), "sw": (0, 2), "s": (1, 2), "se": (2, 2)}
LABELS = {"n": "北（背面）", "ne": "北東", "e": "東（横）", "se": "南東", "s": "南（正面）", "sw": "南西", "w": "西（横）", "nw": "北西"}


def main():
    os.makedirs(GAME_DIR, exist_ok=True)
    finals = {}
    for name in DIRECTIONS:
        rgba = add_outline(bake_glow(load(f"r2-shield-{name}.png"), load(f"r2-shield-{name}_emit.png")))
        finals[name] = to_image(rgba)
        finals[name].save(path(f"r2-shield-{name}-final.png"))
        shutil.copyfile(path(f"r2-shield-{name}-final.png"), os.path.join(GAME_DIR, f"shield_r2_{name}.png"))

    with open(path("r1-assets.json"), encoding="utf-8") as handle:
        pivot = json.load(handle)["shield-dirs"]["s"]["pivot"]
    frame = Image.open(path("game-regalia-nomech.png")).convert("RGB")
    ground = frame.crop((760, 100, 1020, 420)).resize((300, 360), Image.LANCZOS)
    cell_w, cell_h = 300, 360
    sheet = Image.new("RGB", (cell_w * 3 + 40, cell_h * 3 + 90), (18, 20, 28))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(FONT_JP, 18)
    for name, (col, row) in LAYOUT.items():
        x, y = 20 + col * cell_w, 20 + row * cell_h
        sheet.paste(ground, (x, y))
        image = finals[name]
        sheet.paste(image, (x + cell_w // 2 - round(pivot[0]), y + cell_h - 50 - round(pivot[1])), image)
        draw.text((x + 8, y + 8), f"{LABELS[name]}を向いた盾", font=font, fill=(230, 236, 244))
    centre = (20 + cell_w, 20 + cell_h)
    sheet.paste(ground, centre)
    draw.text((centre[0] + 70, centre[1] + 160), "REGALIA（中央）", font=font, fill=(230, 236, 244))
    draw.text((20, cell_h * 3 + 40), "Aegis Wall 8方向（2倍解像度）。盾の正面が向いている方向ごと。北向きの壁は背面（紺の裏板・金の補強・鋼の杭）が見える",
              font=ImageFont.truetype(FONT_JP, 16), fill=(200, 210, 220))
    sheet.save(path("r2-shield-dirs.jpg"), quality=90)
    print("wrote r2-shield-<dir>-final.png, 画像/skills/regalia_aegis_wall/shield_r2_<dir>.png, r2-shield-dirs.jpg")


if __name__ == "__main__":
    main()
