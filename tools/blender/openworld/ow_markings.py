"""Road markings (WORLD_DESIGN.md 6.6 B): transparent, white to light grey paint, tinted in game.

The paint layout is defined in output pixels so it matches the runtime textures in game.js
(ensureOpenWorldTextures) exactly; wear only lowers alpha inside the painted area. Rendering uses a
1 px box filter so nothing bleeds into the gaps and margins. Wear noise repeats with the image so the
textures tile along their length.
"""

import os

import ow_common as ow

MARKINGS = {
    # 120 px line + 120 px gap, 8 times; line 10 px wide with 3 px margins. Starts at the top.
    "ow-dash-v": {"size": (16, 1920), "file": "markings/ow-dash-v.png", "kind": "dash", "along": "y", "period": [16, 240], "seed": 21.0},
    "ow-dash-h": {"size": (1920, 16), "file": "markings/ow-dash-h.png", "kind": "dash", "along": "x", "period": [240, 16], "seed": 22.0},
    # 34 px bar + 30 px gap (64 px period), 11 times. Bars run along the road; starts at the left/top.
    "ow-zebra-v": {"size": (704, 150), "file": "markings/ow-zebra-v.png", "kind": "zebra", "along": "y", "period": [64, 150], "seed": 23.0},
    "ow-zebra-h": {"size": (150, 704), "file": "markings/ow-zebra-h.png", "kind": "zebra", "along": "x", "period": [150, 64], "seed": 24.0},
    # Road edge line (new): continuous, 6 px wide with 1 px margins, repeats every 2048 px.
    "ow-edgeline-v": {"size": (8, 2048), "file": "markings/ow-edgeline-v.png", "kind": "edge", "along": "y", "period": [8, 2048], "seed": 25.0},
    "ow-edgeline-h": {"size": (2048, 8), "file": "markings/ow-edgeline-h.png", "kind": "edge", "along": "x", "period": [2048, 8], "seed": 26.0},
}

DASH = {"period": 240, "on": 120, "margin": 3, "width": 10}
ZEBRA = {"period": 64, "on": 34}
EDGE = {"margin": 1, "width": 6}
PAINT_ALPHA = 0.93
PAINT_COLOR = (0.86, 0.86, 0.84)


EDGE_EPS_PX = 0.002  # keeps float error at pixel borders from leaking paint into gaps and margins


def _between(nb, value, low, high):
    return nb.mul(nb.math("GREATER_THAN", value, low + EDGE_EPS_PX), nb.math("LESS_THAN", value, high - EDGE_EPS_PX))


def paint_mask(nb, spec, px, py):
    """1 inside the painted layout, 0 outside. px from the left edge, py from the top edge (pixels)."""
    along, across = (py, px) if spec["along"] == "y" else (px, py)
    if spec["kind"] == "dash":
        on = _between(nb, nb.math("MODULO", along, DASH["period"]), 0.0, DASH["on"])
        inside = _between(nb, across, DASH["margin"], DASH["margin"] + DASH["width"])
        return nb.mul(on, inside)
    if spec["kind"] == "edge":
        return _between(nb, across, EDGE["margin"], EDGE["margin"] + EDGE["width"])
    return _between(nb, nb.math("MODULO", across, ZEBRA["period"]), 0.0, ZEBRA["on"])


def marking_material(spec, width_m, height_m):
    material, nb = ow.new_material("ow_paint")
    pos = nb.position()
    x, y, _ = nb.separate(pos)
    px = nb.mul(x, ow.PX_PER_M)
    py = nb.mul(nb.sub(height_m, y), ow.PX_PER_M)
    mask = paint_mask(nb, spec, px, py)

    # Repeat period of the image in metres (only along the direction the texture tiles).
    if spec["kind"] in ("dash", "edge"):
        period_x = width_m if spec["along"] == "x" else None
        period_y = height_m if spec["along"] == "y" else None
    else:  # crosswalk bars repeat across the road
        period_x = width_m if spec["along"] == "y" else None
        period_y = height_m if spec["along"] == "x" else None
    tiled = period_x or period_y
    grain_repeat = round(tiled / 3.0)
    grain_vec = nb.vscale(nb.uv(), grain_repeat / tiled)  # asphalt_02 under the paint, whole repeats
    seed = spec["seed"]
    stretch = (1.0, 0.25) if spec["along"] == "y" else (0.25, 1.0)  # wear streaks follow traffic

    grain = nb.map_range(nb.tex("asphalt_02", "displacement", grain_vec), 0.45, 0.72, 0.5, 1.0)
    erosion = nb.map_range(nb.pnoise(pos, period_x, period_y, scale=0.7, detail=5.0, seed=seed, stretch=stretch).outputs["Fac"], 0.55, 0.75, 0.0, 1.0, smooth=True)
    flakes = nb.map_range(nb.pnoise(pos, period_x, period_y, scale=12.0, detail=2.0, roughness=0.4, seed=seed + 1).outputs["Fac"], 0.70, 0.73, 0.0, 1.0)
    alpha = nb.mul(nb.mul(mask, PAINT_ALPHA), grain)
    alpha = nb.mul(alpha, nb.sub(1.0, nb.mul(erosion, 0.7)))
    alpha = nb.mul(alpha, nb.sub(1.0, flakes))
    if spec["kind"] == "zebra":
        # Tyre tracks: bands of heavier wear along the direction of travel.
        band_stretch = (1.0, 0.04) if spec["along"] == "y" else (0.04, 1.0)
        tracks = nb.map_range(nb.pnoise(pos, period_x, period_y, scale=0.55, detail=2.0, seed=seed + 2, stretch=band_stretch).outputs["Fac"], 0.5, 0.66, 0.0, 0.6, smooth=True)
        alpha = nb.mul(alpha, nb.sub(1.0, tracks))

    dirt = nb.pnoise(pos, period_x, period_y, scale=1.6, detail=4.0, seed=seed + 3).outputs["Fac"]
    color = nb.mix(nb.map_range(dirt, 0.42, 0.62, 0.0, 0.3), PAINT_COLOR, (0.72, 0.71, 0.68), blend="MULTIPLY")
    paint = nb.principled(color, roughness=0.7, specular=0.3, normal=nb.bump(grain, strength=0.3, distance=0.004))
    nb.output(nb.mix_shader(alpha, nb.transparent(), paint))
    return material


def build(key, out_root, samples_scale=1.0):
    spec = MARKINGS[key]
    width, height = spec["size"]
    width_m, height_m = width * ow.M_PER_PX, height * ow.M_PER_PX
    scene = ow.reset_scene()
    ow.setup_render(scene, width, height, samples=max(16, int(128 * samples_scale)), transparent=True,
                    box_filter=True, denoise=False, dither=0.0)
    ow.setup_world(scene)
    ow.add_ortho_camera_top(scene, 0.0, 0.0, width_m, height_m)
    material = marking_material(spec, width_m, height_m)
    ow.plane_xy("paint", -1.0, -1.0, width_m + 1.0, height_m + 1.0, 0.0, material)  # margin: no edge misses
    out_path = os.path.join(out_root, spec["file"])
    ow.render_still(scene, out_path, "PNG", rgba=True)
    ow.save_blend(os.path.join(ow.WORK_DIR, f"{key}.blend"))
    return [{"key": key, "type": "marking", "file": spec["file"], "width": width, "height": height, "period": spec["period"]}]
