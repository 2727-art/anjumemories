"""Ground tiles (WORLD_DESIGN.md 6.6 A): opaque, seamless, top-down, uniform sky only.

Seamless by construction: every image texture repeats a whole number of times per tile and all
procedural noise is embedded on a torus with the tile size as its period (Nodes.periodic). The
ground plane covers 3x3 tiles so lighting near the edges matches the neighbouring tile.
"""

import os

import ow_common as ow

GROUND_TILES = {
    "ow-asphalt-a": {"size": (1024, 1024), "file": "ground/ow-asphalt-a.jpg", "target_luma": 0.37, "seed": 1.0},
    "ow-sidewalk": {"size": (512, 512), "file": "ground/ow-sidewalk.jpg", "target_luma": 0.42, "seed": 2.0},
}


def asphalt_material(tile_m, seed):
    material, nb = ow.new_material("ow_asphalt_a")
    uv = nb.uv()  # metres
    pos = nb.position()  # metres (identity transforms)
    period = (tile_m, tile_m)

    base_vec = nb.vscale(uv, 1.0 / tile_m)  # aerial_asphalt_01 (30 m) once per tile
    detail_vec = nb.vscale(uv, 8.0 / tile_m)  # asphalt_02 (3 m) eight times per tile
    base = nb.tex("aerial_asphalt_01", "color", base_vec)
    detail = nb.tex("asphalt_02", "color", detail_vec)
    color = nb.mix(0.45, nb.hsv(base, saturation=0.55), detail, blend="SOFT_LIGHT")

    # Broad sand/dust drifts (lighter, warm) and darker tyre-worn bands.
    dust = nb.pnoise(pos, *period, scale=0.08, detail=3.0, seed=seed).outputs["Fac"]
    color = nb.mix(nb.map_range(dust, 0.55, 0.80, 0.0, 0.2, smooth=True), color, (0.50, 0.47, 0.42))
    grime = nb.pnoise(pos, *period, scale=0.16, detail=4.0, seed=seed + 11).outputs["Fac"]
    color = nb.mix(nb.map_range(grime, 0.42, 0.30, 0.0, 0.45, smooth=True), color, (0.55, 0.54, 0.52), blend="MULTIPLY")

    # Oil stains: dark, slightly glossy blotches.
    oil_noise = nb.pnoise(pos, *period, scale=0.32, detail=6.0, roughness=0.62, distortion=0.5, seed=seed + 3).outputs["Fac"]
    oil = nb.map_range(oil_noise, 0.63, 0.71, 0.0, 1.0, smooth=True)
    color = nb.mix(nb.mul(oil, 0.75), color, (0.30, 0.29, 0.28), blend="MULTIPLY")

    # Fine cracks: wiggly cell edges, broken up so only part of each edge is cracked.
    cracks = nb.pvoronoi(pos, *period, scale=0.12, feature="DISTANCE_TO_EDGE", seed=seed + 7)
    crack_line = nb.map_range(cracks.outputs["Distance"], 0.0, 0.0055, 1.0, 0.0)
    crack_keep = nb.map_range(nb.pnoise(pos, *period, scale=0.45, detail=2.0, seed=seed + 9).outputs["Fac"], 0.50, 0.58, 0.0, 1.0)
    crack = nb.mul(crack_line, crack_keep)
    color = nb.mix(nb.mul(crack, 0.6), color, (0.25, 0.24, 0.23), blend="MULTIPLY")

    gain = nb.value(1.0, "albedo_gain")
    albedo = nb.vscale(color, gain.outputs[0])

    rough = nb.tex("aerial_asphalt_01", "roughness", base_vec)
    rough = nb.mixf(oil, rough, 0.45)
    height = nb.sub(nb.mul(nb.tex("asphalt_02", "displacement", detail_vec), 0.6), nb.mul(crack, 0.8))
    normal = nb.bump(height, strength=0.6, distance=0.01, normal=nb.normal_map(nb.tex("aerial_asphalt_01", "normal", base_vec), 1.0))
    nb.output(nb.principled(albedo, roughness=rough, normal=normal, specular=0.35))
    return material, gain


def sidewalk_material(tile_m, seed, repeats=7):
    material, nb = ow.new_material("ow_sidewalk")
    uv = nb.uv()
    pos = nb.position()
    period = (tile_m, tile_m)

    pav_vec = nb.vscale(uv, repeats / tile_m)  # concrete_pavers (1.92 m) -> 1.83 m, 7 per tile
    color = nb.hsv(nb.tex("concrete_pavers", "color", pav_vec), saturation=0.4, value=1.05)
    ao = nb.tex("concrete_pavers", "ao", pav_vec)
    color = nb.mix(0.8, color, ao, blend="MULTIPLY")
    disp = nb.tex("concrete_pavers", "displacement", pav_vec)
    joint = nb.map_range(disp, 0.40, 0.50, 1.0, 0.0)

    # Moss and grime in the joints, in patches.
    moss_tex = nb.tex("concrete_moss", "color", nb.vscale(uv, 4.0 / tile_m))
    moss_patch = nb.map_range(nb.pnoise(pos, *period, scale=0.22, detail=4.0, seed=seed).outputs["Fac"], 0.46, 0.62, 0.0, 1.0, smooth=True)
    moss_cover = nb.map_range(nb.pnoise(pos, *period, scale=0.5, detail=6.0, roughness=0.7, seed=seed).outputs["Fac"], 0.64, 0.68, 0.0, 0.55)
    moss_amount = nb.add(nb.mul(joint, moss_patch), moss_cover, clamp=True)
    color = nb.mix(moss_amount, color, nb.hsv(moss_tex, saturation=0.7, value=0.75))
    soil = nb.map_range(nb.pnoise(pos, *period, scale=0.5, detail=3.0, seed=seed + 4).outputs["Fac"], 0.5, 0.6, 0.0, 0.8)
    color = nb.mix(nb.mul(joint, soil), color, (0.16, 0.14, 0.12))

    # Dirt drifts and dark stains (gum, water marks).
    dirt = nb.pnoise(pos, *period, scale=0.12, detail=4.0, seed=seed + 2).outputs["Fac"]
    color = nb.mix(nb.map_range(dirt, 0.50, 0.30, 0.0, 0.8, smooth=True), color, (0.55, 0.53, 0.50), blend="MULTIPLY")
    stain = nb.map_range(nb.pnoise(pos, *period, scale=0.9, detail=5.0, seed=seed + 6).outputs["Fac"], 0.62, 0.70, 0.0, 0.6)
    color = nb.mix(stain, color, (0.45, 0.44, 0.42), blend="MULTIPLY")

    # Chipped and missing pieces.
    chip = nb.map_range(nb.pnoise(pos, *period, scale=2.2, detail=2.0, roughness=0.4, seed=seed + 8).outputs["Fac"], 0.69, 0.72, 0.0, 1.0)
    color = nb.mix(chip, color, (0.17, 0.16, 0.15))

    gain = nb.value(1.0, "albedo_gain")
    albedo = nb.vscale(color, gain.outputs[0])
    height = nb.sub(nb.mul(disp, 1.0), nb.mul(chip, 0.6))
    normal = nb.bump(height, strength=0.5, distance=0.01, normal=nb.normal_map(nb.tex("concrete_pavers", "normal", pav_vec), 1.0))
    nb.output(nb.principled(albedo, roughness=0.85, normal=normal, specular=0.35))
    return material, gain


MATERIALS = {"ow-asphalt-a": asphalt_material, "ow-sidewalk": sidewalk_material}


def build(key, out_root, samples_scale=1.0):
    spec = GROUND_TILES[key]
    samples = max(8, int(128 * samples_scale))
    width, height = spec["size"]
    scene = ow.reset_scene()
    ow.setup_render(scene, width, height, samples=samples)
    ow.setup_world(scene)
    tile_w, tile_h = width * ow.M_PER_PX, height * ow.M_PER_PX
    ow.add_ortho_camera_top(scene, 0.0, 0.0, tile_w, tile_h)
    material, gain = MATERIALS[key](tile_w, spec["seed"])
    ow.plane_xy("ground", -tile_w, -tile_h, 2 * tile_w, 2 * tile_h, 0.0, material)
    ow.calibrate_gain(scene, gain, spec["target_luma"], label=key)
    out_path = os.path.join(out_root, spec["file"])
    ow.render_still(scene, out_path, "JPEG", quality=88)
    ow.save_blend(os.path.join(ow.WORK_DIR, f"{key}.blend"))
    return [{"key": key, "type": "tile", "file": spec["file"], "width": width, "height": height}]
