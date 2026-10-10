"""Ground tiles (WORLD_DESIGN.md 6.6 A): opaque, seamless, top-down, uniform sky only.

Seamless by construction: every image texture repeats a whole number of times per tile and all
procedural noise is embedded on a torus with the tile size as its period (Nodes.periodic). The
ground plane covers 3x3 tiles so lighting near the edges matches the neighbouring tile.
"""

import os
import random

import bmesh
from mathutils import Matrix

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


def asphalt_b_material(tile_m, seed):
    """Damaged asphalt: repair patches, alligator and long cracks, potholes. Same brightness as
    ow-asphalt-a so the two can alternate between road sections."""
    material, nb = ow.new_material("ow_asphalt_b")
    uv = nb.uv()
    pos = nb.position()
    u, v, _ = nb.separate(uv)
    period = (tile_m, tile_m)

    # aerial_asphalt_01 turned 90 degrees and shifted, so its big cracks fall elsewhere than in -a.
    rot_vec = nb.combine(nb.add(nb.math("DIVIDE", v, tile_m), 0.37), nb.add(nb.math("DIVIDE", nb.mul(u, -1.0), tile_m), 0.61), 0.0)
    base = nb.hsv(nb.tex("aerial_asphalt_01", "color", rot_vec), saturation=0.5)
    worn = nb.hsv(nb.tex("asphalt_04", "color", nb.vscale(uv, 6.0 / tile_m)), saturation=0.5)  # 4 m -> 4.27 m
    detail_vec = nb.vscale(uv, 8.0 / tile_m)
    color = nb.mix(0.4, base, worn)
    color = nb.mix(0.4, color, nb.tex("asphalt_02", "color", detail_vec), blend="SOFT_LIGHT")
    grime = nb.pnoise(pos, *period, scale=0.14, detail=4.0, seed=seed + 11).outputs["Fac"]
    color = nb.mix(nb.map_range(grime, 0.44, 0.30, 0.0, 0.5, smooth=True), color, (0.55, 0.54, 0.52), blend="MULTIPLY")

    # Repair patches: one rectangle in about half of the 6.4 m cells, with a dark sealed seam.
    cell_id, lx, ly = nb.cells(u, v, 6.4, 4, 4)
    has_value, rand = nb.white(cell_id, seed)
    rr, rg, rb = nb.separate(rand)
    size_value, _ = nb.white(cell_id, seed + 1)
    has = nb.math("LESS_THAN", has_value, 0.5)
    cx, cy = nb.add(1.6, nb.mul(rr, 3.2)), nb.add(1.6, nb.mul(rg, 3.2))
    hw, hh = nb.add(0.9, nb.mul(rb, 0.6)), nb.add(0.7, nb.mul(size_value, 0.8))
    patch = nb.mul(has, nb.rect(lx, ly, cx, cy, hw, hh))
    seam = nb.mul(patch, nb.math("LESS_THAN", nb.rect_edge_distance(lx, ly, cx, cy, hw, hh), 0.05))
    fresh = nb.hsv(nb.tex("asphalt_07", "color", nb.vscale(uv, 10.0 / tile_m)), saturation=0.4)
    patch_color = nb.mix(0.45, nb.mix(1.0, color, (0.70, 0.70, 0.70), blend="MULTIPLY"), fresh, blend="SOFT_LIGHT")
    color = nb.mix(patch, color, patch_color)
    color = nb.mix(nb.mul(seam, 0.75), color, (0.07, 0.07, 0.07))

    # Alligator cracking in zones (not inside the fresh patches) and a few long cracks.
    zone = nb.map_range(nb.pnoise(pos, *period, scale=0.1, detail=3.0, seed=seed + 5).outputs["Fac"], 0.56, 0.64, 0.0, 1.0)
    gator = nb.map_range(nb.pvoronoi(pos, *period, scale=2.2, feature="DISTANCE_TO_EDGE", seed=seed + 6).outputs["Distance"], 0.0, 0.06, 1.0, 0.0)
    gator = nb.mul(nb.mul(gator, zone), nb.sub(1.0, patch))
    long_cracks = nb.map_range(nb.pvoronoi(pos, *period, scale=0.09, feature="DISTANCE_TO_EDGE", seed=seed + 7).outputs["Distance"], 0.0, 0.0045, 1.0, 0.0)
    keep = nb.map_range(nb.pnoise(pos, *period, scale=0.4, detail=2.0, seed=seed + 8).outputs["Fac"], 0.47, 0.55, 0.0, 1.0)
    cracks = nb.math("MAXIMUM", gator, nb.mul(long_cracks, keep))
    color = nb.mix(nb.mul(cracks, 0.85), color, (0.20, 0.19, 0.18), blend="MULTIPLY")

    # Potholes: gravel at the bottom, standing water in the deepest part, a broken dark rim.
    hole_noise = nb.pnoise(pos, *period, scale=0.2, detail=3.0, roughness=0.5, seed=seed + 9).outputs["Fac"]
    hole = nb.map_range(hole_noise, 0.715, 0.73, 0.0, 1.0)
    rim = nb.sub(nb.map_range(hole_noise, 0.69, 0.715, 0.0, 1.0), hole, clamp=True)
    water = nb.map_range(hole_noise, 0.765, 0.775, 0.0, 1.0)
    gravel = nb.mix(1.0, nb.hsv(nb.tex("gravel", "color", nb.vscale(uv, 13.0 / tile_m)), saturation=0.5), (0.6, 0.6, 0.6), blend="MULTIPLY")
    color = nb.mix(hole, color, gravel)
    color = nb.mix(nb.mul(rim, 0.5), color, (0.17, 0.16, 0.15))
    color = nb.mix(nb.mul(water, 0.85), color, (0.05, 0.05, 0.055))

    gain = nb.value(1.0, "albedo_gain")
    albedo = nb.vscale(color, gain.outputs[0])
    rough = nb.mixf(water, nb.mixf(patch, 0.88, 0.75), 0.12)
    height = nb.sub(nb.sub(nb.mul(nb.tex("asphalt_02", "displacement", detail_vec), 0.5), nb.mul(cracks, 0.8)), nb.mul(hole, 1.5))
    normal = nb.bump(height, strength=0.6, distance=0.01, normal=nb.normal_map(nb.tex("asphalt_04", "normal", nb.vscale(uv, 6.0 / tile_m)), 0.8))
    nb.output(nb.principled(albedo, roughness=rough, normal=normal, specular=0.35))
    return material, gain


def park_material(tile_m, seed):
    """Overgrown park lawn: patchy grass, dry areas, bare soil and leaf litter, tall tufts."""
    material, nb = ow.new_material("ow_park")
    uv = nb.uv()
    pos = nb.position()
    period = (tile_m, tile_m)
    grass_vec = nb.vscale(uv, 10.0 / tile_m)  # grass_ground 2.51 m -> 2.56 m
    grass = nb.hsv(nb.tex("grass_ground", "color", grass_vec), saturation=0.85)
    dry = nb.hsv(nb.tex("withered_grass", "color", nb.vscale(uv, 13.0 / tile_m)), saturation=0.8)
    soil = nb.tex("brown_mud_leaves_01", "color", nb.vscale(uv, 20.0 / tile_m))
    litter = nb.tex("dry_decay_leaves", "color", nb.vscale(uv, 13.0 / tile_m))

    # Grass grows in clumps: per-clump brightness, darker gaps between clumps.
    clumps = nb.pvoronoi(pos, *period, scale=3.2, feature="F1", seed=seed + 1)
    clump_tone = nb.map_range(nb.luma(clumps.outputs["Color"]), 0.0, 1.0, 0.72, 1.12)
    clump_gap = nb.map_range(clumps.outputs["Distance"], 0.25, 0.75, 1.0, 0.7)
    grass = nb.mix(1.0, grass, nb.mul(clump_tone, clump_gap), blend="MULTIPLY")
    dry = nb.mix(1.0, dry, (0.82, 0.80, 0.76), blend="MULTIPLY")
    dry_mask = nb.map_range(nb.pnoise(pos, *period, scale=0.085, detail=8.0, roughness=0.65, seed=seed).outputs["Fac"], 0.50, 0.535, 0.0, 1.0)
    color = nb.mix(dry_mask, grass, nb.mix(1.0, dry, nb.mul(clump_tone, clump_gap), blend="MULTIPLY"))
    soil_mask = nb.map_range(nb.pnoise(pos, *period, scale=0.16, detail=8.0, roughness=0.65, seed=seed + 2).outputs["Fac"], 0.615, 0.635, 0.0, 1.0)
    color = nb.mix(soil_mask, color, soil)
    litter_mask = nb.map_range(nb.pnoise(pos, *period, scale=0.22, detail=7.0, roughness=0.6, seed=seed + 4).outputs["Fac"], 0.60, 0.625, 0.0, 0.9)
    color = nb.mix(litter_mask, color, litter)
    tufts = nb.map_range(nb.pnoise(pos, *period, scale=1.6, detail=4.0, seed=seed + 6).outputs["Fac"], 0.58, 0.66, 0.0, 1.0)
    color = nb.mix(nb.mul(tufts, 0.45), color, (0.55, 0.62, 0.45), blend="MULTIPLY")

    gain = nb.value(1.0, "albedo_gain")
    albedo = nb.vscale(color, gain.outputs[0])
    height = nb.sub(nb.mul(tufts, 0.5), nb.mul(soil_mask, 0.2))
    normal = nb.bump(height, strength=0.5, distance=0.02, normal=nb.normal_map(nb.tex("grass_ground", "normal", grass_vec), 1.0))
    nb.output(nb.principled(albedo, roughness=0.92, normal=normal, specular=0.3))
    return material, gain


def plaza_material(tile_m, seed, slab=0.8, major=3.2):
    """Plaza paving: 0.8 m stone slabs, wider joints every 3.2 m (128 px, like the runtime ow-tile),
    per-slab tone, cracked and missing slabs, weeds in the joints."""
    material, nb = ow.new_material("ow_plaza")
    uv = nb.uv()
    pos = nb.position()
    u, v, _ = nb.separate(uv)
    period = (tile_m, tile_m)
    count = int(round(tile_m / slab))
    cell_id, lx, ly = nb.cells(u, v, slab, count, count)
    tone_value, tone_color = nb.white(cell_id, seed)
    state, _ = nb.white(cell_id, seed + 1)
    warm_pick, _, _ = nb.separate(tone_color)

    edge = nb.math("MINIMUM", nb.math("MINIMUM", lx, nb.sub(slab, lx)), nb.math("MINIMUM", ly, nb.sub(slab, ly)))

    def to_line(coord):
        return nb.mul(nb.math("ABSOLUTE", nb.sub(nb.fract(nb.add(nb.math("DIVIDE", coord, major), 0.5)), 0.5)), major)

    major_joint = nb.map_range(nb.math("MINIMUM", to_line(u), to_line(v)), 0.02, 0.035, 1.0, 0.0)
    minor_joint = nb.map_range(edge, 0.008, 0.018, 1.0, 0.0)
    joint = nb.math("MAXIMUM", major_joint, minor_joint)

    stone_vec = nb.vscale(uv, 13.0 / tile_m)  # concrete_floor_01 2 m -> 1.97 m
    stone = nb.hsv(nb.tex("concrete_floor_01", "color", stone_vec), saturation=0.25)
    color = nb.mix(1.0, stone, nb.map_range(tone_value, 0.0, 1.0, 0.84, 1.12), blend="MULTIPLY")
    color = nb.mix(nb.mul(nb.math("GREATER_THAN", warm_pick, 0.9), 0.35), color, (0.70, 0.62, 0.52), blend="MULTIPLY")
    color = nb.mix(nb.map_range(edge, 0.018, 0.05, 0.25, 0.0), color, (0.6, 0.6, 0.6), blend="MULTIPLY")  # worn slab edges

    cracked = nb.math("LESS_THAN", state, 0.12)
    crack_lines = nb.map_range(nb.pvoronoi(pos, *period, scale=2.6, feature="DISTANCE_TO_EDGE", seed=seed + 3).outputs["Distance"], 0.0, 0.035, 1.0, 0.0)
    crack = nb.mul(nb.mul(cracked, crack_lines), nb.math("GREATER_THAN", edge, 0.04))
    missing = nb.math("GREATER_THAN", state, 0.993)

    weeds = nb.hsv(nb.tex("grass_ground", "color", nb.vscale(uv, 10.0 / tile_m)), saturation=0.8)
    weed_mask = nb.map_range(nb.pnoise(pos, *period, scale=0.35, detail=4.0, seed=seed + 5).outputs["Fac"], 0.50, 0.62, 0.0, 1.0)
    joint_color = nb.mix(nb.mul(weed_mask, nb.add(0.35, nb.mul(major_joint, 0.65))), (0.15, 0.14, 0.13), weeds)
    color = nb.mix(joint, color, joint_color)
    color = nb.mix(nb.mul(crack, 0.8), color, (0.18, 0.17, 0.16))
    hole = nb.mix(nb.map_range(nb.pnoise(pos, *period, scale=3.0, detail=6.0, seed=seed + 6).outputs["Fac"], 0.45, 0.55, 0.0, 1.0),
                  nb.mix(1.0, nb.tex("brown_mud_leaves_01", "color", nb.vscale(uv, 20.0 / tile_m)), (0.6, 0.6, 0.6), blend="MULTIPLY"), weeds)
    color = nb.mix(missing, color, hole)
    grime = nb.pnoise(pos, *period, scale=0.12, detail=7.0, roughness=0.62, seed=seed + 7).outputs["Fac"]
    color = nb.mix(nb.map_range(grime, 0.47, 0.36, 0.0, 0.6), color, (0.50, 0.48, 0.45), blend="MULTIPLY")
    # Moss and leaves gathering along the joints in damp patches.
    damp = nb.map_range(nb.pnoise(pos, *period, scale=0.2, detail=6.0, seed=seed + 8).outputs["Fac"], 0.56, 0.6, 0.0, 1.0)
    moss_spread = nb.mul(damp, nb.map_range(edge, 0.0, 0.12, 0.85, 0.0))
    color = nb.mix(moss_spread, color, nb.hsv(nb.tex("concrete_moss", "color", nb.vscale(uv, 8.0 / tile_m)), saturation=0.7, value=0.7))

    gain = nb.value(1.0, "albedo_gain")
    albedo = nb.vscale(color, gain.outputs[0])
    height = nb.sub(nb.sub(0.0, nb.mul(joint, 0.6)), nb.add(nb.mul(crack, 0.4), nb.mul(missing, 0.8)))
    normal = nb.bump(height, strength=0.5, distance=0.01, normal=nb.normal_map(nb.tex("concrete_floor_01", "normal", stone_vec), 0.7))
    nb.output(nb.principled(albedo, roughness=0.85, normal=normal, specular=0.35))
    return material, gain


# Parking layout of the runtime ow-stalls (game.js), in pixels: 5 px lines every 120 px; down the tile,
# a 190 px row of stalls, a 100 px aisle, another 190 px row (480 px period).
STALL = {"pitch": 120, "line": 5, "row": 190, "aisle": 100, "period": 480}


def parking_material(tile_m, seed):
    material, nb = ow.new_material("ow_parking")
    uv = nb.uv()
    pos = nb.position()
    u, v, _ = nb.separate(uv)
    period = (tile_m, tile_m)
    base = nb.hsv(nb.tex("asphalt_04", "color", nb.vscale(uv, 6.0 / tile_m)), saturation=0.5)  # 4.0 m
    detail_vec = nb.vscale(uv, 8.0 / tile_m)
    color = nb.mix(0.35, base, nb.tex("asphalt_02", "color", detail_vec), blend="SOFT_LIGHT")
    grime = nb.pnoise(pos, *period, scale=0.15, detail=4.0, seed=seed + 1).outputs["Fac"]
    color = nb.mix(nb.map_range(grime, 0.45, 0.30, 0.0, 0.45, smooth=True), color, (0.55, 0.54, 0.52), blend="MULTIPLY")

    px = nb.mul(u, ow.PX_PER_M)
    py = nb.mul(nb.sub(tile_m, v), ow.PX_PER_M)  # from the top edge
    col = nb.math("FLOORED_MODULO", px, STALL["pitch"])
    row = nb.math("FLOORED_MODULO", py, STALL["period"])
    second_row_start = STALL["row"] + STALL["aisle"]
    in_rows = nb.math("MAXIMUM", nb.math("LESS_THAN", row, STALL["row"]), nb.math("GREATER_THAN", row, second_row_start))
    line = nb.mul(nb.math("LESS_THAN", col, STALL["line"]), in_rows)
    erosion = nb.map_range(nb.pnoise(pos, *period, scale=0.9, detail=5.0, seed=seed + 2).outputs["Fac"], 0.5, 0.72, 0.0, 0.8, smooth=True)
    paint = nb.mul(nb.mul(line, 0.88), nb.sub(1.0, erosion))
    color = nb.mix(paint, color, (0.80, 0.80, 0.78))

    # Oil under each parked engine: the stall's front half, one blob per stall, random size.
    lower_row = nb.math("GREATER_THAN", row, STALL["period"] / 2)
    stall_id = nb.combine(nb.wrap(nb.floor(nb.math("DIVIDE", px, STALL["pitch"])), 8),
                          nb.add(nb.mul(nb.wrap(nb.floor(nb.math("DIVIDE", py, STALL["period"])), 2), 2.0), lower_row), 0.0)
    oil_value, oil_rand = nb.white(stall_id, seed + 3)
    ox, oy, _ = nb.separate(oil_rand)
    engine_y = nb.mixf(lower_row, STALL["row"] - 45.0, second_row_start + 45.0)
    dist = nb.vmath("LENGTH", nb.combine(nb.sub(col, nb.add(60.0, nb.mul(ox, 10.0))), nb.mul(nb.sub(row, engine_y), 0.8), 0.0))
    blob_noise = nb.pnoise(pos, *period, scale=3.0, detail=3.0, seed=seed + 4).outputs["Fac"]
    radius = nb.mul(nb.add(14.0, nb.mul(oy, 22.0)), nb.add(0.7, blob_noise))
    oil = nb.mul(nb.map_range(dist, radius, nb.mul(radius, 0.4), 0.0, 1.0, smooth=True), nb.math("GREATER_THAN", oil_value, 0.5))
    color = nb.mix(nb.mul(oil, 0.45), color, (0.30, 0.29, 0.28), blend="MULTIPLY")

    # Tyre marks in the aisles and cracks with weeds.
    aisle = nb.mul(nb.math("GREATER_THAN", row, STALL["row"]), nb.math("LESS_THAN", row, second_row_start))
    tyres = nb.map_range(nb.pnoise(pos, *period, scale=0.8, detail=3.0, seed=seed + 5, stretch=(0.08, 1.0)).outputs["Fac"], 0.55, 0.7, 0.0, 0.45)
    color = nb.mix(nb.mul(aisle, tyres), color, (0.45, 0.44, 0.43), blend="MULTIPLY")
    cracks = nb.map_range(nb.pvoronoi(pos, *period, scale=0.2, feature="DISTANCE_TO_EDGE", seed=seed + 6).outputs["Distance"], 0.0, 0.006, 1.0, 0.0)
    cracks = nb.mul(cracks, nb.map_range(nb.pnoise(pos, *period, scale=0.5, seed=seed + 7).outputs["Fac"], 0.46, 0.54, 0.0, 1.0))
    weeds = nb.hsv(nb.tex("withered_grass", "color", nb.vscale(uv, 12.0 / tile_m)), saturation=0.9)
    color = nb.mix(nb.mul(cracks, 0.9), color, nb.mix(nb.map_range(blob_noise, 0.4, 0.6, 0.0, 1.0), (0.16, 0.15, 0.14), weeds))

    gain = nb.value(1.0, "albedo_gain")
    albedo = nb.vscale(color, gain.outputs[0])
    rough = nb.mixf(oil, 0.85, 0.45)
    height = nb.sub(nb.mul(nb.tex("asphalt_02", "displacement", detail_vec), 0.5), nb.mul(cracks, 0.6))
    normal = nb.bump(height, strength=0.5, distance=0.01, normal=nb.normal_map(nb.tex("asphalt_04", "normal", nb.vscale(uv, 6.0 / tile_m)), 0.8))
    nb.output(nb.principled(albedo, roughness=rough, normal=normal, specular=0.35))
    return material, gain


def parking_geometry(tile_m, seed):
    """Concrete wheel stops near the back of every stall, repeated over the 3x3 tiles so the lighting
    at the tile edges matches the neighbours."""
    material, nb = ow.new_material("wheel_stop")
    pos = nb.position()
    noise = nb.noise(pos, scale=3.0, detail=5.0).outputs["Fac"]
    color = nb.mix(nb.map_range(noise, 0.6, 0.35, 0.0, 0.5), (0.22, 0.215, 0.20), (0.45, 0.42, 0.38), blend="MULTIPLY")
    nb.output(nb.principled(color, roughness=0.9))
    rng = random.Random(int(seed * 1000))
    stops = []
    columns = int(round(tile_m * ow.PX_PER_M / STALL["pitch"]))
    periods = int(round(tile_m * ow.PX_PER_M / STALL["period"]))
    for k in range(columns):
        for j in range(periods):
            for back_py in (22, STALL["period"] - 22):
                if rng.random() < 0.15:
                    continue  # missing
                shift = rng.uniform(-6, 6)
                angle = rng.uniform(-0.12, 0.12) if rng.random() < 0.3 else 0.0
                stops.append(((k * STALL["pitch"] + 62.5 + shift) * ow.M_PER_PX, tile_m - (j * STALL["period"] + back_py) * ow.M_PER_PX, angle))
    for ox in (-tile_m, 0.0, tile_m):
        for oy in (-tile_m, 0.0, tile_m):
            bm = bmesh.new()
            for x, y, angle in stops:
                geom = bmesh.ops.create_cube(bm, size=1.0)
                mat = Matrix.Translation((x + ox, y + oy, 0.06)) @ Matrix.Rotation(angle, 4, "Z") @ Matrix.Diagonal((1.6, 0.15, 0.12, 1.0))
                bmesh.ops.transform(bm, matrix=mat, verts=geom["verts"])
            ow.mesh_object(f"wheel_stops_{ox:+.0f}_{oy:+.0f}", bm, material)


def lot_material(tile_m, seed):
    """Vacant lot: gravel, rubble, bare soil, weeds and broken foundation slabs."""
    material, nb = ow.new_material("ow_lot")
    uv = nb.uv()
    pos = nb.position()
    u, v, _ = nb.separate(uv)
    period = (tile_m, tile_m)
    gravel_vec = nb.vscale(uv, 8.0 / tile_m)  # gravel_ground_01 3 m -> 3.2 m
    gravel = nb.hsv(nb.tex("gravel_ground_01", "color", gravel_vec), saturation=0.6)
    debris = nb.hsv(nb.tex("concrete_debris", "color", nb.vscale(uv, 13.0 / tile_m)), saturation=0.5)
    weeds = nb.tex("withered_grass", "color", nb.vscale(uv, 13.0 / tile_m))
    green = nb.hsv(nb.tex("grass_ground", "color", nb.vscale(uv, 10.0 / tile_m)), saturation=0.8)
    soil = nb.tex("brown_mud_leaves_01", "color", nb.vscale(uv, 20.0 / tile_m))

    debris_mask = nb.map_range(nb.pnoise(pos, *period, scale=0.13, detail=8.0, roughness=0.65, seed=seed).outputs["Fac"], 0.58, 0.61, 0.0, 0.85)
    color = nb.mix(debris_mask, gravel, debris)
    soil_mask = nb.map_range(nb.pnoise(pos, *period, scale=0.09, detail=8.0, roughness=0.65, seed=seed + 2).outputs["Fac"], 0.64, 0.66, 0.0, 0.7)
    color = nb.mix(soil_mask, color, soil)
    weed_mask = nb.map_range(nb.pnoise(pos, *period, scale=0.18, detail=8.0, roughness=0.65, seed=seed + 3).outputs["Fac"], 0.53, 0.56, 0.0, 1.0)
    weed_clumps = nb.pvoronoi(pos, *period, scale=4.0, feature="F1", seed=seed + 9)
    weed_mask = nb.mul(weed_mask, nb.map_range(weed_clumps.outputs["Distance"], 0.75, 0.45, 0.4, 1.0))
    green_mask = nb.map_range(nb.pnoise(pos, *period, scale=0.5, detail=5.0, seed=seed + 4).outputs["Fac"], 0.48, 0.56, 0.0, 0.85)
    color = nb.mix(weed_mask, color, nb.mix(green_mask, weeds, green))

    # Broken foundation slabs left from a demolished building (one per 12.8 m cell, most cells).
    cell_id, lx, ly = nb.cells(u, v, 12.8, 2, 2)
    has_value, rand = nb.white(cell_id, seed + 5)
    rr, rg, rb = nb.separate(rand)
    cx, cy = nb.add(3.8, nb.mul(rr, 5.2)), nb.add(3.8, nb.mul(rg, 5.2))
    hw, hh = nb.add(1.8, nb.mul(rb, 1.4)), nb.add(1.6, nb.mul(has_value, 1.4))
    ragged = nb.mul(nb.sub(nb.pnoise(pos, *period, scale=1.2, detail=4.0, seed=seed + 6).outputs["Fac"], 0.5), 0.9)
    slab_edge = nb.add(nb.rect_edge_distance(lx, ly, cx, cy, hw, hh), ragged)
    slab = nb.mul(nb.math("LESS_THAN", has_value, 0.4), nb.math("GREATER_THAN", slab_edge, 0.0))
    slab_color = nb.mix(1.0, nb.hsv(nb.tex("granular_concrete", "color", nb.vscale(uv, 11.0 / tile_m)), saturation=0.3), (1.9, 1.88, 1.84), blend="MULTIPLY")
    slab_color = nb.mix(nb.map_range(nb.pnoise(pos, *period, scale=0.7, detail=6.0, seed=seed + 10).outputs["Fac"], 0.45, 0.65, 0.0, 0.6), slab_color, (0.5, 0.48, 0.44), blend="MULTIPLY")
    slab_cracks = nb.map_range(nb.pvoronoi(pos, *period, scale=0.9, feature="DISTANCE_TO_EDGE", seed=seed + 7).outputs["Distance"], 0.0, 0.02, 1.0, 0.0)
    slab_color = nb.mix(slab_cracks, slab_color, nb.mix(weed_mask, (0.16, 0.15, 0.14), green))
    color = nb.mix(slab, color, slab_color)
    stain = nb.map_range(nb.pnoise(pos, *period, scale=0.3, detail=3.0, seed=seed + 8).outputs["Fac"], 0.64, 0.70, 0.0, 0.5)
    color = nb.mix(stain, color, (0.35, 0.33, 0.31), blend="MULTIPLY")

    gain = nb.value(1.0, "albedo_gain")
    albedo = nb.vscale(color, gain.outputs[0])
    height = nb.add(nb.mul(debris_mask, 0.6), nb.mul(slab, 0.4))
    normal = nb.bump(height, strength=0.5, distance=0.02, normal=nb.normal_map(nb.tex("gravel_ground_01", "normal", gravel_vec), 1.0))
    nb.output(nb.principled(albedo, roughness=0.9, normal=normal, specular=0.3))
    return material, gain


GROUND_TILES.update({
    "ow-asphalt-b": {"size": (1024, 1024), "file": "ground/ow-asphalt-b.jpg", "target_luma": 0.37, "seed": 3.0},
    "ow-park": {"size": (1024, 1024), "file": "ground/ow-park.jpg", "target_luma": 0.36, "seed": 4.0},
    "ow-plaza": {"size": (1024, 1024), "file": "ground/ow-plaza.jpg", "target_luma": 0.42, "seed": 5.0},
    "ow-parking": {"size": (960, 960), "file": "ground/ow-parking.jpg", "target_luma": 0.38, "seed": 6.0, "period": [120, 480]},
    "ow-lot": {"size": (1024, 1024), "file": "ground/ow-lot.jpg", "target_luma": 0.38, "seed": 7.0},
})

MATERIALS = {
    "ow-asphalt-a": asphalt_material,
    "ow-asphalt-b": asphalt_b_material,
    "ow-sidewalk": sidewalk_material,
    "ow-park": park_material,
    "ow-plaza": plaza_material,
    "ow-parking": parking_material,
    "ow-lot": lot_material,
}
GEOMETRY = {"ow-parking": parking_geometry}


# ---------------------------------------------------------------------------
# Curbs: 16 px strips, seamless along their length. The road side is the top row (-h) / the left
# column (-v): 10 px of concrete L-gutter, then the 6 px curb top (the runtime curb band). The game
# flips the strip for blocks on the other side of a road.

CURBS = {
    "ow-curb-h": {"size": (1024, 16), "file": "ground/ow-curb-h.jpg", "along": "x", "seed": 8.0},
    "ow-curb-v": {"size": (16, 1024), "file": "ground/ow-curb-v.jpg", "along": "y", "seed": 9.0},
}
GUTTER_M = 10 * ow.M_PER_PX
CURB_HEIGHT_M = 0.15


def curb_material(spec, length_m, strip_m):
    material, nb = ow.new_material("ow_curb")
    uv = nb.uv()
    pos = nb.position()
    x, y, _ = nb.separate(pos)
    along = x if spec["along"] == "x" else y
    across = nb.sub(strip_m, y) if spec["along"] == "x" else x  # metres from the road side
    period = (length_m, None) if spec["along"] == "x" else (None, length_m)
    tex_vec = nb.vscale(uv, 11.0 / length_m)  # granular_concrete 2.4 m -> 2.33 m
    concrete = nb.hsv(nb.tex("granular_concrete", "color", tex_vec), saturation=0.3)
    in_curb = nb.math("GREATER_THAN", across, GUTTER_M)

    # Gutter: darker, dirt and leaves piling up against the curb, joints every ~2 m.
    gutter_joint = nb.math("LESS_THAN", nb.math("FLOORED_MODULO", along, length_m / 13.0), 0.02)
    pile = nb.map_range(across, GUTTER_M * 0.35, GUTTER_M, 0.0, 1.0)
    dirt = nb.map_range(nb.pnoise(pos, *period, scale=0.8, detail=5.0, seed=spec["seed"]).outputs["Fac"], 0.35, 0.65, 0.0, 1.0)
    gutter = nb.mix(1.0, concrete, (0.80, 0.80, 0.78), blend="MULTIPLY")
    gutter = nb.mix(nb.mul(pile, dirt), gutter, (0.30, 0.25, 0.19))
    leaves = nb.mul(nb.map_range(nb.pnoise(pos, *period, scale=6.0, detail=2.0, seed=spec["seed"] + 1).outputs["Fac"], 0.62, 0.66, 0.0, 1.0), pile)
    gutter = nb.mix(leaves, gutter, (0.42, 0.26, 0.12))
    gutter = nb.mix(nb.mul(gutter_joint, 0.8), gutter, (0.12, 0.12, 0.12))

    # Curb top: lighter stone, joints every ~1 m, chipped edge on the road side.
    curb_joint = nb.math("LESS_THAN", nb.math("FLOORED_MODULO", along, length_m / 26.0), 0.012)
    chip = nb.map_range(nb.pnoise(pos, *period, scale=4.0, detail=3.0, seed=spec["seed"] + 2).outputs["Fac"], 0.66, 0.70, 0.0, 1.0)
    edge = nb.map_range(across, GUTTER_M, GUTTER_M + 0.02, 1.0, 0.0)
    curb = nb.mix(1.0, concrete, (1.08, 1.08, 1.06), blend="MULTIPLY")
    curb = nb.mix(nb.mul(nb.math("MAXIMUM", edge, chip), 0.6), curb, (0.45, 0.44, 0.42), blend="MULTIPLY")
    curb = nb.mix(nb.mul(curb_joint, 0.8), curb, (0.18, 0.18, 0.18))
    grime = nb.map_range(nb.pnoise(pos, *period, scale=1.5, detail=4.0, seed=spec["seed"] + 3).outputs["Fac"], 0.55, 0.35, 0.0, 0.5)
    color = nb.mix(in_curb, gutter, curb)
    color = nb.mix(grime, color, (0.6, 0.58, 0.55), blend="MULTIPLY")
    normal = nb.normal_map(nb.tex("granular_concrete", "normal", tex_vec), 0.8)
    nb.output(nb.principled(color, roughness=0.9, normal=normal, specular=0.3))
    return material


def build_curb(key, out_root, samples):
    spec = CURBS[key]
    width, height = spec["size"]
    scene = ow.reset_scene()
    ow.setup_render(scene, width, height, samples=samples)
    ow.setup_world(scene)
    w_m, h_m = width * ow.M_PER_PX, height * ow.M_PER_PX
    ow.add_ortho_camera_top(scene, 0.0, 0.0, w_m, h_m)
    if spec["along"] == "x":
        material = curb_material(spec, w_m, h_m)
        # Road and gutter north of the curb face, the raised curb (and sidewalk behind it) south of it.
        face_y = h_m - GUTTER_M
        ow.plane_xy("road", -w_m, face_y, 2 * w_m, h_m + 3.0, 0.0, material)
        ow.box("curb", -w_m, -3.0, 0.0, 2 * w_m, face_y, CURB_HEIGHT_M, material)
    else:
        material = curb_material(spec, h_m, w_m)
        face_x = GUTTER_M
        ow.plane_xy("road", -3.0, -h_m, face_x, 2 * h_m, 0.0, material)
        ow.box("curb", face_x, -h_m, 0.0, w_m + 3.0, 2 * h_m, CURB_HEIGHT_M, material)
    out_path = os.path.join(out_root, spec["file"])
    ow.render_still(scene, out_path, "JPEG", quality=90)
    ow.save_blend(os.path.join(ow.WORK_DIR, f"{key}.blend"))
    return [{"key": key, "type": "tile", "file": spec["file"], "width": width, "height": height,
             "roadSide": "top" if spec["along"] == "x" else "left"}]


# ---------------------------------------------------------------------------
# ow-grit: semi-transparent dirt overlay (512 px), drawn over the whole ground by the game.

GRIT = {"ow-grit": {"size": (512, 512), "file": "ground/ow-grit.png", "seed": 10.0}}


def grit_material(tile_m, seed):
    material, nb = ow.new_material("ow_grit")
    pos = nb.position()
    period = (tile_m, tile_m)
    blotch = nb.map_range(nb.pnoise(pos, *period, scale=0.35, detail=6.0, roughness=0.6, seed=seed).outputs["Fac"], 0.56, 0.74, 0.0, 0.5, smooth=True)
    stains = nb.map_range(nb.pnoise(pos, *period, scale=1.4, detail=4.0, seed=seed + 1).outputs["Fac"], 0.64, 0.70, 0.0, 0.45)
    cracks = nb.map_range(nb.pvoronoi(pos, *period, scale=0.55, feature="DISTANCE_TO_EDGE", seed=seed + 2).outputs["Distance"], 0.0, 0.006, 0.7, 0.0)
    cracks = nb.mul(cracks, nb.map_range(nb.pnoise(pos, *period, scale=0.8, detail=2.0, seed=seed + 3).outputs["Fac"], 0.5, 0.58, 0.0, 1.0))
    dark_specks = nb.map_range(nb.pnoise(pos, *period, scale=9.0, detail=2.0, roughness=0.4, seed=seed + 4).outputs["Fac"], 0.68, 0.72, 0.0, 0.5)
    dust = nb.map_range(nb.pnoise(pos, *period, scale=11.0, detail=2.0, roughness=0.4, seed=seed + 5).outputs["Fac"], 0.70, 0.74, 0.0, 0.35)
    dust_drift = nb.map_range(nb.pnoise(pos, *period, scale=0.25, detail=3.0, seed=seed + 6).outputs["Fac"], 0.62, 0.75, 0.0, 0.18)
    dark = nb.math("MAXIMUM", nb.math("MAXIMUM", blotch, stains), nb.math("MAXIMUM", cracks, dark_specks))
    light = nb.math("MAXIMUM", dust, dust_drift)
    alpha = nb.math("MAXIMUM", dark, light)
    color = nb.mix(nb.math("GREATER_THAN", light, dark), (0.06, 0.055, 0.05), (0.78, 0.75, 0.70))
    nb.output(nb.mix_shader(alpha, nb.transparent(), nb.principled(color, roughness=0.9)))
    return material


def build_grit(key, out_root, samples):
    spec = GRIT[key]
    width, height = spec["size"]
    scene = ow.reset_scene()
    ow.setup_render(scene, width, height, samples=samples, transparent=True, denoise=False)
    ow.setup_world(scene)
    tile_m = width * ow.M_PER_PX
    ow.add_ortho_camera_top(scene, 0.0, 0.0, tile_m, tile_m)
    ow.plane_xy("grit", -tile_m, -tile_m, 2 * tile_m, 2 * tile_m, 0.0, grit_material(tile_m, spec["seed"]))
    out_path = os.path.join(out_root, spec["file"])
    ow.render_still(scene, out_path, "PNG", rgba=True)
    ow.save_blend(os.path.join(ow.WORK_DIR, f"{key}.blend"))
    return [{"key": key, "type": "tile", "file": spec["file"], "width": width, "height": height, "transparent": True}]


def keys():
    return list(GROUND_TILES) + list(CURBS) + list(GRIT)


def build(key, out_root, samples_scale=1.0):
    samples = max(8, int(128 * samples_scale))
    if key in CURBS:
        return build_curb(key, out_root, samples)
    if key in GRIT:
        return build_grit(key, out_root, samples)
    spec = GROUND_TILES[key]
    width, height = spec["size"]
    scene = ow.reset_scene()
    ow.setup_render(scene, width, height, samples=samples)
    ow.setup_world(scene)
    tile_w, tile_h = width * ow.M_PER_PX, height * ow.M_PER_PX
    ow.add_ortho_camera_top(scene, 0.0, 0.0, tile_w, tile_h)
    material, gain = MATERIALS[key](tile_w, spec["seed"])
    ow.plane_xy("ground", -tile_w, -tile_h, 2 * tile_w, 2 * tile_h, 0.0, material)
    if key in GEOMETRY:
        GEOMETRY[key](tile_w, spec["seed"])
    ow.calibrate_gain(scene, gain, spec["target_luma"], label=key)
    out_path = os.path.join(out_root, spec["file"])
    ow.render_still(scene, out_path, "JPEG", quality=88)
    ow.save_blend(os.path.join(ow.WORK_DIR, f"{key}.blend"))
    entry = {"key": key, "type": "tile", "file": spec["file"], "width": width, "height": height}
    if "period" in spec:
        entry["period"] = spec["period"]
    return [entry]
