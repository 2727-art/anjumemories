"""More building types (WORLD_DESIGN.md 6.6 D, 8 "建物の種類を増やすとき"): ow-bld-b01 / c01 / d01 / e01.

Same ruined night-time Tokyo and the same light rig as ow-bld-a01 (ow_building), and the same four
images per building: roof / roof_emit (top-down) and south / south_emit (k = 0.5). What changes per type
is the size, the number of floors, the facade (cladding, windows, shops and signs) and above all the
roof, so that a street of buildings does not repeat one roof:

- b01 (768 x 768, 5 floors): mid-size zakkyo building. Green urethane waterproofing, peeling; an
  L-shaped steel billboard frame on the south-west corner; stair house and lift room; a horizontal
  stainless tank; outdoor AC racks, crates and drums.
- c01 (512 x 640, 3 floors): small liquor shop with the owner's home above. Silver-painted asphalt
  sheet; the ruins of a rooftop garden (deck, overgrown planters, pergola, a dead tree), laundry poles,
  a prefab shed with a red roof.
- d01 (1024 x 768, 8 floors): wide office / commercial block. Light-grey PVC membrane; two cooling
  towers, a fenced plant yard, a solar array with broken and missing panels, ducts.
- e01 (512 x 1024, 12 floors): slim hotel. Dark urethane with an emergency helipad "H"; a gondola
  track and its yellow carriage; lift room with a lattice mast and the red aircraft-warning light;
  a windsock.

The roof surface albedo is scaled (one Value node per roof surface material) so each roof image has
the mean brightness of ow-bld-a01 (about 0.45, 6.5); the facade fill is solved per building exactly as
for a01. All randomness comes from each building's seed.
"""

import math

import bmesh
import bpy
from mathutils import Matrix, Vector

import ow_building as building
import ow_common as ow
import ow_props as props

COLORS = building.COLORS
SHELL = building.SHELL_DEPTH
ROOM = building.ROOM_DEPTH
ROOF_TARGET_LUMA = 0.45  # ow-bld-a01's roof is 0.446

TYPES = {
    "ow-bld-b01": {
        "footprint": (768, 768), "floors": 5, "seed": 53, "style": "b01",
        "ground_floor_m": 3.6, "parapet_m": 0.9,
        "bay_m": 3.2, "window": (1.8, 1.4), "sill": 0.85, "windows_per_bay": 1,
        "window_states": [("dark", 0.36), ("blinds", 0.18), ("curtain", 0.08), ("broken", 0.14), ("boarded", 0.10), ("lit", 0.14)],
        "wall": {"tex": "square_tiled_wall", "size": 2.0, "tint": (0.94, 0.92, 0.88), "saturation": 0.75, "ivy_x": 17.4},
        "wall_units": 0.3,
    },
    "ow-bld-c01": {
        "footprint": (512, 640), "floors": 3, "seed": 61, "style": "c01",
        "ground_floor_m": 3.2, "parapet_m": 0.7,
        "bay_m": 3.2, "window": (1.6, 1.2), "sill": 0.9, "windows_per_bay": 1,
        "window_states": [("dark", 0.30), ("curtain", 0.20), ("rain_shutter", 0.20), ("broken", 0.12), ("boarded", 0.08), ("lit", 0.10)],
        "wall": {"tex": "white_plaster_rough_01", "size": 1.0, "tint": (0.90, 0.88, 0.82), "saturation": 0.6, "ivy_x": 1.2},
        "wall_units": 0.35,
    },
    "ow-bld-d01": {
        "footprint": (1024, 768), "floors": 8, "seed": 71, "style": "d01",
        "ground_floor_m": 4.0, "parapet_m": 1.0,
        "bay_m": 3.2, "window": (1.35, 1.6), "sill": 0.8, "windows_per_bay": 2,
        "window_states": [("dark", 0.44), ("blinds", 0.24), ("curtain", 0.04), ("broken", 0.14), ("boarded", 0.05), ("lit", 0.09)],
        "wall": {"tex": "rectangular_facade_tiles", "size": 2.0, "tint": (1.0, 1.0, 1.0), "saturation": 0.6, "ivy_x": None},
        "wall_units": 0.0,
    },
    "ow-bld-e01": {
        "footprint": (512, 1024), "floors": 12, "seed": 83, "style": "e01",
        "ground_floor_m": 3.6, "parapet_m": 1.1,
        "bay_m": 3.2, "window": (1.6, 1.5), "sill": 0.85, "windows_per_bay": 1,
        "window_states": [("dark", 0.46), ("curtain", 0.18), ("blinds", 0.05), ("broken", 0.12), ("boarded", 0.06), ("lit", 0.13)],
        "wall": {"tex": "rectangular_facade_tiles_02", "size": 2.1, "tint": (0.98, 0.96, 0.94), "saturation": 0.8, "ivy_x": None},
        "wall_units": 0.0,
    },
}

NEON = {
    "pink": COLORS["neon_pink"],
    "cyan": COLORS["neon_cyan"],
    "yellow": COLORS["neon_yellow"],
    "purple": (0.62, 0.32, 1.0),
    "orange": (1.0, 0.45, 0.08),
    "red": (1.0, 0.1, 0.06),
    "green": (0.25, 1.0, 0.35),
    "blue": (0.25, 0.45, 1.0),
}


def keys():
    return list(TYPES)


# ---------------------------------------------------------------------------
# Materials


def _gain(nb, gains):
    node = nb.value(1.0, label="roof_gain")
    gains.append(node)
    return node.outputs[0]


def _leaves_moss(nb, pos, uv, color, rough, moss_amount=0.6, leaf_amount=1.0):
    """Moss patches and leaf litter shared by the roof surfaces (as on ow-bld-a01)."""
    moss = nb.hsv(nb.tex("concrete_moss", "color", nb.vscale(uv, 1.0 / 2.5)), saturation=0.75, value=0.8)
    patch = nb.map_range(nb.noise(pos, scale=0.3, detail=6.0, roughness=0.65).outputs["Fac"], 0.58, 0.70, 0.0, moss_amount, smooth=True)
    color = nb.mix(patch, color, moss)
    cells = nb.voronoi(pos, scale=11.0, feature="F1")
    leaf_patch = nb.map_range(nb.noise(pos, scale=0.45, detail=4.0).outputs["Fac"], 0.56, 0.68, 0.0, leaf_amount)
    leaf_on = nb.mul(nb.map_range(cells.outputs["Distance"], 0.32, 0.22, 0.0, 1.0), leaf_patch)
    leaf_color = nb.mix(nb.luma(cells.outputs["Color"]), (0.20, 0.11, 0.05), (0.42, 0.28, 0.12))
    color = nb.mix(leaf_on, color, leaf_color)
    rough = nb.mixf(leaf_on, rough, 0.7)
    return color, rough, leaf_on


def _ponding(nb, pos, color, rough, threshold=0.66):
    """Dark, glossy stains where rain water stands."""
    puddle = nb.map_range(nb.noise(pos, scale=0.36, detail=3.0, roughness=0.5).outputs["Fac"], threshold, threshold + 0.04, 0.0, 1.0)
    ring = nb.mul(nb.map_range(nb.noise(pos, scale=0.36, detail=3.0, roughness=0.5).outputs["Fac"], threshold - 0.05, threshold, 0.0, 1.0),
                  nb.sub(1.0, puddle))
    color = nb.mix(nb.mul(puddle, 0.65), color, (0.40, 0.41, 0.42), blend="MULTIPLY")
    color = nb.mix(nb.mul(ring, 0.5), color, (0.55, 0.50, 0.42), blend="MULTIPLY")
    rough = nb.mixf(puddle, rough, 0.12)
    return color, rough


def green_coat_material(name, gains):
    """b01: green urethane waterproofing, sun-faded and peeling to the concrete in sheets."""
    material, nb = ow.new_material(name)
    uv = nb.uv()
    pos = nb.position()
    vec = nb.vscale(uv, 1.0 / 2.0)  # painted_concrete is 2 m
    near = nb.tex("painted_concrete", "color", vec)
    far = nb.tex("painted_concrete", "color", nb.add_vec(nb.vscale(uv, 1.0 / 5.3), (0.31, 0.57, 0.0)))
    color = nb.mix(0.45, near, far)
    color = nb.hsv(color, saturation=0.55, value=0.85)
    fade = nb.map_range(nb.noise(pos, scale=0.12, detail=3.0).outputs["Fac"], 0.42, 0.66, 0.0, 0.55, smooth=True)
    color = nb.mix(fade, color, nb.hsv(color, saturation=0.55, value=1.2))
    peel_noise = nb.noise(pos, scale=0.33, detail=6.0, roughness=0.65).outputs["Fac"]
    peel = nb.map_range(peel_noise, 0.645, 0.665, 0.0, 1.0)
    edge = nb.mul(nb.map_range(peel_noise, 0.615, 0.645, 0.0, 1.0), nb.sub(1.0, peel))
    concrete = nb.mix(1.0, nb.hsv(nb.tex("dirty_concrete", "color", nb.vscale(uv, 1.0 / 3.0)), saturation=0.4), (0.70, 0.69, 0.66), blend="MULTIPLY")
    color = nb.mix(nb.mul(edge, 0.35), color, (0.66, 0.68, 0.62))  # lifted, chalky rim of the coating
    color = nb.mix(peel, color, concrete)
    dirt = nb.noise(pos, scale=0.9, detail=5.0).outputs["Fac"]
    color = nb.mix(nb.map_range(dirt, 0.62, 0.38, 0.0, 0.55), color, (0.55, 0.52, 0.46), blend="MULTIPLY")
    rough = nb.mixf(peel, nb.tex("painted_concrete", "roughness", vec), 0.85)
    color, rough = _ponding(nb, pos, color, rough)
    color, rough, leaf_on = _leaves_moss(nb, pos, uv, color, rough, moss_amount=0.5)
    color = nb.vmath("SCALE", color, scale=_gain(nb, gains))
    normal = nb.bump(nb.sub(nb.mul(leaf_on, 0.5), nb.mul(peel, 0.4)), strength=0.5, distance=0.01,
                     normal=nb.normal_map(nb.tex("painted_concrete", "normal", vec), 0.7))
    nb.output(nb.principled(color, roughness=rough, normal=normal, specular=0.4))
    return material


def silver_sheet_material(name, gains):
    """c01: asphalt roofing sheet in 0.95 m laps, silver-painted, the paint flaking to black."""
    material, nb = ow.new_material(name)
    uv = nb.uv()
    pos = nb.position()
    _, y, _ = nb.separate(pos)
    lap = nb.math("FRACT", nb.math("DIVIDE", y, 0.95))
    seam = nb.map_range(lap, 0.0, 0.035, 1.0, 0.0)
    tone = nb.map_range(nb.luma(nb.tex("dirty_concrete", "color", nb.vscale(uv, 1.0 / 2.6))), 0.2, 0.8, 0.78, 1.08)
    silver = nb.mix(1.0, (0.60, 0.61, 0.60), nb.combine(tone, tone, tone), blend="MULTIPLY")
    flake_noise = nb.noise(pos, scale=0.5, detail=7.0, roughness=0.7).outputs["Fac"]
    flake = nb.map_range(flake_noise, 0.635, 0.665, 0.0, 0.85)
    asphalt = nb.mix(1.0, nb.hsv(nb.tex("asphalt_02", "color", nb.vscale(uv, 1.0 / 1.5)), saturation=0.3), (0.55, 0.54, 0.52), blend="MULTIPLY")
    color = nb.mix(flake, silver, asphalt)
    color = nb.mix(nb.mul(seam, 0.6), color, (0.45, 0.44, 0.42), blend="MULTIPLY")
    rust = nb.map_range(nb.noise(pos, scale=0.25, detail=4.0).outputs["Fac"], 0.62, 0.72, 0.0, 0.55)
    color = nb.mix(rust, color, (0.55, 0.40, 0.26), blend="MULTIPLY")
    rough = nb.mixf(flake, 0.45, 0.9)
    color, rough = _ponding(nb, pos, color, rough, threshold=0.68)
    color, rough, leaf_on = _leaves_moss(nb, pos, uv, color, rough, moss_amount=0.45)
    color = nb.vmath("SCALE", color, scale=_gain(nb, gains))
    normal = nb.bump(nb.add(nb.mul(seam, 0.6), nb.mul(flake, -0.3)), strength=0.5, distance=0.008)
    nb.output(nb.principled(color, roughness=rough, normal=normal, metallic=nb.mixf(flake, 0.35, 0.0), specular=0.45))
    return material


def membrane_material(name, gains):
    """d01: light-grey PVC membrane laid in 2 m strips with welded seams, patched, dirt along the seams."""
    material, nb = ow.new_material(name)
    uv = nb.uv()
    pos = nb.position()
    x, y, _ = nb.separate(pos)
    strip_y = nb.math("DIVIDE", y, 2.0)
    local = nb.math("FRACT", strip_y)
    strip_id = nb.combine(nb.math("FLOOR", nb.math("DIVIDE", x, 18.0)), nb.math("FLOOR", strip_y), 5.0)
    strip_val, _ = nb.white(strip_id, seed=3.0)
    base = nb.mix(1.0, (0.60, 0.61, 0.60), nb.combine(*(nb.map_range(strip_val, 0.0, 1.0, 0.94, 1.04),) * 3), blend="MULTIPLY")
    seam = nb.map_range(local, 0.0, 0.03, 1.0, 0.0)
    seam_dirt = nb.map_range(local, 0.0, 0.12, 1.0, 0.0)
    grime = nb.luma(nb.tex("dirty_concrete", "color", nb.vscale(uv, 1.0 / 4.0)))
    color = nb.mix(1.0, base, nb.combine(*(nb.map_range(grime, 0.2, 0.8, 0.82, 1.05),) * 3), blend="MULTIPLY")
    color = nb.mix(nb.mul(seam_dirt, 0.45), color, (0.52, 0.50, 0.46), blend="MULTIPLY")
    color = nb.mix(nb.mul(seam, 0.4), color, (0.72, 0.73, 0.72))
    cell_id, lx, ly = nb.cells(x, y, 3.0)
    cell_val, _ = nb.white(cell_id, seed=9.0)
    patch = nb.mul(nb.math("GREATER_THAN", cell_val, 0.9), nb.rect(lx, ly, 1.5, 1.5, 0.7, 0.55))
    color = nb.mix(nb.mul(patch, 0.8), color, (0.70, 0.71, 0.70))
    streak = nb.map_range(nb.noise(nb.combine(nb.mul(x, 0.25), nb.mul(y, 1.6), 0.0), scale=1.0, detail=4.0).outputs["Fac"], 0.55, 0.75, 0.0, 0.5)
    color = nb.mix(streak, color, (0.55, 0.53, 0.50), blend="MULTIPLY")
    rough = 0.6
    color, rough = _ponding(nb, pos, color, rough, threshold=0.67)
    color, rough, leaf_on = _leaves_moss(nb, pos, uv, color, rough, moss_amount=0.35, leaf_amount=0.8)
    color = nb.vmath("SCALE", color, scale=_gain(nb, gains))
    normal = nb.bump(nb.add(nb.mul(seam, 0.5), nb.mul(patch, 0.3)), strength=0.4, distance=0.006)
    nb.output(nb.principled(color, roughness=rough, normal=normal, specular=0.45))
    return material


def helipad_material(name, gains, center, radius):
    """e01: dark grey urethane with the painted emergency helipad (yellow circle, white H), worn."""
    material, nb = ow.new_material(name)
    uv = nb.uv()
    pos = nb.position()
    x, y, _ = nb.separate(pos)
    tone = nb.map_range(nb.luma(nb.tex("dirty_concrete", "color", nb.vscale(uv, 1.0 / 3.0))), 0.2, 0.8, 0.82, 1.06)
    color = nb.mix(1.0, (0.36, 0.37, 0.38), nb.combine(tone, tone, tone), blend="MULTIPLY")
    roller = nb.map_range(nb.noise(nb.combine(nb.mul(x, 3.0), nb.mul(y, 0.3), 0.0), scale=1.0, detail=2.0).outputs["Fac"], 0.3, 0.7, 0.92, 1.06)
    color = nb.mix(1.0, color, nb.combine(roller, roller, roller), blend="MULTIPLY")
    fade = nb.map_range(nb.noise(pos, scale=0.15, detail=3.0).outputs["Fac"], 0.45, 0.68, 0.0, 0.4)
    color = nb.mix(fade, color, (0.48, 0.48, 0.47))
    cx, cy = center
    dist = nb.vmath("DISTANCE", nb.combine(x, y, 0.0), (cx, cy, 0.0))
    ring = nb.inside(dist, radius - 0.45, radius)
    bar_l = nb.rect(x, y, cx - 1.35, cy, 0.32, 2.1)
    bar_r = nb.rect(x, y, cx + 1.35, cy, 0.32, 2.1)
    bar_m = nb.rect(x, y, cx, cy, 1.1, 0.3)
    letter = nb.math("MAXIMUM", nb.math("MAXIMUM", bar_l, bar_r), bar_m)
    wear = nb.map_range(nb.noise(pos, scale=2.2, detail=6.0, roughness=0.7).outputs["Fac"], 0.36, 0.46, 0.0, 1.0)
    big_wear = nb.map_range(nb.noise(pos, scale=0.4, detail=3.0).outputs["Fac"], 0.62, 0.7, 1.0, 0.0)
    keep = nb.mul(wear, big_wear)
    color = nb.mix(nb.mul(ring, keep), color, (0.80, 0.58, 0.10))
    color = nb.mix(nb.mul(letter, keep), color, (0.78, 0.78, 0.75))
    rough = 0.7
    color, rough = _ponding(nb, pos, color, rough, threshold=0.67)
    color, rough, leaf_on = _leaves_moss(nb, pos, uv, color, rough, moss_amount=0.3, leaf_amount=0.6)
    color = nb.vmath("SCALE", color, scale=_gain(nb, gains))
    normal = nb.bump(nb.mul(nb.math("MAXIMUM", ring, letter), keep), strength=0.2, distance=0.004)
    nb.output(nb.principled(color, roughness=rough, normal=normal, specular=0.4))
    return material


def deck_material(name, gains):
    """c01: grey, weathered deck boards (UVs along the boards)."""
    material, nb = ow.new_material(name)
    u, v, _ = nb.separate(nb.uv())
    vec = nb.combine(nb.mul(v, 0.5), nb.mul(u, 0.5), 0.0)  # the texture's boards run along v; ours run east-west
    uv = nb.uv()
    color = nb.mix(1.0, nb.hsv(nb.tex("weathered_planks", "color", vec), saturation=0.7), (0.92, 0.90, 0.86), blend="MULTIPLY")
    pos = nb.position()
    rot = nb.map_range(nb.noise(pos, scale=0.6, detail=5.0).outputs["Fac"], 0.6, 0.75, 0.0, 0.6)
    color = nb.mix(rot, color, (0.25, 0.22, 0.18), blend="MULTIPLY")
    rough = nb.tex("weathered_planks", "roughness", vec)
    color, rough, _ = _leaves_moss(nb, pos, uv, color, rough, moss_amount=0.55)
    color = nb.vmath("SCALE", color, scale=_gain(nb, gains))
    nb.output(nb.principled(color, roughness=rough, normal=nb.normal_map(nb.tex("weathered_planks", "normal", vec), 0.8)))
    return material


def solar_material(name, broken=False):
    """Mono-crystalline panel: dark blue cells, silver grid, glass. Broken panels are crazed and milky."""
    material, nb = ow.new_material(name)
    uv = nb.uv()
    u, v, _ = nb.separate(uv)
    grid_u = nb.map_range(nb.math("FRACT", nb.math("DIVIDE", u, 0.166)), 0.0, 0.04, 1.0, 0.0)
    grid_v = nb.map_range(nb.math("FRACT", nb.math("DIVIDE", v, 0.166)), 0.0, 0.04, 1.0, 0.0)
    grid = nb.math("MAXIMUM", grid_u, grid_v)
    color = nb.mix(grid, (0.035, 0.055, 0.12), (0.38, 0.40, 0.42))
    rough = nb.mixf(grid, 0.12, 0.4)
    if broken:
        cracks = nb.voronoi(nb.position(), scale=2.4, feature="DISTANCE_TO_EDGE")
        crack = nb.map_range(cracks.outputs["Distance"], 0.0, 0.03, 1.0, 0.0)
        milky = nb.map_range(nb.noise(nb.position(), scale=1.5, detail=3.0).outputs["Fac"], 0.4, 0.6, 0.0, 0.6)
        color = nb.mix(milky, color, (0.30, 0.33, 0.36))
        color = nb.mix(crack, color, (0.62, 0.64, 0.66))
        rough = nb.mixf(nb.math("MAXIMUM", crack, milky), rough, 0.6)
    dirt = nb.map_range(nb.noise(nb.position(), scale=0.8, detail=4.0).outputs["Fac"], 0.55, 0.75, 0.0, 0.5)
    color = nb.mix(dirt, color, (0.42, 0.40, 0.36))
    nb.output(nb.principled(color, roughness=rough, specular=0.6))
    return material


def soil_material(name):
    material, nb = ow.new_material(name)
    uv = nb.uv()
    soil = nb.mix(1.0, nb.hsv(nb.tex("brown_mud_leaves_01", "color", nb.vscale(uv, 1.0 / 1.5)), saturation=0.7), (0.8, 0.75, 0.7), blend="MULTIPLY")
    weeds = nb.hsv(nb.tex("withered_grass", "color", nb.vscale(uv, 1.0 / 1.2)), saturation=0.8)
    patch = nb.map_range(nb.noise(nb.position(), scale=1.4, detail=4.0).outputs["Fac"], 0.42, 0.58, 0.0, 1.0)
    nb.output(nb.principled(nb.mix(patch, soil, weeds), roughness=0.95))
    return material


def stripes_material(name, color_a, color_b, period, axis="Y"):
    """Painted stripes along one axis (windsock bands, hazard paint)."""
    material, nb = ow.new_material(name)
    x, y, z = nb.separate(nb.position())
    coord = {"X": x, "Y": y, "Z": z}[axis]
    band = nb.math("GREATER_THAN", nb.math("FRACT", nb.math("DIVIDE", coord, period)), 0.5)
    color = nb.mix(band, color_a, color_b)
    dirt = nb.noise(nb.position(), scale=2.0, detail=4.0).outputs["Fac"]
    color = nb.mix(nb.map_range(dirt, 0.6, 0.35, 0.0, 0.4), color, (0.5, 0.47, 0.42), blend="MULTIPLY")
    nb.output(nb.principled(color, roughness=0.8))
    return material


# ---------------------------------------------------------------------------
# Small geometry helpers


def disc(name, center, radius, depth, direction, material, radius2=None, segments=24):
    """Cone frustum (dish, sock, lamp shade) centred at `center`, axis along `direction`."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=radius, radius2=radius if radius2 is None else radius2, depth=depth)
    rot = Vector(direction).normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation(Vector(center)) @ rot, verts=bm.verts)
    return ow.mesh_object(name, bm, material)


def sphere(name, center, radius, material, subdivisions=2, scale=(1.0, 1.0, 1.0)):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, radius=radius)
    bmesh.ops.scale(bm, vec=Vector(scale), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(center), verts=bm.verts)
    return ow.mesh_object(name, bm, material)


# ---------------------------------------------------------------------------
# Builder


class TypedBuilder(building.Builder):
    """ow_building.Builder with per-type floors, windows, shops and roof."""

    def __init__(self, key, spec):
        super().__init__(key, spec)
        self.spec = spec
        self.ground_floor_m = spec["ground_floor_m"]
        self.roof_z = self.H - spec["parapet_m"]
        upper = (self.roof_z - self.ground_floor_m) / (self.floors - 1)
        self.floor_z = [0.0] + [self.ground_floor_m + i * upper for i in range(self.floors - 1)] + [self.roof_z]
        self.upper_h = upper
        self.bay_m = spec["bay_m"]
        self.window_w, self.window_h = spec["window"]
        self.sill = spec["sill"]
        self.window_states = spec["window_states"]
        self.forced_state = None
        self.roof_gains = []
        self.keep_out = []

    # --- materials
    def build_materials(self):
        super().build_materials()
        m = self.mats
        spec = self.spec
        wall = spec["wall"]
        sill0 = self.ground_floor_m + self.sill
        common = {"tex_id": wall["tex"], "tex_size": wall["size"], "saturation": wall["saturation"], "ground_floor_m": self.ground_floor_m}
        ivy = wall["ivy_x"] is not None
        m["wall"] = building.wall_material("wall_t", wall["tint"], sill0, self.upper_h, ivy=ivy, ivy_x=wall["ivy_x"] or 0.0, **common)
        m["wall_plain"] = building.wall_material("wall_plain_t", tuple(c * 0.94 for c in wall["tint"]), sill0, self.upper_h, ivy=False, **common)
        m["roof_plain"] = building.roof_material("roof_plain")
        style = spec["style"]
        if style == "b01":
            m["roof"] = green_coat_material("roof_green", self.roof_gains)
        elif style == "c01":
            m["roof"] = silver_sheet_material("roof_silver", self.roof_gains)
            m["deck"] = deck_material("deck", self.roof_gains)
        elif style == "d01":
            m["roof"] = membrane_material("roof_membrane", self.roof_gains)
        else:
            m["roof"] = helipad_material("roof_helipad", self.roof_gains, (self.W / 2.0, 8.8), 5.0)
        m["stainless"] = building.noisy_material("stainless", (0.66, 0.67, 0.68), roughness=0.3, metallic=0.9, dirt=0.45)
        m["galv"] = building.noisy_material("galvanised", (0.58, 0.59, 0.58), roughness=0.45, metallic=0.7, dirt=0.4)
        m["cream"] = building.noisy_material("cream_paint", (0.74, 0.70, 0.60), roughness=0.6, dirt=0.55)
        m["yellow"] = building.noisy_material("safety_yellow", (0.78, 0.58, 0.08), roughness=0.55, dirt=0.5)
        m["crate_y"] = building.noisy_material("crate_yellow", (0.80, 0.58, 0.06), roughness=0.5, dirt=0.4, scale=4.0)
        m["crate_r"] = building.noisy_material("crate_red", (0.58, 0.07, 0.05), roughness=0.5, dirt=0.4, scale=4.0)
        m["drum_b"] = building.noisy_material("drum_blue", (0.07, 0.17, 0.44), roughness=0.5, metallic=0.3, dirt=0.55)
        m["drum_r"] = building.noisy_material("drum_red", (0.50, 0.08, 0.05), roughness=0.5, metallic=0.3, dirt=0.55)
        m["pvc_blue"] = building.noisy_material("pvc_blue", (0.12, 0.30, 0.55), roughness=0.5, dirt=0.4)
        m["grate"] = props.textured("checker_plate", "metal_grate_rusty", 0.5, tint=(0.7, 0.7, 0.7), saturation=0.6, metallic=0.5)
        m["red_roof"] = props.textured("box_profile", "box_profile_metal_sheet", 2.0, tint=(0.9, 0.85, 0.85), saturation=0.85, metallic=0.3)
        m["corrugated"] = props.textured("corrugated", "corrugated_iron", 1.12, tint=(0.8, 0.8, 0.78), saturation=0.6, metallic=0.4)
        m["soil"] = soil_material("planter_soil")
        m["terracotta"] = building.noisy_material("terracotta", (0.50, 0.26, 0.15), roughness=0.85, dirt=0.5, scale=3.0)
        m["plastic_white"] = building.noisy_material("plastic_white", (0.70, 0.69, 0.66), roughness=0.5, dirt=0.6, scale=3.0)
        m["cloth_blue"] = building.noisy_material("cloth_blue", (0.20, 0.30, 0.48), roughness=0.95, dirt=0.4, scale=5.0)
        m["cloth_pink"] = building.noisy_material("cloth_pink", (0.70, 0.45, 0.48), roughness=0.95, dirt=0.4, scale=5.0)
        m["solar"] = solar_material("solar")
        m["solar_broken"] = solar_material("solar_broken", broken=True)
        m["frp_green"] = building.noisy_material("frp_green", (0.46, 0.52, 0.48), roughness=0.6, dirt=0.5)
        m["windsock"] = stripes_material("windsock", (0.85, 0.32, 0.06), (0.78, 0.76, 0.72), 0.45, axis="X")
        m["vend_red"] = building.noisy_material("vend_red", (0.55, 0.06, 0.05), roughness=0.4, dirt=0.4)
        m["vend_white"] = building.noisy_material("vend_white", (0.70, 0.72, 0.74), roughness=0.4, dirt=0.45)
        m["light_panel"] = building.noisy_material("light_panel", (0.78, 0.80, 0.80), roughness=0.4, dirt=0.3, scale=3.0)
        m["dark_wood"] = building.noisy_material("dark_wood", (0.22, 0.14, 0.08), roughness=0.7, dirt=0.4, scale=3.0)
        m["shutter_metal"] = building.pbr_material("rain_shutter", "rusty_metal_02", 1.6, tint=(0.62, 0.62, 0.58), saturation=0.4, metallic=0.4)

    # --- windows
    def pick_state(self):
        if self.forced_state:
            state, self.forced_state = self.forced_state, None
            return state
        roll = self.rng.random()
        acc = 0.0
        for state, weight in self.window_states:
            acc += weight
            if roll < acc:
                return state
        return "dark"

    def window(self, x0, x1, z0, z1, floor_z0, floor_z1, floor_index):
        state = self.pick_state()
        if state != "rain_shutter":
            self.forced_state = state
            return super().window(x0, x1, z0, z1, floor_z0, floor_z1, floor_index)
        # Steel rain shutters (amado) closed over the window, with their box beside it.
        m = self.mats
        ow.box(self.name("sill"), x0 - 0.08, -0.07, z0 - 0.06, x1 + 0.08, 0.12, z0, m["wall_plain"])
        ow.plane_south(self.name("amado"), x0, z0, x1, z1, 0.05, m["shutter_metal"])
        ow.box(self.name("amado_rail"), x0 - 0.04, -0.03, z1, x1 + 0.04, 0.08, z1 + 0.06, m["frame"])
        ow.box(self.name("amado_box"), x1 + 0.02, -0.14, z0, x1 + 0.42, 0.05, z1 + 0.06, m["shutter_metal"])
        return None

    def window_centers(self):
        per = self.spec["windows_per_bay"]
        bays = int(round(self.W / self.bay_m))
        return [(b + (k + 0.5) / per) * self.bay_m for b in range(bays) for k in range(per)], bays

    def upper_floors(self):
        m = self.mats
        W = self.W
        ww, wh = self.window_w, self.window_h
        centers, bays = self.window_centers()
        for i in range(1, self.floors):
            z0, z1 = self.floor_z[i], self.floor_z[i + 1]
            sill = z0 + self.sill
            head = sill + wh
            ow.box(self.name("spandrel"), 0.0, 0.0, z0, W, SHELL, sill, m["wall"])
            ow.box(self.name("lintel"), 0.0, 0.0, head, W, SHELL, z1, m["wall"])
            ow.box(self.name("floor_band"), -0.06, -0.12, z0 - 0.14, W + 0.06, 0.02, z0 + 0.1, m["wall_plain"])
            edges = [0.0]
            for cx in centers:
                edges += [cx - ww / 2.0, cx + ww / 2.0]
            edges.append(W)
            for k in range(0, len(edges), 2):
                if edges[k + 1] - edges[k] > 0.01:
                    ow.box(self.name("pier"), edges[k], 0.0, sill, edges[k + 1], SHELL, head, m["wall"])
            for cx in centers:
                self.window(cx - ww / 2.0, cx + ww / 2.0, sill, head, z0, z1, floor_index=i)
            for b in range(1, bays):
                x = b * self.bay_m
                # Kept under the roof slab, or its top shows through the roof surface.
                ow.box(self.name("divider"), x - 0.1, SHELL, z0, x + 0.1, ROOM, min(z1, self.roof_z - 0.32), m["interior_dark"])

    def wall_units(self):
        chance = self.spec["wall_units"]
        if chance <= 0:
            return
        m = self.mats
        centers, _ = self.window_centers()
        for i in range(1, self.floors):
            for cx in centers:
                if self.rng.random() > chance:
                    continue
                cx += self.rng.uniform(-0.3, 0.3)
                z = self.floor_z[i] + 0.1
                ow.box(self.name("ac_unit"), cx - 0.4, -0.38, z, cx + 0.4, -0.06, z + 0.58, m["metal"])
                ow.cylinder(self.name("ac_fan"), cx + 0.1, z + 0.29, -0.39, -0.37, 0.2, m["fan"], segments=24, axis="Y")
                ow.box(self.name("ac_bracket"), cx - 0.42, -0.4, z - 0.05, cx + 0.42, -0.02, z, m["steel"])
                ow.cylinder(self.name("ac_pipe"), cx - 0.45, -0.12, z + 0.2, self.floor_z[i] + self.sill, 0.03, m["pipe"], segments=8)

    # --- ground floor parts
    def ground_piers(self, piers):
        for a, b in piers:
            ow.box(self.name("gpier"), a, -0.05, 0.0, b, SHELL, self.ground_floor_m, self.mats["wall"])

    def fascia(self, fascia_z):
        m = self.mats
        gf = self.ground_floor_m
        ow.box(self.name("fascia"), 0.0, 0.0, fascia_z, self.W, SHELL, gf, m["wall"])
        ow.box(self.name("fascia_band"), -0.05, -0.08, gf - 0.12, self.W + 0.05, 0.05, gf + 0.08, m["wall_plain"])

    def shutter_bay(self, a, b, fascia_z, open_to=0.0, lit=None):
        m = self.mats
        ow.box(self.name("shutter_box"), a, -0.06, fascia_z - 0.26, b, 0.2, fascia_z, m["metal"])
        ow.plane_south(self.name("shutter"), a, open_to, b, fascia_z - 0.26, 0.1, m["shutter"])
        if open_to <= 0.0:
            return
        back = ow.plane_south(self.name("shop_back"), a, 0.0, b, fascia_z, ROOM - 0.06, m["interior"] if lit else m["interior_dark"])
        if lit:
            self.emit.add(back, lit[0], lit[1])
        for _ in range(4):
            cx = self.rng.uniform(a + 0.4, b - 0.4)
            building.rotated_box(self.name("shop_stock"), (cx, self.rng.uniform(1.0, 2.6), 0.35),
                                 (self.rng.uniform(0.4, 1.0), 0.5, self.rng.uniform(0.4, 0.9)), self.rng.uniform(-0.3, 0.3), m["interior_dark"])

    def glass_bay(self, a, b, fascia_z, lit, panes=4, smashed=(), shelves=True, door=None):
        """Shopfront glass over a lit interior. `door` = index of a pane left open (dark doorway)."""
        m = self.mats
        store_y = 0.4
        back = ow.plane_south(self.name("shop_back"), a, 0.0, b, fascia_z, ROOM - 0.06, m["interior"])
        if lit:
            self.emit.add(back, lit[0], lit[1])
        if shelves:
            count = max(1, int((b - a) / 1.9))
            for k in range(count):
                sx = a + 0.3 + k * (b - a - 0.6) / count
                ow.box(self.name("shelf"), sx, 1.4, 0.0, sx + 1.1, 1.8, 1.6, m["interior_dark"])
        mullions = [a + k * (b - a) / panes for k in range(panes + 1)]
        for x in mullions:
            ow.box(self.name("store_mullion"), x - 0.04, store_y, 0.0, x + 0.04, store_y + 0.08, fascia_z, m["frame"])
        ow.box(self.name("store_transom"), a, store_y, 2.2, b, store_y + 0.08, 2.28, m["frame"])
        ow.box(self.name("store_kick"), a, store_y - 0.02, 0.0, b, store_y + 0.08, 0.25, m["frame"])
        for k in range(panes):
            x0, x1 = mullions[k] + 0.04, mullions[k + 1] - 0.04
            if k in smashed or k == door:
                continue
            self.emit.add_glass(ow.plane_south(self.name("store_glass"), x0, 0.25, x1, 2.2, store_y + 0.04, m["glass"]))
        self.emit.add_glass(ow.plane_south(self.name("store_glass_top"), a, 2.28, b, fascia_z, store_y + 0.04, m["glass"]))

    def fascia_sign(self, a, b, z0, z1, text, size, ink, panel=None, glow=None, glow_strength=0.0, ink_glow=None, ink_strength=1.0, depth=0.18,
                    halo=None):
        """Box sign (`panel`, lit with `glow`) or neon letters on a dark backer. `halo` = (colour, strength)
        lights the backer around neon letters in their hue: thin letters alone are too small a light for
        the street glow the game derives from south_emit (8 "ネオンの照り返し")."""
        zc = (z0 + z1) / 2.0
        cx = (a + b) / 2.0
        if panel is not None:
            obj = ow.box(self.name("sign_panel"), a, -0.02 - depth, z0, b, -0.02, z1,
                         building.noisy_material(self.name("panel_mat"), panel, roughness=0.5, dirt=0.5, scale=3.0))
            if glow is not None:
                self.emit.add(obj, glow, glow_strength)
            y = -0.03 - depth
            fit = (b - a - 0.5, (z1 - z0) * size)
        else:
            backer = ow.box(self.name("neon_backer"), a, -0.06, z0, b, -0.01, z1, self.mats["sign_back"])
            if halo is not None:
                self.emit.add(backer, halo[0], halo[1])
            y = -0.08
            fit = (b - a - 0.6, (z1 - z0) * size)
        label = building.text(self.name("sign_text"), text, (cx, y, zc), size,
                              ow.flat_material(self.name("ink"), ink, roughness=0.4), self.font, extrude=0.01, fit=fit)
        if ink_glow is not None:
            self.emit.add(label, ink_glow, ink_strength)
        return label

    def vertical_sign(self, x0, x1, top, panels, height=2.0, gap=0.16, y0=-0.5):
        """Stacked bar signs hung off the facade; panels = (text, panel colour, ink, glow or None)."""
        m = self.mats
        y1 = y0 + 0.2
        bottom = top - len(panels) * (height + gap)
        for z in (top - 0.3, (top + bottom) / 2.0, bottom + 0.3):
            ow.box(self.name("sign_bracket"), x0 + 0.1, y1, z - 0.1, x1 - 0.1, 0.0, z, m["steel"])
        ow.box(self.name("vsign_frame"), x0 - 0.06, y0 - 0.02, bottom - 0.06, x1 + 0.06, y1, top + 0.06, m["sign_back"])
        for k, (label, panel_color, ink, glow) in enumerate(panels):
            ptop = top - k * (height + gap)
            panel = ow.box(self.name("vsign_panel"), x0, y0 - 0.03, ptop - height, x1, y0, ptop,
                           building.noisy_material(self.name("vpanel_mat"), panel_color, roughness=0.45, dirt=0.6, scale=2.5))
            letters = building.text(self.name("vsign_text"), label, ((x0 + x1) / 2.0, y0 - 0.04, ptop - height / 2.0), 0.72,
                                    ow.flat_material(self.name("vink"), ink, roughness=0.4), self.font,
                                    fit=(x1 - x0 - 0.3, height * 0.66))
            if glow is not None:
                self.emit.add(panel, glow, 0.5)
                self.emit.add(letters, glow, 1.0)

    def stand_sign(self, x, text, panel, ink, glow, width=0.62, height=1.05):
        """Lit A-board on the pavement in front of a shop."""
        m = self.mats
        y = -0.75
        ow.box(self.name("stand_frame"), x - width / 2 - 0.03, y, 0.0, x + width / 2 + 0.03, y + 0.35, 0.08, m["steel"])
        panel = ow.box(self.name("stand_panel"), x - width / 2, y, 0.08, x + width / 2, y + 0.3, height,
                       building.noisy_material(self.name("stand_mat"), panel, roughness=0.4, dirt=0.4, scale=3.0))
        self.emit.add(panel, glow, 0.6)
        label = building.text(self.name("stand_text"), text, (x, y - 0.01, 0.08 + (height - 0.08) / 2.0), 0.3,
                              ow.flat_material(self.name("stand_ink"), ink, roughness=0.4), self.font, fit=(width - 0.12, height * 0.7))
        self.emit.add(label, glow, 0.9)

    def vending_machine(self, x0, body, display_color, width=1.0):
        m = self.mats
        y0, y1 = -0.78, -0.06
        ow.box(self.name("vend_body"), x0, y0, 0.0, x0 + width, y1, 1.83, m[body])
        window = ow.box(self.name("vend_window"), x0 + 0.08, y0 - 0.01, 1.0, x0 + width - 0.08, y0 + 0.02, 1.7, m["light_panel"])
        self.emit.add(window, display_color, 0.4)
        for k in range(6):
            bx = x0 + 0.12 + k * (width - 0.24) / 5.0
            button = ow.box(self.name("vend_button"), bx - 0.04, y0 - 0.02, 0.92, bx + 0.04, y0, 0.97, m["light_panel"])
            self.emit.add(button, NEON["green"] if k % 3 else NEON["red"], 0.8)
        ow.box(self.name("vend_slot"), x0 + 0.15, y0 - 0.01, 0.15, x0 + width - 0.15, y0 + 0.02, 0.5, m["fan"])

    def utilities(self, drain_x, meter_x):
        m = self.mats
        ow.cylinder(self.name("drain_pipe"), drain_x, -0.12, 0.0, self.H - 0.3, 0.06, m["steel"], segments=12)
        for k, z in enumerate((self.ground_floor_m - 0.85, self.ground_floor_m - 0.98)):
            ow.cylinder(self.name("cable"), -0.18 - 0.05 * k, z, 0.0, self.W, 0.015, m["fan"], segments=6, axis="X")
        ow.box(self.name("meter_box"), meter_x, -0.22, 1.3, meter_x + 0.35, -0.05, 1.85, m["metal"])

    # --- facades
    def facade(self):
        getattr(self, f"facade_{self.spec['style']}")()

    def facade_b01(self):
        """Ramen shop, the stair entrance to the bars upstairs, a snack bar behind a half-open shutter."""
        W = self.W
        fz = 2.85
        piers = [(0.0, 0.45), (7.2, 7.6), (11.4, 11.8), (W - 0.45, W)]
        self.ground_piers(piers)
        self.fascia(fz)
        self.glass_bay(0.45, 7.2, fz, (COLORS["lit_warm"], 0.2), panes=4, smashed=(2,), door=1)
        lantern = sphere(self.name("lantern"), (2.3, -0.35, 2.35), 0.26, ow.flat_material(self.name("lantern_mat"), (0.6, 0.1, 0.06), roughness=0.6))
        self.emit.add(lantern, NEON["red"], 0.9)
        self.fascia_sign(0.7, 6.95, 2.66, 3.5, "ラーメン 龍", 0.8, (0.92, 0.88, 0.80), panel=(0.62, 0.08, 0.06),
                         glow=NEON["red"], glow_strength=0.55, ink_glow=(1.0, 0.92, 0.8), ink_strength=0.9)
        self.glass_bay(7.6, 11.4, fz, (COLORS["lit_cool"], 0.06), panes=2, shelves=False, door=0)
        self.fascia_sign(7.8, 11.2, 2.7, 3.45, "第二星野ビル", 0.7, (0.70, 0.70, 0.68))
        self.stand_sign(9.5, "スナック\n蘭", (0.30, 0.10, 0.36), (0.95, 0.9, 1.0), NEON["purple"])
        self.shutter_bay(11.8, W - 0.45, fz, open_to=1.1, lit=((1.0, 0.35, 0.7), 0.2))  # the snack bar's pink light under the shutter
        self.fascia_sign(12.1, W - 0.75, 2.66, 3.5, "スナック 蘭", 0.85, (0.62, 0.48, 0.66), ink_glow=NEON["pink"], ink_strength=1.0,
                         halo=(NEON["pink"], 0.55))
        self.vertical_sign(0.55, 2.05, 14.7, [
            ("BAR", (0.14, 0.16, 0.20), (0.70, 0.92, 0.95), NEON["cyan"]),
            ("スナック", (0.40, 0.20, 0.46), (0.95, 0.90, 1.0), NEON["purple"]),
            ("居酒屋", (0.86, 0.50, 0.20), (0.25, 0.08, 0.02), NEON["orange"]),
            ("麻雀", (0.84, 0.78, 0.52), (0.30, 0.10, 0.05), None),
        ], height=2.05)
        self.utilities(W - 0.25, 7.65)

    def facade_c01(self):
        """Liquor and tobacco shop with vending machines; the family's front door."""
        W = self.W
        fz = 2.5
        piers = [(0.0, 0.4), (8.0, 8.4), (W - 0.4, W)]
        self.ground_piers(piers)
        self.fascia(fz)
        self.shutter_bay(0.4, 8.0, fz, open_to=1.5, lit=((1.0, 0.92, 0.80), 0.1))
        self.fascia_sign(0.6, 7.8, 2.48, 3.12, "酒・たばこ 山田商店", 0.8, (0.92, 0.88, 0.80), panel=(0.58, 0.07, 0.05),
                         glow=NEON["red"], glow_strength=0.5, ink_glow=(1.0, 0.92, 0.8), ink_strength=0.8)
        tobacco = ow.box(self.name("tobacco_sign"), 6.9, -0.42, 1.9, 7.9, -0.3, 2.36,
                         building.noisy_material(self.name("tobacco_mat"), (0.62, 0.06, 0.05), roughness=0.4, dirt=0.4))
        self.emit.add(tobacco, NEON["red"], 0.7)
        label = building.text(self.name("tobacco_text"), "たばこ", (7.4, -0.43, 2.13), 0.3,
                              ow.flat_material(self.name("tobacco_ink"), (0.95, 0.92, 0.85)), self.font, fit=(0.85, 0.3))
        self.emit.add(label, (1.0, 0.95, 0.9), 0.9)
        self.vending_machine(0.7, "vend_red", (0.92, 0.95, 1.0))
        self.vending_machine(1.8, "vend_white", (0.80, 0.92, 1.0))
        m = self.mats
        ow.plane_south(self.name("house_back"), 8.4, 0.0, W - 0.4, fz, ROOM - 0.06, m["interior_dark"])
        ow.box(self.name("house_wall"), 8.4, 0.0, 0.0, W - 0.4, SHELL, fz, m["wall_plain"])
        ow.box(self.name("house_door"), 9.4, -0.05, 0.0, 10.4, 0.02, 2.1, m["dark_wood"])
        ow.box(self.name("door_frame"), 9.32, -0.07, 0.0, 10.48, 0.0, 2.16, m["frame"])
        ow.box(self.name("mailbox"), 11.0, -0.2, 1.0, 11.4, -0.05, 1.35, m["metal"])
        lamp = ow.box(self.name("door_lamp"), 10.6, -0.18, 2.15, 10.8, -0.05, 2.3, m["metal"])
        self.emit.add(lamp, COLORS["lamp"], 0.9)
        window = ow.plane_south(self.name("house_window"), 10.9, 1.5, 12.0, 2.2, 0.1, m["glass"])
        self.emit.add_glass(window)
        self.utilities(0.2, 8.5)

    def facade_d01(self):
        """Game centre, the office lobby, a drugstore; karaoke letters in the first-floor windows."""
        W = self.W
        fz = 3.2
        piers = [(0.0, 0.5), (8.4, 8.9), (16.7, 17.2), (W - 0.5, W)]
        self.ground_piers(piers)
        self.fascia(fz)
        m = self.mats
        self.glass_bay(0.5, 8.4, fz, (COLORS["lit_cool"], 0.08), panes=5, smashed=(3,), shelves=False)
        for k, color in enumerate((NEON["pink"], NEON["cyan"], NEON["yellow"], NEON["purple"])):
            x = 1.0 + k * 1.8
            ow.box(self.name("crane_game"), x, 1.0, 0.0, x + 1.2, 2.0, 1.0, m["frame"])
            booth = ow.box(self.name("crane_glass"), x + 0.05, 1.0, 1.0, x + 1.15, 1.95, 1.9, m["light_panel"])
            self.emit.add(booth, color, 0.55)
        self.fascia_sign(0.8, 8.1, 3.3, 3.95, "GAME 24H", 0.85, (0.62, 0.40, 0.58), ink_glow=NEON["pink"], ink_strength=1.0,
                         halo=(NEON["pink"], 0.32))
        self.glass_bay(8.9, 16.7, fz, (COLORS["lit_cool"], 0.04), panes=4, shelves=False, door=1)
        exit_sign = ow.box(self.name("lobby_exit"), 12.3, 0.3, 2.45, 12.9, 0.36, 2.7, m["metal"])
        self.emit.add(exit_sign, COLORS["exit_green"], 0.8)
        self.fascia_sign(9.4, 16.2, 3.35, 3.9, "第一中央ビル", 0.7, (0.72, 0.72, 0.70))
        self.shutter_bay(17.2, W - 0.5, fz, open_to=1.3, lit=((1.0, 0.96, 0.86), 0.14))
        self.fascia_sign(17.4, W - 0.7, 3.25, 3.95, "ドラッグ ハヤミ", 0.8, (0.05, 0.18, 0.55), panel=(0.86, 0.72, 0.10),
                         glow=NEON["yellow"], glow_strength=0.45, ink_glow=NEON["blue"], ink_strength=0.6)
        medicine = ow.cylinder(self.name("medicine_sign"), 17.75, 2.75, -0.5, -0.36, 0.42,
                               building.noisy_material(self.name("medicine_mat"), (0.62, 0.06, 0.05), roughness=0.4, dirt=0.4), segments=32, axis="Y")
        self.emit.add(medicine, NEON["red"], 0.7)
        label = building.text(self.name("medicine_text"), "薬", (17.75, -0.51, 2.75), 0.5,
                              ow.flat_material(self.name("medicine_ink"), (0.95, 0.92, 0.88)), self.font, fit=(0.55, 0.55))
        self.emit.add(label, (1.0, 0.95, 0.9), 0.9)
        # Karaoke box on the first floor: big letters behind three windows.
        z = self.floor_z[1] + self.sill + self.window_h / 2.0
        for k, letter in enumerate("カラオケ"):
            x = 0.8 + k * 1.6
            glyph = building.text(self.name("karaoke"), letter, (x, 0.08, z), 1.0,
                                  ow.flat_material(self.name("karaoke_ink"), (0.9, 0.7, 0.2)), self.font, fit=(1.1, 1.25))
            self.emit.add(glyph, NEON["yellow"] if k != 2 else NEON["orange"], 0.9)
        self.utilities(W - 0.3, 8.95)

    def facade_e01(self):
        """Hotel entrance under a canopy, a small bar; the tall HOTEL sign on the east edge."""
        W = self.W
        fz = 2.9
        piers = [(0.0, 0.4), (7.4, 7.8), (W - 0.4, W)]
        self.ground_piers(piers)
        self.fascia(fz)
        m = self.mats
        self.glass_bay(0.4, 7.4, fz, ((0.8, 0.45, 1.0), 0.12), panes=4, shelves=False, door=2)  # violet lobby light
        ow.box(self.name("canopy"), 0.8, -1.3, 2.62, 7.0, 0.0, 2.82, m["metal"])
        for k in range(4):
            x = 1.6 + k * 1.5
            downlight = ow.box(self.name("canopy_light"), x - 0.12, -0.9, 2.6, x + 0.12, -0.66, 2.62, m["light_panel"])
            if k in (0, 3):
                self.emit.add(downlight, COLORS["lit_warm"], 0.4)
        self.fascia_sign(0.7, 7.1, 2.95, 3.5, "HOTEL LUNA", 0.85, (0.58, 0.42, 0.66), ink_glow=NEON["purple"], ink_strength=1.0,
                         halo=(NEON["purple"], 0.6))
        ow.plane_south(self.name("bar_back"), 7.8, 0.0, W - 0.4, fz, ROOM - 0.06, m["interior_dark"])
        ow.box(self.name("bar_wall"), 7.8, 0.0, 0.0, W - 0.4, SHELL, fz, m["wall_plain"])
        ow.box(self.name("bar_door"), 9.0, -0.05, 0.0, 10.0, 0.02, 2.1, m["dark_wood"])
        porthole = ow.cylinder(self.name("bar_window"), 11.2, 1.5, -0.02, 0.0, 0.3, m["light_panel"], segments=24, axis="Y")
        self.emit.add(porthole, (1.0, 0.7, 0.4), 0.4)
        self.fascia_sign(8.0, W - 0.6, 2.4, 2.85, "BAR", 0.9, (0.55, 0.75, 0.8), ink_glow=NEON["cyan"], ink_strength=1.0,
                         halo=(NEON["cyan"], 0.5))
        self.stand_sign(8.6, "BAR\nOPEN", (0.10, 0.16, 0.30), (0.85, 0.95, 1.0), NEON["blue"], width=0.55, height=0.95)
        # Tall vertical sign, one letter per panel; the T is dead.
        panels = []
        for k, letter in enumerate("HOTEL"):
            panels.append((letter, (0.16, 0.12, 0.20), (0.85, 0.55, 0.85), None if k == 2 else NEON["pink"]))
        self.vertical_sign(W - 1.55, W - 0.15, 22.5, panels, height=2.6, gap=0.2)
        self.utilities(0.2, 7.85)

    # --- roof helpers
    def keep(self, x0, y0, x1, y1):
        self.keep_out.append((x0, y0, x1, y1))

    def is_free(self, x, y, margin=0.3):
        return all(not (a - margin < x < c + margin and b - margin < y < d + margin) for a, b, c, d in self.keep_out)

    def rubble(self, count, edge_bias=True):
        m = self.mats
        rng = self.rng
        rz = self.roof_z
        W, D = self.W, self.D
        placed = 0
        tries = 0
        while placed < count and tries < count * 20:
            tries += 1
            cx = rng.uniform(0.5, W - 0.5)
            cy = rng.choice([rng.uniform(0.5, 2.0), rng.uniform(D - 2.0, D - 0.5), rng.uniform(0.5, D - 0.5)]) if edge_bias else rng.uniform(0.5, D - 0.5)
            if not self.is_free(cx, cy):
                continue
            s = rng.uniform(0.08, 0.36)
            building.rotated_box(self.name("rubble"), (cx, cy, rz + s * 0.3), (s * rng.uniform(0.8, 1.6), s, s * 0.6), rng.uniform(0, math.pi),
                                 m["rubble"], tilt=(rng.uniform(-0.3, 0.3), rng.uniform(-0.3, 0.3)))
            placed += 1

    def roof_drains(self):
        m = self.mats
        for x, y in ((0.6, 0.6), (self.W - 0.6, 0.6), (0.6, self.D - 0.6), (self.W - 0.6, self.D - 0.6)):
            ow.cylinder(self.name("roof_drain"), x, y, self.roof_z, self.roof_z + 0.02, 0.15, m["fan"], segments=16)

    def room(self, x0, y0, x1, y1, h, door_x=None, door_side="south", lamp=True, exit_sign=False, lamp_lit=True):
        """Stair house / lift room with a concrete roof, lip, door, lamp and exit sign."""
        m = self.mats
        rz = self.roof_z
        top = rz + h
        ow.box(self.name("room"), x0, y0, rz, x1, y1, top, m["wall_plain"])
        ow.box(self.name("room_roof"), x0 + 0.12, y0 + 0.12, top, x1 - 0.12, y1 - 0.12, top + 0.02, m["roof_plain"])
        for a, b, c, d in ((x0, y0, x1, y0 + 0.12), (x0, y1 - 0.12, x1, y1), (x0, y0, x0 + 0.12, y1), (x1 - 0.12, y0, x1, y1)):
            ow.box(self.name("room_lip"), a, b, top, c, d, top + 0.25, m["wall_plain"])
        if door_x is not None:
            dx0, dx1 = door_x
            if door_side == "south":
                ow.box(self.name("room_door"), dx0, y0 - 0.05, rz, dx1, y0, rz + 2.05, m["steel"])
                if lamp:
                    head = ow.box(self.name("room_lamp"), (dx0 + dx1) / 2 - 0.15, y0 - 0.3, rz + 2.22, (dx0 + dx1) / 2 + 0.15, y0, rz + 2.34, m["metal"])
                    if lamp_lit:
                        self.emit.add(head, COLORS["lamp"], 1.0)
                if exit_sign:
                    sign = ow.box(self.name("exit_sign"), dx1 + 0.2, y0 - 0.08, rz + 2.1, dx1 + 0.65, y0, rz + 2.32, m["metal"])
                    self.emit.add(sign, COLORS["exit_green"], 0.8)
        self.keep(x0, y0, x1, y1)
        return top

    def top_ac(self, x, y, z, w=1.3, d=0.82, h=1.67, fans=1):
        m = self.mats
        ow.box(self.name("roof_ac"), x, y, z, x + w, y + d, z + h, m["metal"])
        for k in range(fans):
            fx = x + w * (k + 0.5) / fans
            r = min(d, w / fans) * 0.44
            ow.cylinder(self.name("roof_fan_ring"), fx, y + d / 2, z + h, z + h + 0.1, r, m["metal"], segments=32)
            ow.cylinder(self.name("roof_fan"), fx, y + d / 2, z + h + 0.01, z + h + 0.11, r * 0.86, m["fan"], segments=32)
            for angle in (0.0, math.pi / 2.0):
                dx, dy = math.cos(angle) * r * 0.92, math.sin(angle) * r * 0.92
                building.beam(self.name("fan_guard"), (fx - dx, y + d / 2 - dy, z + h + 0.13), (fx + dx, y + d / 2 + dy, z + h + 0.13), 0.025, m["steel"])
        self.keep(x, y, x + w, y + d)

    def side_ac(self, x, y, z, facing="south"):
        """Small split-system outdoor unit on a stand (fan on its long face)."""
        m = self.mats
        w, d, h = 0.8, 0.3, 0.58
        if facing in ("south", "north"):
            ow.box(self.name("side_ac"), x, y, z + 0.12, x + w, y + d, z + 0.12 + h, m["metal"])
            ow.box(self.name("ac_stand"), x - 0.03, y - 0.03, z, x + w + 0.03, y + d + 0.03, z + 0.12, m["steel"])
            fy = y - 0.01 if facing == "south" else y + d + 0.01
            ow.cylinder(self.name("ac_fan"), x + 0.5, z + 0.41, fy - 0.01, fy + 0.01, 0.2, m["fan"], segments=24, axis="Y")
            self.keep(x, y, x + w, y + d)
        else:
            ow.box(self.name("side_ac"), x, y, z + 0.12, x + d, y + w, z + 0.12 + h, m["metal"])
            ow.box(self.name("ac_stand"), x - 0.03, y - 0.03, z, x + d + 0.03, y + w + 0.03, z + 0.12, m["steel"])
            fx = x - 0.01 if facing == "west" else x + d + 0.01
            ow.cylinder(self.name("ac_fan"), y + 0.5, z + 0.41, fx - 0.01, fx + 0.01, 0.2, m["fan"], segments=24, axis="X")
            self.keep(x, y, x + d, y + w)

    def frp_tank(self, x0, y0, x1, y1, z, h, legs=0.6):
        m = self.mats
        for x in (x0 + 0.2, x1 - 0.2):
            for y in (y0 + 0.2, y1 - 0.2):
                ow.box(self.name("tank_leg"), x - 0.1, y - 0.1, z, x + 0.1, y + 0.1, z + legs, m["steel"])
        ow.box(self.name("tank_base"), x0 - 0.1, y0 - 0.1, z + legs - 0.1, x1 + 0.1, y1 + 0.1, z + legs + 0.02, m["steel"])
        ow.box(self.name("frp_tank"), x0, y0, z + legs + 0.02, x1, y1, z + legs + h, m["frp"])
        ow.cylinder(self.name("tank_hatch"), x1 - 0.5, y1 - 0.5, z + legs + h, z + legs + h + 0.1, 0.3, m["frp"])
        ow.cylinder(self.name("tank_vent"), x0 + 0.5, y0 + 0.5, z + legs + h, z + legs + h + 0.4, 0.08, m["pipe"], segments=12)
        self.keep(x0, y0, x1, y1)
        return z + legs + h

    def yagi(self, x, y, z, h):
        m = self.mats
        ow.cylinder(self.name("antenna_mast"), x, y, z, z + h, 0.03, m["steel"], segments=8)
        for k in range(2):
            boom_z = z + h - 0.2 - k * 0.7
            building.beam(self.name("antenna_boom"), (x - 0.9, y + 0.2 * k, boom_z), (x + 0.9, y + 0.2 * k, boom_z), 0.02, m["galv"])
            for e in range(6):
                ex = x - 0.8 + e * 0.32
                building.beam(self.name("antenna_element"), (ex, y + 0.2 * k - 0.35, boom_z), (ex, y + 0.2 * k + 0.35, boom_z), 0.012, m["galv"])

    def dish(self, x, y, z, r=0.45, yaw_deg=225.0):
        m = self.mats
        ow.cylinder(self.name("dish_post"), x, y, z, z + 0.9, 0.03, m["steel"], segments=8)
        yaw = math.radians(yaw_deg)
        direction = Vector((math.sin(yaw) * 0.75, math.cos(yaw) * 0.75, 0.66))
        disc(self.name("dish"), (x, y, z + 1.05), r, 0.08, direction, m["plastic_white"], radius2=r * 0.85)
        building.beam(self.name("dish_arm"), (x, y, z + 1.0), (x + direction.x * 0.5, y + direction.y * 0.5, z + 1.0 + direction.z * 0.5), 0.02, m["steel"])
        self.keep(x - r, y - r, x + r, y + r)

    def drum(self, x, y, material, tipped=False):
        rz = self.roof_z
        if tipped:
            ow.cylinder(self.name("drum"), y, rz + 0.29, x - 0.44, x + 0.44, 0.29, self.mats[material], segments=20, axis="X")
        else:
            ow.cylinder(self.name("drum"), x, y, rz, rz + 0.88, 0.29, self.mats[material], segments=20)
            ow.cylinder(self.name("drum_lid"), x + 0.1, y + 0.08, rz + 0.88, rz + 0.9, 0.05, self.mats["steel"], segments=10)
        self.keep(x - 0.4, y - 0.4, x + 0.4, y + 0.4)

    def crates(self, x, y, count, rotation=0.0):
        rz = self.roof_z
        for k in range(count):
            material = self.mats["crate_y"] if self.rng.random() < 0.6 else self.mats["crate_r"]
            building.rotated_box(self.name("crate"), (x + self.rng.uniform(-0.05, 0.05), y + self.rng.uniform(-0.05, 0.05), rz + 0.15 + k * 0.3),
                                 (0.62, 0.42, 0.3), rotation + self.rng.uniform(-0.15, 0.15), material)
        self.keep(x - 0.4, y - 0.3, x + 0.4, y + 0.3)

    def billboard(self, along0, along1, offset, depth, height, facing, lamps, lamp_skip=()):
        """Steel lattice frame of a rooftop billboard; the board faces out over the `facing` edge."""
        m = self.mats
        rz = self.roof_z

        def at(u, v, z):  # u along the board, v from the board (0) to the back row (1)
            if facing == "south":
                return (u, offset + v * depth, z)
            return (offset + v * depth, u, z)

        n = max(2, int(round((along1 - along0) / 1.6)))
        us = [along0 + (along1 - along0) * k / n for k in range(n + 1)]
        bottom, top = rz + 0.3, rz + height
        for u in us:
            for v in (0.0, 1.0):
                building.beam(self.name("bb_post"), at(u, v, rz), at(u, v, top + 0.1), 0.12, m["steel"])
            building.beam(self.name("bb_strut"), at(u, 0.0, top), at(u, 1.0, top), 0.07, m["steel"])
            building.beam(self.name("bb_strut"), at(u, 0.0, rz + 2.0), at(u, 1.0, rz + 2.0), 0.07, m["steel"])
            building.beam(self.name("bb_brace"), at(u, 0.0, top - 0.2), at(u, 1.0, rz + 0.2), 0.06, m["steel"])
        for z in (bottom + 0.4, (bottom + top) / 2.0, top - 0.2):
            building.beam(self.name("bb_rail"), at(along0, 1.0, z), at(along1, 1.0, z), 0.07, m["steel"])
        for k in range(n):
            building.beam(self.name("bb_diag"), at(us[k], 1.0, bottom + 0.4), at(us[k + 1], 1.0, top - 0.2), 0.05, m["steel"])
        p0, p1 = at(along0, 0.0, rz + 1.1), at(along1, 0.0, top)
        q = at(along0, 0.0, 0.0)
        if facing == "south":
            ow.box(self.name("bb_board"), along0, q[1] - 0.08, rz + 1.1, along1, q[1] - 0.02, top, m["sign_back"])
            ow.box(self.name("bb_walk"), along0, offset + 0.12, rz + 1.0, along1, offset + 0.7, rz + 1.05, m["grate"])
        else:
            ow.box(self.name("bb_board"), q[0] - 0.08, along0, rz + 1.1, q[0] - 0.02, along1, top, m["sign_back"])
            ow.box(self.name("bb_walk"), offset + 0.12, along0, rz + 1.0, offset + 0.7, along1, rz + 1.05, m["grate"])
        for k in range(lamps):
            u = along0 + (along1 - along0) * (k + 0.5) / lamps
            arm0 = at(u, 0.0, top + 0.05)
            arm1 = at(u, -0.45, top + 0.12)
            building.beam(self.name("bb_lamp_arm"), arm0, arm1, 0.05, m["steel"])
            cx, cy, cz = at(u, -0.55, top + 0.12)
            head = ow.box(self.name("bb_lamp"), cx - 0.2, cy - 0.12, cz - 0.07, cx + 0.2, cy + 0.12, cz + 0.07, m["metal"])
            if k not in lamp_skip:
                self.emit.add(head, COLORS["lamp"], 0.9)
        lo = at(along0, 0.0, 0.0)
        hi = at(along1, 1.0, 0.0)
        self.keep(min(lo[0], hi[0]) - 0.3, min(lo[1], hi[1]) - 0.3, max(lo[0], hi[0]) + 0.3, max(lo[1], hi[1]) + 0.3)

    def railing(self, points, height=1.1, post_every=1.8):
        m = self.mats
        rz = self.roof_z
        for (x0, y0), (x1, y1) in zip(points, points[1:]):
            length = math.hypot(x1 - x0, y1 - y0)
            posts = max(1, int(length / post_every))
            for k in range(posts + 1):
                t = k / posts
                x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
                ow.cylinder(self.name("rail_post"), x, y, rz, rz + height, 0.025, m["galv"], segments=8)
            for z in (rz + height, rz + height * 0.5):
                building.beam(self.name("rail"), (x0, y0, z), (x1, y1, z), 0.04, m["galv"])

    # --- roofs
    def roof(self):
        getattr(self, f"roof_{self.spec['style']}")()
        self.roof_drains()

    def roof_b01(self):
        """Green coating; L-shaped billboard frame (south-west); stair house + lift room (north-east)."""
        m = self.mats
        rng = self.rng
        rz = self.roof_z
        W, D = self.W, self.D
        top = self.room(13.6, 13.0, 18.7, 18.5, 3.0, door_x=(14.2, 15.2), lamp=True, exit_sign=True)
        self.yagi(17.2, 17.6, top, 2.4)
        lift_top = self.room(10.6, 15.2, 13.6, 18.5, 2.2)
        for k in range(3):
            ow.box(self.name("louver"), 10.9 + k * 0.8, 15.15, rz + 1.0, 11.5 + k * 0.8, 15.2, rz + 1.6, m["metal"])
        ow.cylinder(self.name("lift_vent"), 12.8, 17.6, lift_top, lift_top + 0.5, 0.18, m["galv"], segments=16)
        # Horizontal stainless tank on saddles, piped to the stair house.
        for x in (3.2, 5.8):
            ow.box(self.name("saddle"), x - 0.15, 14.6, rz, x + 0.15, 16.6, rz + 0.7, m["steel"])
        ow.cylinder(self.name("tank_h"), 15.6, rz + 1.6, 2.2, 6.8, 1.0, m["stainless"], segments=40, axis="X")
        for x in (2.2, 6.8):
            sphere(self.name("tank_end"), (x, 15.6, rz + 1.6), 1.0, m["stainless"], subdivisions=3, scale=(0.25, 1.0, 1.0))
        ow.cylinder(self.name("tank_hatch"), 4.5, 15.6, rz + 2.5, rz + 2.68, 0.3, m["stainless"], segments=20)
        self.keep(1.9, 14.4, 7.1, 16.8)
        for offset in (0.0, 0.2):
            ow.cylinder(self.name("pipe_x"), 15.0 + offset, rz + 0.3, 6.8, 13.6, 0.06, m["pipe"], segments=12, axis="X")
        # Billboard frame on the south-west corner, facing south and west.
        self.billboard(0.9, 12.6, 0.9, 1.3, 5.4, "south", 5, lamp_skip=(3,))
        self.billboard(2.4, 10.4, 0.9, 1.3, 5.4, "west", 3, lamp_skip=(0,))
        # Plant: split-system units on racks with their pipes, two big condensers.
        for k in range(6):
            self.side_ac(5.4 + k * 1.0, 6.0, rz, facing="south")
        for k in range(5):
            self.side_ac(5.4 + k * 1.0, 7.4, rz, facing="north")
        ow.box(self.name("ac_rack"), 5.3, 5.9, rz, 11.4, 8.0, rz + 0.05, m["steel"])
        self.top_ac(14.4, 4.4, rz + 0.18, w=1.8, d=0.95, h=1.6, fans=2)
        self.top_ac(14.4, 6.2, rz + 0.18, w=1.8, d=0.95, h=1.6, fans=2)
        ow.box(self.name("ac_base"), 14.3, 4.3, rz, 16.3, 7.25, rz + 0.18, m["steel"])
        for offset in (0.0, 0.2):
            ow.cylinder(self.name("pipe_y"), 14.0 + offset, rz + 0.3, 7.2, 13.0, 0.06, m["pipe"], segments=12, axis="Y")
        self.dish(18.2, 10.4, rz, 0.45, yaw_deg=210.0)
        # Abandoned things.
        self.crates(9.0, 16.4, 3)
        self.crates(9.8, 13.8, 2, rotation=0.4)
        self.drum(8.2, 13.6, "drum_b")
        self.drum(7.5, 12.9, "drum_r", tipped=True)
        building.lumpy_sheet("tarp", 15.2, 8.4, 17.4, 11.2, rz, rng, m["tarp"], lift=0.5)
        self.keep(15.2, 8.4, 17.4, 11.2)
        self.rubble(24)

    def roof_c01(self):
        """Silver sheet; rooftop garden ruins (west), laundry poles, stair house, prefab shed."""
        m = self.mats
        rng = self.rng
        rz = self.roof_z
        W, D = self.W, self.D
        # Deck on sleepers, some boards missing.
        dx0, dx1, dy0, dy1 = 0.95, 6.9, 6.0, 14.75
        for k in range(int((dx1 - dx0) / 0.6) + 1):
            x = dx0 + 0.1 + k * 0.6
            ow.box(self.name("sleeper"), x - 0.04, dy0, rz, x + 0.04, dy1, rz + 0.1, m["dark_wood"])
        y = dy0
        while y < dy1 - 0.05:
            if rng.random() > 0.06:
                lift = rng.uniform(0.0, 0.015)
                x0 = dx0 + (rng.uniform(0.0, 1.5) if rng.random() < 0.08 else 0.0)
                ow.box(self.name("board"), x0, y + 0.005, rz + 0.1 + lift, dx1, y + 0.135, rz + 0.13 + lift, m["deck"])
            y += 0.14
        self.keep(dx0, dy0, dx1, dy1)
        # Planters along the west parapet and the north edge of the deck.
        planters = [(0.3, 6.0, 0.9, 15.5), (0.9, 14.85, 6.9, 15.5)]
        for x0, y0, x1, y1 in planters:
            ow.box(self.name("planter"), x0, y0, rz, x1, y1, rz + 0.55, m["wall_plain"])
            ow.plane_xy(self.name("planter_soil"), x0 + 0.06, y0 + 0.06, x1 - 0.06, y1 - 0.06, rz + 0.5, m["soil"])
        weeds_green = props.leaf_material("weeds_green", "LeafSet014", (0.55, 0.68, 0.40), variation=0.35)
        weeds_dry = props.leaf_material("weeds_dry", "LeafSet007", (0.70, 0.52, 0.30), variation=0.4)
        clusters = []
        for x0, y0, x1, y1 in planters:
            length = max(x1 - x0, y1 - y0)
            for k in range(int(length / 0.9)):
                t = (k + rng.uniform(0.2, 0.8)) / int(length / 0.9)
                cx = x0 + (x1 - x0) * (t if x1 - x0 > y1 - y0 else 0.5)
                cy = y0 + (y1 - y0) * (t if y1 - y0 >= x1 - x0 else 0.5)
                clusters.append((cx, cy, rz + 0.75, rng.uniform(0.6, 1.4), rng.uniform(0.35, 0.65), rng.uniform(0.35, 0.65), 0.3))
        clusters += [(rng.uniform(1.2, 6.4), rng.uniform(13.9, 14.6), rz + 0.3, 0.6, 0.4, 0.3, 0.12) for _ in range(5)]  # spilling onto the deck
        props.leaf_cards("weeds_g", weeds_green, "LeafSet014", clusters, 2600, rng, size=(0.12, 0.22),
                         palette=[(0.8, 0.9, 0.6), (0.65, 0.75, 0.45), (0.9, 0.85, 0.55)])
        props.leaf_cards("weeds_d", weeds_dry, "LeafSet007", clusters, 420, rng, size=(0.12, 0.2),
                         palette=[(0.85, 0.7, 0.45), (0.65, 0.5, 0.3)])
        # A dead tree in a big pot on the deck.
        ow.cylinder(self.name("big_pot"), 5.9, 7.2, rz + 0.13, rz + 0.75, 0.45, m["terracotta"], segments=28)
        ow.plane_xy(self.name("pot_soil"), 5.6, 6.9, 6.2, 7.5, rz + 0.7, m["soil"])
        bark, nb = ow.new_material("bark")
        nb.output(nb.principled(nb.mix(1.0, nb.hsv(nb.tex("bark_brown_01", "color", nb.vscale(nb.uv(), 1.0)), saturation=0.5), (0.55, 0.52, 0.5), blend="MULTIPLY"), roughness=0.9))
        before = set(bpy.data.objects.keys())
        tips = props.branches("dead_tree", rng, 1.2, 1.3, 2, bark, base_radius=0.05)
        for name in set(bpy.data.objects.keys()) - before:
            bpy.data.objects[name].location = (5.9, 7.2, rz + 0.72)
        dry = props.leaf_material("dead_leaves", "LeafSet007", (0.62, 0.42, 0.22), variation=0.35)
        props.leaf_cards("dead_tree_leaves", dry, "LeafSet007",
                         [(t.x + 5.9, t.y + 7.2, t.z + rz + 0.72, 1.0, 0.25, 0.25, 0.15) for t in tips], 160, rng, size=(0.1, 0.16),
                         palette=[(0.75, 0.55, 0.35), (0.55, 0.38, 0.22)])
        # Pergola: posts, two beams, rafters; two rafters have fallen onto the deck.
        for x in (1.2, 4.0, 6.7):
            for y in (6.3, 14.4):
                ow.box(self.name("pergola_post"), x - 0.05, y - 0.05, rz + 0.13, x + 0.05, y + 0.05, rz + 2.4, m["dark_wood"])
        for x in (1.2, 4.0, 6.7):
            ow.box(self.name("pergola_beam"), x - 0.05, 6.15, rz + 2.3, x + 0.05, 14.55, rz + 2.45, m["dark_wood"])
        for k in range(10):
            y = 6.6 + k * 0.85
            if k in (3, 7):
                building.rotated_box(self.name("fallen_rafter"), (3.2 + rng.uniform(-0.5, 0.5), y, rz + 0.2), (5.6, 0.07, 0.12),
                                     rng.uniform(-0.3, 0.3), m["dark_wood"], tilt=(0.0, rng.uniform(-0.15, 0.15)))
                continue
            ow.box(self.name("rafter"), 1.0, y - 0.035, rz + 2.45, 6.9, y + 0.035, rz + 2.55, m["dark_wood"])
        # String lights left on the pergola: a few bulbs still burn.
        for k in range(14):
            x = 1.3 + k * 0.4
            bulb = sphere(self.name("bulb"), (x, 10.4 + 0.25 * math.sin(k * 0.9), rz + 2.2), 0.05, m["plastic_white"], subdivisions=1)
            if rng.random() < 0.35:
                self.emit.add(bulb, (1.0, 0.75, 0.42), 1.0)
        building.beam(self.name("light_wire"), (1.2, 10.4, rz + 2.3), (6.7, 10.4, rz + 2.3), 0.01, m["fan"])
        # Pots, a fallen chair.
        for _ in range(6):
            px, py = rng.uniform(1.5, 6.4), rng.uniform(6.4, 13.5)
            r = rng.uniform(0.12, 0.22)
            if rng.random() < 0.3:
                ow.cylinder(self.name("pot_fallen"), py, rz + 0.13 + r, px - r * 1.2, px + r * 1.2, r, m["terracotta"], segments=16, axis="X")
            else:
                ow.cylinder(self.name("pot"), px, py, rz + 0.13, rz + 0.13 + r * 2.2, r, m["terracotta"], segments=16)
        building.rotated_box(self.name("chair_seat"), (3.0, 9.0, rz + 0.35), (0.45, 0.45, 0.04), 0.6, m["plastic_white"], tilt=(1.2, 0.2))
        building.rotated_box(self.name("chair_back"), (3.2, 9.3, rz + 0.25), (0.45, 0.05, 0.45), 0.6, m["plastic_white"], tilt=(1.2, 0.2))
        # Stair house with a corrugated roof, the shed, the laundry poles.
        top = self.room(8.2, 6.0, 11.0, 8.8, 2.5, door_x=(8.8, 9.7), lamp=True)
        building.rotated_box(self.name("hatch_roof"), (9.6, 7.4, top + 0.12), (3.0, 3.0, 0.05), 0.0, m["corrugated"], tilt=(0.06, 0.0))
        self.yagi(10.4, 8.2, top + 0.15, 1.8)
        ow.box(self.name("shed"), 8.6, 1.9, rz, 12.0, 4.0, rz + 2.0, m["cream"])
        building.rotated_box(self.name("shed_roof"), (10.3, 2.95, rz + 2.08), (3.6, 2.4, 0.05), 0.0, m["red_roof"], tilt=(0.08, 0.0))
        ow.box(self.name("shed_door"), 9.0, 1.85, rz, 10.4, 1.9, rz + 1.8, m["metal"])
        self.keep(8.5, 1.8, 12.1, 4.1)
        for x in (8.4, 12.0):
            for y in (12.7, 14.3):
                ow.cylinder(self.name("pole_stand"), x, y, rz, rz + 1.8, 0.03, m["galv"], segments=8)
            ow.box(self.name("stand_base"), x - 0.2, 12.5, rz, x + 0.2, 14.5, rz + 0.08, m["steel"])
        for y in (12.7, 14.3):
            ow.cylinder(self.name("laundry_pole"), y, rz + 1.78, 8.2, 12.2, 0.025, m["galv"], segments=8, axis="X")
        # Washing left on the poles: hanging cloths, blown slightly askew.
        building.rotated_box(self.name("towel"), (9.4, 12.75, rz + 1.42), (0.9, 0.02, 0.7), 0.05, m["cloth_blue"], tilt=(0.35, 0.0))
        building.rotated_box(self.name("sheet"), (11.0, 14.38, rz + 1.2), (1.4, 0.02, 1.1), -0.04, m["cloth_pink"], tilt=(0.45, 0.05))
        self.keep(8.2, 12.4, 12.2, 14.6)
        # Small PVC tank, a satellite dish, two outdoor units.
        ow.box(self.name("tank_stand"), 11.1, 9.6, rz, 12.3, 10.8, rz + 0.4, m["steel"])
        ow.cylinder(self.name("pvc_tank"), 11.7, 10.2, rz + 0.4, rz + 1.5, 0.55, m["pvc_blue"], segments=28)
        ow.cylinder(self.name("pvc_lid"), 11.7, 10.2, rz + 1.5, rz + 1.58, 0.3, m["pvc_blue"], segments=20)
        self.keep(11.0, 9.5, 12.4, 10.9)
        self.dish(7.8, 2.4, rz, 0.4, yaw_deg=215.0)
        self.side_ac(12.2, 4.6, rz, facing="west")
        self.side_ac(12.2, 5.6, rz, facing="west")
        self.rubble(12)

    def roof_d01(self):
        """Membrane; cooling towers (north-west), fenced plant yard (north-east), solar array (south)."""
        m = self.mats
        rng = self.rng
        rz = self.roof_z
        W, D = self.W, self.D
        top = self.room(9.4, 12.4, 17.8, 18.5, 3.6, door_x=(10.4, 11.4), lamp=True, exit_sign=True)
        ow.box(self.name("room_door2"), 15.6, 12.35, rz, 16.6, 12.4, rz + 2.05, m["steel"])
        ow.box(self.name("room_lamp2"), 15.95, 12.1, rz + 2.22, 16.25, 12.4, rz + 2.34, m["metal"])  # dead
        for k in range(3):
            x = 11.0 + k * 2.4
            ow.cylinder(self.name("exhaust"), x, 15.4, top, top + 0.4, 0.3, m["galv"], segments=20)
            ow.cylinder(self.name("exhaust_cap"), x, 15.4, top + 0.55, top + 0.62, 0.42, m["galv"], segments=20)
            ow.cylinder(self.name("exhaust_neck"), x, 15.4, top + 0.4, top + 0.55, 0.12, m["galv"], segments=12)
        # Cooling towers on a concrete pad.
        ow.box(self.name("tower_pad"), 1.0, 13.4, rz, 9.0, 18.4, rz + 0.25, m["roof_plain"])
        for cx in (3.0, 7.0):
            cy = 15.9
            for a in range(4):
                ang = a * math.pi / 2 + math.pi / 4
                lx, ly = cx + math.cos(ang) * 1.2, cy + math.sin(ang) * 1.2
                ow.box(self.name("tower_leg"), lx - 0.08, ly - 0.08, rz + 0.25, lx + 0.08, ly + 0.08, rz + 0.75, m["steel"])
            ow.cylinder(self.name("tower"), cx, cy, rz + 0.75, rz + 3.3, 1.6, m["frp_green"], segments=48)
            ow.cylinder(self.name("tower_stack"), cx, cy, rz + 3.3, rz + 3.95, 1.0, m["frp_green"], segments=40)
            ow.cylinder(self.name("tower_fan_well"), cx, cy, rz + 3.9, rz + 3.96, 0.92, m["fan"], segments=40)
            for b in range(5):
                ang = b * 2 * math.pi / 5 + rng.uniform(0, 0.3)
                building.rotated_box(self.name("tower_blade"), (cx + math.cos(ang) * 0.42, cy + math.sin(ang) * 0.42, rz + 3.97), (0.8, 0.18, 0.02), ang,
                                     m["galv"], tilt=(0.25, 0.0))
            for k in range(-3, 4):
                building.beam(self.name("tower_guard"), (cx - 0.95, cy + k * 0.27, rz + 4.0), (cx + 0.95, cy + k * 0.27, rz + 4.0), 0.02, m["steel"])
            ow.cylinder(self.name("tower_pipe"), cy - 0.6, rz + 0.5, cx + 1.4, 9.4, 0.15, m["steel"], segments=16, axis="X")
        self.keep(1.0, 13.4, 9.0, 18.4)
        # Fenced plant yard on a grating platform.
        ow.box(self.name("yard_deck"), 19.0, 11.2, rz + 0.3, 25.0, 18.4, rz + 0.36, m["grate"])
        for x in (19.2, 22.0, 24.8):
            for y in (11.4, 14.8, 18.2):
                ow.box(self.name("yard_support"), x - 0.1, y - 0.1, rz, x + 0.1, y + 0.1, rz + 0.3, m["steel"])
        for row, y in enumerate((12.0, 15.6)):
            for k in range(3):
                x = 19.4 + k * 1.95
                self.top_ac(x, y, rz + 0.36, w=1.8, d=0.95, h=1.55, fans=2)
                if rng.random() < 0.5:
                    led = ow.box(self.name("ac_led"), x + 0.2, y - 0.02, rz + 1.6, x + 0.3, y, rz + 1.65, m["metal"])
                    self.emit.add(led, NEON["green"], 0.6)
        self.railing([(18.8, 11.0), (25.2, 11.0), (25.2, 18.6)], height=1.6, post_every=1.6)
        self.railing([(18.8, 11.0), (18.8, 18.6)], height=1.6, post_every=1.6)
        self.keep(18.7, 10.9, 25.3, 18.7)
        # Duct from the lift room to the yard, on supports.
        ow.box(self.name("duct"), 17.8, 14.1, rz + 0.5, 19.0, 14.7, rz + 0.9, m["galv"])
        ow.box(self.name("duct_run"), 17.9, 10.0, rz + 0.5, 18.5, 14.1, rz + 0.9, m["galv"])
        for y in (10.4, 12.2, 13.8):
            ow.box(self.name("duct_support"), 17.85, y - 0.05, rz, 18.55, y + 0.05, rz + 0.5, m["steel"])
        self.keep(17.8, 10.0, 19.0, 14.7)
        # Solar array: four rows facing south, broken and missing panels, one collapsed row end.
        for row in range(4):
            y0 = 1.4 + row * 2.3
            tilt = math.radians(10.0)
            for side in (y0 + 0.1, y0 + 1.5):
                ow.box(self.name("solar_rail"), 1.2, side - 0.04, rz + 0.25 + (side - y0) * math.tan(tilt), 16.9, side + 0.04,
                       rz + 0.33 + (side - y0) * math.tan(tilt), m["galv"])
            for k in range(8):
                x = 1.2 + k * 2.0 + 1.0
                ow.box(self.name("solar_leg"), x - 0.05, y0 + 0.05, rz, x + 0.05, y0 + 0.15, rz + 0.3, m["steel"])
                ow.box(self.name("solar_leg"), x - 0.05, y0 + 1.45, rz, x + 0.05, y0 + 1.55, rz + 0.55, m["steel"])
            for k in range(15):
                x = 1.25 + k * 1.04 + 0.52
                roll = rng.random()
                if roll < 0.08:
                    continue  # missing panel
                material = m["solar_broken"] if roll < 0.22 else m["solar"]
                droop = (row == 2 and k >= 12)
                building.rotated_box(self.name("solar_panel"), (x, y0 + 0.8, rz + 0.48 + (0.0 if not droop else -0.2)), (1.0, 1.62, 0.04),
                                     rng.uniform(-0.01, 0.01) + (0.12 if droop else 0.0), material, tilt=(tilt + (0.15 if droop else 0.0), 0.0))
        self.keep(1.1, 1.3, 17.0, 10.6)
        building.rotated_box(self.name("fallen_panel"), (18.6, 3.2, rz + 0.05), (1.0, 1.62, 0.04), 0.9, m["solar_broken"], tilt=(0.05, 0.05))
        self.keep(17.8, 2.2, 19.4, 4.2)
        self.railing([(0.6, 0.7), (W - 0.6, 0.7)], height=1.1, post_every=2.4)
        self.rubble(16, edge_bias=False)

    def roof_e01(self):
        """Helipad (south two thirds), gondola track, lift room with mast and warning light (north)."""
        m = self.mats
        rng = self.rng
        rz = self.roof_z
        W, D = self.W, self.D
        top = self.room(1.0, 18.4, 11.8, 25.2, 3.6, door_x=(5.0, 6.0), lamp=True, exit_sign=True)
        tank_top = self.frp_tank(1.6, 20.6, 5.2, 24.4, top, 2.0, legs=0.7)
        # Lattice mast with the red aircraft-warning light.
        mx, my = 9.4, 22.6
        mast_h = 8.0
        legs = [(mx + 0.45 * math.cos(a), my + 0.45 * math.sin(a)) for a in (math.pi / 2, math.pi / 2 + 2.094, math.pi / 2 + 4.189)]
        for lx, ly in legs:
            building.beam(self.name("mast_leg"), (lx, ly, top), (mx + (lx - mx) * 0.3, my + (ly - my) * 0.3, top + mast_h), 0.05, m["galv"])
        for level in range(8):
            z0 = top + level * mast_h / 8
            z1 = z0 + mast_h / 8
            s0, s1 = 1.0 - 0.7 * level / 8, 1.0 - 0.7 * (level + 1) / 8
            for i in range(3):
                a = legs[i]
                b = legs[(i + 1) % 3]
                pa = (mx + (a[0] - mx) * s0, my + (a[1] - my) * s0, z0)
                pb = (mx + (b[0] - mx) * s1, my + (b[1] - my) * s1, z1)
                building.beam(self.name("mast_diag"), pa, pb, 0.02, m["galv"])
                building.beam(self.name("mast_ring"), pa, (mx + (b[0] - mx) * s0, my + (b[1] - my) * s0, z0), 0.02, m["galv"])
        beacon = sphere(self.name("beacon"), (mx, my, top + mast_h + 0.15), 0.16, m["metal"])
        self.emit.add(beacon, COLORS["beacon"], 1.0)
        mid_beacon = sphere(self.name("beacon_mid"), (mx + 0.25, my, top + mast_h * 0.5), 0.1, m["metal"])
        self.emit.add(mid_beacon, COLORS["beacon"], 0.8)
        ow.cylinder(self.name("lightning_rod"), 2.4, 24.6, top, top + 3.0, 0.02, m["steel"], segments=6)
        # Gondola track along both long sides, the carriage parked at the north-east.
        for x in (0.62, W - 0.62):
            ow.box(self.name("gondola_rail"), x - 0.08, 0.6, rz + 0.25, x + 0.08, 18.2, rz + 0.37, m["galv"])
            for k in range(12):
                y = 0.9 + k * 1.5
                ow.box(self.name("rail_block"), x - 0.15, y - 0.1, rz, x + 0.15, y + 0.1, rz + 0.25, m["roof_plain"])
        ow.box(self.name("gondola_rail_s"), 0.6, 0.54, rz + 0.25, W - 0.6, 0.7, rz + 0.37, m["galv"])
        ow.box(self.name("gondola"), 8.8, 14.4, rz + 0.37, 12.4, 17.0, rz + 1.9, m["yellow"])
        ow.box(self.name("gondola_top"), 9.0, 14.6, rz + 1.9, 12.2, 16.8, rz + 2.05, m["galv"])
        building.beam(self.name("gondola_jib"), (10.6, 15.7, rz + 2.05), (12.7, 15.7, rz + 3.0), 0.18, m["yellow"])
        ow.cylinder(self.name("cable_reel"), 15.7, rz + 2.4, 9.4, 10.2, 0.35, m["steel"], segments=24, axis="X")
        self.keep(8.7, 14.3, 12.5, 17.1)
        # Outdoor units in a row by the west rail, north of the pad.
        for k in range(4):
            self.top_ac(1.2 + k * 1.45, 15.6, rz, w=1.3, d=0.82, h=1.5, fans=1)
        # Windsock at the south-east corner.
        ow.cylinder(self.name("sock_pole"), 11.6, 1.4, rz, rz + 3.2, 0.04, m["galv"], segments=8)
        sock_dir = Vector((-0.9, 0.25, -0.35)).normalized()
        for k in range(5):
            r0 = 0.32 - k * 0.045
            center = Vector((11.6, 1.4, rz + 3.0)) + sock_dir * (0.25 + k * 0.42)
            disc(self.name("sock"), center, r0, 0.4, sock_dir, m["windsock"], radius2=r0 - 0.04, segments=16)
        self.keep(10.2, 0.8, 12.2, 2.0)
        # Helipad perimeter lights (several dead).
        cx, cy, radius = W / 2.0, 8.8, 5.35
        for k in range(10):
            a = k * 2 * math.pi / 10 + 0.3
            lx, ly = cx + math.cos(a) * radius, cy + math.sin(a) * radius
            if not (0.8 < lx < W - 0.8):
                continue
            ow.cylinder(self.name("pad_light_base"), lx, ly, rz, rz + 0.06, 0.1, m["steel"], segments=12)
            dome = sphere(self.name("pad_light"), (lx, ly, rz + 0.08), 0.07, m["light_panel"], subdivisions=1)
            if k % 3 != 0:
                self.emit.add(dome, (1.0, 0.72, 0.30), 0.7)
        # Sandbags and a stretcher left on the pad edge, a few bits of rubble.
        for k in range(6):
            building.rotated_box(self.name("sandbag"), (2.0 + k * 0.45, 2.0 + rng.uniform(-0.1, 0.1), rz + 0.08), (0.5, 0.32, 0.16),
                                 rng.uniform(0, math.pi), m["sandbag"])
        self.keep(1.6, 1.6, 4.9, 2.4)
        ow.box(self.name("stretcher"), 9.8, 4.0, rz + 0.05, 10.4, 6.0, rz + 0.12, m["cloth_blue"])
        for x in (9.82, 10.38):
            ow.box(self.name("stretcher_pole"), x - 0.02, 3.8, rz + 0.1, x + 0.02, 6.2, rz + 0.14, m["galv"])
        self.keep(9.7, 3.7, 10.5, 6.3)
        self.rubble(10, edge_bias=True)


def build(key, out_root, samples_scale=1.0):
    spec = TYPES[key]
    scene = ow.reset_scene()
    builder = TypedBuilder(key, spec)
    builder.build_materials()
    builder.structure()
    builder.upper_floors()
    builder.facade()
    builder.wall_units()
    builder.roof()
    builder.ground()
    return building.render_building(scene, key, spec, builder, out_root, samples_scale,
                                    roof_gains=builder.roof_gains, roof_target=ROOF_TARGET_LUMA)
