"""R1 style test for the REGALIA BASTION kit (docs/regalia-kit-design.md 11 and 12).

Renders five sample images for art-direction review only (not game assets yet):
  r1-shield        Aegis Wall shield planted in the ground   (oblique, like the mech sprites)
  r1-crack         ground crack under a planted shield        (top-down, like ground decals)
  r1-pulse         one Counter Pulse ring frame               (top-down, emission on black)
  r1-icon-aegis    Aegis Wall skill icon
  r1-icon-pulse    Counter Pulse skill icon

V1 (2026-10-14, the counter wave made distinct; docs/regalia-kit-design.md 12.5):
  v1-counter-ring    the counter wave's ring in REGALIA gold  (top-down, emission on black)
  v1-counter-emblem  REGALIA's crest flashing on the ground   (top-down, emission on black)

V2 (2026-10-14, Counter Pulse's guard shields; docs/regalia-kit-design.md 12.6):
  v2-guard-<facing>  a small shield orbiting the mech: se / s / sw, so its cross always shows
                     (the Aegis Wall shield without rubble, its tip not buried: it hovers)

Every image except the pulse rings and the emblem also gets "<name>_emit.png" with only its
glowing parts; make_r1_mock.py turns that into the glow and writes the review sheets
(make_v1_counter.py for V1).

  & "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" --background --factory-startup `
      --python tools/blender/regalia_kit/build_r1.py -- --out tools/blender/regalia_kit/preview

Conventions follow tools/blender/openworld/ow_common.py (Standard view transform, 1 m = 40 game
px, sun from the north-west) but R1 renders at 2x (1 m = 80 px) so the review can zoom in.
Seeds are fixed, so the same Blender version draws the same images.
"""

import json
import math
import os
import random
import sys

import bmesh
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.dont_write_bytecode = True  # no __pycache__ in tools/blender/openworld
sys.path.insert(0, os.path.join(HERE, "..", "openworld"))
import ow_common as ow  # noqa: E402

PX_PER_M = 80.0  # 2x the game scale (ow_common.PX_PER_M = 40)


def srgb(hex_code):
    hex_code = hex_code.lstrip("#")
    return tuple(ow.srgb_to_linear(int(hex_code[i:i + 2], 16) / 255.0) for i in (0, 2, 4)) + (1.0,)


# Sampled from 画像/player/ALM-01_REGALIA_BASTION/ALM_000.png and the cannon impact frames.
PALETTE = {
    "ivory": "#ece4d6",
    "gold": "#f0c574",
    "navy": "#1b2250",
    "stone": "#6e6872",
    "crack": "#151018",
    "crater": "#2a2530",
    "energy": "#9fd2ff",       # periwinkle-cyan of the cannon energy
    "energy_core": "#e8f8ff",
    "aura_gold": "#ffd86b",    # cannon auraTint
    "pulse": "#8fa0f0",
    "counter_core": "#fff3d0",  # warm white edge of the gold counter ring
    "counter_band": "#e0a43c",  # deep gold inside the band
}


# ---------------------------------------------------------------------------
# Scene, world, lights, cameras


def setup_scene(width, height, samples=96, transparent=True):
    scene = ow.reset_scene()
    ow.setup_render(scene, width, height, samples=samples, transparent=transparent)
    return scene


def setup_world(scene, strength=0.85, black=False):
    """White sky above the horizon and dark below, so metal has something dark to reflect.
    The background node is named "Background" so render_emit can switch it off."""
    world = bpy.data.worlds.new("rk_world")
    scene.world = world
    tree = world.node_tree
    tree.nodes.clear()
    background = tree.nodes.new("ShaderNodeBackground")
    background.name = "Background"
    output = tree.nodes.new("ShaderNodeOutputWorld")
    tree.links.new(background.outputs["Background"], output.inputs["Surface"])
    if black:
        background.inputs["Color"].default_value = (0.0, 0.0, 0.0, 1.0)
        background.inputs["Strength"].default_value = 0.0
        return world
    background.inputs["Strength"].default_value = strength
    coord = tree.nodes.new("ShaderNodeTexCoord")
    separate = tree.nodes.new("ShaderNodeSeparateXYZ")
    remap = tree.nodes.new("ShaderNodeMapRange")
    remap.inputs["From Min"].default_value = -1.0
    remap.inputs["From Max"].default_value = 1.0
    ramp = tree.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.40
    ramp.color_ramp.elements[0].color = srgb("#7a6a58")  # warm ground, so gold stays gold
    ramp.color_ramp.elements[1].position = 0.56
    ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)
    tree.links.new(coord.outputs["Generated"], separate.inputs["Vector"])
    tree.links.new(separate.outputs["Z"], remap.inputs["Value"])
    tree.links.new(remap.outputs["Result"], ramp.inputs["Fac"])
    tree.links.new(ramp.outputs["Color"], background.inputs["Color"])
    return world


def add_sprite_lights(scene):
    """Mech-sprite lighting: front-left key (the painted sprites are lit from the upper left),
    the world's north-west sun as a rim, and a weak south fill (as ow_building.FACADE_FILL)."""
    ow.add_directional_light(scene, "rk_key", 2.2, 215.0, 38.0, 6.0)
    ow.add_directional_light(scene, "rk_rim", 1.6, 315.0, 50.0, 3.0)
    ow.add_directional_light(scene, "rk_fill", 0.5, 180.0, 20.0, 45.0)


def ortho_camera(scene, target, width_m, elevation_deg):
    """Ortho camera looking north and down by elevation_deg (0 = straight at a south face)."""
    data = bpy.data.cameras.new("rk_cam")
    data.type = "ORTHO"
    data.sensor_fit = "HORIZONTAL"
    data.ortho_scale = width_m
    data.clip_start = 0.1
    data.clip_end = 400.0
    cam = bpy.data.objects.new("rk_cam", data)
    scene.collection.objects.link(cam)
    el = math.radians(elevation_deg)
    direction = Vector((0.0, math.cos(el), -math.sin(el)))
    cam.location = Vector(target) - direction * 100.0
    cam.rotation_euler = (math.radians(90.0) - el, 0.0, 0.0)
    scene.camera = cam
    return cam


def top_camera(scene, width_m):
    return ow.add_ortho_camera_top(scene, -width_m / 2.0, -width_m / 2.0, width_m, width_m)


def pixel_of(scene, point):
    co = world_to_camera_view(scene, scene.camera, Vector(point))
    return [round(co.x * scene.render.resolution_x, 1), round((1.0 - co.y) * scene.render.resolution_y, 1)]


# ---------------------------------------------------------------------------
# Materials. Emission materials are listed in EMISSIVE so render_emit keeps them.

EMISSIVE = set()


def principled(name, color, roughness=0.5, metallic=0.0, coat=0.0, wear=0.0):
    """wear > 0 adds fine hammered noise (bump and roughness variation) so large plates do not
    look like flat vector shapes next to the painted mech."""
    material, nb = ow.new_material(name)
    normal = rough = None
    if wear:
        noise = nb.noise(nb.node("ShaderNodeTexCoord").outputs["Object"], scale=18.0, detail=8.0, roughness=0.62)
        noise = noise.outputs["Fac"] if hasattr(noise, "outputs") else noise
        normal = nb.bump(noise, strength=wear, distance=0.01)
        rough = nb.map_range(noise, 0.35, 0.65, roughness * 0.8, roughness * 1.35)
    bsdf = nb.principled(srgb(color), roughness=rough if rough is not None else roughness, metallic=metallic, normal=normal)
    if coat:
        nb.set(bsdf.node, "Coat Weight", coat)
        nb.set(bsdf.node, "Coat Roughness", 0.15)
    nb.output(bsdf)
    return material


def emission(name, color, strength):
    material = ow.emission_material(name, srgb(color), strength)
    EMISSIVE.add(material.name)
    return material


def holdout(name="rk_holdout"):
    material, nb = ow.new_material(name)
    nb.output(nb.holdout())
    return material


def materials():
    return {
        "ivory": principled("rk_ivory", PALETTE["ivory"], roughness=0.34, coat=0.35, wear=0.06),
        "gold": principled("rk_gold", PALETTE["gold"], roughness=0.3, metallic=1.0, wear=0.12),
        "navy": principled("rk_navy", PALETTE["navy"], roughness=0.42, metallic=0.25),
        "stone": principled("rk_stone", PALETTE["stone"], roughness=0.9),
        "steel": principled("rk_steel", "#3a3644", roughness=0.35, metallic=0.85, wear=0.08),
        "crack": principled("rk_crack", PALETTE["crack"], roughness=0.95),
        # Standard view transform clips at 1.0, so coloured glows stay near strength 1 and the
        # bloom comes from the emit pass in make_r1_mock.py.
        "seam": emission("rk_seam", PALETTE["energy"], 1.4),
        "gem": emission("rk_gem", PALETTE["energy_core"], 3.0),
        "ember": emission("rk_ember", PALETTE["aura_gold"], 1.5),
    }


def render_emit(scene, path):
    """Same camera, only the emission materials: everything else becomes holdout, lights and
    the world are off. Restores the scene afterwards."""
    cut = holdout("rk_emit_holdout")
    saved = {}
    for obj in scene.objects:
        if obj.type != "MESH":
            continue
        saved[obj.name] = [slot.material for slot in obj.material_slots]
        for slot in obj.material_slots:
            if slot.material is None or slot.material.name not in EMISSIVE:
                slot.material = cut
    lights = [obj for obj in scene.objects if obj.type == "LIGHT" and not obj.hide_render]
    for obj in lights:
        obj.hide_render = True
    strength = scene.world.node_tree.nodes["Background"].inputs["Strength"]
    saved_strength, strength.default_value = strength.default_value, 0.0
    saved_catchers = [obj for obj in scene.objects if getattr(obj, "is_shadow_catcher", False)]
    for obj in saved_catchers:
        obj.hide_render = True
    ow.render_still(scene, path, "PNG", rgba=True)
    for obj in saved_catchers:
        obj.hide_render = False
    strength.default_value = saved_strength
    for obj in lights:
        obj.hide_render = False
    for obj in scene.objects:
        if obj.name in saved:
            for slot, material in zip(obj.material_slots, saved[obj.name]):
                slot.material = material
    return path


def render_pair(scene, out_dir, name):
    ow.render_still(scene, os.path.join(out_dir, f"{name}.png"), "PNG", rgba=True)
    render_emit(scene, os.path.join(out_dir, f"{name}_emit.png"))


# ---------------------------------------------------------------------------
# Geometry


def new_object(name, bm, mats, smooth=False, bevel=None):
    bm.normal_update()
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for material in mats:
        mesh.materials.append(material)
    if smooth:
        for poly in mesh.polygons:
            poly.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    if bevel:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
        mod.angle_limit = math.radians(35.0)
    return obj


SHIELD = {"half": 1.0, "top": 2.55, "crest": 0.16, "shoulder": 1.35, "bulge": 0.14, "thickness": 0.22}
TIP_SLOPE = 1.483  # tip sits this many half-widths below the shoulder (arcs of radius 1.6 h at -0.6 h)


def heater_outline(inset=0.0, samples=24):
    """Heater-shield outline (x, z) shrunk by `inset` m, counter-clockwise seen from -Y.
    Two circular arcs meet at the pointed tip, like a heraldic heater shield. Inner layers use
    the same formula with a smaller half width, so they never self-intersect at the tip."""
    s = SHIELD
    half = s["half"] - inset
    top = s["top"] - inset
    crest = s["crest"] * half / s["half"]
    tip_z = s["shoulder"] - TIP_SLOPE * s["half"] + inset * 1.9  # the tip angle needs ~1.9x the inset
    shoulder = tip_z + TIP_SLOPE * half
    cx, radius = -0.6 * half, 1.6 * half
    a1 = math.atan2(tip_z - shoulder, -cx)
    right = [(cx + radius * math.cos(a1 * i / samples), shoulder + radius * math.sin(a1 * i / samples))
             for i in range(samples + 1)]  # right shoulder -> tip
    pts = list(reversed(right))  # tip -> right shoulder
    side = max(2, int(samples * (top - shoulder) / 1.2))
    pts += [(half, shoulder + (top - shoulder) * i / side) for i in range(1, side)]
    for i in range(samples + 1):  # crest, right to left
        x = half - 2.0 * half * i / samples
        pts.append((x, top + crest * (1.0 - (x / half) ** 2)))
    pts += [(-half, top - (top - shoulder) * i / side) for i in range(1, side)]
    pts += [(-x, z) for (x, z) in right][:-1]  # left shoulder -> tip (tip already first)
    return pts


def cross_pattee(arm=0.42, root=0.06, flare=0.17):
    """Cross pattée (flared arms), like the emblem on the REGALIA tabard. (x, z) around 0, CCW."""
    pts = []
    for k in range(4):
        a = math.pi / 2.0 * k
        c, s = math.cos(a), math.sin(a)
        for (u, v) in ((root, -root), (arm, -flare), (arm, flare)):
            pts.append((u * c - v * s, u * s + v * c))
    return pts


def bulge(x):
    """Horizontal curvature of the shield face (towards the camera, -Y)."""
    return SHIELD["bulge"] * (1.0 - min(1.0, (x / SHIELD["half"]) ** 2))


def solid_from_outline(bm, outline, y_front, depth, front_mat=0, side_mat=0):
    """Flat prism: front face at y_front facing -Y, back face at y_front + depth."""
    front = [bm.verts.new((x, y_front, z)) for (x, z) in outline]
    back = [bm.verts.new((x, y_front + depth, z)) for (x, z) in outline]
    face = bm.faces.new(front)
    face.material_index = front_mat
    bm.faces.new(list(reversed(back))).material_index = side_mat
    n = len(outline)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], back[i], back[j], front[j])).material_index = side_mat
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return face


def curved_layer(name, loops, y_front, thickness, material, curve=True, bevel=0.0):
    """A plate following the shield curvature. `loops` is the outer outline, optionally followed
    by hole outlines (a ring). The face is triangulated and subdivided so it can bend, then
    Solidify gives it thickness and Edge Split keeps the rims sharp with a smooth face."""
    bm = bmesh.new()
    edges = []
    for loop in loops:
        verts = [bm.verts.new((x, 0.0, z)) for (x, z) in loop]
        edges += [bm.edges.new((verts[i], verts[(i + 1) % len(verts)])) for i in range(len(verts))]
    bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=edges)
    if curve:
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2, use_grid_fill=True)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
    for v in bm.verts:
        v.co.y = y_front - (bulge(v.co.x) if curve else 0.0)
    bm.normal_update()
    for f in bm.faces:
        if f.normal.y > 0:
            f.normal_flip()
    obj = new_object(name, bm, [material], smooth=True)
    solidify = obj.modifiers.new("solidify", "SOLIDIFY")
    solidify.thickness = thickness
    solidify.offset = -1.0  # behind the face (+Y)
    solidify.use_even_offset = True
    if bevel:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
        mod.angle_limit = math.radians(50.0)
    split = obj.modifiers.new("edge_split", "EDGE_SPLIT")
    split.split_angle = math.radians(40.0)
    return obj


def box_between(name, start, end, width, material):
    """A square beam from start to end (local coordinates)."""
    start, end = Vector(start), Vector(end)
    length = (end - start).length
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * width, v.co.y * width, (v.co.z + 0.5) * length))
    rotation = (end - start).to_track_quat("Z", "Y").to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation(start) @ rotation, verts=bm.verts[:])
    return new_object(name, bm, [material], bevel=0.008)


def build_shield_back(mats, name, ground_z):
    """Back of the shield for the north and side views of the wall (R2b): a navy back plate,
    a gold cross of braces and a steel kickstand driven into the ground behind it."""
    objects = []
    back = SHIELD["thickness"]
    objects.append(curved_layer(f"{name}_backplate", [heater_outline(0.14)], back + 0.02, 0.02, mats["navy"], bevel=0.006))
    rect = lambda x0, z0, x1, z1: [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]  # noqa: E731
    for key, outline in (("strut", rect(-0.08, 0.35, 0.08, 2.4)), ("brace_low", rect(-0.66, 0.92, 0.66, 1.04)),
                         ("brace_high", rect(-0.82, 1.92, 0.82, 2.04))):
        objects.append(curved_layer(f"{name}_{key}", [outline], back + 0.08, 0.06, mats["gold"], bevel=0.006))
    top = (0.0, back + 0.1 - bulge(0.0), 1.55)
    foot = (0.0, back + 0.95, ground_z - 0.12)
    objects.append(box_between(f"{name}_kickstand", top, foot, 0.1, mats["steel"]))
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * 0.32, v.co.y * 0.26, v.co.z * 0.05)) + Vector((foot[0], foot[1] - 0.05, ground_z + 0.02))
    objects.append(new_object(f"{name}_foot", bm, [mats["gold"]], bevel=0.01))
    return objects


def build_shield(mats, origin=(0.0, 0.0, 0.0), rotation_z=0.0, scale=1.0, ground=0.2, name="aegis", back=False):
    """One Aegis Wall shield whose pointed tip is buried `ground` m below z = 0 at origin.
    Layers from back to front: gold base (the rim), ivory field, gold inlay line, glowing seam,
    navy panel, gold cross with a gem. Every layer follows the same curvature. back=True adds the
    back plate, braces and kickstand seen when the wall faces away from the camera."""
    objects = []
    tip_z = SHIELD["shoulder"] - TIP_SLOPE * SHIELD["half"]
    lift = -ground - tip_z
    if back:
        objects.extend(build_shield_back(mats, name, -lift))
    layers = [
        ("base", [heater_outline(0.0)], 0.0, SHIELD["thickness"], mats["gold"], 0.02),
        ("field", [heater_outline(0.12)], -0.03, 0.03, mats["ivory"], 0.012),
        ("inlay", [heater_outline(0.235), heater_outline(0.26)], -0.036, 0.008, mats["gold"], 0.0),
        ("seam", [heater_outline(0.40)], -0.042, 0.012, mats["seam"], 0.0),
        ("panel", [heater_outline(0.435)], -0.055, 0.015, mats["navy"], 0.008),
    ]
    for key, loops, y_front, thickness, material, bevel in layers:
        objects.append(curved_layer(f"{name}_{key}", loops, y_front, thickness, material, bevel=bevel))

    emblem_z = 1.5
    bm = bmesh.new()
    solid_from_outline(bm, [(x, z + emblem_z) for (x, z) in cross_pattee()], -0.07 - bulge(0.0), 0.02)
    objects.append(new_object(f"{name}_cross", bm, [mats["gold"]], bevel=0.008))
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=0.07)
    for v in bm.verts:
        v.co += Vector((0.0, -0.085 - bulge(0.0), emblem_z))
    objects.append(new_object(f"{name}_gem", bm, [mats["gem"]], smooth=True))

    # crown spikes on the crest (the mech's crown motif), and rivets around the rim
    for (x, height, radius) in ((0.0, 0.5, 0.1), (-0.55, 0.32, 0.075), (0.55, 0.32, 0.075)):
        z0 = SHIELD["top"] + SHIELD["crest"] * (1.0 - x ** 2) - 0.04
        y = SHIELD["thickness"] / 2.0 - bulge(x)
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=radius, radius2=0.0, depth=height)
        for v in bm.verts:
            v.co += Vector((x, y, z0 + height / 2.0))
        objects.append(new_object(f"{name}_spike", bm, [mats["gold"]], smooth=True))
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=radius * 1.3)
        for v in bm.verts:
            v.co += Vector((x, y, z0))
        objects.append(new_object(f"{name}_spike_base", bm, [mats["gold"]], smooth=True))
    for i, (x, z) in enumerate(heater_outline(0.06)[::6]):
        if z + lift < 0.1:
            continue
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=0.026)
        for v in bm.verts:
            v.co += Vector((x, -0.005 - bulge(x), z))
        objects.append(new_object(f"{name}_rivet{i}", bm, [mats["gold"]], smooth=True))

    matrix = (Matrix.Translation(Vector(origin)) @ Matrix.Rotation(rotation_z, 4, "Z") @ Matrix.Scale(scale, 4)
              @ Matrix.Translation(Vector((0.0, 0.0, lift))))
    for obj in objects:
        obj.matrix_world = matrix @ obj.matrix_world
    return objects


def add_rubble(mats, rng, count, r_min, r_max, size, name, center=(0.0, 0.0)):
    for i in range(count):
        angle = rng.uniform(0.0, math.tau)
        dist = rng.uniform(r_min, r_max)
        radius = rng.uniform(*size)
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=radius)
        sx, sy, sz = rng.uniform(0.7, 1.3), rng.uniform(0.7, 1.3), rng.uniform(0.45, 0.9)
        for v in bm.verts:
            v.co = Vector((v.co.x * sx + center[0] + math.cos(angle) * dist,
                           v.co.y * sy + center[1] + math.sin(angle) * dist,
                           v.co.z * sz + radius * 0.25))
        new_object(f"{name}{i}", bm, [mats["ivory"] if i % 5 == 0 else mats["stone"]])


def ribbon(name, pts, w0, w1, z, material):
    bm = bmesh.new()
    left, right = [], []
    for i, (x, y) in enumerate(pts):
        nx_, ny_ = pts[min(i + 1, len(pts) - 1)]
        px_, py_ = pts[max(i - 1, 0)]
        dx, dy = nx_ - px_, ny_ - py_
        length = math.hypot(dx, dy) or 1.0
        ox, oy = -dy / length, dx / length
        w = w0 + (w1 - w0) * i / max(1, len(pts) - 1)
        left.append(bm.verts.new((x + ox * w / 2, y + oy * w / 2, z)))
        right.append(bm.verts.new((x - ox * w / 2, y - oy * w / 2, z)))
    for i in range(len(pts) - 1):
        bm.faces.new((left[i], right[i], right[i + 1], left[i + 1]))
    return new_object(name, bm, [material])


def crack_paths(rng, count=8):
    paths = []
    for i in range(count):
        angle = math.tau * i / count + rng.uniform(-0.25, 0.25)
        length = rng.uniform(0.95, 1.4)
        pts = [(0.0, 0.0)]
        for s in range(1, 10):
            angle += rng.uniform(-0.28, 0.28)
            r = length * s / 9
            pts.append((math.cos(angle) * r, math.sin(angle) * r))
        paths.append(pts)
        if rng.random() < 0.7:
            bx, by = pts[rng.randint(3, 6)]
            b_angle = angle + rng.choice((-1, 1)) * rng.uniform(0.5, 0.9)
            branch = [(bx, by)]
            for s in range(1, 5):
                b_angle += rng.uniform(-0.25, 0.25)
                branch.append((bx + math.cos(b_angle) * 0.12 * s, by + math.sin(b_angle) * 0.12 * s))
            paths.append(branch)
    return paths


def flat_ring(name, radius, width, axis, offset, material, segments=128):
    """Annulus in the XY plane (axis "Z", at z = offset) or XZ plane (axis "Y", at y = offset)."""
    bm = bmesh.new()
    inner, outer = [], []
    for i in range(segments):
        a = math.tau * i / segments
        c, s = math.cos(a), math.sin(a)
        if axis == "Z":
            inner.append(bm.verts.new((c * (radius - width), s * (radius - width), offset)))
            outer.append(bm.verts.new((c * (radius + width), s * (radius + width), offset)))
        else:
            inner.append(bm.verts.new((c * (radius - width), offset, s * (radius - width))))
            outer.append(bm.verts.new((c * (radius + width), offset, s * (radius + width))))
    for i in range(segments):
        j = (i + 1) % segments
        bm.faces.new((inner[i], outer[i], outer[j], inner[j]))
    return new_object(name, bm, [material])


# ---------------------------------------------------------------------------
# Assets


def asset_shield(out_dir):
    width, height = 256, 320
    scene = setup_scene(width, height)
    setup_world(scene)
    add_sprite_lights(scene)
    mats = materials()
    build_shield(mats)
    add_rubble(mats, random.Random(11), 10, 0.15, 0.75, (0.05, 0.11), "rk_base_rubble")
    ow.plane_xy("rk_ground", -3.0, -3.0, 3.0, 3.0, 0.0, holdout())  # hides the buried tip
    ortho_camera(scene, (0.0, 0.0, 1.45), width / PX_PER_M, 20.0)
    render_pair(scene, out_dir, "r1-shield")
    return {"size": [width, height], "pivot": pixel_of(scene, (0.0, 0.0, 0.0)),
            "camera": "ortho, looking north, 20 deg down", "px_per_m": PX_PER_M}


# R2b: the wall faces one of 8 directions. Screen angle (y down, 0 = east, 90 = south) per name.
SHIELD_DIRECTIONS = (("e", 0), ("se", 45), ("s", 90), ("sw", 135), ("w", 180), ("nw", 225), ("n", 270), ("ne", 315))


def asset_shield_dirs(out_dir):
    """The shield facing each of the 8 directions, with its back. Same camera and lights as the
    R1 shield, so the world light stays in the north-west for every direction (no mirroring)."""
    width, height = 256, 320
    result = {}
    for name, degrees in SHIELD_DIRECTIONS:
        scene = setup_scene(width, height)
        setup_world(scene)
        add_sprite_lights(scene)
        mats = materials()
        screen = math.radians(degrees)
        # the front normal starts at -Y (south); turn it to the world direction (cos a, -sin a)
        yaw = math.atan2(-math.sin(screen), math.cos(screen)) + math.pi / 2.0
        build_shield(mats, rotation_z=yaw, back=True, name=f"aegis_{name}")
        add_rubble(mats, random.Random(11), 10, 0.15, 0.75, (0.05, 0.11), "rk_base_rubble")
        ow.plane_xy("rk_ground", -3.0, -3.0, 3.0, 3.0, 0.0, holdout())
        ortho_camera(scene, (0.0, 0.0, 1.45), width / PX_PER_M, 20.0)
        render_pair(scene, out_dir, f"r2-shield-{name}")
        result[name] = {"size": [width, height], "pivot": pixel_of(scene, (0.0, 0.0, 0.0)), "screen_angle_deg": degrees}
    return result


# V2: a guard shield on the east side of the orbit turns south-east, on the west side south-west, and
# faces the camera in between. Facing outwards would leave the east / west ones edge-on and the north
# ones showing their backs, and the player needs to count them at a glance.
GUARD_FACINGS = (("se", 45), ("s", 90), ("sw", 135))


def asset_guard_dirs(out_dir):
    """V2: the guard shield in each of its three facings. Same shield, camera and lights as the R2
    wall, but hovering: no rubble, no ground, the tip at z = 0 (the pivot)."""
    width, height = 256, 320
    result = {}
    for name, degrees in GUARD_FACINGS:
        scene = setup_scene(width, height)
        setup_world(scene)
        add_sprite_lights(scene)
        mats = materials()
        screen = math.radians(degrees)
        yaw = math.atan2(-math.sin(screen), math.cos(screen)) + math.pi / 2.0
        build_shield(mats, rotation_z=yaw, ground=0.0, name=f"guard_{name}")
        ortho_camera(scene, (0.0, 0.0, 1.65), width / PX_PER_M, 20.0)
        render_pair(scene, out_dir, f"v2-guard-{name}")
        result[name] = {"size": [width, height], "pivot": pixel_of(scene, (0.0, 0.0, 0.0)), "screen_angle_deg": degrees}
    return result


def asset_crack(out_dir):
    size = 256
    scene = setup_scene(size, size)
    setup_world(scene, strength=1.0)
    ow.add_directional_light(scene, "rk_sun", 1.2, 315.0, 50.0, 3.0)
    mats = materials()
    catcher = ow.plane_xy("rk_catcher", -3.0, -3.0, 3.0, 3.0, 0.0)
    catcher.is_shadow_catcher = True  # transparent, keeps the rubble shadows
    material, nb = ow.new_material("rk_crater")
    dist = nb.vmath("LENGTH", nb.node("ShaderNodeTexCoord").outputs["Object"])
    soft = nb.mul(nb.map_range(dist, 0.25, 0.75, 1.0, 0.0, smooth=True), 0.85)
    nb.output(nb.mix_shader(soft, nb.transparent(), nb.principled(srgb(PALETTE["crater"]), roughness=0.95)))
    ow.plane_xy("rk_crater", -0.8, -0.8, 0.8, 0.8, 0.001, material)
    ow.plane_xy("rk_hole", -0.2, -0.07, 0.2, 0.07, 0.003, mats["crack"])
    rng = random.Random(23)
    for i, pts in enumerate(crack_paths(rng)):
        ribbon(f"rk_crack{i}", pts, 0.09, 0.012, 0.004, mats["crack"])
        ribbon(f"rk_crack_glow{i}", pts[: max(2, len(pts) * 2 // 3)], 0.03, 0.004, 0.006,
               mats["ember"] if i % 3 else mats["seam"])
    # broken ground slabs pushed up around the impact, tilted outwards
    slab = principled("rk_slab", "#5d5862", roughness=0.85)
    for i in range(9):
        a = math.tau * i / 9 + rng.uniform(-0.2, 0.2)
        r = rng.uniform(0.28, 0.42)
        w, d = rng.uniform(0.16, 0.26), rng.uniform(0.1, 0.16)
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        for v in bm.verts:
            v.co = Vector((v.co.x * d, v.co.y * w, v.co.z * 0.05))
        bmesh.ops.rotate(bm, verts=bm.verts[:], cent=Vector((0, 0, 0)),
                         matrix=Matrix.Rotation(math.radians(rng.uniform(18, 32)), 3, "Y"))
        bmesh.ops.rotate(bm, verts=bm.verts[:], cent=Vector((0, 0, 0)), matrix=Matrix.Rotation(a, 3, "Z"))
        bmesh.ops.translate(bm, verts=bm.verts[:], vec=Vector((math.cos(a) * r, math.sin(a) * r, 0.04)))
        new_object(f"rk_slab{i}", bm, [slab], bevel=0.01)
    add_rubble(mats, rng, 18, 0.3, 1.0, (0.035, 0.1), "rk_rubble")
    top_camera(scene, size / PX_PER_M)
    render_pair(scene, out_dir, "r1-crack")
    return {"size": [size, size], "pivot": [size / 2, size / 2], "camera": "top-down", "px_per_m": PX_PER_M}


def asset_pulse(out_dir):
    """One mid-expansion frame. Emission only, on black; make_r1_mock.py derives the alpha."""
    return pulse_ring(out_dir, "r1-pulse", band_colors=("pulse", "energy"), edge="energy_core", streak="energy", shard="aura_gold")


def asset_counter_ring(out_dir):
    """V1: the same ring in REGALIA gold for the counter wave, with cyan sparks (the colours of the
    cannon's aura swapped), so a counter never reads as the cool automatic wave."""
    return pulse_ring(out_dir, "v1-counter-ring", band_colors=("counter_band", "aura_gold"), edge="counter_core", streak="aura_gold", shard="energy")


def pulse_ring(out_dir, name, band_colors, edge, streak, shard):
    """The pulse ring with the given PALETTE colours (band inner -> outer, edge line, streaks, shards).
    Same geometry and seed for every colour set."""
    size = 512
    scene = setup_scene(size, size, samples=64, transparent=False)
    scene.cycles.use_denoising = False
    setup_world(scene, black=True)
    radius = 2.5  # m = 200 px at 2x
    rng = random.Random(5)

    material, nb = ow.new_material("rk_band")
    obj_co = nb.node("ShaderNodeTexCoord").outputs["Object"]
    delta = nb.sub(nb.vmath("LENGTH", obj_co), radius)
    outside = nb.map_range(delta, 0.0, 0.22, 1.0, 0.0, smooth=True)
    inside = nb.map_range(delta, -0.9, 0.0, 0.0, 1.0, smooth=True)
    band = nb.mul(nb.math("POWER", inside, 3.0), outside)
    noise = nb.noise(obj_co, scale=3.0, detail=6.0, roughness=0.6)
    noise = noise.outputs["Fac"] if hasattr(noise, "outputs") else noise
    wobble = nb.map_range(noise, 0.3, 0.7, 0.55, 1.25)
    color = nb.mix(nb.map_range(delta, -0.12, 0.03), srgb(PALETTE[band_colors[0]]), srgb(PALETTE[band_colors[1]]))
    nb.output(nb.emission(color, nb.mul(nb.mul(band, wobble), 0.6)))
    ow.plane_xy("rk_band", -3.4, -3.4, 3.4, 3.4, 0.0, material)

    flat_ring("rk_edge", radius - 0.02, 0.022, "Z", 0.01, emission("rk_edge_mat", PALETTE[edge], 1.1), segments=192)

    streak_mat, nb = ow.new_material("rk_streak")
    along = nb.separate(nb.uv())[1]
    nb.output(nb.emission(srgb(PALETTE[streak]), nb.mul(along, 1.1)))
    for i in range(56):
        a = math.tau * i / 56 + rng.uniform(-0.03, 0.03)
        r0, r1, w = radius - rng.uniform(0.15, 0.6), radius + rng.uniform(0.05, 0.35), rng.uniform(0.012, 0.03)
        ca, sa = math.cos(a), math.sin(a)
        corners = [(ca * r0 - sa * w, sa * r0 + ca * w), (ca * r0 + sa * w, sa * r0 - ca * w),
                   (ca * r1 + sa * w * 0.2, sa * r1 - ca * w * 0.2), (ca * r1 - sa * w * 0.2, sa * r1 + ca * w * 0.2)]
        bm = bmesh.new()
        face = bm.faces.new([bm.verts.new((x, y, 0.02)) for (x, y) in corners])
        uv_layer = bm.loops.layers.uv.new()
        for loop, uv in zip(face.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
            loop[uv_layer].uv = uv  # v = 0 at the inner end, 1 at the outer end
        new_object(f"rk_streak{i}", bm, [streak_mat])

    shard_mat = emission("rk_shard", PALETTE[shard], 1.6)
    for i in range(34):
        a, r = rng.uniform(0.0, math.tau), radius + rng.uniform(-0.25, 0.3)
        s, rot = rng.uniform(0.03, 0.07), rng.uniform(0.0, math.tau)
        pts = [(math.cos(rot + k * 2.1) * s * (1.6 if k == 0 else 1.0), math.sin(rot + k * 2.1) * s) for k in range(3)]
        bm = bmesh.new()
        bm.faces.new([bm.verts.new((math.cos(a) * r + x, math.sin(a) * r + y, 0.03)) for (x, y) in pts])
        new_object(f"rk_shard{i}", bm, [shard_mat])

    top_camera(scene, size / PX_PER_M)
    ow.render_still(scene, os.path.join(out_dir, f"{name}.png"), "PNG", rgba=False)
    return {"size": [size, size], "pivot": [size / 2, size / 2], "ring_radius_px": radius * PX_PER_M,
            "camera": "top-down", "blend": "additive; alpha derived from brightness", "px_per_m": PX_PER_M}


def flat_polygon(name, pts, z, material):
    """A flat n-gon in the XY plane at height z."""
    bm = bmesh.new()
    bm.faces.new([bm.verts.new((x, y, z)) for (x, y) in pts])
    return new_object(name, bm, [material])


def asset_counter_emblem(out_dir):
    """V1: REGALIA's crest as light on the ground, flashed under the mech on a counter. The cross
    pattee of the shields and the tabard, a ring of ticks and eight crown spikes like the shield's
    crest. Emission only, on black (drawn additively, alpha from brightness)."""
    size = 512
    scene = setup_scene(size, size, samples=64, transparent=False)
    scene.cycles.use_denoising = False
    setup_world(scene, black=True)
    outer = 2.3  # m; 184 px at 2x. The game scales it to its own size (V1: 150 world px).

    # a faint disc of light inside the crest, brightest at the rim
    material, nb = ow.new_material("rk_emblem_disc")
    dist = nb.vmath("LENGTH", nb.node("ShaderNodeTexCoord").outputs["Object"])
    rim = nb.mul(nb.map_range(dist, 0.4, outer, 0.25, 1.0), nb.map_range(dist, outer - 0.05, outer + 0.05, 1.0, 0.0))
    nb.output(nb.emission(srgb(PALETTE["counter_band"]), nb.mul(rim, 0.14)))
    ow.plane_xy("rk_emblem_disc", -3.0, -3.0, 3.0, 3.0, 0.0, material)

    gold = emission("rk_emblem_gold", PALETTE["aura_gold"], 1.0)
    gold_dim = emission("rk_emblem_gold_dim", PALETTE["counter_band"], 0.42)
    white = emission("rk_emblem_white", PALETTE["counter_core"], 1.2)
    cyan = emission("rk_emblem_cyan", PALETTE["energy"], 0.9)
    gem = emission("rk_emblem_gem", PALETTE["energy_core"], 3.0)

    flat_ring("rk_emblem_outer", outer, 0.045, "Z", 0.01, white, segments=192)
    flat_ring("rk_emblem_outer2", outer - 0.3, 0.018, "Z", 0.01, gold, segments=192)
    flat_ring("rk_emblem_inner", 1.85, 0.028, "Z", 0.01, cyan, segments=160)
    # ticks between the two outer rings, a diamond at every eighth
    for i in range(64):
        a = math.tau * i / 64
        ca, sa = math.cos(a), math.sin(a)
        if i % 8 == 0:
            r0, r1, w = outer - 0.27, outer - 0.03, 0.07
            mid = (r0 + r1) / 2
            pts = [(ca * r0, sa * r0), (ca * mid - sa * w, sa * mid + ca * w),
                   (ca * r1, sa * r1), (ca * mid + sa * w, sa * mid - ca * w)]
            flat_polygon(f"rk_emblem_diamond{i}", pts, 0.02, white)
        else:
            r0, r1, w = outer - 0.2, outer - 0.1, 0.012
            pts = [(ca * r0 - sa * w, sa * r0 + ca * w), (ca * r0 + sa * w, sa * r0 - ca * w),
                   (ca * r1 + sa * w, sa * r1 - ca * w), (ca * r1 - sa * w, sa * r1 + ca * w)]
            flat_polygon(f"rk_emblem_tick{i}", pts, 0.02, gold)
    # eight crown spikes outside the rim, between the diamonds
    for i in range(8):
        a = math.tau * i / 8 + math.pi / 8
        ca, sa = math.cos(a), math.sin(a)
        r0, r1, w = outer + 0.02, outer + 0.42, 0.11
        pts = [(ca * r0 - sa * w, sa * r0 + ca * w), (ca * r0 + sa * w, sa * r0 - ca * w), (ca * r1, sa * r1)]
        flat_polygon(f"rk_emblem_spike{i}", pts, 0.02, gold)
        core = [(x * 0.55 + ca * r0 * 0.45, y * 0.55 + sa * r0 * 0.45) for (x, y) in pts]
        flat_polygon(f"rk_emblem_spike_core{i}", core, 0.03, white)
    # faint cyan rays between the cross arms
    for i in range(4):
        a = math.pi / 4 + math.pi / 2 * i
        ca, sa = math.cos(a), math.sin(a)
        r0, r1, w = 0.7, 1.75, 0.06
        pts = [(ca * r0 - sa * w, sa * r0 + ca * w), (ca * r0 + sa * w, sa * r0 - ca * w), (ca * r1, sa * r1)]
        flat_polygon(f"rk_emblem_ray{i}", pts, 0.02, cyan)
    # the cross pattee reaching the inner ring, so its arms show around the mech standing on it:
    # a bright rim around a dimmer gold fill, a gem in the middle
    cross = cross_pattee(arm=1.8, root=0.2, flare=0.62)
    flat_polygon("rk_emblem_cross", cross, 0.02, white)
    flat_polygon("rk_emblem_cross_fill", [(x * 0.84, y * 0.84) for (x, y) in cross], 0.03, gold_dim)
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, segments=32, radius=0.14)
    for v in bm.verts:
        v.co.z = 0.04
    new_object("rk_emblem_gem", bm, [gem])

    top_camera(scene, size / PX_PER_M)
    ow.render_still(scene, os.path.join(out_dir, "v1-counter-emblem.png"), "PNG", rgba=False)
    return {"size": [size, size], "pivot": [size / 2, size / 2], "outer_radius_px": outer * PX_PER_M,
            "camera": "top-down", "blend": "additive; alpha derived from brightness", "px_per_m": PX_PER_M}


def asset_icon_aegis(out_dir):
    size = 256
    scene = setup_scene(size, size)
    setup_world(scene)
    add_sprite_lights(scene)
    mats = materials()
    for (x, y, rot, scale) in ((-0.95, 0.9, math.radians(22), 0.78), (0.95, 0.9, math.radians(-22), 0.78), (0.0, 0.0, 0.0, 1.0)):
        build_shield(mats, origin=(x, y, 0.0), rotation_z=rot, scale=scale, name=f"icon{x:+.1f}")
    ow.plane_xy("rk_ground", -4.0, -4.0, 4.0, 4.0, 0.0, holdout())
    ortho_camera(scene, (0.0, 0.0, 1.35), 3.6, 14.0)
    render_pair(scene, out_dir, "r1-icon-aegis")
    return {"size": [size, size]}


def asset_icon_pulse(out_dir):
    size = 256
    scene = setup_scene(size, size)
    setup_world(scene)
    add_sprite_lights(scene)
    mats = materials()

    def roundel(name, radius, y, material):
        bm = bmesh.new()
        outline = [(math.cos(math.tau * i / 64) * radius, math.sin(math.tau * i / 64) * radius) for i in range(64)]
        solid_from_outline(bm, outline, y, 0.08)
        return new_object(name, bm, [material], bevel=0.01)

    roundel("rk_roundel_rim", 0.62, 0.0, mats["gold"])
    roundel("rk_roundel_ivory", 0.55, -0.03, mats["ivory"])
    roundel("rk_roundel", 0.45, -0.06, mats["navy"])
    bm = bmesh.new()
    solid_from_outline(bm, cross_pattee(arm=0.36, root=0.055, flare=0.15), -0.09, 0.03)
    new_object("rk_icon_cross", bm, [mats["gold"]], bevel=0.008)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=0.06)
    for v in bm.verts:
        v.co += Vector((0.0, -0.12, 0.0))
    new_object("rk_icon_gem", bm, [mats["gem"]], smooth=True)
    for k, (radius, width, strength) in enumerate(((0.92, 0.045, 6.0), (1.28, 0.03, 4.0))):
        flat_ring(f"rk_icon_ring{k}", radius, width, "Y", -0.02, emission(f"rk_icon_ring_mat{k}", PALETTE["energy"], strength * 0.25))
    for i in range(8):
        a = math.tau * i / 8 + math.pi / 8
        ca, sa = math.cos(a), math.sin(a)
        pts = [(-0.07, -0.05), (0.07, 0.0), (-0.07, 0.05), (-0.03, 0.0)]
        bm = bmesh.new()
        bm.faces.new([bm.verts.new((ca * (1.1 + u) - sa * v, -0.03, sa * (1.1 + u) + ca * v)) for (u, v) in pts])
        new_object(f"rk_icon_chevron{i}", bm, [mats["ember"]])
    ortho_camera(scene, (0.0, 0.0, 0.0), 2.95, 0.0)
    render_pair(scene, out_dir, "r1-icon-pulse")
    return {"size": [size, size]}


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out_dir, only = os.path.join(HERE, "preview"), None
    for flag, value in zip(argv[::2], argv[1::2]):
        if flag == "--out":
            out_dir = os.path.abspath(value)
        elif flag == "--only":
            only = set(value.split(","))
    os.makedirs(out_dir, exist_ok=True)
    builders = {
        "shield": asset_shield,
        "crack": asset_crack,
        "pulse": asset_pulse,
        "icon-aegis": asset_icon_aegis,
        "icon-pulse": asset_icon_pulse,
        "shield-dirs": asset_shield_dirs,
        "counter-ring": asset_counter_ring,
        "counter-emblem": asset_counter_emblem,
        "guard-dirs": asset_guard_dirs,
    }
    manifest_path = os.path.join(out_dir, "r1-assets.json")
    manifest = {}
    if os.path.exists(manifest_path):
        with open(manifest_path, encoding="utf-8") as handle:
            manifest = json.load(handle)
    for key, builder in builders.items():
        if only and key not in only:
            continue
        print(f"[regalia-kit] rendering {key}")
        EMISSIVE.clear()
        manifest[key] = builder(out_dir)
    manifest["_blender"] = bpy.app.version_string
    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2, ensure_ascii=False)
    print("[regalia-kit] done")


main()
