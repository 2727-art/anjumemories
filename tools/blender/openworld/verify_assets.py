"""Check rendered open-world assets against WORLD_DESIGN.md 6.6-6.9 (Python 3.10+, Pillow, numpy).

    python tools/blender/openworld/verify_assets.py
    python tools/blender/openworld/verify_assets.py --manifest 画像/openworld/manifest.json

Checks: files exist, sizes match the manifest, opaque/transparent as expected, no duplicate keys,
2048 px limit, formats (JPG tiles / PNG otherwise), ground tile brightness, seams of repeating tiles
(and writes 2x2 previews to preview/), road-marking layout to the pixel, props (transparent border,
origin, footprint), building brightness (6.5), file-size and GPU budgets, and the "hash" of each asset
when the manifest has one (publish_manifest.py). Exit code 1 if any check fails.
"""

import argparse
import json
import os
import sys

import numpy as np
from PIL import Image

sys.dont_write_bytecode = True  # keep __pycache__ out of the repository
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from publish_manifest import asset_hash  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
DEFAULT_ROOT = os.path.join(REPO_ROOT, "画像", "openworld")
PREVIEW_DIR = os.path.join(HERE, "preview")

MAX_SIDE = 2048
BUDGET_GROUND_MB = 15.0  # tiles + markings + props
BUDGET_BUILDINGS_MB = 20.0
BUDGET_GPU_MB = 96.0
GROUND_LUMA = (0.35, 0.45)
SEAM_RATIO_LIMIT = 1.6
PROP_BORDER_ALPHA_MAX = 8  # of 255: sprites must fade out before their edge
# Building brightness (WORLD_DESIGN.md 6.5): mean sRGB luma of the south facade, its ground-floor
# shop band (bottom 64 px) and the roof.
FACADE_LUMA = (0.36, 0.38)
SHOP_BAND_LUMA_MIN = 0.30
ROOF_LUMA = (0.40, 0.50)

# Layout of the runtime textures in game.js (ensureOpenWorldTextures), in pixels.
DASH = {"period": 240, "on": 120, "margin": 3, "width": 10}
ZEBRA = {"period": 64, "on": 34}
EDGE = {"margin": 1, "width": 6}


class Report:
    def __init__(self):
        self.lines = []
        self.failures = 0

    def ok(self, message):
        self.lines.append(f"  ok    {message}")

    def fail(self, message):
        self.failures += 1
        self.lines.append(f"  FAIL  {message}")

    def info(self, message):
        self.lines.append(message)


def load(path):
    image = Image.open(path)
    image.load()
    return image


def luma(rgb):
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def seam_ratio(array, axis):
    """Mean step across the wrap-around edge divided by the mean step between neighbouring pixels."""
    a = array.astype(np.float32)
    if axis == 1:
        inner = np.abs(np.diff(a, axis=1)).mean()
        edge = np.abs(a[:, 0] - a[:, -1]).mean()
    else:
        inner = np.abs(np.diff(a, axis=0)).mean()
        edge = np.abs(a[0] - a[-1]).mean()
    return float(edge / max(inner, 1e-6))


def seamless(array, axis):
    """True when the wrap-around step looks like an ordinary step inside the tile.

    Plain textures pass on the mean-step ratio. Patterned tiles whose lines start at pixel 0 (parking
    stall lines, curb joints) have a large step at the wrap by design; they pass when that step is no
    larger than the steps the same pattern makes inside the tile (top 0.5 % of column/row steps).
    """
    a = array.astype(np.float32)
    steps = np.abs(np.diff(a, axis=axis)).mean(axis=0 if axis == 1 else 1)
    edge = float(np.abs(a[:, 0] - a[:, -1]).mean() if axis == 1 else np.abs(a[0] - a[-1]).mean())
    ratio = edge / max(float(steps.mean()), 1e-6)
    structural = float(np.percentile(steps, 99.5))
    return ratio < SEAM_RATIO_LIMIT or edge <= structural * 1.15, ratio


def tile_preview(image, key):
    """2x2 copies of the tile; large tiles are halved so preview/ stays small."""
    w, h = image.size
    if image.mode == "RGBA":
        backdrop = Image.new("RGBA", image.size, (118, 120, 124, 255))
        backdrop.alpha_composite(image)
        image = backdrop
    sheet = Image.new("RGB", (w * 2, h * 2))
    for i in range(2):
        for j in range(2):
            sheet.paste(image.convert("RGB"), (i * w, j * h))
    if w * 2 > 1024:
        sheet = sheet.resize((w, h), Image.LANCZOS)
    path = os.path.join(PREVIEW_DIR, f"tile-{key}-2x2.jpg")
    sheet.save(path, quality=88)
    return path


def expected_marking_mask(key, width, height):
    ys, xs = np.mgrid[0:height, 0:width]
    vertical = key.endswith("-v")
    if key.startswith("ow-edgeline"):
        along, across = (ys, xs) if vertical else (xs, ys)
        return (across >= EDGE["margin"]) & (across < EDGE["margin"] + EDGE["width"]), along
    if key.startswith("ow-dash"):
        along, across = (ys, xs) if vertical else (xs, ys)
        on = (along % DASH["period"]) < DASH["on"]
        inside = (across >= DASH["margin"]) & (across < DASH["margin"] + DASH["width"])
        return on & inside, along
    across = xs if vertical else ys
    return (across % ZEBRA["period"]) < ZEBRA["on"], across


def check_marking(report, key, image):
    rgba = np.asarray(image.convert("RGBA"))
    alpha = rgba[..., 3].astype(np.float32) / 255.0
    mask, along = expected_marking_mask(key, image.size[0], image.size[1])
    outside_max = alpha[~mask].max() if (~mask).any() else 0.0
    inside_mean = alpha[mask].mean()
    if outside_max == 0.0:
        report.ok(f"{key}: no paint outside the layout (gaps and margins alpha = 0)")
    else:
        report.fail(f"{key}: paint outside the layout (max alpha {outside_max:.3f})")
    if inside_mean > 0.4:
        report.ok(f"{key}: painted area mean alpha {inside_mean:.2f}")
    else:
        report.fail(f"{key}: painted area too faint (mean alpha {inside_mean:.2f})")
    if key.startswith("ow-edgeline"):
        # A continuous line: almost every position along it has some paint, and it tiles.
        axis = 1 if key.endswith("-v") else 0
        covered = float((alpha.max(axis=axis) > 0).mean())
        ratio = seam_ratio(alpha, 0 if key.endswith("-v") else 1)
        (report.ok if covered > 0.95 else report.fail)(f"{key}: paint along {covered * 100:.1f}% of the length")
        (report.ok if ratio < SEAM_RATIO_LIMIT else report.fail)(f"{key}: seamless along its length (edge/inner step ratio {ratio:.2f})")
        return
    # Every dash / bar must be present, starting at pixel 0.
    period = DASH["period"] if key.startswith("ow-dash") else ZEBRA["period"]
    on = DASH["on"] if key.startswith("ow-dash") else ZEBRA["on"]
    length = along.max() + 1
    segments = []
    for start in range(0, length, period):
        segment = mask & (along >= start) & (along < start + on)
        segments.append(alpha[segment].mean() if segment.any() else 0.0)
    weakest = min(segments)
    if weakest > 0.25 and length % period == 0:
        report.ok(f"{key}: {len(segments)} segments of {on} px every {period} px from pixel 0 (weakest mean alpha {weakest:.2f})")
    else:
        report.fail(f"{key}: segment check failed (count {len(segments)}, length {length}, weakest {weakest:.2f})")
    rows_repeat = key in ("ow-dash-v", "ow-zebra-h")  # pattern repeats down the rows
    first_on = int(np.argmax(alpha.max(axis=1 if rows_repeat else 0) > 0))
    if first_on == 0:
        report.ok(f"{key}: pattern starts at the first pixel")
    else:
        report.fail(f"{key}: pattern starts at pixel {first_on}, expected 0")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default=os.path.join(PREVIEW_DIR, "build-manifest.json"))
    parser.add_argument("--root", default=DEFAULT_ROOT)
    parser.add_argument("--out", default=os.path.join(PREVIEW_DIR, "build-verify.txt"))
    args = parser.parse_args()

    with open(args.manifest, encoding="utf-8") as handle:
        manifest = json.load(handle)
    report = Report()
    report.info(f"manifest: {os.path.relpath(args.manifest, REPO_ROOT)}  (Blender {manifest.get('blenderVersion')})")

    keys = [asset["key"] for asset in manifest["assets"]]
    duplicates = sorted({k for k in keys if keys.count(k) > 1})
    if duplicates:
        report.fail(f"duplicate keys: {duplicates}")
    else:
        report.ok(f"{len(keys)} unique keys")

    sizes = {"ground": 0, "buildings": 0}
    gpu_bytes = 0
    files_table = []

    def check_file(key, rel, expect_size, expect_alpha, category, expect_format):
        nonlocal gpu_bytes
        path = os.path.join(args.root, rel)
        if not os.path.exists(path):
            report.fail(f"{key}: missing {rel}")
            return None
        image = load(path)
        bytes_ = os.path.getsize(path)
        sizes[category] += bytes_
        gpu_bytes += image.size[0] * image.size[1] * 4
        files_table.append((rel, image.size, bytes_))
        if tuple(image.size) != tuple(expect_size):
            report.fail(f"{key}: {rel} is {image.size}, manifest says {tuple(expect_size)}")
        else:
            report.ok(f"{key}: {rel} {image.size[0]}x{image.size[1]}")
        if max(image.size) > MAX_SIDE:
            report.fail(f"{key}: {rel} exceeds {MAX_SIDE} px")
        if image.format != expect_format:
            report.fail(f"{key}: {rel} is {image.format}, expected {expect_format}")
        has_alpha = image.mode in ("RGBA", "LA") and np.asarray(image.getchannel("A")).min() < 255
        if expect_alpha and not has_alpha:
            report.fail(f"{key}: {rel} should be transparent")
        if not expect_alpha and has_alpha:
            report.fail(f"{key}: {rel} should be opaque")
        return image

    for asset in manifest["assets"]:
        key, kind = asset["key"], asset["type"]
        if kind == "tile":
            transparent = bool(asset.get("transparent"))
            image = check_file(key, asset["file"], (asset["width"], asset["height"]), transparent, "ground", "PNG" if transparent else "JPEG")
            if image is None:
                continue
            w, h = image.size
            strip = min(w, h) < 64  # curbs: repeat along their length only
            rgb = np.asarray(image.convert("RGB")).astype(np.float32) / 255.0
            gray = luma(rgb)
            if transparent:
                gray = np.asarray(image.getchannel("A")).astype(np.float32) / 255.0
            elif not strip:
                mean = float(gray.mean())
                if GROUND_LUMA[0] <= mean <= GROUND_LUMA[1]:
                    report.ok(f"{key}: mean sRGB luma {mean:.3f}")
                else:
                    report.fail(f"{key}: mean sRGB luma {mean:.3f} outside {GROUND_LUMA}")
            axes = [1 if w > h else 0] if strip else [1, 0]
            checks = {("x" if axis == 1 else "y"): seamless(gray, axis) for axis in axes}
            text = ", ".join(f"{name} {ratio:.2f}{'' if ratio < SEAM_RATIO_LIMIT else ' (pattern edge)'}" for name, (_, ratio) in checks.items())
            if all(ok for ok, _ in checks.values()):
                report.ok(f"{key}: seamless (edge/inner step ratio {text})")
            else:
                report.fail(f"{key}: visible seam (edge/inner step ratio {text})")
            if not strip:
                report.ok(f"{key}: 2x2 preview {os.path.relpath(tile_preview(image, key), REPO_ROOT)}")
        elif kind == "marking":
            image = check_file(key, asset["file"], (asset["width"], asset["height"]), True, "ground", "PNG")
            if image is not None:
                check_marking(report, key, image)
        elif kind == "prop":
            image = check_file(key, asset["file"], (asset["width"], asset["height"]), True, "ground", "PNG")
            if image is None:
                continue
            alpha = np.asarray(image.getchannel("A"))
            border = int(max(alpha[0].max(), alpha[-1].max(), alpha[:, 0].max(), alpha[:, -1].max()))
            (report.ok if border <= PROP_BORDER_ALPHA_MAX else report.fail)(f"{key}: border alpha max {border}/255 (limit {PROP_BORDER_ALPHA_MAX})")
            if asset.get("water"):
                mask = check_file(key, asset["water"], (asset["width"], asset["height"]), True, "ground", "PNG")
                if mask is not None:
                    water = np.asarray(mask.getchannel("A")).astype(np.float32) / 255.0
                    edge = float(max(water[0].max(), water[-1].max(), water[:, 0].max(), water[:, -1].max()))
                    outside = float((water[alpha < 26] > 0.1).mean()) if (alpha < 26).any() else 0.0
                    ok = water.max() > 0.5 and edge <= PROP_BORDER_ALPHA_MAX / 255.0 and outside < 0.001
                    (report.ok if ok else report.fail)(
                        f"{key}: water mask covers {float((water > 0.5).mean()) * 100:.1f}% of the sprite, inside the puddle, clear border")
            ox, oy = asset.get("origin", [0.5, 0.5])
            fw, fh = asset.get("footprint", [asset["width"], asset["height"]])
            ok = 0.0 <= ox <= 1.0 and 0.0 <= oy <= 1.0 and 0 < fw <= asset["width"] and 0 < fh <= asset["height"]
            (report.ok if ok else report.fail)(f"{key}: origin [{ox}, {oy}], footprint {fw}x{fh}")
        elif kind == "building":
            fw, fd = asset["footprint"]
            south_size = (fw, asset["floors"] * 64)
            roof = check_file(key, asset["roof"], (fw, fd), False, "buildings", "PNG")
            south = check_file(key, asset["south"], south_size, False, "buildings", "PNG")
            if roof is not None and south is not None:
                roof_luma = float(luma(np.asarray(roof.convert("RGB")).astype(np.float32) / 255.0).mean())
                south_rgb = np.asarray(south.convert("RGB")).astype(np.float32) / 255.0
                south_luma = float(luma(south_rgb).mean())
                band_luma = float(luma(south_rgb[-64:]).mean())
                (report.ok if FACADE_LUMA[0] <= south_luma <= FACADE_LUMA[1] else report.fail)(
                    f"{key}: south facade mean sRGB luma {south_luma:.3f} (target {FACADE_LUMA[0]}-{FACADE_LUMA[1]})")
                (report.ok if band_luma >= SHOP_BAND_LUMA_MIN else report.fail)(
                    f"{key}: shop band (bottom 64 px) luma {band_luma:.3f} (min {SHOP_BAND_LUMA_MIN})")
                (report.ok if ROOF_LUMA[0] <= roof_luma <= ROOF_LUMA[1] else report.fail)(
                    f"{key}: roof mean sRGB luma {roof_luma:.3f} (target {ROOF_LUMA[0]}-{ROOF_LUMA[1]})")
            if asset.get("roofEmit"):
                check_file(key, asset["roofEmit"], (fw, fd), True, "buildings", "PNG")
            if asset.get("southEmit"):
                check_file(key, asset["southEmit"], south_size, True, "buildings", "PNG")
        else:
            report.fail(f"{key}: unknown type {kind}")
            continue
        if "hash" in asset:
            try:
                actual = asset_hash(args.root, asset)
            except OSError:
                continue  # the missing file is already reported above
            if actual == asset["hash"]:
                report.ok(f"{key}: hash {actual}")
            else:
                report.fail(f"{key}: hash {asset['hash']} in the manifest, files hash to {actual} (run publish_manifest.py)")

    mb = lambda b: b / (1024 * 1024)
    report.info("")
    report.info("files:")
    for rel, size, bytes_ in files_table:
        report.info(f"  {rel:42s} {size[0]:5d}x{size[1]:<5d} {bytes_ / 1024:8.1f} KB")
    report.info("")
    for category, budget in (("ground", BUDGET_GROUND_MB), ("buildings", BUDGET_BUILDINGS_MB)):
        line = f"{category} total {mb(sizes[category]):.2f} MB (budget {budget:.0f} MB)"
        (report.ok if mb(sizes[category]) <= budget else report.fail)(line)
    line = f"GPU memory estimate {mb(gpu_bytes):.1f} MB (budget {BUDGET_GPU_MB:.0f} MB)"
    (report.ok if mb(gpu_bytes) <= BUDGET_GPU_MB else report.fail)(line)
    report.info("")
    report.info("RESULT: " + ("OK" if report.failures == 0 else f"{report.failures} failure(s)"))

    text = "\n".join(report.lines) + "\n"
    print(text)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    sys.exit(0 if report.failures == 0 else 1)


if __name__ == "__main__":
    main()
