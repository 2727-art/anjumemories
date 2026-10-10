"""Props (WORLD_DESIGN.md 6.6 C): transparent top-down sprites. The image centre is the placement point.

Two kinds:
- Flat decals on the road (manhole, drain, puddles, cracks) are lit like the ground tiles (uniform sky
  only), so they sit on ow-asphalt-* without a brightness step. Their alpha comes from the shader.
- Props with height (debris, trash, barricades, cars, trees, the lamp head) get the sky plus the
  north-west key light, like buildings. The contact shadow is rendered in a second pass on a shadow
  catcher lit by the sky only (key light off, the prop invisible to the camera) and composited under
  the prop, so the sprite carries the soft shadow under and around the prop but not a long key-light
  shadow that would not fit the sprite (6.5: contact shadows stay inside the image).

Cars and barricades are rendered once per orientation (-h / -v) so the key light keeps its direction.
All randomness comes from each prop's seed.
"""

import math
import os
import random

import bmesh
import bpy
from mathutils import Matrix, Vector

import ow_building as building
import ow_common as ow

M = ow.M_PER_PX


# ---------------------------------------------------------------------------
# Scene helpers


def prop_scene(width, height, samples, sun=True, catcher=True, transparent_bounces=16):
    scene = ow.reset_scene()
    ow.setup_render(scene, width, height, samples=samples, transparent=True)
    scene.cycles.transparent_max_bounces = transparent_bounces
    ow.setup_world(scene)
    w_m, h_m = width * M, height * M
    ow.add_ortho_camera_top(scene, -w_m / 2.0, -h_m / 2.0, w_m, h_m)
    if sun:
        ow.add_sun(scene)
    if catcher:
        ground = ow.plane_xy("shadow_catcher", -w_m * 2, -h_m * 2, w_m * 2, h_m * 2, 0.0, ow.flat_material("catcher", (0.3, 0.3, 0.3)))
        ground.is_shadow_catcher = True
    return scene, w_m, h_m


CONTACT_SHADOW_PX = 8


def box_blur(image, radius, passes=3):
    """Approximate gaussian blur of a 2-D array (three box blurs, edges clamped)."""
    out = image.astype(ow.np.float32)
    r = max(1, int(radius))
    for _ in range(passes):
        for axis in (0, 1):
            pad = [(0, 0), (0, 0)]
            pad[axis] = (r + 1, r)
            padded = ow.np.pad(out, pad, mode="edge")
            c = ow.np.cumsum(padded, axis=axis)
            hi = ow.np.take(c, ow.np.arange(2 * r + 1, padded.shape[axis]), axis=axis)
            lo = ow.np.take(c, ow.np.arange(0, padded.shape[axis] - 2 * r - 1), axis=axis)
            out = (hi - lo) / (2 * r + 1)
    return out


def render_with_contact_shadow(scene, path):
    """Prop pass (sky + key light, no catcher) over a shadow pass (sky only, prop hidden from the camera)."""
    import tempfile
    tmp = os.path.join(tempfile.gettempdir(), "ow_prop")
    catcher = scene.objects["shadow_catcher"]
    props = [obj for obj in scene.objects if obj.type in {"MESH", "CURVE", "FONT"} and obj is not catcher]
    lights = [obj for obj in scene.objects if obj.type == "LIGHT"]
    catcher.hide_render = True
    prop = ow.read_png(ow.render_still(scene, tmp + "_prop.png", "PNG", rgba=True))
    catcher.hide_render = False
    for obj in props:
        obj.visible_camera = False
    for obj in lights:
        obj.hide_render = True
    shadow = ow.read_png(ow.render_still(scene, tmp + "_shadow.png", "PNG", rgba=True))
    for obj in props:
        obj.visible_camera = True
    for obj in lights:
        obj.hide_render = False
    alpha_p, alpha_s = prop[..., 3:4], shadow[..., 3:4]
    # The sky's occlusion reaches far from tall props; keep only the part hugging the prop's outline
    # (CONTACT_SHADOW_PX) and fade it out at the image border so the sprite has no visible edge.
    near = ow.np.clip(box_blur(alpha_p[..., 0], CONTACT_SHADOW_PX) * 3.0, 0.0, 1.0)
    height, width = near.shape
    ys, xs = ow.np.mgrid[0:height, 0:width]
    border = ow.np.minimum(ow.np.minimum(xs, width - 1 - xs), ow.np.minimum(ys, height - 1 - ys))
    fade = ow.np.clip(border / 4.0, 0.0, 1.0)
    alpha_s = alpha_s * (near * fade)[..., None]
    color = prop[..., :3] * alpha_p + shadow[..., :3] * alpha_s * (1.0 - alpha_p)
    alpha = alpha_p + alpha_s * (1.0 - alpha_p)
    out = ow.np.zeros_like(prop)
    out[..., :3] = ow.np.where(alpha > 1e-4, color / ow.np.maximum(alpha, 1e-4), 0.0)
    out[..., 3:4] = alpha
    return ow.write_png(path, out)


def decal_material(name, color, alpha, roughness=0.85, normal=None, nb_material=None):
    material, nb = nb_material
    surface = nb.principled(color, roughness=roughness, normal=normal, specular=0.35)
    nb.output(nb.mix_shader(alpha, nb.transparent(), surface))
    return material


def radial(nb, pos, rx, ry):
    """Elliptical distance from the origin (1 on the ellipse)."""
    x, y, _ = nb.separate(pos)
    return nb.vmath("LENGTH", nb.combine(nb.math("DIVIDE", x, rx), nb.math("DIVIDE", y, ry), 0.0))


def tex_vec(nb, size_m, offset=(0.0, 0.0)):
    """World-position texture coordinates (props are not tiled, so any scale works)."""
    return nb.add_vec(nb.vscale(nb.position(), 1.0 / size_m), (offset[0], offset[1], 0.0))


def chunk(bm, center, size, rotation, tilt=(0.0, 0.0)):
    geom = bmesh.ops.create_cube(bm, size=1.0)
    mat = (Matrix.Translation(center) @ Matrix.Rotation(rotation, 4, "Z") @ Matrix.Rotation(tilt[0], 4, "X")
           @ Matrix.Rotation(tilt[1], 4, "Y") @ Matrix.Diagonal((size[0], size[1], size[2], 1.0)))
    bmesh.ops.transform(bm, matrix=mat, verts=geom["verts"])


def blob(bm, center, radii, rng, subdivisions=2, roughness=0.12):
    """Lumpy ellipsoid (rocks, rubbish bags)."""
    geom = bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, radius=1.0)
    for vert in geom["verts"]:
        n = vert.co.normalized()
        bump = 1.0 + rng.uniform(-roughness, roughness)
        vert.co = Vector((center[0] + n.x * radii[0] * bump, center[1] + n.y * radii[1] * bump, center[2] + n.z * radii[2] * bump))
    return geom


def textured(name, tex_id, size_m, tint=(1.0, 1.0, 1.0), saturation=1.0, roughness=0.85, metallic=0.0):
    """Image texture in metre UVs (box UVs from ow_common.mesh_object), with its normal map when fetched."""
    material, nb = ow.new_material(name)
    vec = nb.vscale(nb.uv(), 1.0 / size_m)
    color = nb.mix(1.0, nb.hsv(nb.tex(tex_id, "color", vec), saturation=saturation), tint, blend="MULTIPLY")
    dirt = nb.noise(nb.position(), scale=0.9, detail=5.0).outputs["Fac"]
    color = nb.mix(nb.map_range(dirt, 0.6, 0.35, 0.0, 0.45), color, (0.5, 0.47, 0.42), blend="MULTIPLY")
    maps = ow.load_sources()[tex_id]["maps"]
    normal = nb.normal_map(nb.tex(tex_id, "normal", vec), 1.0) if "normal" in maps else None
    rough = nb.tex(tex_id, "roughness", vec) if "roughness" in maps else roughness
    nb.output(nb.principled(color, roughness=rough, normal=normal, metallic=metallic))
    return material


def concrete_material(name, tint=(0.62, 0.61, 0.58)):
    return textured(name, "granular_concrete", 1.5, tint=tint, saturation=0.4)


# ---------------------------------------------------------------------------
# Flat decals (sky only)


def manhole(spec, w_m, h_m, rng):
    """Cast-iron cover (0.66 m) in its frame, set in a square repair patch of darker asphalt."""
    material, nb = ow.new_material("manhole")
    pos = nb.position()
    x, y, _ = nb.separate(pos)
    r = nb.vmath("LENGTH", nb.combine(x, y, 0.0))
    theta = nb.math("ARCTAN2", y, x)
    half = 0.8
    ragged = nb.mul(nb.sub(nb.noise(pos, scale=6.0, detail=3.0).outputs["Fac"], 0.5), 0.08)
    patch = nb.math("LESS_THAN", nb.sub(nb.math("MAXIMUM", nb.math("ABSOLUTE", x), nb.math("ABSOLUTE", y)), ragged), half)
    asphalt = nb.mix(1.0, nb.hsv(nb.tex("asphalt_07", "color", tex_vec(nb, 2.5)), saturation=0.4), (0.62, 0.62, 0.62), blend="MULTIPLY")
    seam = nb.math("GREATER_THAN", nb.sub(nb.math("MAXIMUM", nb.math("ABSOLUTE", x), nb.math("ABSOLUTE", y)), ragged), half - 0.04)
    asphalt = nb.mix(nb.mul(seam, 0.7), asphalt, (0.06, 0.06, 0.06))
    # Cover pattern: rim, ring groove, radial ribs, centre emblem; raised parts worn bright.
    frame = nb.inside(r, 0.33, 0.40)
    cover = nb.math("LESS_THAN", r, 0.33)
    ring = nb.inside(r, 0.27, 0.29)
    ribs = nb.mul(nb.inside(r, 0.09, 0.26), nb.math("GREATER_THAN", nb.math("SINE", nb.mul(theta, 18.0)), 0.55))
    emblem = nb.mul(nb.math("LESS_THAN", r, 0.08), nb.math("GREATER_THAN", nb.math("SINE", nb.mul(theta, 5.0)), -0.2))
    raised = nb.math("MAXIMUM", nb.math("MAXIMUM", ring, ribs), emblem)
    rust = nb.map_range(nb.noise(pos, scale=9.0, detail=5.0).outputs["Fac"], 0.45, 0.65, 0.0, 1.0)
    iron = nb.mix(nb.mul(rust, 0.6), (0.20, 0.19, 0.18), (0.30, 0.17, 0.09))
    iron = nb.mix(raised, iron, (0.36, 0.35, 0.33))
    color = nb.mix(nb.math("MAXIMUM", frame, cover), asphalt, iron)
    color = nb.mix(nb.mul(nb.inside(r, 0.325, 0.335), 0.9), color, (0.03, 0.03, 0.03))  # gap around the cover
    rough = nb.mixf(nb.math("MAXIMUM", frame, cover), 0.85, nb.mixf(raised, 0.6, 0.35))
    normal = nb.bump(nb.add(nb.mul(raised, 1.0), nb.mul(frame, 0.5)), strength=0.6, distance=0.01)
    nb.output(nb.mix_shader(patch, nb.transparent(), nb.principled(color, roughness=rough, normal=normal, metallic=nb.mul(cover, 0.4))))
    ow.plane_xy("manhole", -w_m, -h_m, w_m, h_m, 0.0, material)


def drain(spec, w_m, h_m, rng):
    """Steel grating in a concrete frame at the kerb, long axis north-south."""
    material, nb = ow.new_material("drain")
    pos = nb.position()
    x, y, _ = nb.separate(pos)
    ragged = nb.mul(nb.sub(nb.noise(pos, scale=8.0, detail=3.0).outputs["Fac"], 0.5), 0.05)
    frame = nb.mul(nb.math("LESS_THAN", nb.add(nb.math("ABSOLUTE", x), ragged), 0.45), nb.math("LESS_THAN", nb.add(nb.math("ABSOLUTE", y), ragged), 1.1))
    grate = nb.mul(nb.math("LESS_THAN", nb.math("ABSOLUTE", x), 0.25), nb.math("LESS_THAN", nb.math("ABSOLUTE", y), 0.9))
    bars = nb.math("LESS_THAN", nb.math("FLOORED_MODULO", x, 0.05), 0.02)
    cross = nb.math("LESS_THAN", nb.math("FLOORED_MODULO", y, 0.2), 0.02)
    steel = nb.math("MAXIMUM", bars, cross)
    concrete = nb.hsv(nb.tex("granular_concrete", "color", tex_vec(nb, 2.4)), saturation=0.3)
    grime = nb.map_range(nb.noise(pos, scale=4.0, detail=5.0).outputs["Fac"], 0.35, 0.65, 0.0, 0.6)
    concrete = nb.mix(grime, concrete, (0.32, 0.30, 0.27), blend="MULTIPLY")
    rust = nb.map_range(nb.noise(pos, scale=12.0, detail=4.0).outputs["Fac"], 0.4, 0.7, 0.0, 1.0)
    metal = nb.mix(rust, (0.24, 0.24, 0.23), (0.32, 0.18, 0.09))
    leaves = nb.mul(nb.map_range(nb.noise(pos, scale=14.0, detail=2.0).outputs["Fac"], 0.62, 0.68, 0.0, 1.0), grate)
    hole = (0.025, 0.025, 0.025)
    inside = nb.mix(steel, hole, metal)
    inside = nb.mix(leaves, inside, (0.36, 0.22, 0.10))
    color = nb.mix(grate, concrete, inside)
    normal = nb.bump(nb.sub(nb.mul(steel, grate), nb.mul(grate, 0.3)), strength=0.6, distance=0.01)
    nb.output(nb.mix_shader(frame, nb.transparent(), nb.principled(color, roughness=0.8, normal=normal, metallic=nb.mul(nb.mul(steel, grate), 0.5))))
    ow.plane_xy("drain", -w_m, -h_m, w_m, h_m, 0.0, material)


PUDDLE = {
    "micro_amplitude": 0.012,  # asphalt relief (m) from asphalt_02's displacement, 3 m repeat
    "basin_depth": 0.03,  # deepest point of the dip the water collects in (m)
    "water_level": -0.003,  # just below the lowest relief outside the dip, so water stays in it
    "reach": 0.42,  # dip radius as a fraction of the image (before the wobble)
    "wobble": 0.3,
    "mid_ground": 0.133,  # linear albedo of a mid-grey road, used to turn the result into an alpha decal
    "sky_reflection": 0.2,  # share of the neutral sky's reflection kept in the decal
    # Leaves are drawn larger than life (28-40 cm) so they read at 1 px = 2.5 cm.
    "leaf_size": (0.28, 0.40),
    "leaves": {"ow-prop-puddle-a": 5, "ow-prop-puddle-b": 8, "ow-prop-puddle-c": 12},
}


def _value_noise(xs, ys, scale, seed, octaves=4):
    """Smooth fractal noise on numpy grids (mathutils noise per point would be slow)."""
    from mathutils import noise
    total = ow.np.zeros_like(xs)
    amplitude, frequency, norm = 1.0, scale, 0.0
    flat_x, flat_y = xs.ravel(), ys.ravel()
    for octave in range(octaves):
        values = ow.np.fromiter((noise.noise(Vector((x * frequency + seed * 7.1, y * frequency + seed * 3.3, octave * 11.7)))
                                 for x, y in zip(flat_x, flat_y)), dtype=ow.np.float32, count=flat_x.size)
        total += values.reshape(xs.shape) * amplitude
        norm += amplitude
        amplitude *= 0.5
        frequency *= 2.0
    return total / norm  # about -1..1


def _grid_mesh(name, xs, ys, zs, attributes, material):
    rows, cols = xs.shape
    verts = ow.np.stack([xs.ravel(), ys.ravel(), zs.ravel()], axis=1)
    index = ow.np.arange(rows * cols).reshape(rows, cols)
    quads = ow.np.stack([index[:-1, :-1].ravel(), index[:-1, 1:].ravel(), index[1:, 1:].ravel(), index[1:, :-1].ravel()], axis=1)
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts.tolist(), [], quads.tolist())
    mesh.shade_smooth()
    for attr_name, values in attributes.items():
        attr = mesh.color_attributes.new(attr_name, "FLOAT_COLOR", "POINT")
        rgba = ow.np.repeat(values.ravel()[:, None], 4, axis=1).astype(ow.np.float32)
        rgba[:, 3] = 1.0
        attr.data.foreach_set("color", rgba.ravel())
    mesh.update()
    mesh.validate()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    mesh.materials.append(material)
    return obj


def puddle(spec, w_m, h_m, rng):
    """Rain puddle that shows the road through it.

    Built as real geometry: the asphalt relief (asphalt_02's displacement) with a shallow dip, and a
    flat water surface at a fixed level, so the waterline follows the grain of the road, stone tips
    break the surface in the shallows, a damp ring hugs the edge and deeper water is murkier. Floating
    leaves sit on top. The scene is rendered twice, once with a white and once with a black road; the
    difference is how much the puddle darkens whatever road is under it in game, the black render is
    the light it adds (the leaves, and the sky's faint reflection, which is cut to 20 %: the night sky
    is dark and reflections of lamps and neon are the game's job). Both become one alpha decal, so the
    real road texture stays visible through the water.

    A third pass writes <key>_water.png: white, alpha = open water surface (not the damp ground, not the
    leaves), same size and position as the puddle, so the game can add lamp and neon reflections there.
    """
    seed = spec["seed"]
    step = M  # one vertex per output pixel
    margin = 0.5
    xs1 = ow.np.arange(-w_m / 2 - margin, w_m / 2 + margin + step / 2, step, dtype=ow.np.float32)
    ys1 = ow.np.arange(-h_m / 2 - margin, h_m / 2 + margin + step / 2, step, dtype=ow.np.float32)
    xs, ys = ow.np.meshgrid(xs1, ys1)

    # Relief of the road surface: asphalt_02's displacement map, 3 m repeat.
    disp_img = bpy.data.images.load(ow.tex_file("asphalt_02", "displacement"), check_existing=True)
    dw, dh = disp_img.size
    disp = ow.np.empty(dw * dh * 4, dtype=ow.np.float32)
    disp_img.pixels.foreach_get(disp)
    disp = disp.reshape(dh, dw, 4)[..., 0]
    u = ((xs / 3.0 + seed * 0.13) % 1.0 * dw).astype(int) % dw
    v = ((ys / 3.0 + seed * 0.29) % 1.0 * dh).astype(int) % dh
    # The dip: a wobbly ellipse, deepest in the middle.
    ell = ow.np.sqrt((xs / (w_m * PUDDLE["reach"])) ** 2 + (ys / (h_m * PUDDLE["reach"])) ** 2)
    wobble = _value_noise(xs, ys, 0.6, seed, octaves=3) * PUDDLE["wobble"] + _value_noise(xs, ys, 2.4, seed + 5, octaves=2) * 0.08
    shape = 1.0 - ell + wobble - ow.np.clip((ell - 1.05) * 3.0, 0.0, None)  # nothing reaches the sprite edge
    # Relief only around the dip: further out the road is flat, so the decal is fully clear there.
    relief = ow.np.clip((shape + 0.35) / 0.2, 0.0, 1.0)
    micro = (disp[v, u] - 0.62) * PUDDLE["micro_amplitude"] * relief
    basin = ow.np.clip(shape / 0.55, 0.0, 1.0) ** 1.3
    heights = micro - PUDDLE["basin_depth"] * basin
    level = PUDDLE["water_level"]
    depth = level - heights

    # Damp ground: just above the waterline, plus a patchy halo around the dip.
    rim = ow.np.clip(1.0 - (heights - level) / 0.0015, 0.0, 1.0)
    halo = ow.np.clip((shape + 0.08) / 0.08, 0.0, 1.0) * ow.np.clip(0.4 + _value_noise(xs, ys, 1.6, seed + 9, octaves=3), 0.0, 1.0)
    wet = ow.np.maximum(ow.np.maximum(rim, halo * 0.45), (depth > 0).astype(ow.np.float32))

    ground_mat, nb = ow.new_material("puddle_ground")
    wet_attr = nb.separate(nb.new("ShaderNodeVertexColor", layer_name="wet").outputs["Color"])[0]
    base = nb.value(1.0, "road_albedo")  # 1 = white road, 0 = black road
    albedo = nb.mul(base.outputs[0], nb.mixf(wet_attr, 1.0, 0.5))
    nb.output(nb.principled(albedo, roughness=nb.mixf(wet_attr, 0.88, 0.3), specular=0.35))
    road = _grid_mesh("road", xs, ys, heights, {"wet": wet}, ground_mat)

    # Water surface over the dip only (so no stray specks reach the sprite's edge).
    inside = shape > -0.05
    rows = ow.np.where(inside.any(axis=1))[0]
    cols = ow.np.where(inside.any(axis=0))[0]
    r0, r1, c0, c1 = rows.min(), rows.max() + 1, cols.min(), cols.max() + 1
    water_mat, nb = ow.new_material("puddle_water")
    pos = nb.position()
    d = nb.separate(nb.new("ShaderNodeVertexColor", layer_name="depth").outputs["Color"])[0]
    # Muddy water absorbs more the deeper it is (light passes it twice): darker, slightly brown.
    tint = nb.mix(nb.map_range(d, 0.0, 0.025, 0.0, 1.0), (0.90, 0.90, 0.88), (0.62, 0.58, 0.52))
    clear = nb.node("ShaderNodeBsdfTransparent", {"Color": tint}).outputs["BSDF"]
    ripples = nb.bump(nb.noise(pos, scale=9.0, detail=3.0).outputs["Fac"], strength=0.05, distance=0.002)
    reflect = nb.node("ShaderNodeBsdfPrincipled", {"Base Color": (0.0, 0.0, 0.0), "Roughness": 0.03, "IOR": 1.333, "Normal": ripples}).outputs["BSDF"]
    add = nb.node("ShaderNodeAddShader")
    nb.links.new(clear, add.inputs[0])
    nb.links.new(reflect, add.inputs[1])
    nb.output(add.outputs["Shader"])
    water = _grid_mesh("water", xs[r0:r1, c0:c1], ys[r0:r1, c0:c1], ow.np.full((r1 - r0, c1 - c0), level, dtype=ow.np.float32),
                       {"depth": ow.np.clip(depth[r0:r1, c0:c1], 0.0, 1.0)}, water_mat)

    # Leaves floating on the water, and every fourth one stranded at the waterline.
    leaf_mat = wet_leaf_material("floating_leaves", "LeafSet014")  # broad leaves read better than narrow ones
    floating = ow.np.argwhere(depth > 0.006)
    stranded = ow.np.argwhere((depth > -0.002) & (depth <= 0.0) & (shape > 0.0))
    items = []
    for k in range(PUDDLE["leaves"].get(spec["key"], 12)):
        pool = stranded if (k % 4 == 3 and len(stranded)) else floating
        if len(pool) == 0:
            break
        j, i = pool[rng.randrange(len(pool))]
        if ow.np.hypot(xs[j, i] / (w_m / 2), ys[j, i] / (h_m / 2)) > 0.8:
            continue  # keep whole leaves inside the sprite
        z = level + 0.0015 if pool is floating else float(heights[j, i]) + 0.002
        items.append((float(xs[j, i]), float(ys[j, i]), z, rng.uniform(*PUDDLE["leaf_size"]), rng.uniform(0, 2 * math.pi)))
    leaves = flat_leaf_cards("leaves", leaf_mat, "LeafSet014", items, rng,
                             palette=[(0.95, 0.75, 0.45), (0.8, 0.52, 0.3), (1.0, 0.88, 0.6), (0.7, 0.45, 0.25)]) if items else None

    road_albedo = base.outputs[0]
    # Where the puddle can change the road at all, sampled at the output pixels (row 0 = north edge).
    out_h, out_w = int(round(h_m / step)), int(round(w_m / step))
    cols_idx = ow.np.clip(ow.np.round((-w_m / 2 + (ow.np.arange(out_w) + 0.5) * step - xs1[0]) / step).astype(int), 0, len(xs1) - 1)
    rows_idx = ow.np.clip(ow.np.round((h_m / 2 - (ow.np.arange(out_h) + 0.5) * step - ys1[0]) / step).astype(int), 0, len(ys1) - 1)
    influence = ow.np.clip((shape[rows_idx][:, cols_idx] + 0.16) / 0.06, 0.0, 1.0)
    # Pixels well away from the dip (camera image rows/cols) to measure the plain road's brightness.
    px = ((xs1 + w_m / 2) / step).astype(int)
    py = ((h_m / 2 - ys1) / step).astype(int)
    dry = ow.np.zeros((int(round(h_m / step)), int(round(w_m / step))), dtype=bool)
    for j, yy in enumerate(py):
        if 0 <= yy < dry.shape[0]:
            for i, xx in enumerate(px):
                if 0 <= xx < dry.shape[1] and shape[j, i] < -0.45:
                    dry[yy, xx] = True

    def render(scene, path):
        import tempfile
        tmp = os.path.join(tempfile.gettempdir(), "ow_puddle")
        write_water_mask(scene, path[:-4] + "_water.png", water, [obj for obj in (road, leaves) if obj], influence)
        scene.render.film_transparent = False
        road_albedo.default_value = 1.0
        white = ow.read_linear(ow.render_still(scene, tmp + "_white.exr", "EXR"))
        road_albedo.default_value = 0.0
        black = ow.read_linear(ow.render_still(scene, tmp + "_black.exr", "EXR"))
        road_albedo.default_value = 1.0
        flat = float(ow.np.median(white[dry])) if dry.any() else 1.0  # the plain road, no puddle
        keep = ow.np.clip((white - black) / max(flat, 1e-3), 0.0, 1.0)  # how much of the road's light survives
        keep_srgb = keep ** (1.0 / 2.2)  # an sRGB multiply that matches the linear one
        opaque = (ow.srgb_luma(keep_srgb) < 0.05)[..., None]  # floating leaves
        added = ow.np.clip(black, 0.0, 1.0) * ow.np.where(opaque, 1.0, PUDDLE["sky_reflection"])  # light the puddle adds
        alpha = ow.np.clip(1.0 - ow.srgb_luma(keep_srgb), 0.0, 1.0)[..., None]
        alpha = ow.np.where(alpha < 0.02, 0.0, alpha) * influence[..., None]  # no render noise on the dry road
        g = PUDDLE["mid_ground"]
        target = ow.linear_to_srgb(g * keep + added)
        color = (target - ow.linear_to_srgb(g) * (1.0 - alpha)) / ow.np.maximum(alpha, 1e-3)
        rgba = ow.np.concatenate([ow.np.clip(color, 0.0, 1.0), alpha], axis=2)
        return ow.write_png(path, rgba)

    return render


def atlas_leaf_rects(atlas):
    """UV rectangle (u0, v0, u1, v1) around the leaf in each cell of a leaf atlas, from its opacity map."""
    cols, rows = LEAF_ATLAS[atlas]
    image = bpy.data.images.load(ow.tex_file(atlas, "opacity"), check_existing=True)
    width, height = image.size
    data = ow.np.empty(width * height * 4, dtype=ow.np.float32)
    image.pixels.foreach_get(data)
    alpha = data.reshape(height, width, 4)[..., 0] > 0.5  # row 0 = bottom, like UV v
    rects = []
    for row in range(rows):
        for col in range(cols):
            x0, x1 = col * width // cols, (col + 1) * width // cols
            y0, y1 = row * height // rows, (row + 1) * height // rows
            ys, xs = ow.np.nonzero(alpha[y0:y1, x0:x1])
            if len(xs) == 0:
                continue
            rects.append(((x0 + xs.min()) / width, (y0 + ys.min()) / height, (x0 + xs.max() + 1) / width, (y0 + ys.max() + 1) / height))
    return rects, width / height


def flat_leaf_cards(name, material, atlas, items, rng, palette):
    """Leaves lying flat: items = (x, y, z, size, angle), size = the leaf's long side.

    UVs are cropped to one leaf of the atlas, so the card is the leaf (no empty margin)."""
    rects, pixel_aspect = atlas_leaf_rects(atlas)
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")
    color_layer = bm.loops.layers.color.new("leaf_tint")
    for x, y, z, size, angle in items:
        u0, v0, u1, v1 = rects[rng.randrange(len(rects))]
        aspect = (u1 - u0) * pixel_aspect / (v1 - v0)  # leaf width / height
        half_w, half_h = (size / 2, size / 2 / aspect) if aspect >= 1 else (size / 2 * aspect, size / 2)
        ca, sa = math.cos(angle), math.sin(angle)
        corners = [(x + ca * dx - sa * dy, y + sa * dx + ca * dy) for dx, dy in ((-half_w, -half_h), (half_w, -half_h), (half_w, half_h), (-half_w, half_h))]
        face = bm.faces.new([bm.verts.new((px, py, z)) for px, py in corners])
        tint = palette[rng.randrange(len(palette))]
        for loop, (a, b) in zip(face.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
            loop[uv_layer].uv = (u0 + (u1 - u0) * a, v0 + (v1 - v0) * b)
            loop[color_layer] = (*tint, 1.0)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    mesh.materials.append(material)
    return obj


def wet_leaf_material(name, atlas):
    """Soaked leaf lying on water: opaque where the atlas has a leaf, no light through it."""
    material, nb = ow.new_material(name)
    uv = nb.uv()
    color = nb.tex(atlas, "color", uv, interpolation="Linear", extension="CLIP")
    alpha = nb.luma(nb.tex(atlas, "opacity", uv, interpolation="Linear", extension="CLIP"))
    tint = nb.new("ShaderNodeVertexColor", layer_name="leaf_tint").outputs["Color"]
    color = nb.mix(1.0, nb.hsv(color, hue=0.42, saturation=0.95, value=0.85), tint, blend="MULTIPLY")  # green -> fallen yellow-brown
    nb.output(nb.mix_shader(nb.math("GREATER_THAN", alpha, 0.5), nb.transparent(), nb.principled(color, roughness=0.35, specular=0.4)))
    return material


def leaf_cutout(name, atlas, inner):
    """Same leaf shapes as wet_leaf_material, with `inner` (a shader socket factory) inside them."""
    material, nb = ow.new_material(name)
    alpha = nb.luma(nb.tex(atlas, "opacity", nb.uv(), interpolation="Linear", extension="CLIP"))
    nb.output(nb.mix_shader(nb.math("GREATER_THAN", alpha, 0.5), nb.transparent(), inner(nb)))
    return material


def write_water_mask(scene, path, water, others, influence):
    """White sprite whose alpha is the visible open water (others are held out), for reflections."""
    holdout, nb = ow.new_material("mask_holdout")
    nb.output(nb.holdout())
    leaf_holdout = leaf_cutout("mask_leaf_holdout", "LeafSet014", lambda nb: nb.holdout())  # hold out the leaf, not its card
    white, nb = ow.new_material("mask_white")
    nb.output(nb.emission((1.0, 1.0, 1.0), 1.0))
    saved = {obj.name: list(obj.data.materials) for obj in [water, *others]}
    for obj in others:
        for index in range(len(obj.data.materials)):
            obj.data.materials[index] = leaf_holdout if obj.name.startswith("leaves") else holdout
    water.data.materials[0] = white
    transparent, denoise = scene.render.film_transparent, scene.cycles.use_denoising
    scene.render.film_transparent, scene.cycles.use_denoising = True, False
    import tempfile
    coverage = ow.read_png(ow.render_still(scene, os.path.join(tempfile.gettempdir(), "ow_puddle_water.png"), "PNG", rgba=True))[..., 3]
    scene.render.film_transparent, scene.cycles.use_denoising = transparent, denoise
    for obj in [water, *others]:
        for index, material in enumerate(saved[obj.name]):
            obj.data.materials[index] = material
    alpha = ow.np.clip(coverage, 0.0, 1.0) * influence
    rgba = ow.np.ones(alpha.shape + (4,), dtype=ow.np.float32)
    rgba[..., 3] = alpha
    return ow.write_png(path, rgba)


def crack(spec, w_m, h_m, rng):
    """Crack decals: a: branching crack, b: alligator patch with missing chunks."""
    material, nb = ow.new_material("crack")
    pos = nb.position()
    seed = spec["seed"]
    moved = nb.add_vec(pos, (seed * 3.1, seed * 1.7, 0.0))
    reach = nb.sub(1.0, radial(nb, pos, w_m * 0.46, h_m * 0.46))
    reach = nb.add(reach, nb.mul(nb.sub(nb.noise(moved, scale=0.8, detail=3.0).outputs["Fac"], 0.5), 0.6))
    if spec["style"] == "branch":
        cells = nb.voronoi(moved, scale=0.55, feature="DISTANCE_TO_EDGE")
        width = nb.mul(nb.map_range(reach, 0.0, 0.6, 0.0, 0.03), 1.0)
        lines = nb.math("LESS_THAN", cells.outputs["Distance"], width)
        fine = nb.math("LESS_THAN", nb.voronoi(moved, scale=1.8, feature="DISTANCE_TO_EDGE").outputs["Distance"], nb.mul(width, 0.5))
        lines = nb.mul(nb.math("MAXIMUM", lines, nb.mul(fine, nb.math("GREATER_THAN", reach, 0.35))), nb.math("GREATER_THAN", reach, 0.05))
        halo = nb.mul(nb.map_range(cells.outputs["Distance"], 0.0, 0.12, 0.35, 0.0), nb.math("GREATER_THAN", reach, 0.1))
        alpha = nb.math("MAXIMUM", nb.mul(lines, 0.9), halo)
        color = nb.mix(lines, (0.10, 0.10, 0.10), (0.03, 0.03, 0.03))
        normal = None
    else:
        cells = nb.voronoi(moved, scale=2.4, feature="DISTANCE_TO_EDGE")
        cell_color = nb.voronoi(moved, scale=2.4, feature="F1").outputs["Color"]
        zone = nb.mul(nb.math("GREATER_THAN", reach, 0.0), nb.math("LESS_THAN", radial(nb, pos, w_m * 0.47, h_m * 0.47), 1.0))
        lines = nb.mul(nb.math("LESS_THAN", cells.outputs["Distance"], 0.05), zone)
        missing = nb.mul(nb.math("GREATER_THAN", nb.luma(cell_color), 0.74), nb.math("GREATER_THAN", reach, 0.25))
        gravel = nb.mix(1.0, nb.hsv(nb.tex("gravel", "color", tex_vec(nb, 2.0)), saturation=0.5), (0.5, 0.5, 0.5), blend="MULTIPLY")
        alpha = nb.math("MAXIMUM", nb.mul(lines, 0.85), missing)
        alpha = nb.math("MAXIMUM", alpha, nb.mul(nb.map_range(reach, 0.0, 0.3, 0.0, 0.18), zone))
        color = nb.mix(missing, (0.05, 0.05, 0.05), gravel)
        normal = nb.bump(nb.mul(missing, -1.0), strength=0.6, distance=0.02)
    nb.output(nb.mix_shader(alpha, nb.transparent(), nb.principled(color, roughness=0.9, normal=normal)))
    ow.plane_xy("crack", -w_m, -h_m, w_m, h_m, 0.0, material)


def sinkhole(spec, w_m, h_m, rng):
    """Road subsidence (陥没): a bowl with broken asphalt slabs tipping in, gravel and water at the bottom."""
    radius = min(w_m, h_m) * 0.36
    material, nb = ow.new_material("sinkhole")
    pos = nb.position()
    x, y, z = nb.separate(pos)
    depth = nb.map_range(z, -0.05, -0.9, 0.0, 1.0)
    asphalt = nb.mix(1.0, nb.hsv(nb.tex("aerial_asphalt_01", "color", tex_vec(nb, 25.6)), saturation=0.5), (0.95, 0.95, 0.95), blend="MULTIPLY")
    soil = nb.tex("brown_mud_leaves_01", "color", tex_vec(nb, 1.3))
    gravel = nb.hsv(nb.tex("gravel", "color", tex_vec(nb, 2.0)), saturation=0.5)
    debris = nb.hsv(nb.tex("concrete_debris", "color", tex_vec(nb, 2.0)), saturation=0.5)
    slope = nb.mix(nb.map_range(nb.noise(pos, scale=1.2, detail=5.0).outputs["Fac"], 0.4, 0.6, 0.0, 1.0), debris, nb.mix(0.5, soil, debris))
    slope = nb.mix(1.0, slope, (0.55, 0.54, 0.52), blend="MULTIPLY")
    color = nb.mix(nb.map_range(depth, 0.08, 0.2, 0.0, 1.0), asphalt, slope)
    color = nb.mix(nb.map_range(depth, 0.55, 0.75, 0.0, 1.0), color, gravel)
    water = nb.map_range(depth, 0.93, 0.95, 0.0, 1.0)
    color = nb.mix(nb.mul(water, 0.9), color, (0.03, 0.035, 0.04))
    r = nb.vmath("LENGTH", nb.combine(x, y, 0.0))
    edge = nb.add(nb.sub(1.0, nb.math("DIVIDE", r, radius * 1.25)), nb.mul(nb.sub(nb.noise(pos, scale=1.5, detail=3.0).outputs["Fac"], 0.5), 0.3))
    alpha = nb.map_range(edge, 0.0, 0.05, 0.0, 1.0)
    rough = nb.mixf(water, 0.9, 0.05)
    nb.output(nb.mix_shader(alpha, nb.transparent(), nb.principled(color, roughness=rough)))
    # Displaced grid: bowl + broken slab steps (voronoi-like jitter of whole cells).
    bm = bmesh.new()
    n = 160
    cells = [(rng.uniform(-radius * 1.3, radius * 1.3), rng.uniform(-radius * 1.3, radius * 1.3), rng.uniform(-0.25, 0.08), rng.uniform(-0.12, 0.12), rng.uniform(-0.12, 0.12)) for _ in range(28)]
    verts = []
    for j in range(n + 1):
        row = []
        for i in range(n + 1):
            px = -w_m / 2 + w_m * i / n
            py = -h_m / 2 + h_m * j / n
            d = math.hypot(px, py) / radius
            z = -0.9 * max(0.0, 1.0 - d * d) ** 1.4
            if 0.55 < d < 1.35:  # broken slabs around the rim: nearest cell's tilt
                cx, cy, dz, tx, ty = min(cells, key=lambda c: (c[0] - px) ** 2 + (c[1] - py) ** 2)
                z += (dz + tx * (px - cx) + ty * (py - cy)) * max(0.0, 1.0 - abs(d - 0.95) / 0.4)
            z += rng.uniform(-0.01, 0.01)
            row.append(bm.verts.new((px, py, z)))
        verts.append(row)
    for j in range(n):
        for i in range(n):
            bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
    ow.mesh_object("sinkhole", bm, material)


# ---------------------------------------------------------------------------
# Props with height (sky + key light, contact shadow from the sky)


def dust_decal(name, rx, ry, strength=0.6):
    material, nb = ow.new_material(name)
    pos = nb.position()
    fall = nb.map_range(radial(nb, pos, rx, ry), 1.0, 0.5, 0.0, strength, smooth=True)
    noise = nb.map_range(nb.noise(pos, scale=2.0, detail=4.0).outputs["Fac"], 0.35, 0.65, 0.3, 1.0)
    color = nb.hsv(nb.tex("concrete_debris", "color", tex_vec(nb, 2.0)), saturation=0.4)
    nb.output(nb.mix_shader(nb.mul(fall, noise), nb.transparent(), nb.principled(color, roughness=0.95)))
    ow.plane_xy(name, -rx, -ry, rx, ry, 0.003, material)


def rubble_pile(spec, w_m, h_m, rng, count, radius, max_size, rebar=False):
    concrete = concrete_material("rubble_concrete")
    brick = building.noisy_material("brick", (0.26, 0.14, 0.10), roughness=0.9, dirt=0.5, scale=4.0)
    tile = building.noisy_material("tile", (0.70, 0.68, 0.62), roughness=0.6, dirt=0.4, scale=3.0)
    steel = textured("rebar", "rust_coarse_01", 0.6, tint=(0.8, 0.7, 0.6), metallic=0.4)
    dust_decal("rubble_dust", radius * 1.25, radius * 1.15)
    groups = {concrete: bmesh.new(), brick: bmesh.new(), tile: bmesh.new()}
    for _ in range(count):
        a = rng.uniform(0, 2 * math.pi)
        d = radius * math.sqrt(rng.random())
        cx, cy = math.cos(a) * d, math.sin(a) * d
        height = 0.4 * radius * max(0.0, 1.0 - (d / radius) ** 2)
        s = rng.uniform(0.2, 1.0) * max_size
        material = rng.choices([concrete, brick, tile], weights=[0.8, 0.14, 0.06])[0]
        if material is tile:
            chunk(groups[tile], (cx, cy, height + 0.02), (s * 0.7, s * 0.7, 0.02), rng.uniform(0, math.pi), (rng.uniform(-0.3, 0.3), 0.0))
        elif rng.random() < 0.65:
            blob(groups[material], (cx, cy, height + s * 0.2), (s * rng.uniform(0.6, 1.0), s * rng.uniform(0.5, 0.8), s * rng.uniform(0.3, 0.5)), rng, subdivisions=1, roughness=0.3)
        else:  # broken slab pieces
            chunk(groups[material], (cx, cy, height + s * 0.15), (s * rng.uniform(1.0, 1.8), s * rng.uniform(0.7, 1.2), s * rng.uniform(0.15, 0.3)),
                  rng.uniform(0, math.pi), (rng.uniform(-0.6, 0.6), rng.uniform(-0.6, 0.6)))
    for material, bm in groups.items():
        ow.mesh_object(material.name, bm, material)
    if rebar:
        for k in range(10):
            a = rng.uniform(0, 2 * math.pi)
            d = radius * rng.uniform(0.0, 0.7)
            start = Vector((math.cos(a) * d, math.sin(a) * d, 0.1))
            end = start + Vector((rng.uniform(-0.9, 0.9), rng.uniform(-0.9, 0.9), rng.uniform(0.2, 0.7)))
            building.beam(f"rebar_{k}", start, end, 0.03, steel)


def debris_small(spec, w_m, h_m, rng):
    rubble_pile(spec, w_m, h_m, rng, count=45, radius=0.9, max_size=0.36)


def debris_large(spec, w_m, h_m, rng):
    rubble_pile(spec, w_m, h_m, rng, count=160, radius=2.5, max_size=0.6, rebar=True)


def debris_glass(spec, w_m, h_m, rng):
    """Broken shop glass: shards scattered from a fallen frame, plus a little rubble."""
    glass = ow.flat_material("shard_glass", (0.62, 0.70, 0.72), roughness=0.12)
    shards = bmesh.new()
    for _ in range(170):
        a = rng.uniform(0, 2 * math.pi)
        d = 1.6 * math.sqrt(rng.random())
        cx, cy = math.cos(a) * d, math.sin(a) * d
        s = rng.uniform(0.06, 0.26) * (1.4 - d / 1.6)
        pts = [Vector((cx + math.cos(t) * s * rng.uniform(0.4, 1.0), cy + math.sin(t) * s * rng.uniform(0.4, 1.0), 0.004 + rng.uniform(0, 0.01)))
               for t in sorted(rng.uniform(0, 2 * math.pi) for _ in range(3))]
        shards.faces.new([shards.verts.new(p) for p in pts])
    obj = ow.mesh_object("shards", shards, glass)
    frame = building.noisy_material("alu", (0.40, 0.40, 0.38), roughness=0.4, metallic=0.8)
    for k in range(2):
        rotated = building.rotated_box(f"frame_bar_{k}", (rng.uniform(-0.6, 0.6), rng.uniform(-0.6, 0.6), 0.03), (rng.uniform(1.2, 2.0), 0.05, 0.05),
                                       rng.uniform(0, math.pi), frame)
    concrete = concrete_material("glass_rubble")
    bm = bmesh.new()
    for _ in range(10):
        chunk(bm, (rng.uniform(-1.2, 1.2), rng.uniform(-1.2, 1.2), 0.04), (rng.uniform(0.06, 0.2),) * 2 + (0.06,), rng.uniform(0, math.pi))
    ow.mesh_object("glass_rubble", bm, concrete)
    return obj


def debris_sign(spec, w_m, h_m, rng):
    """A fallen shop sign lying face up: bent panel, steel frame, broken plastic."""
    panel_mat = building.noisy_material("sign_face", (0.82, 0.80, 0.74), roughness=0.5, dirt=0.7, scale=2.5)
    bm = bmesh.new()
    nx, ny = 24, 8
    lx, ly = 3.6, 1.1
    verts = []
    for j in range(ny + 1):
        row = []
        for i in range(nx + 1):
            x = -lx / 2 + lx * i / nx
            y = -ly / 2 + ly * j / ny
            bend = 0.18 * max(0.0, (x - 0.6)) ** 1.5 if x > 0.6 else 0.0
            row.append(bm.verts.new((x, y, 0.06 + bend + rng.uniform(-0.005, 0.005))))
        verts.append(row)
    for j in range(ny):
        for i in range(nx):
            bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
    panel = ow.mesh_object("sign_panel", bm, panel_mat)
    panel.rotation_euler = (0.0, 0.0, 0.12)
    stripe = ow.flat_material("sign_stripe", (0.55, 0.08, 0.06), roughness=0.5)
    for k, y in enumerate((-0.42, 0.42)):
        band = ow.plane_xy(f"sign_band_{k}", -1.8, y - 0.07, 0.55, y + 0.07, 0.065, stripe)
        band.rotation_euler = (0.0, 0.0, 0.12)
    font = building.find_font()
    ink = ow.flat_material("sign_ink", (0.10, 0.20, 0.45), roughness=0.4)
    label = building.text("sign_label", "クリーニング", (-0.65, 0.0, 0.07), 0.4, ink, font, facing="top", fit=(2.0, 0.5))
    label.rotation_euler = (0.0, 0.0, 0.12)
    steel = textured("sign_steel", "rust_coarse_01", 0.8, tint=(0.7, 0.6, 0.5), metallic=0.5)
    building.beam("sign_frame_a", (-1.7, -0.62, 0.05), (1.4, -0.70, 0.05), 0.05, steel)
    building.beam("sign_frame_b", (-1.6, 0.65, 0.05), (0.9, 0.85, 0.30), 0.05, steel)
    plastic = building.noisy_material("plastic_bits", (0.75, 0.74, 0.70), roughness=0.4, dirt=0.4, scale=4.0)
    bm = bmesh.new()
    for _ in range(14):
        chunk(bm, (rng.uniform(-2.0, 2.0), rng.uniform(-1.2, 1.2), 0.01), (rng.uniform(0.08, 0.3), rng.uniform(0.05, 0.2), 0.01), rng.uniform(0, math.pi))
    ow.mesh_object("plastic_bits", bm, plastic)


def trash(spec, w_m, h_m, rng):
    """Garbage bags piled at a collection point, under a crow net (カラスよけネット)."""
    bag_mats = [
        building.noisy_material("bag_white", (0.78, 0.78, 0.74), roughness=0.35, dirt=0.4, scale=5.0),
        building.noisy_material("bag_blue", (0.42, 0.56, 0.68), roughness=0.35, dirt=0.4, scale=5.0),
        building.noisy_material("bag_black", (0.06, 0.06, 0.07), roughness=0.3, dirt=0.2, scale=5.0),
    ]
    groups = {m: bmesh.new() for m in bag_mats}
    for _ in range(11):
        a = rng.uniform(0, 2 * math.pi)
        d = rng.uniform(0.0, 0.6)
        r = rng.uniform(0.22, 0.32)
        center = (math.cos(a) * d, math.sin(a) * d, r * 0.6 + (0.25 if d < 0.25 else 0.0))
        material = rng.choices(bag_mats, weights=[0.5, 0.35, 0.15])[0]
        blob(groups[material], center, (r * rng.uniform(0.9, 1.2), r * rng.uniform(0.8, 1.1), r * 0.75), rng, roughness=0.15)
    for material, bm in groups.items():
        ow.mesh_object(material.name, bm, material)
    net_mat, nb = ow.new_material("crow_net")
    pos = nb.position()
    x, y, _ = nb.separate(pos)
    cell = 0.06
    lines = nb.math("MAXIMUM", nb.math("LESS_THAN", nb.math("FLOORED_MODULO", x, cell), 0.012), nb.math("LESS_THAN", nb.math("FLOORED_MODULO", y, cell), 0.012))
    ragged = nb.math("LESS_THAN", nb.add(radial(nb, pos, 0.62, 0.55), nb.mul(nb.sub(nb.noise(pos, scale=3.0).outputs["Fac"], 0.5), 0.5)), 1.0)
    nb.output(nb.mix_shader(nb.mul(nb.mul(lines, ragged), 0.7), nb.transparent(), nb.principled((0.06, 0.30, 0.20), roughness=0.6)))
    building.lumpy_sheet("net", -0.8, -0.7, 0.8, 0.7, 0.05, rng, net_mat, cuts=40, lift=0.75)
    can = building.noisy_material("cans", (0.6, 0.6, 0.62), roughness=0.3, metallic=0.8)
    for k in range(4):
        a = rng.uniform(0, 2 * math.pi)
        ow.cylinder(f"can_{k}", math.cos(a) * 1.0, math.sin(a) * 0.9, 0.0, 0.12, 0.033, can, segments=12)


def barricade(spec, w_m, h_m, rng):
    """Two plastic barricades in a row, yellow/black striped top rail on A-frame legs."""
    along_x = spec["axis"] == "h"
    material, nb = ow.new_material("barricade_rail")
    x, y, _ = nb.separate(nb.position())
    along = x if along_x else y
    stripes = nb.math("LESS_THAN", nb.math("FLOORED_MODULO", nb.add(along, nb.mul(x if not along_x else y, 1.0)), 0.3), 0.15)
    color = nb.mix(stripes, (0.85, 0.66, 0.08), (0.05, 0.05, 0.05))
    dirt = nb.map_range(nb.noise(nb.position(), scale=3.0, detail=4.0).outputs["Fac"], 0.6, 0.35, 0.0, 0.5)
    color = nb.mix(dirt, color, (0.5, 0.46, 0.4), blend="MULTIPLY")
    nb.output(nb.principled(color, roughness=0.45))
    leg = building.noisy_material("barricade_leg", (0.80, 0.62, 0.10), roughness=0.5, dirt=0.5, scale=3.0)
    foot = textured("barricade_foot", "rust_coarse_01", 0.8, tint=(0.25, 0.22, 0.2))
    lamp = building.noisy_material("warning_lamp", (0.95, 0.55, 0.05), roughness=0.3, dirt=0.3)

    def place(a, b, z0, z1, mat, name, cross=(0.0, 0.0)):
        # a/b along the row, cross across it.
        if along_x:
            return ow.box(name, a, cross[0], z0, b, cross[1], z1, mat)
        return ow.box(name, cross[0], a, z0, cross[1], b, z1, mat)

    unit = 1.8
    for k, start in enumerate((-unit - 0.02, 0.02)):
        jitter = rng.uniform(-0.04, 0.04)
        place(start, start + unit, 0.78, 0.92, material, f"rail_{k}", (-0.06 + jitter, 0.06 + jitter))
        place(start, start + unit, 0.32, 0.40, leg, f"lower_{k}", (-0.04 + jitter, 0.04 + jitter))
        for end in (start + 0.05, start + unit - 0.15):
            for side in (-1, 1):
                place(end, end + 0.1, 0.0, 0.85, leg, f"leg_{k}_{end:.2f}_{side}", sorted((side * 0.05, side * 0.36)))
                place(end - 0.05, end + 0.15, 0.0, 0.06, foot, f"foot_{k}_{end:.2f}_{side}", sorted((side * 0.30, side * 0.44)))
    if along_x:
        ow.cylinder("lamp", -unit + 0.2, 0.0, 0.92, 1.05, 0.07, lamp, segments=16)
    else:
        ow.cylinder("lamp", 0.0, -unit + 0.2, 0.92, 1.05, 0.07, lamp, segments=16)


# --- cars


def car_paint(name, color, spec):
    material, nb = ow.new_material(name)
    pos = nb.position()
    normal_z = nb.separate(nb.new("ShaderNodeNewGeometry").outputs["Normal"])[2]
    dust = nb.map_range(nb.noise(pos, scale=1.2, detail=6.0, roughness=0.6).outputs["Fac"], 0.35, 0.65, 0.15, 0.75)
    dust = nb.mul(dust, nb.map_range(normal_z, 0.3, 0.9, 0.3, 1.0))  # dust settles on top
    rust = nb.map_range(nb.noise(pos, scale=5.0, detail=5.0).outputs["Fac"], 0.66, 0.72, 0.0, 1.0)
    leaves = nb.mul(nb.map_range(nb.voronoi(pos, scale=9.0).outputs["Distance"], 0.2, 0.12, 0.0, 1.0),
                    nb.map_range(nb.noise(pos, scale=0.9).outputs["Fac"], 0.55, 0.65, 0.0, 1.0))
    c = nb.mix(dust, color, (0.55, 0.50, 0.42))
    c = nb.mix(rust, c, (0.30, 0.16, 0.08))
    c = nb.mix(nb.mul(leaves, normal_z), c, (0.40, 0.26, 0.11))
    rough = nb.mixf(dust, 0.25, 0.85)
    nb.output(nb.principled(c, roughness=rough, metallic=nb.mixf(dust, 0.4, 0.0), specular=0.5))
    return material


def car_glass(name, broken=False):
    material, nb = ow.new_material(name)
    pos = nb.position()
    dust = nb.map_range(nb.noise(pos, scale=1.5, detail=5.0).outputs["Fac"], 0.45, 0.75, 0.04, 0.35)
    color = nb.mix(dust, (0.012, 0.014, 0.018), (0.40, 0.37, 0.32))
    if broken:
        cracks = nb.map_range(nb.voronoi(pos, scale=7.0, feature="DISTANCE_TO_EDGE").outputs["Distance"], 0.0, 0.03, 1.0, 0.0)
        color = nb.mix(nb.mul(cracks, 0.8), color, (0.7, 0.72, 0.72))
    nb.output(nb.principled(color, roughness=nb.mixf(dust, 0.12, 0.6), specular=0.22))
    return material


def rounded_box(bm, x0, y0, z0, x1, y1, z1, bevel=0.06, top_inset=(0.0, 0.0, 0.0, 0.0)):
    """Box with bevelled edges; top_inset (front, back, left, right) slants the upper faces inward."""
    geom = bmesh.ops.create_cube(bm, size=1.0)
    verts = geom["verts"]
    for v in verts:
        top = v.co.z > 0
        x = x0 + (v.co.x + 0.5) * (x1 - x0)
        y = y0 + (v.co.y + 0.5) * (y1 - y0)
        if top:
            x = x - top_inset[0] if v.co.x > 0 else x + top_inset[1]
            y = y - top_inset[3] if v.co.y > 0 else y + top_inset[2]
        v.co = Vector((x, y, z0 + (v.co.z + 0.5) * (z1 - z0)))
    edges = list({e for v in verts for e in v.link_edges})
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=2, profile=0.5, affect="EDGES")


def car(spec, w_m, h_m, rng):
    """Abandoned car. Built along +x (front = east); the -v version is rotated to face north."""
    kind = spec["model"]
    paint = car_paint("paint", spec["color"], spec) if kind != "burnt" else textured("burnt", "rust_coarse_01", 0.8, tint=(0.55, 0.45, 0.40), saturation=0.8)
    glass = car_glass("glass", broken=spec.get("broken", False))
    trim = building.noisy_material("trim", (0.08, 0.08, 0.08), roughness=0.6, dirt=0.4)
    charred = ow.flat_material("charred", (0.03, 0.03, 0.03), roughness=0.9)
    lights_front = ow.flat_material("headlight", (0.75, 0.75, 0.70), roughness=0.2)
    lights_rear = ow.flat_material("taillight", (0.45, 0.04, 0.03), roughness=0.3)
    objs = []
    if kind == "van":
        length, width = 3.4, 1.48
        body = bmesh.new()
        rounded_box(body, -length / 2, -width / 2, 0.25, length / 2, width / 2, 1.0, bevel=0.08)
        cabin = bmesh.new()
        rounded_box(cabin, -length / 2 + 0.05, -width / 2 + 0.04, 1.0, length / 2 - 0.25, width / 2 - 0.04, 1.85, bevel=0.06, top_inset=(0.35, 0.02, 0.04, 0.04))
        roof = bmesh.new()
        rounded_box(roof, -length / 2 + 0.07, -width / 2 + 0.1, 1.85, length / 2 - 0.62, width / 2 - 0.1, 1.88, bevel=0.03)
        for k in range(4):  # roof rack
            chunk(roof, (-length / 2 + 0.35 + k * 0.62, 0.0, 1.93), (0.05, width - 0.25, 0.04), 0.0)
        for side in (-1, 1):
            chunk(roof, (-0.25, side * (width / 2 - 0.16), 1.95), (2.1, 0.04, 0.04), 0.0)
    else:
        length, width = 4.3, 1.7
        body = bmesh.new()
        rounded_box(body, -length / 2, -width / 2, 0.25, length / 2, width / 2, 0.9, bevel=0.1, top_inset=(0.1, 0.1, 0.03, 0.03))
        cabin = bmesh.new()
        rounded_box(cabin, -0.95, -width / 2 + 0.08, 0.9, 1.05, width / 2 - 0.08, 1.42, bevel=0.05, top_inset=(0.55, 0.45, 0.1, 0.1))
        roof = bmesh.new()
        rounded_box(roof, -0.45, -width / 2 + 0.2, 1.42, 0.48, width / 2 - 0.2, 1.45, bevel=0.03)
    objs.append(ow.mesh_object("body", body, paint))
    objs.append(ow.mesh_object("cabin", cabin, charred if kind == "burnt" else glass))
    roof_obj = ow.mesh_object("roof", roof, paint)
    objs.append(roof_obj)
    if kind == "burnt":
        roof_obj.location.z -= 0.12  # caved in
        roof_obj.rotation_euler = (0.04, -0.03, 0.0)
    # Bumpers, lights, mirrors.
    bumpers = bmesh.new()
    chunk(bumpers, (length / 2 + 0.02, 0.0, 0.42), (0.12, width - 0.1, 0.2), 0.0)
    chunk(bumpers, (-length / 2 - 0.02, 0.0, 0.42), (0.12, width - 0.1, 0.2), 0.0)
    for side in (-1, 1):
        chunk(bumpers, (0.75 if kind != "van" else length / 2 - 0.35, side * (width / 2 + 0.08), 1.0), (0.12, 0.14, 0.1), 0.0)
    objs.append(ow.mesh_object("trim", bumpers, trim))
    lamps = bmesh.new()
    for side in (-1, 1):
        chunk(lamps, (length / 2 - 0.06, side * (width / 2 - 0.22), 0.72 if kind != "van" else 0.85), (0.12, 0.3, 0.1), 0.0)
    objs.append(ow.mesh_object("headlights", lamps, charred if kind == "burnt" else lights_front))
    rear = bmesh.new()
    for side in (-1, 1):
        chunk(rear, (-length / 2 + 0.05, side * (width / 2 - 0.18), 0.75 if kind != "van" else 0.9), (0.1, 0.24, 0.12), 0.0)
    objs.append(ow.mesh_object("taillights", rear, charred if kind == "burnt" else lights_rear))
    if spec["axis"] == "v":
        for obj in objs:
            obj.matrix_world = Matrix.Rotation(math.pi / 2, 4, "Z") @ obj.matrix_world
    tilt = rng.uniform(-0.03, 0.03)  # flat tyre lean
    for obj in objs:
        obj.matrix_world = Matrix.Rotation(tilt, 4, "X" if spec["axis"] == "h" else "Y") @ obj.matrix_world


# --- trees


LEAF_ATLAS = {"LeafSet014": (3, 2), "LeafSet007": (2, 3)}  # columns, rows of leaves in the atlas


def leaf_material(name, atlas, tint, variation=0.25):
    material, nb = ow.new_material(name)
    uv = nb.uv()
    color = nb.tex(atlas, "color", uv, interpolation="Linear", extension="CLIP")
    alpha = nb.luma(nb.tex(atlas, "opacity", uv, interpolation="Linear", extension="CLIP"))
    attr = nb.new("ShaderNodeVertexColor", layer_name="leaf_tint")
    shade = nb.luma(attr.outputs["Color"])
    color = nb.mix(1.0, color, tint, blend="MULTIPLY")
    color = nb.mix(variation, color, attr.outputs["Color"], blend="MULTIPLY")
    color = nb.mix(1.0, color, nb.map_range(shade, 0.0, 1.0, 0.7, 1.15), blend="MULTIPLY")
    leaf = nb.principled(color, roughness=0.6, specular=0.3)
    translucent = nb.node("ShaderNodeBsdfTranslucent", {"Color": color}).outputs["BSDF"]
    surface = nb.mix_shader(0.25, leaf, translucent)
    nb.output(nb.mix_shader(nb.math("GREATER_THAN", alpha, 0.5), nb.transparent(), surface))
    return material


def leaf_cards(name, material, atlas, clusters, count, rng, size=(0.16, 0.26), palette=None):
    cols, rows = LEAF_ATLAS[atlas]
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")
    color_layer = bm.loops.layers.color.new("leaf_tint")
    total = sum(c[3] for c in clusters)
    for _ in range(count):
        r = rng.random() * total
        for cx, cy, cz, weight, rx, ry, rz in clusters:
            r -= weight
            if r <= 0:
                break
        while True:  # point in the ellipsoid, biased to its outer shell
            p = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1)))
            if 0.35 < p.length <= 1.0:
                break
        center = Vector((cx + p.x * rx, cy + p.y * ry, cz + p.z * rz))
        s = rng.uniform(*size)
        normal = Vector((rng.uniform(-0.6, 0.6), rng.uniform(-0.6, 0.6), rng.uniform(0.3, 1.0))).normalized()
        tangent = normal.cross(Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0.01))).normalized()
        bitangent = normal.cross(tangent)
        corners = [center + (tangent * a + bitangent * b) * s for a, b in ((-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5))]
        face = bm.faces.new([bm.verts.new(c) for c in corners])
        col, row = rng.randrange(cols), rng.randrange(rows)
        u0, v0 = col / cols, row / rows
        tint = palette[rng.randrange(len(palette))] if palette else (1.0, 1.0, 1.0)
        shade = rng.uniform(0.75, 1.0)
        for loop, (a, b) in zip(face.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
            loop[uv_layer].uv = (u0 + a / cols, v0 + b / rows)
            loop[color_layer] = (tint[0] * shade, tint[1] * shade, tint[2] * shade, 1.0)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    mesh.materials.append(material)
    return obj


def branches(name, rng, trunk_height, spread, levels, material, base_radius=0.14):
    """Recursive branch skeleton (visible on the bare tree)."""
    def grow(start, direction, length, radius, level, index):
        end = start + direction * length
        building.beam(f"{name}_{level}_{index}_{rng.randrange(10 ** 6)}", start, end, radius * 2, material)
        if level >= levels:
            return [end]
        tips = []
        for k in range(rng.randint(2, 3)):
            turn = Matrix.Rotation(rng.uniform(-0.9, 0.9), 3, "Z") @ Matrix.Rotation(rng.uniform(0.2, 0.6), 3, "X")
            new_dir = (turn @ direction).normalized()
            new_dir.z = max(0.15, new_dir.z * 0.7)
            new_dir.normalize()
            tips += grow(end, new_dir, length * rng.uniform(0.55, 0.75), radius * 0.6, level + 1, k)
        return tips

    trunk_top = Vector((0.0, 0.0, trunk_height))
    building.beam(f"{name}_trunk", Vector((0.0, 0.0, 0.0)), trunk_top, base_radius * 2.4, material)
    tips = []
    for k in range(rng.randint(4, 6)):
        a = 2 * math.pi * k / 5 + rng.uniform(-0.4, 0.4)
        direction = Vector((math.cos(a), math.sin(a), rng.uniform(0.5, 1.0))).normalized()
        tips += grow(trunk_top, direction, spread * rng.uniform(0.45, 0.6), base_radius, 1, k)
    return tips


def tree(spec, w_m, h_m, rng):
    style = spec["style"]
    bark_mat, nb = ow.new_material("bark")
    nb.output(nb.principled(nb.mix(1.0, nb.hsv(nb.tex("bark_brown_01", "color", tex_vec(nb, 1.0)), saturation=0.5), (0.55, 0.52, 0.5), blend="MULTIPLY"), roughness=0.9))
    radius = min(w_m, h_m) * 0.43
    if style == "dead":
        tips = branches("branch", rng, 2.6, radius * 1.05, 3, bark_mat, base_radius=0.09)
        leaves = leaf_material("dry_leaves", "LeafSet007", (0.62, 0.42, 0.22), variation=0.35)
        clusters = [(t.x, t.y, t.z, 1.0, 0.35, 0.35, 0.25) for t in tips]
        leaf_cards("leaves", leaves, "LeafSet007", clusters, 500, rng, size=(0.12, 0.2),
                   palette=[(0.75, 0.55, 0.35), (0.55, 0.38, 0.22), (0.85, 0.7, 0.45)])
        return
    branches("branch", rng, 2.8, radius * 0.8, 2, bark_mat, base_radius=0.15)
    clusters = [(0.0, 0.0, 5.4, 2.0, radius * 0.75, radius * 0.75, 1.3)]
    for k in range(6):
        a = 2 * math.pi * k / 6 + rng.uniform(-0.3, 0.3)
        d = radius * rng.uniform(0.45, 0.6)
        clusters.append((math.cos(a) * d, math.sin(a) * d, rng.uniform(4.6, 5.6), 1.0, radius * 0.45, radius * 0.45, 0.9))
    if style == "green":
        leaves = leaf_material("leaves", "LeafSet014", (0.62, 0.78, 0.48), variation=0.3)
        leaf_cards("leaves", leaves, "LeafSet014", clusters, 5200, rng, size=(0.16, 0.26),
                   palette=[(0.9, 1.0, 0.8), (0.75, 0.9, 0.6), (1.0, 1.0, 0.7), (0.85, 0.75, 0.45)])
    else:  # autumn: yellow and orange, thinner, branches show through
        leaves = leaf_material("leaves", "LeafSet007", (0.72, 0.48, 0.28), variation=0.5)
        leaf_cards("leaves", leaves, "LeafSet007", clusters, 3400, rng, size=(0.16, 0.26),
                   palette=[(1.0, 0.85, 0.55), (0.95, 0.55, 0.3), (0.7, 0.42, 0.22), (0.85, 0.8, 0.5), (0.55, 0.6, 0.3)])


def lamp(spec, w_m, h_m, rng):
    """Cobra-head luminaire seen from above; the arm runs off to the left (west, towards the pole)."""
    housing_mat = building.noisy_material("housing", (0.48, 0.49, 0.48), roughness=0.4, metallic=0.3, dirt=0.5, scale=6.0)
    bm = bmesh.new()
    rounded_box(bm, -0.36, -0.15, 0.0, 0.36, 0.15, 0.14, bevel=0.06, top_inset=(0.12, 0.0, 0.04, 0.04))
    ow.mesh_object("housing", bm, housing_mat)
    arm = building.noisy_material("arm", (0.40, 0.41, 0.40), roughness=0.5, metallic=0.4, dirt=0.4)
    ow.cylinder("arm", 0.0, 0.07, -w_m / 2 + 0.08, -0.3, 0.035, arm, segments=12, axis="X")  # stub towards the pole
    grime = ow.flat_material("bird_grime", (0.75, 0.74, 0.70), roughness=0.9)
    ow.plane_xy("grime", -0.1, -0.06, 0.05, 0.03, 0.141, grime)


# ---------------------------------------------------------------------------
# Catalogue. size: image (px); footprint: the prop itself (px), for placement and collision later.

PROPS = {
    "ow-prop-manhole": {"size": (72, 72), "footprint": (64, 64), "build": manhole, "decal": True},
    "ow-prop-drain": {"size": (48, 96), "footprint": (36, 88), "build": drain, "decal": True},
    "ow-prop-puddle-a": {"size": (192, 144), "footprint": (160, 116), "build": puddle, "decal": True, "samples": 256, "water": True},
    "ow-prop-puddle-b": {"size": (320, 224), "footprint": (270, 180), "build": puddle, "decal": True, "samples": 256, "water": True},
    "ow-prop-puddle-c": {"size": (448, 288), "footprint": (380, 240), "build": puddle, "decal": True, "samples": 256, "water": True},
    "ow-prop-crack-a": {"size": (256, 256), "footprint": (236, 236), "build": crack, "decal": True, "style": "branch"},
    "ow-prop-crack-b": {"size": (384, 384), "footprint": (350, 350), "build": crack, "decal": True, "style": "alligator"},
    "ow-prop-crack-c": {"size": (512, 512), "footprint": (440, 440), "build": sinkhole, "decal": True},
    "ow-prop-debris-a": {"size": (96, 96), "footprint": (80, 80), "build": debris_small},
    "ow-prop-debris-b": {"size": (160, 160), "footprint": (140, 140), "build": debris_glass},
    "ow-prop-debris-c": {"size": (192, 128), "footprint": (176, 104), "build": debris_sign},
    "ow-prop-debris-d": {"size": (256, 256), "footprint": (224, 224), "build": debris_large},
    "ow-prop-trash": {"size": (96, 96), "footprint": (80, 76), "build": trash},
    "ow-prop-barricade-h": {"size": (176, 56), "footprint": (148, 32), "build": barricade, "axis": "h"},
    "ow-prop-barricade-v": {"size": (56, 176), "footprint": (32, 148), "build": barricade, "axis": "v"},
    "ow-prop-car-a-h": {"size": (196, 92), "footprint": (172, 68), "build": car, "axis": "h", "model": "sedan", "color": (0.62, 0.63, 0.62)},
    "ow-prop-car-a-v": {"size": (92, 196), "footprint": (68, 172), "build": car, "axis": "v", "model": "sedan", "color": (0.62, 0.63, 0.62)},
    "ow-prop-car-b-h": {"size": (196, 92), "footprint": (136, 60), "build": car, "axis": "h", "model": "van", "color": (0.42, 0.55, 0.62), "broken": True},
    "ow-prop-car-b-v": {"size": (92, 196), "footprint": (60, 136), "build": car, "axis": "v", "model": "van", "color": (0.42, 0.55, 0.62), "broken": True},
    "ow-prop-car-c-h": {"size": (196, 92), "footprint": (172, 68), "build": car, "axis": "h", "model": "burnt", "color": (0.2, 0.2, 0.2)},
    "ow-prop-car-c-v": {"size": (92, 196), "footprint": (68, 172), "build": car, "axis": "v", "model": "burnt", "color": (0.2, 0.2, 0.2)},
    "ow-prop-tree-a": {"size": (192, 192), "footprint": (176, 176), "build": tree, "style": "green", "bounces": 64},
    "ow-prop-tree-b": {"size": (224, 224), "footprint": (204, 204), "build": tree, "style": "autumn", "bounces": 64},
    "ow-prop-tree-c": {"size": (256, 256), "footprint": (236, 236), "build": tree, "style": "dead", "bounces": 64},
    "ow-prop-lamp": {"size": (48, 48), "footprint": (30, 14), "build": lamp, "catcher": False},
}


def keys():
    return list(PROPS)


def build(key, out_root, samples_scale=1.0):
    spec = dict(PROPS[key])
    spec.setdefault("seed", 40 + list(PROPS).index(key))
    width, height = spec["size"]
    samples = max(16, int(spec.get("samples", 128) * samples_scale))
    decal = spec.get("decal", False)
    scene, w_m, h_m = prop_scene(width, height, samples, sun=not decal, catcher=not decal and spec.get("catcher", True),
                                 transparent_bounces=spec.get("bounces", 16))
    rng = random.Random(spec["seed"])
    spec["key"] = key
    renderer = spec["build"](spec, w_m, h_m, rng)
    rel = f"props/{key}.png"
    if callable(renderer):  # props with their own render passes (puddles)
        renderer(scene, os.path.join(out_root, rel))
    elif "shadow_catcher" in scene.objects:
        render_with_contact_shadow(scene, os.path.join(out_root, rel))
    else:
        ow.render_still(scene, os.path.join(out_root, rel), "PNG", rgba=True)
    ow.save_blend(os.path.join(ow.WORK_DIR, f"{key}.blend"))
    entry = {"key": key, "type": "prop", "file": rel, "width": width, "height": height,
             "origin": [0.5, 0.5], "footprint": list(spec["footprint"]), "decal": decal}
    if spec.get("water"):
        entry["water"] = f"props/{key}_water.png"  # open-water mask for reflections (same size and origin)
    return [entry]
