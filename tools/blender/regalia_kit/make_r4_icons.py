"""R4: the Aegis Wall / Counter Pulse skill icons for the game (docs/regalia-kit-design.md 10, 11).

Run after `make_r1_mock.py` (repository root, Python 3 with Pillow):

  python tools/blender/regalia_kit/make_r4_icons.py

Scales the approved R1 icons (preview/r1-icon-<name>-final.png, 256 px, glow and outline baked)
down to 128 px, enough for the level-up card and the HUD, and writes them next to each skill's
other images as icon_r1.png.
"""

import os

from PIL import Image

from make_r1_mock import REPO, path

ICON_SIZE = 128
ICONS = {
    "aegis": os.path.join(REPO, "画像", "skills", "regalia_aegis_wall", "icon_r1.png"),
    "pulse": os.path.join(REPO, "画像", "skills", "regalia_counter_pulse", "icon_r1.png"),
}


def main():
    for name, target in ICONS.items():
        icon = Image.open(path(f"r1-icon-{name}-final.png")).convert("RGBA")
        os.makedirs(os.path.dirname(target), exist_ok=True)
        icon.resize((ICON_SIZE, ICON_SIZE), Image.LANCZOS).save(target, optimize=True)
        print(f"wrote the {name} icon ({ICON_SIZE} px)")


if __name__ == "__main__":
    main()
