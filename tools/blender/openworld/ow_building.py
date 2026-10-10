"""Buildings (WORLD_DESIGN.md 6.6 D). Pilot: one L-size mixed-use building, ow-bld-a01.

Per building this renders:
- <key>-roof.png / -roof_emit.png: top-down ortho over the footprint (1 px = 1 game px).
- <key>-south.png / -south_emit.png: the south facade seen head-on, squashed vertically by k = 0.5
  (pixel aspect 2), width = footprint width, height = floors x 64 px.

The building is a ruined 1980s Tokyo shop-and-office block: shops with shutters and signs on the
ground floor, five office floors above (dark, broken, boarded, a few lit windows), rain streaks,
ivy, and a cluttered roof (penthouse with water tank, AC units, pipes, sign frame, blue tarp).
All randomness comes from the building seed, so a rebuild gives the same images.
"""

import math
import os
import random
import tempfile

import bmesh
import bpy
from mathutils import Matrix, Vector

import ow_common as ow

BUILDINGS = {
    "ow-bld-a01": {"footprint": (768, 1024), "floors": 6, "seed": 31},
}

GROUND_FLOOR_M = 3.6
PARAPET_M = 0.9
BAY_M = 3.2
WINDOW_W = 2.0
WINDOW_H = 1.45
SILL_ABOVE_FLOOR = 0.85
SHELL_DEPTH = 0.25  # facade wall thickness
ROOM_DEPTH = 3.0  # interior visible through windows ends here (y)
# The north-west key light (ow_common.LIGHT) never reaches a south facade, so the facade render adds a
# soft, low fill from the south (2026-10-10 decision, WORLD_DESIGN.md 6.5). Only the facade render uses
# it; the roof render and the ground tiles keep the plain sky + key light. The strength is solved per
# building so the facade's mean sRGB luma hits the target.
FACADE_FILL = {
    "azimuth_deg": 180.0,  # from the street side (south)
    "elevation_deg": 20.0,
    "angle_deg": 45.0,  # very soft, no hard shadow edges
    "target_luma": 0.37,  # mean sRGB luma of the south image (spec 0.36-0.38)
    "shop_band_min": 0.30,  # mean of the bottom 64 px (ground-floor shops)
    "calibration_samples": 64,
}
WINDOW_STATES = [("dark", 0.40), ("blinds", 0.16), ("curtain", 0.08), ("broken", 0.14), ("boarded", 0.10), ("lit", 0.12)]

COLORS = {
    "lit_warm": (1.0, 0.72, 0.42),
    "lit_cool": (0.78, 0.9, 1.0),
    "neon_pink": (1.0, 0.18, 0.62),
    "neon_cyan": (0.2, 0.9, 1.0),
    "neon_yellow": (1.0, 0.82, 0.25),
    "lamp": (1.0, 0.62, 0.3),
    "beacon": (1.0, 0.12, 0.08),
    "exit_green": (0.2, 1.0, 0.45),
}


# ---------------------------------------------------------------------------
# Materials


def wall_material(name, tint, sill0, floor_h, ivy=True):
    material, nb = ow.new_material(name)
    uv = nb.uv()
    pos = nb.position()
    x, _, z = nb.separate(pos)
    tex_vec = nb.vscale(uv, 1.0 / 2.0)  # concrete_layers_02 is 2 m
    color = nb.mix(1.0, nb.hsv(nb.tex("concrete_layers_02", "color", tex_vec), saturation=0.45), tint, blend="MULTIPLY")

    grime = nb.noise(pos, scale=0.22, detail=5.0, roughness=0.6).outputs["Fac"]
    color = nb.mix(nb.map_range(grime, 0.62, 0.32, 0.0, 0.55, smooth=True), color, (0.45, 0.43, 0.40), blend="MULTIPLY")

    # Rain streaks hanging from every window sill (and the parapet): top of Leaking003 at the sill.
    t = nb.math("DIVIDE", nb.sub(z, sill0), floor_h)
    row = nb.math("FLOOR", t)
    v = nb.sub(t, row)
    jitter = nb.new("ShaderNodeTexWhiteNoise", noise_dimensions="1D")
    nb.set(jitter, "W", row)
    u = nb.add(nb.math("DIVIDE", x, BAY_M * 1.25), nb.mul(_output_value(jitter), 7.3))
    leak = nb.luma(nb.image(ow.tex_file("Leaking003", "opacity"), nb.combine(u, v, 0.0), non_color=True).outputs["Color"])
    leak = nb.mul(leak, nb.math("GREATER_THAN", z, GROUND_FLOOR_M - 0.3))
    color = nb.mix(nb.mul(leak, 0.85), color, (0.20, 0.18, 0.16), blend="MULTIPLY")

    # Splash grime and damp at the wall base.
    splash_vec = nb.combine(nb.math("DIVIDE", x, 4.0), nb.math("DIVIDE", z, 2.4), 0.0)
    splash = nb.luma(nb.image(ow.tex_file("Leaking008", "opacity"), splash_vec, non_color=True).outputs["Color"])
    splash = nb.mul(splash, nb.math("LESS_THAN", z, 2.4))
    color = nb.mix(nb.mul(splash, 0.8), color, (0.30, 0.30, 0.24), blend="MULTIPLY")

    rough = nb.tex("concrete_layers_02", "roughness", tex_vec)
    normal = nb.normal_map(nb.tex("concrete_layers_02", "normal", tex_vec), 0.8)

    if ivy:
        # Ivy climbing from the west end of the shop front.
        reach = nb.add(nb.sub(10.5, nb.mul(nb.math("ABSOLUTE", nb.sub(x, 2.4)), 1.7)),
                       nb.mul(nb.sub(nb.noise(nb.combine(nb.mul(x, 0.9), 0.0, 0.0), scale=1.0, detail=2.0).outputs["Fac"], 0.5), 5.0))
        height_ok = nb.map_range(z, reach, nb.sub(reach, 1.6), 0.0, 1.0)
        leaves = nb.voronoi(pos, scale=16.0, feature="F1")
        cluster = nb.map_range(nb.noise(pos, scale=2.8, detail=6.0, roughness=0.7).outputs["Fac"], 0.40, 0.50, 0.0, 1.0)
        leaf_on = nb.map_range(leaves.outputs["Distance"], 0.42, 0.30, 0.0, 1.0)
        ivy_mask = nb.mul(nb.mul(height_ok, cluster), nb.add(0.35, nb.mul(leaf_on, 0.65), clamp=True))
        leaf_color = nb.mix(nb.luma(leaves.outputs["Color"]), (0.05, 0.10, 0.035), (0.17, 0.25, 0.07))
        color = nb.mix(ivy_mask, color, leaf_color)
        rough = nb.mixf(ivy_mask, rough, 0.55)
        normal = nb.bump(nb.mul(ivy_mask, nb.sub(1.0, leaves.outputs["Distance"])), strength=0.8, distance=0.03, normal=normal)

    nb.output(nb.principled(color, roughness=rough, normal=normal, specular=0.35))
    return material


def _output_value(node):
    return node.outputs["Value"]


def roof_material(name):
    """Pressed-concrete roof with 3 m expansion joints (a common Tokyo flat roof), repairs, moss, leaves."""
    material, nb = ow.new_material(name)
    uv = nb.uv()
    pos = nb.position()
    x, y, _ = nb.separate(pos)
    near = nb.tex("dirty_concrete", "color", nb.vscale(uv, 1.0 / 3.0))
    far = nb.tex("dirty_concrete", "color", nb.add_vec(nb.vscale(uv, 1.0 / 7.3), (0.37, 0.61, 0.0)))
    color = nb.mix(0.5, near, far)
    color = nb.mix(1.0, nb.hsv(color, saturation=0.5), (0.70, 0.70, 0.68), blend="MULTIPLY")

    joint = 3.0
    def line_distance(coord):
        return nb.mul(nb.math("ABSOLUTE", nb.sub(nb.math("FRACT", nb.add(nb.math("DIVIDE", coord, joint), 0.5)), 0.5)), joint)
    seam = nb.map_range(nb.math("MINIMUM", line_distance(x), line_distance(y)), 0.012, 0.035, 1.0, 0.0)
    cell_id = nb.combine(nb.math("FLOOR", nb.math("DIVIDE", x, joint)), nb.math("FLOOR", nb.math("DIVIDE", y, joint)), 3.0)
    cell_noise = nb.new("ShaderNodeTexWhiteNoise", noise_dimensions="3D")
    nb.set(cell_noise, "Vector", cell_id)
    cell = cell_noise.outputs["Value"]
    color = nb.mix(1.0, color, nb.map_range(cell, 0.0, 1.0, 0.82, 1.06), blend="MULTIPLY")
    repaired = nb.math("GREATER_THAN", cell, 0.86)
    color = nb.mix(nb.mul(repaired, 0.8), color, (0.13, 0.13, 0.14))

    moss = nb.hsv(nb.tex("concrete_moss", "color", nb.vscale(uv, 1.0 / 2.5)), saturation=0.75, value=0.8)
    moss_patch = nb.map_range(nb.noise(pos, scale=0.32, detail=6.0, roughness=0.65).outputs["Fac"], 0.56, 0.68, 0.0, 0.9, smooth=True)
    moss_joint = nb.mul(seam, nb.map_range(nb.noise(pos, scale=0.6, detail=3.0).outputs["Fac"], 0.45, 0.55, 0.0, 1.0))
    color = nb.mix(nb.add(moss_patch, moss_joint, clamp=True), color, moss)
    color = nb.mix(nb.mul(seam, nb.sub(1.0, moss_joint)), color, (0.10, 0.10, 0.10))

    puddle = nb.map_range(nb.noise(pos, scale=0.38, detail=3.0, roughness=0.5).outputs["Fac"], 0.66, 0.70, 0.0, 1.0)
    color = nb.mix(nb.mul(puddle, 0.7), color, (0.40, 0.41, 0.42), blend="MULTIPLY")
    leaf_cells = nb.voronoi(pos, scale=11.0, feature="F1")
    leaf_patch = nb.map_range(nb.noise(pos, scale=0.45, detail=4.0).outputs["Fac"], 0.55, 0.68, 0.0, 1.0)
    leaf_on = nb.mul(nb.map_range(leaf_cells.outputs["Distance"], 0.32, 0.22, 0.0, 1.0), leaf_patch)
    leaf_color = nb.mix(nb.luma(leaf_cells.outputs["Color"]), (0.20, 0.11, 0.05), (0.42, 0.28, 0.12))
    color = nb.mix(leaf_on, color, leaf_color)
    rough = nb.mixf(puddle, nb.tex("dirty_concrete", "roughness", nb.vscale(uv, 1.0 / 3.0)), 0.2)
    normal = nb.bump(nb.sub(nb.mul(leaf_on, 0.6), nb.mul(seam, 0.5)), strength=0.6, distance=0.02,
                     normal=nb.normal_map(nb.tex("dirty_concrete", "normal", nb.vscale(uv, 1.0 / 3.0)), 0.7))
    nb.output(nb.principled(color, roughness=rough, normal=normal, specular=0.35))
    return material


def pbr_material(name, tex_id, size_m, tint=(1.0, 1.0, 1.0), saturation=1.0, metallic=0.0, grime_bottom=False):
    material, nb = ow.new_material(name)
    uv = nb.uv()
    vec = nb.vscale(uv, 1.0 / size_m)
    color = nb.mix(1.0, nb.hsv(nb.tex(tex_id, "color", vec), saturation=saturation), tint, blend="MULTIPLY")
    pos = nb.position()
    dirt = nb.noise(pos, scale=0.9, detail=5.0).outputs["Fac"]
    color = nb.mix(nb.map_range(dirt, 0.6, 0.35, 0.0, 0.5), color, (0.5, 0.47, 0.42), blend="MULTIPLY")
    if grime_bottom:
        _, _, z = nb.separate(pos)
        color = nb.mix(nb.map_range(z, 0.0, 1.2, 0.6, 0.0), color, (0.3, 0.28, 0.24), blend="MULTIPLY")
    rough = nb.tex(tex_id, "roughness", vec)
    normal = nb.normal_map(nb.tex(tex_id, "normal", vec), 1.0)
    nb.output(nb.principled(color, roughness=rough, normal=normal, metallic=metallic, specular=0.4))
    return material


def noisy_material(name, color, roughness=0.8, dirt=0.35, metallic=0.0, scale=1.5):
    material, nb = ow.new_material(name)
    pos = nb.position()
    n = nb.noise(pos, scale=scale, detail=5.0).outputs["Fac"]
    c = nb.mix(nb.map_range(n, 0.62, 0.35, 0.0, dirt), color, (0.45, 0.42, 0.38), blend="MULTIPLY")
    nb.output(nb.principled(c, roughness=roughness, metallic=metallic))
    return material


def glass_material(name):
    material, nb = ow.new_material(name)
    pos = nb.position()
    dirt = nb.map_range(nb.noise(pos, scale=2.5, detail=6.0).outputs["Fac"], 0.5, 0.75, 0.03, 0.22)
    transparent = nb.node("ShaderNodeBsdfTransparent", {"Color": (0.86, 0.9, 0.9)}).outputs["BSDF"]
    reflect = nb.principled((0.0, 0.0, 0.0), roughness=0.06, specular=0.6)
    add = nb.node("ShaderNodeAddShader")
    nb.links.new(transparent, add.inputs[0])
    nb.links.new(reflect, add.inputs[1])
    grime = nb.principled((0.32, 0.31, 0.28), roughness=0.9)
    nb.output(nb.mix_shader(dirt, add.outputs["Shader"], grime))
    return material


def interior_material(name, base=(0.26, 0.25, 0.23)):
    material, nb = ow.new_material(name)
    r = nb.object_random()
    pos = nb.position()
    color = nb.hsv(base, hue=nb.add(0.42, nb.mul(r, 0.16)), saturation=nb.add(0.6, r), value=nb.add(0.65, nb.mul(r, 0.7)))
    stain = nb.noise(pos, scale=1.2, detail=4.0).outputs["Fac"]
    color = nb.mix(nb.map_range(stain, 0.6, 0.35, 0.0, 0.5), color, (0.5, 0.48, 0.45), blend="MULTIPLY")
    nb.output(nb.principled(color, roughness=0.9))
    return material


def blinds_material(name, color):
    material, nb = ow.new_material(name)
    _, _, z = nb.separate(nb.position())
    slats = nb.math("SINE", nb.mul(z, 2.0 * math.pi / 0.03))
    pos = nb.position()
    dirt = nb.noise(pos, scale=3.0, detail=4.0).outputs["Fac"]
    c = nb.mix(nb.map_range(dirt, 0.6, 0.4, 0.0, 0.4), color, (0.55, 0.52, 0.45), blend="MULTIPLY")
    nb.output(nb.principled(c, roughness=0.6, normal=nb.bump(slats, strength=0.6, distance=0.01)))
    return material


def curtain_material(name, color):
    material, nb = ow.new_material(name)
    x, _, _ = nb.separate(nb.position())
    folds = nb.math("SINE", nb.mul(x, 2.0 * math.pi / 0.18))
    nb.output(nb.principled(color, roughness=0.95, normal=nb.bump(folds, strength=0.9, distance=0.05)))
    return material


def frp_material(name):
    material, nb = ow.new_material(name)
    pos = nb.position()
    x, y, z = nb.separate(pos)
    grid = nb.add(nb.math("PINGPONG", x, 0.5), nb.math("PINGPONG", nb.add(y, z), 0.5))
    lines = nb.map_range(grid, 0.0, 0.05, 1.0, 0.0)
    color = nb.mix(nb.mul(lines, 0.5), (0.28, 0.32, 0.34), (0.17, 0.19, 0.21))
    dirt = nb.noise(pos, scale=1.0, detail=5.0).outputs["Fac"]
    color = nb.mix(nb.map_range(dirt, 0.62, 0.38, 0.0, 0.6), color, (0.5, 0.48, 0.42), blend="MULTIPLY")
    nb.output(nb.principled(color, roughness=0.6, normal=nb.bump(lines, strength=0.4, distance=0.02)))
    return material


def tarp_material(name):
    material, nb = ow.new_material(name)
    pos = nb.position()
    n = nb.noise(pos, scale=1.6, detail=6.0).outputs["Fac"]
    color = nb.mix(nb.map_range(n, 0.3, 0.7, 0.0, 1.0), (0.06, 0.16, 0.42), (0.16, 0.30, 0.55))
    dirt = nb.noise(pos, scale=0.7, detail=4.0).outputs["Fac"]
    color = nb.mix(nb.map_range(dirt, 0.6, 0.4, 0.0, 0.55), color, (0.55, 0.52, 0.45), blend="MULTIPLY")
    nb.output(nb.principled(color, roughness=0.55))
    return material


# ---------------------------------------------------------------------------
# Geometry helpers


def beam(name, p0, p1, thickness, material):
    """Square-section bar between two points."""
    p0, p1 = Vector(p0), Vector(p1)
    direction = p1 - p0
    length = direction.length
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    rot = direction.normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
    mat = Matrix.Translation((p0 + p1) / 2.0) @ rot @ Matrix.Diagonal((thickness, thickness, length, 1.0))
    bmesh.ops.transform(bm, matrix=mat, verts=bm.verts)
    return ow.mesh_object(name, bm, material)


def rotated_box(name, center, size, rotation_z, material, tilt=(0.0, 0.0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    mat = (Matrix.Translation(center) @ Matrix.Rotation(rotation_z, 4, "Z") @ Matrix.Rotation(tilt[0], 4, "X")
           @ Matrix.Rotation(tilt[1], 4, "Y") @ Matrix.Diagonal((size[0], size[1], size[2], 1.0)))
    bmesh.ops.transform(bm, matrix=mat, verts=bm.verts)
    return ow.mesh_object(name, bm, material)


def lumpy_sheet(name, x0, y0, x1, y1, z, rng, material, cuts=24, lift=0.5):
    bm = bmesh.new()
    bumps = [(rng.uniform(x0, x1), rng.uniform(y0, y1), rng.uniform(0.25, 0.9), rng.uniform(0.15, lift)) for _ in range(7)]
    verts = []
    for j in range(cuts + 1):
        row = []
        for i in range(cuts + 1):
            x = x0 + (x1 - x0) * i / cuts
            y = y0 + (y1 - y0) * j / cuts
            h = 0.03
            for bx, by, radius, height in bumps:
                d = math.hypot(x - bx, y - by) / radius
                h += height * math.exp(-d * d)
            edge = min(i, j, cuts - i, cuts - j) / 2.0
            h *= min(1.0, edge)
            h += rng.uniform(-0.01, 0.02)
            row.append(bm.verts.new((x, y, z + h)))
        verts.append(row)
    for j in range(cuts):
        for i in range(cuts):
            bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
    return ow.mesh_object(name, bm, material)


def find_font():
    path = os.path.join(bpy.utils.resource_path("LOCAL"), "datafiles", "fonts", "Noto Sans CJK Regular.woff2")
    try:
        return bpy.data.fonts.load(path, check_existing=True)
    except (RuntimeError, OSError):
        return None


def text(name, body, center, size, material, font, facing="south", extrude=0.006, fit=None):
    """Text object facing the facade camera. `fit=(w, h)` scales it to fill that box (metres)."""
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = body
    if font is not None:
        curve.font = font
    curve.size = size
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.space_line = 0.95
    curve.extrude = extrude
    curve.materials.append(material)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = center
    if facing == "south":
        obj.rotation_euler = (math.radians(90.0), 0.0, 0.0)
    if fit is not None:
        bpy.context.view_layer.update()
        width, height = obj.dimensions.x, obj.dimensions.y
        if width > 0 and height > 0:
            factor = min(fit[0] / width, fit[1] / height)
            obj.scale = (factor, factor, 1.0)
    return obj


# ---------------------------------------------------------------------------
# Building


class Builder:
    def __init__(self, key, spec):
        self.key = key
        self.rng = random.Random(spec["seed"])
        fw, fd = spec["footprint"]
        self.W = fw * ow.M_PER_PX
        self.D = fd * ow.M_PER_PX
        self.floors = spec["floors"]
        self.H = self.floors * ow.FLOOR_HEIGHT_M  # facade image height (k = 0.5 -> floors x 64 px)
        self.roof_z = self.H - PARAPET_M
        upper = (self.roof_z - GROUND_FLOOR_M) / (self.floors - 1)
        self.floor_z = [0.0] + [GROUND_FLOOR_M + i * upper for i in range(self.floors - 1)] + [self.roof_z]
        self.upper_h = upper
        self.emit = ow.EmitLayer()
        self.font = find_font()
        self.mats = {}
        self.counter = 0

    def name(self, prefix):
        self.counter += 1
        return f"{prefix}_{self.counter:03d}"

    def build_materials(self):
        sill0 = GROUND_FLOOR_M + SILL_ABOVE_FLOOR
        m = self.mats
        m["wall"] = wall_material("wall", (0.86, 0.84, 0.80), sill0, self.upper_h)
        m["wall_plain"] = wall_material("wall_plain", (0.80, 0.78, 0.74), sill0, self.upper_h, ivy=False)
        m["roof"] = roof_material("roof")
        m["shutter"] = pbr_material("shutter", "rusted_shutter", 1.8, tint=(0.95, 0.95, 0.92), saturation=0.7, metallic=0.3, grime_bottom=True)
        m["metal"] = pbr_material("metal_white", "rusty_metal_02", 2.4, tint=(0.80, 0.80, 0.78), saturation=0.3, metallic=0.2)
        m["steel"] = pbr_material("steel", "rusty_metal_02", 1.0, tint=(0.38, 0.33, 0.30), saturation=1.2, metallic=0.5)
        m["frame"] = noisy_material("alu_frame", (0.28, 0.27, 0.25), roughness=0.45, metallic=0.7)
        m["glass"] = glass_material("glass")
        m["interior"] = interior_material("interior")
        m["interior_dark"] = interior_material("interior_dark", base=(0.12, 0.115, 0.11))
        m["floor_slab"] = noisy_material("slab", (0.2, 0.19, 0.18), roughness=0.9)
        m["wood"] = noisy_material("plywood", (0.46, 0.36, 0.24), roughness=0.85, dirt=0.6, scale=3.0)
        m["frp"] = frp_material("frp_tank")
        m["tarp"] = tarp_material("blue_tarp")
        m["pipe"] = noisy_material("pipe_insulation", (0.46, 0.46, 0.44), roughness=0.7, dirt=0.5)
        m["fan"] = ow.flat_material("fan_dark", (0.05, 0.05, 0.05), roughness=0.5, metallic=0.5)
        m["rubble"] = wall_material("rubble", (0.7, 0.69, 0.66), sill0, self.upper_h, ivy=False)
        m["ground"] = ow.flat_material("ground_asphalt", (0.10, 0.10, 0.10), roughness=0.9)
        m["sandbag"] = noisy_material("sandbag", (0.48, 0.44, 0.34), roughness=0.95, scale=4.0)
        m["sign_back"] = noisy_material("sign_back", (0.24, 0.22, 0.21), roughness=0.6, metallic=0.4, dirt=0.6)

    # --- shell, slabs and rooms
    def structure(self):
        m = self.mats
        W, D = self.W, self.D
        ow.box("main_body", 0.0, ROOM_DEPTH, 0.0, W, D, self.roof_z - 0.3, m["wall_plain"])
        ow.box("room_back", 0.2, ROOM_DEPTH - 0.02, 0.0, W - 0.2, ROOM_DEPTH, self.roof_z - 0.3, m["interior_dark"])
        ow.box("roof_slab", 0.0, 0.0, self.roof_z - 0.3, W, D, self.roof_z, m["roof"])
        for i in range(1, self.floors):
            z = self.floor_z[i]
            ow.box(self.name("slab"), 0.0, SHELL_DEPTH, z - 0.18, W, ROOM_DEPTH, z + 0.06, m["floor_slab"])
        ow.box("slab_ground", 0.0, SHELL_DEPTH, -0.1, W, ROOM_DEPTH, 0.0, m["floor_slab"])
        ow.box("end_wall_w", 0.0, SHELL_DEPTH, 0.0, 0.3, ROOM_DEPTH, self.roof_z, m["wall_plain"])
        ow.box("end_wall_e", W - 0.3, SHELL_DEPTH, 0.0, W, ROOM_DEPTH, self.roof_z, m["wall_plain"])
        # Parapets with coping.
        t = 0.22
        top = self.H - 0.06
        ow.box("parapet_s", 0.0, 0.0, self.roof_z, W, t, top, m["wall"])
        ow.box("parapet_n", 0.0, D - t, self.roof_z, W, D, top, m["wall_plain"])
        ow.box("parapet_w", 0.0, t, self.roof_z, t, D - t, top, m["wall_plain"])
        ow.box("parapet_e", W - t, t, self.roof_z, W, D - t, top, m["wall_plain"])
        c = 0.04
        ow.box("coping_s", -c, -c, top, W + c, t + c, self.H, m["wall_plain"])
        ow.box("coping_n", -c, D - t - c, top, W + c, D + c, self.H, m["wall_plain"])
        ow.box("coping_w", -c, t + c, top, t + c, D - t - c, self.H, m["wall_plain"])
        ow.box("coping_e", W - t - c, t + c, top, W + c, D - t - c, self.H, m["wall_plain"])

    def upper_floors(self):
        m = self.mats
        W = self.W
        bays = int(round(W / BAY_M))
        for i in range(1, self.floors):
            z0, z1 = self.floor_z[i], self.floor_z[i + 1]
            sill = z0 + SILL_ABOVE_FLOOR
            head = sill + WINDOW_H
            ow.box(self.name("spandrel"), 0.0, 0.0, z0, W, SHELL_DEPTH, sill, m["wall"])
            ow.box(self.name("lintel"), 0.0, 0.0, head, W, SHELL_DEPTH, z1, m["wall"])
            ow.box(self.name("floor_band"), -0.06, -0.12, z0 - 0.14, W + 0.06, 0.02, z0 + 0.1, m["wall"])
            edges = [0.0]
            for b in range(bays):
                cx = (b + 0.5) * BAY_M
                edges += [cx - WINDOW_W / 2.0, cx + WINDOW_W / 2.0]
            edges.append(W)
            for k in range(0, len(edges), 2):
                if edges[k + 1] - edges[k] > 0.01:
                    ow.box(self.name("pier"), edges[k], 0.0, sill, edges[k + 1], SHELL_DEPTH, head, m["wall"])
            for b in range(bays):
                cx = (b + 0.5) * BAY_M
                self.window(cx - WINDOW_W / 2.0, cx + WINDOW_W / 2.0, sill, head, z0, z1, floor_index=i)
            # Room dividers behind the piers.
            for b in range(1, bays):
                x = b * BAY_M
                ow.box(self.name("divider"), x - 0.1, SHELL_DEPTH, z0, x + 0.1, ROOM_DEPTH, z1, m["interior_dark"])

    def pick_state(self):
        roll = self.rng.random()
        acc = 0.0
        for state, weight in WINDOW_STATES:
            acc += weight
            if roll < acc:
                return state
        return "dark"

    def window(self, x0, x1, z0, z1, floor_z0, floor_z1, floor_index):
        m = self.mats
        rng = self.rng
        state = self.pick_state()
        # Sill, frame and mullion.
        ow.box(self.name("sill"), x0 - 0.08, -0.07, z0 - 0.06, x1 + 0.08, 0.12, z0, m["wall_plain"])
        fy0, fy1 = 0.12, 0.19
        f = 0.05
        ow.box(self.name("frame"), x0, fy0, z0, x1, fy1, z0 + f, m["frame"])
        ow.box(self.name("frame"), x0, fy0, z1 - f, x1, fy1, z1, m["frame"])
        ow.box(self.name("frame"), x0, fy0, z0, x0 + f, fy1, z1, m["frame"])
        ow.box(self.name("frame"), x1 - f, fy0, z0, x1, fy1, z1, m["frame"])
        xm = (x0 + x1) / 2.0
        ow.box(self.name("mullion"), xm - 0.025, fy0 - 0.01, z0, xm + 0.025, fy1, z1, m["frame"])
        panes = [(x0 + f, xm - 0.025), (xm + 0.025, x1 - f)]
        gy = 0.16
        if state == "broken":
            for p, (px0, px1) in enumerate(panes):
                if rng.random() < 0.75:
                    # Leave a few shards in the corners.
                    for _ in range(rng.randint(1, 2)):
                        corner_x = px0 if rng.random() < 0.5 else px1
                        corner_z = z0 + f if rng.random() < 0.5 else z1 - f
                        sx = (px1 - px0) * rng.uniform(0.2, 0.55) * (1 if corner_x == px0 else -1)
                        sz = (z1 - z0) * rng.uniform(0.2, 0.6) * (1 if corner_z == z0 + f else -1)
                        shard = ow.plane(self.name("shard"), [(corner_x, gy, corner_z), (corner_x + sx, gy, corner_z), (corner_x, gy, corner_z + sz)], m["glass"])
                        self.emit.add_glass(shard)
                else:
                    self.emit.add_glass(ow.plane_south(self.name("glass"), px0, z0 + f, px1, z1 - f, gy, m["glass"]))
        elif state != "boarded":
            for px0, px1 in panes:
                self.emit.add_glass(ow.plane_south(self.name("glass"), px0, z0 + f, px1, z1 - f, gy, m["glass"]))

        if state == "boarded":
            boards = rng.randint(3, 5)
            for b in range(boards):
                bz = z0 + (z1 - z0) * (b + 0.5) / boards
                h = (z1 - z0) / boards * 0.8
                rotated_box(self.name("board"), (xm + rng.uniform(-0.05, 0.05), 0.08, bz), (x1 - x0 + 0.25, 0.03, h), 0.0,
                            m["wood"], tilt=(0.0, rng.uniform(-0.08, 0.08)))
        elif state == "blinds":
            drop = rng.uniform(0.45, 1.0)
            color = rng.choice([(0.70, 0.68, 0.62), (0.60, 0.62, 0.60), (0.66, 0.60, 0.50)])
            ow.plane_south(self.name("blinds"), x0 + f, z1 - (z1 - z0) * drop, x1 - f, z1 - f, 0.22,
                           blinds_material(self.name("blinds_mat"), color))
        elif state == "curtain":
            color = rng.choice([(0.55, 0.42, 0.36), (0.42, 0.48, 0.52), (0.62, 0.58, 0.46)])
            mat = curtain_material(self.name("curtain_mat"), color)
            left = rng.uniform(0.3, 0.6)
            ow.plane_south(self.name("curtain"), x0 + f, z0 + 0.05, x0 + (x1 - x0) * left, z1 - f, 0.24, mat)
            if rng.random() < 0.6:
                ow.plane_south(self.name("curtain"), x1 - (x1 - x0) * rng.uniform(0.2, 0.4), z0 + 0.05, x1 - f, z1 - f, 0.24, mat)

        # Room: back plane (emitter when lit) and a few dark silhouettes.
        back = ow.plane_south(self.name("room"), x0 - 0.5, floor_z0 + 0.05, x1 + 0.5, floor_z1 - 0.2, ROOM_DEPTH - 0.06, m["interior"])
        if state == "lit":
            color = COLORS["lit_warm"] if rng.random() < 0.7 else COLORS["lit_cool"]
            self.emit.add(back, color, rng.uniform(0.35, 0.6))
        for _ in range(rng.randint(0, 2)):
            w = rng.uniform(0.4, 1.2)
            h = rng.uniform(0.9, 2.0)
            sx = rng.uniform(x0 - 0.2, x1 - w + 0.2)
            sy = rng.uniform(1.2, ROOM_DEPTH - 0.4)
            ow.box(self.name("furniture"), sx, sy, floor_z0, sx + w, sy + 0.35, floor_z0 + h, m["interior_dark"])

    # --- ground floor shops
    def shops(self):
        m = self.mats
        W = self.W
        piers = [(0.0, 0.45), (6.3, 6.8), (12.4, 12.9), (W - 0.45, W)]
        fascia_z = 2.85
        for i, (a, b) in enumerate(piers):
            ow.box(self.name("gpier"), a, -0.05, 0.0, b, SHELL_DEPTH, GROUND_FLOOR_M, m["wall"])
        ow.box("fascia", 0.0, 0.0, fascia_z, W, SHELL_DEPTH, GROUND_FLOOR_M, m["wall"])
        ow.box("fascia_band", -0.05, -0.08, GROUND_FLOOR_M - 0.12, W + 0.05, 0.05, GROUND_FLOOR_M + 0.08, m["wall"])
        bays = [(piers[k][1], piers[k + 1][0]) for k in range(3)]
        store_y = 0.4

        # Bay 1: shutter fully down.
        a, b = bays[0]
        ow.box("shutter_box_1", a, -0.06, fascia_z - 0.26, b, 0.2, fascia_z, m["metal"])
        ow.plane_south("shutter_1", a, 0.0, b, fascia_z - 0.26, 0.1, m["shutter"])

        # Bay 2: shutter half up over a dark, wrecked shop.
        a, b = bays[1]
        ow.box("shutter_box_2", a, -0.06, fascia_z - 0.26, b, 0.2, fascia_z, m["metal"])
        ow.plane_south("shutter_2", a, 1.15, b, fascia_z - 0.26, 0.1, m["shutter"])
        ow.plane_south("shop2_back", a, 0.0, b, fascia_z, ROOM_DEPTH - 0.06, m["interior_dark"])
        for k in range(4):
            x = a + 0.2 + k * (b - a - 0.4) / 3.0
            ow.box(self.name("door_frame"), x - 0.03, store_y, 0.0, x + 0.03, store_y + 0.06, 1.15, m["frame"])
        for _ in range(5):
            cx = self.rng.uniform(a + 0.3, b - 0.3)
            rotated_box(self.name("shop_debris"), (cx, self.rng.uniform(0.8, 2.6), 0.2), (self.rng.uniform(0.3, 0.9), 0.4, self.rng.uniform(0.2, 0.7)),
                        self.rng.uniform(-0.4, 0.4), m["interior_dark"])

        # Bay 3: glass shopfront of a mini-mart, partly broken, still lit inside.
        a, b = bays[2]
        mart_back = ow.plane_south("shop3_back", a, 0.0, b, fascia_z, ROOM_DEPTH - 0.06, m["interior"])
        self.emit.add(mart_back, COLORS["lit_cool"], 0.2)
        for k in range(3):
            sx = a + 0.3 + k * 1.75
            ow.box(self.name("shelf"), sx, 1.4, 0.0, sx + 1.2, 1.8, 1.7, m["interior_dark"])
        mullions = [a + k * (b - a) / 4.0 for k in range(5)]
        for x in mullions:
            ow.box(self.name("store_mullion"), x - 0.04, store_y, 0.0, x + 0.04, store_y + 0.08, fascia_z, m["frame"])
        ow.box("store_transom", a, store_y, 2.2, b, store_y + 0.08, 2.28, m["frame"])
        ow.box("store_kick", a, store_y - 0.02, 0.0, b, store_y + 0.08, 0.25, m["frame"])
        for k in range(4):
            x0, x1 = mullions[k] + 0.04, mullions[k + 1] - 0.04
            if k == 1:
                continue  # smashed pane
            self.emit.add_glass(ow.plane_south(self.name("store_glass"), x0, 0.25, x1, 2.2, store_y + 0.04, m["glass"]))
        self.emit.add_glass(ow.plane_south("store_glass_top", a, 2.28, b, fascia_z, store_y + 0.04, m["glass"]))

        # Signs on the fascia.
        self.fascia_signs(bays, fascia_z)
        self.vertical_sign()

        # Utilities on the wall.
        ow.cylinder("drain_pipe", 0.22, -0.12, 0.0, self.H - 0.3, 0.06, m["steel"], segments=12)
        for k, z in enumerate((2.75, 2.62)):
            ow.cylinder(self.name("cable"), -0.18 - 0.05 * k, z, 0.0, W, 0.015, m["fan"], segments=6, axis="X")
        ow.box("meter_box", 6.4, -0.22, 1.3, 6.75, -0.05, 1.85, m["metal"])

    def fascia_signs(self, bays, fascia_z):
        m = self.mats
        z0, z1 = 2.66, 3.5
        zc = (z0 + z1) / 2.0
        signs = [
            {"text": "居酒屋 とり吉", "size": 0.74, "panel": (0.80, 0.76, 0.68), "ink": (0.55, 0.06, 0.04), "lit": True,
             "glow": (1.0, 0.86, 0.62), "glow_strength": 0.45, "ink_glow": (1.0, 0.16, 0.06)},
            {"text": "カラオケ", "size": 0.8, "panel": None, "ink": (0.62, 0.48, 0.56), "lit": True, "ink_glow": COLORS["neon_pink"]},
            {"text": "24H MART", "size": 0.66, "panel": (0.70, 0.74, 0.76), "ink": (0.05, 0.25, 0.5), "lit": False},
        ]
        for (a, b), sign in zip(bays, signs):
            cx = (a + b) / 2.0
            if sign["panel"] is not None:
                panel = ow.box(self.name("sign_panel"), a + 0.25, -0.2, z0, b - 0.25, -0.02, z1,
                               noisy_material(self.name("panel_mat"), sign["panel"], roughness=0.5, dirt=0.55, scale=3.0))
                if sign["lit"]:
                    self.emit.add(panel, sign["glow"], sign["glow_strength"])
                y = -0.21
            else:
                ow.box(self.name("neon_backer"), a + 0.4, -0.06, z0, b - 0.4, -0.01, z1, m["sign_back"])
                y = -0.08
            label = text(self.name("sign_text"), sign["text"], (cx, y, zc), sign["size"],
                         ow.flat_material(self.name("ink"), sign["ink"], roughness=0.4), self.font, extrude=0.01,
                         fit=(b - a - (0.9 if sign["panel"] else 1.2), (z1 - z0) * sign["size"]))
            if sign["lit"]:
                self.emit.add(label, sign["ink_glow"], 1.0)

    def vertical_sign(self):
        """Stacked bar signs on the east pier (facing the street, the way Tokyo zakkyo buildings do)."""
        m = self.mats
        x0, x1 = 16.75, 18.45
        y0, y1 = -0.5, -0.3
        panels = [
            ("酒場", (0.82, 0.60, 0.70), (0.25, 0.04, 0.12), COLORS["neon_pink"], True),
            ("BAR", (0.16, 0.18, 0.22), (0.70, 0.92, 0.95), COLORS["neon_cyan"], True),
            ("麻雀", (0.84, 0.78, 0.52), (0.30, 0.10, 0.05), COLORS["neon_yellow"], False),
            ("占い", (0.64, 0.62, 0.80), (0.18, 0.10, 0.30), (0.62, 0.42, 1.0), True),
        ]
        z = 13.6
        gap = 0.18
        height = 2.05
        for k in range(3):
            ow.box(self.name("sign_bracket"), x0 + 0.1, y1, z - k * 3.5 - 0.1, x1 - 0.1, 0.0, z - k * 3.5, m["steel"])
        ow.box("vsign_frame", x0 - 0.06, y0 - 0.02, z - 4 * (height + gap) - 0.06, x1 + 0.06, y1, z + 0.06, m["sign_back"])
        for k, (label, panel_color, ink, glow, lit) in enumerate(panels):
            top = z - k * (height + gap)
            panel = ow.box(self.name("vsign_panel"), x0, y0 - 0.03, top - height, x1, y0, top,
                           noisy_material(self.name("vpanel_mat"), panel_color, roughness=0.45, dirt=0.6, scale=2.5))
            letters = text(self.name("vsign_text"), label, ((x0 + x1) / 2.0, y0 - 0.04, top - height / 2.0), 0.72,
                           ow.flat_material(self.name("vink"), ink, roughness=0.4), self.font, fit=(x1 - x0 - 0.3, height * 0.62))
            if lit:
                self.emit.add(panel, glow, 0.55)
                self.emit.add(letters, (1.0, 0.97, 0.92), 1.0)

    def wall_units(self):
        """Window AC units hung under some sills, and their pipes."""
        m = self.mats
        bays = int(round(self.W / BAY_M))
        for i in range(1, self.floors):
            for b in range(bays):
                if self.rng.random() > 0.3:
                    continue
                cx = (b + 0.5) * BAY_M + self.rng.uniform(-0.4, 0.4)
                z = self.floor_z[i] + 0.1
                ow.box(self.name("ac_unit"), cx - 0.4, -0.38, z, cx + 0.4, -0.06, z + 0.58, m["metal"])
                ow.cylinder(self.name("ac_fan"), cx + 0.1, z + 0.29, -0.39, -0.37, 0.2, m["fan"], segments=24, axis="Y")
                ow.box(self.name("ac_bracket"), cx - 0.42, -0.4, z - 0.05, cx + 0.42, -0.02, z, m["steel"])
                ow.cylinder(self.name("ac_pipe"), cx - 0.45, -0.12, z + 0.2, self.floor_z[i] + SILL_ABOVE_FLOOR, 0.03, m["pipe"], segments=8)

    # --- roof
    def roof(self):
        m = self.mats
        rng = self.rng
        rz = self.roof_z
        W, D = self.W, self.D
        # Penthouse with water tank and antenna.
        px0, py0, px1, py1, ptop = 12.2, 17.2, 17.4, 23.6, rz + 3.2
        ow.box("penthouse", px0, py0, rz, px1, py1, ptop, m["wall_plain"])
        ow.box("penthouse_roof", px0 + 0.15, py0 + 0.15, ptop, px1 - 0.15, py1 - 0.15, ptop + 0.02, m["roof"])
        for (a, b, c, d) in ((px0, py0, px1, py0 + 0.15), (px0, py1 - 0.15, px1, py1), (px0, py0, px0 + 0.15, py1), (px1 - 0.15, py0, px1, py1)):
            ow.box(self.name("penthouse_lip"), a, b, ptop, c, d, ptop + 0.3, m["wall_plain"])
        ow.box("penthouse_door", 13.0, py0 - 0.05, rz, 14.0, py0, rz + 2.1, m["steel"])
        lamp = ow.box("door_lamp", 13.35, py0 - 0.3, rz + 2.3, 13.65, py0, rz + 2.42, m["metal"])
        self.emit.add(lamp, COLORS["lamp"], 1.0)
        exit_sign = ow.box("exit_sign", 14.3, py0 - 0.08, rz + 2.2, 14.75, py0, rz + 2.42, m["metal"])
        self.emit.add(exit_sign, COLORS["exit_green"], 0.8)
        for (x, y) in ((13.2, 18.4), (16.4, 18.4), (13.2, 21.6), (16.4, 21.6)):
            ow.box(self.name("tank_leg"), x - 0.1, y - 0.1, ptop, x + 0.1, y + 0.1, ptop + 0.6, m["steel"])
        ow.box("tank_base", 12.9, 18.1, ptop + 0.5, 16.7, 21.9, ptop + 0.62, m["steel"])
        ow.box("water_tank", 13.0, 18.2, ptop + 0.62, 16.6, 21.8, ptop + 2.6, m["frp"])
        ow.cylinder("tank_hatch", 15.8, 21.0, ptop + 2.6, ptop + 2.7, 0.3, m["frp"])
        ow.cylinder("tank_vent", 13.6, 18.8, ptop + 2.6, ptop + 3.0, 0.08, m["pipe"], segments=12)
        ow.cylinder("antenna", 17.0, 23.2, ptop, ptop + 3.6, 0.04, m["steel"], segments=8)
        beacon = ow.cylinder("beacon", 17.0, 23.2, ptop + 3.6, ptop + 3.75, 0.09, m["metal"], segments=12)
        self.emit.add(beacon, COLORS["beacon"], 1.0)
        beam("antenna_stay", (17.0, 23.2, ptop + 3.0), (16.0, 22.4, ptop + 0.3), 0.02, m["steel"])

        # Top-discharge AC units on steel bases.
        for row_y, count in ((5.8, 4), (8.8, 3)):
            ow.box(self.name("ac_base"), 1.6, row_y - 0.1, rz, 1.6 + count * 1.6, row_y + 0.95, rz + 0.18, m["steel"])
            for k in range(count):
                x = 1.8 + k * 1.6
                ow.box(self.name("roof_ac"), x, row_y, rz + 0.18, x + 1.3, row_y + 0.82, rz + 1.85, m["metal"])
                ow.cylinder(self.name("roof_fan_ring"), x + 0.65, row_y + 0.41, rz + 1.85, rz + 1.95, 0.36, m["metal"], segments=32)
                ow.cylinder(self.name("roof_fan"), x + 0.65, row_y + 0.41, rz + 1.86, rz + 1.96, 0.31, m["fan"], segments=32)
                for angle in (0.0, math.pi / 2.0):
                    dx, dy = math.cos(angle) * 0.33, math.sin(angle) * 0.33
                    beam(self.name("fan_guard"), (x + 0.65 - dx, row_y + 0.41 - dy, rz + 1.98), (x + 0.65 + dx, row_y + 0.41 + dy, rz + 1.98), 0.025, m["steel"])

        # Split units along the west parapet.
        for k in range(6):
            y = 11.6 + k * 1.05
            ow.box(self.name("split_ac"), 0.35, y, rz + 0.12, 0.7, y + 0.85, rz + 0.75, m["metal"])
            ow.box(self.name("split_stand"), 0.3, y - 0.05, rz, 0.75, y + 0.9, rz + 0.12, m["steel"])

        # Refrigerant pipes to the penthouse, on small supports.
        for offset, material in ((0.0, m["pipe"]), (0.22, m["steel"])):
            y = 7.6 + offset
            ow.cylinder(self.name("pipe_x"), y, rz + 0.35, 0.9, 12.6, 0.07, material, segments=12, axis="X")
            x = 12.6 + offset
            ow.cylinder(self.name("pipe_y"), x, rz + 0.35, y, py0, 0.07, material, segments=12, axis="Y")
        for k in range(6):
            ow.box(self.name("pipe_support"), 1.5 + k * 2.1, 7.45, rz, 1.7 + k * 2.1, 8.05, rz + 0.3, m["steel"])

        # Back of a rooftop sign facing the street (south), with lamps on arms.
        board_y = 1.2
        ow.box("sign_board", 3.0, board_y, rz + 0.8, 15.0, board_y + 0.1, rz + 3.8, m["sign_back"])
        for k in range(7):
            x = 3.1 + k * 1.95
            ow.box(self.name("sign_post"), x - 0.06, board_y + 0.1, rz, x + 0.06, board_y + 0.22, rz + 3.9, m["steel"])
            beam(self.name("sign_brace"), (x, board_y + 0.16, rz + 3.6), (x, board_y + 2.4, rz), 0.08, m["steel"])
            beam(self.name("sign_rail"), (x, board_y + 0.16, rz + 2.0), (x, board_y + 1.4, rz + 1.4), 0.05, m["steel"])
        ow.box("sign_catwalk", 3.0, board_y + 0.25, rz + 1.1, 15.0, board_y + 0.85, rz + 1.16, m["steel"])
        for k in range(4):
            x = 4.4 + k * 3.1
            beam(self.name("lamp_arm"), (x, board_y, rz + 3.85), (x, board_y - 0.7, rz + 3.95), 0.05, m["steel"])
            head = ow.box(self.name("sign_lamp"), x - 0.2, board_y - 0.85, rz + 3.88, x + 0.2, board_y - 0.6, rz + 4.02, m["metal"])
            if k != 2:
                self.emit.add(head, COLORS["lamp"], 0.9)

        # Blue tarp over a pile, weighed down with sandbags.
        lumpy_sheet("blue_tarp", 6.4, 12.4, 10.2, 15.8, rz, rng, m["tarp"], lift=0.7)
        for (x, y) in ((6.5, 12.5), (10.1, 12.6), (6.6, 15.7), (10.0, 15.6), (8.3, 12.45)):
            rotated_box(self.name("sandbag"), (x, y, rz + 0.08), (0.5, 0.32, 0.16), rng.uniform(0, math.pi), m["sandbag"])

        # Skylight with one broken pane.
        ow.box("skylight_curb", 8.0, 19.4, rz, 9.6, 21.2, rz + 0.45, m["wall_plain"])
        self.emit.add_glass(ow.plane_xy("skylight_glass_a", 8.1, 19.5, 8.8, 21.1, rz + 0.46, m["glass"]))
        ow.box("skylight_bar", 8.78, 19.45, rz + 0.45, 8.82, 21.15, rz + 0.5, m["frame"])

        # Rubble, broken parapet chunks, a roof drain.
        for _ in range(26):
            cx = rng.uniform(0.6, W - 0.6)
            cy = rng.choice([rng.uniform(0.5, 2.5), rng.uniform(D - 3.0, D - 0.5), rng.uniform(0.5, D - 0.5)])
            if px0 - 0.5 < cx < px1 + 0.5 and py0 - 0.5 < cy < py1 + 0.5:
                continue
            s = rng.uniform(0.08, 0.38)
            rotated_box(self.name("rubble"), (cx, cy, rz + s * 0.3), (s * rng.uniform(0.8, 1.6), s, s * 0.6), rng.uniform(0, math.pi), m["rubble"],
                        tilt=(rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3)))
        ow.cylinder("roof_drain", W - 0.6, 0.6, rz, rz + 0.02, 0.15, m["fan"], segments=16)

    def ground(self):
        ow.plane_xy("street", -60.0, -60.0, 80.0, 80.0, -0.02, self.mats["ground"])


def build(key, out_root, samples_scale=1.0):
    spec = BUILDINGS[key]
    scene = ow.reset_scene()
    builder = Builder(key, spec)
    builder.build_materials()
    builder.structure()
    builder.upper_floors()
    builder.shops()
    builder.wall_units()
    builder.roof()
    builder.ground()
    ow.setup_world(scene)
    ow.add_sun(scene)
    samples = max(16, int(256 * samples_scale))
    fw, fd = spec["footprint"]
    files = {}

    # South facade: k = 0.5 via a pixel aspect of 2 (each output pixel covers 2.5 cm x 5 cm).
    facade_h_px = int(round(builder.H * ow.PX_PER_M * ow.FACADE_K))
    ow.setup_render(scene, fw, facade_h_px, samples=samples, pixel_aspect_y=1.0 / ow.FACADE_K)
    ow.add_ortho_camera_south(scene, 0.0, 0.0, builder.W, builder.H)
    fill = ow.add_directional_light(scene, "ow_facade_fill", 0.0, FACADE_FILL["azimuth_deg"],
                                    FACADE_FILL["elevation_deg"], FACADE_FILL["angle_deg"])
    exclude_upper_rooms_from_fill(scene, builder, fill)
    fill_stats = calibrate_facade_fill(scene, fill, key)
    files["south"] = f"buildings/{key}-south.png"
    files["southEmit"] = f"buildings/{key}-south_emit.png"
    ow.save_blend(os.path.join(ow.WORK_DIR, f"{key}.blend"))
    ow.render_still(scene, os.path.join(out_root, files["south"]), "PNG")
    builder.emit.render(scene, os.path.join(out_root, files["southEmit"]))

    # Roof: top-down over the footprint, without the facade fill.
    fill.hide_render = True
    ow.setup_render(scene, fw, fd, samples=samples)
    ow.add_ortho_camera_top(scene, 0.0, 0.0, builder.W, builder.D)
    files["roof"] = f"buildings/{key}-roof.png"
    files["roofEmit"] = f"buildings/{key}-roof_emit.png"
    ow.render_still(scene, os.path.join(out_root, files["roof"]), "PNG")
    builder.emit.render(scene, os.path.join(out_root, files["roofEmit"]))

    return [{
        "key": key, "type": "building", "footprint": [fw, fd], "floors": spec["floors"],
        "roof": files["roof"], "roofEmit": files["roofEmit"],
        "south": files["south"], "southEmit": files["southEmit"],
        "southSize": [fw, facade_h_px],
        "facadeFill": fill_stats,
    }]


def exclude_upper_rooms_from_fill(scene, builder, fill):
    """Keep the office rooms behind the upper windows dark: the fill stands for light bouncing off the
    street, which lights the wall but not the depth of the rooms. Ground-floor shops stay lit. Glass is
    excluded too, or it mirrors the low fill and every window turns grey."""
    interior = {builder.mats["interior"].name, builder.mats["interior_dark"].name, builder.mats["floor_slab"].name}
    collection = bpy.data.collections.new("ow_facade_fill_exclude")
    for obj in scene.objects:
        if obj.name in builder.emit.glass:
            collection.objects.link(obj)
            continue
        if obj.type != "MESH" or not obj.data.materials or obj.data.materials[0] is None:
            continue
        if obj.data.materials[0].name not in interior:
            continue
        lowest = min(v.co.z for v in obj.data.vertices)
        if obj.name == "room_back" or lowest >= GROUND_FLOOR_M - 0.25:
            collection.objects.link(obj)
    fill.light_linking.receiver_collection = collection
    for item in collection.collection_objects:
        item.light_linking.link_state = "EXCLUDE"  # everything else still receives the fill
    print(f"[facade fill] {len(collection.objects)} glass and upper-floor room objects excluded from the fill")


def calibrate_facade_fill(scene, fill, key):
    """Solve the fill strength for the facade's target mean luma from two linear renders.

    Light transport is linear, so image(s) = base + s * fill_only. The base render has the fill off;
    the fill-only render has the sky and key light off and the fill at strength 1.
    """
    tmp = os.path.join(tempfile.gettempdir(), "ow_fill")
    cycles = scene.cycles
    saved = (cycles.samples, cycles.use_denoising)
    cycles.samples = FACADE_FILL["calibration_samples"]
    cycles.use_denoising = False
    world = scene.world.node_tree.nodes["Background"].inputs["Strength"]
    sky = world.default_value
    others = [obj for obj in scene.objects if obj.type == "LIGHT" and obj is not fill]

    fill.data.energy = 0.0
    base = ow.read_linear(ow.render_still(scene, tmp + "_base.exr", "EXR"))
    fill.data.energy = 1.0
    world.default_value = 0.0
    for obj in others:
        obj.hide_render = True
    unit = ow.read_linear(ow.render_still(scene, tmp + "_unit.exr", "EXR"))
    world.default_value = sky
    for obj in others:
        obj.hide_render = False
    cycles.samples, cycles.use_denoising = saved

    def luma(strength, rows=slice(None)):
        return float(ow.srgb_luma(ow.linear_to_srgb(base[rows] + strength * unit[rows])).mean())

    low, high = 0.0, 50.0
    for _ in range(40):
        mid = (low + high) / 2.0
        low, high = (mid, high) if luma(mid) < FACADE_FILL["target_luma"] else (low, mid)
    strength = (low + high) / 2.0
    band = slice(-64, None)  # bottom 64 px = the ground-floor shops
    stats = {
        "strength": round(strength, 3),
        "southLumaBefore": round(luma(0.0), 3),
        "southLuma": round(luma(strength), 3),
        "shopBandLumaBefore": round(luma(0.0, band), 3),
        "shopBandLuma": round(luma(strength, band), 3),
    }
    fill.data.energy = strength
    print(f"[facade fill] {key}: {stats}")
    if stats["shopBandLuma"] < FACADE_FILL["shop_band_min"]:
        print(f"[facade fill] WARNING {key}: shop band {stats['shopBandLuma']} < {FACADE_FILL['shop_band_min']}")
    return stats
