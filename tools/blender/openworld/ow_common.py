"""Shared helpers for the open-world Blender asset scripts.

Conventions follow WORLD_DESIGN.md 6.5:
- 1 Blender unit = 1 m, 1 m = 40 game px. Ortho cameras are sized so 1 output px = 1 game px.
- Game x = Blender +X (east), game "up" on screen = Blender +Y (north). Height is +Z.
- Ground tiles: uniform sky only. Buildings and props: the same sky plus a weak sun from the
  north-west at 50 degrees elevation.
- Colour management: View Transform Standard, no Look, exposure 0. Output 8-bit sRGB.
"""

import json
import math
import os
import tempfile

import bmesh
import bpy
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
WORK_DIR = os.path.join(REPO_ROOT, "asset-src", "openworld")
SOURCES_PATH = os.path.join(HERE, "sources.json")

PX_PER_M = 40.0
M_PER_PX = 1.0 / PX_PER_M
FACADE_K = 0.5  # vertical squash of south facades (1 floor 3.2 m = 64 px)
FLOOR_HEIGHT_M = 3.2

LIGHT = {
    "sky_strength": 1.0,  # uniform white world; a flat albedo A renders as A under it
    "sun_strength": 1.45,  # irradiance; adds ~35% on horizontal surfaces (weak key light)
    "sun_azimuth_deg": 315.0,  # north-west (screen top-left), clockwise from north
    "sun_elevation_deg": 50.0,
    "sun_angle_deg": 3.0,  # soft shadow edge
}

GROUND_TARGET_LUMA = (0.35, 0.45)  # mean sRGB luma of ground tiles (6.5 "色")


# ---------------------------------------------------------------------------
# Paths and sources


_sources_cache = None


def load_sources():
    global _sources_cache
    if _sources_cache is None:
        if not os.path.exists(SOURCES_PATH):
            raise RuntimeError("sources.json is missing. Run fetch_textures.py first.")
        with open(SOURCES_PATH, encoding="utf-8") as handle:
            _sources_cache = {entry["id"]: entry for entry in json.load(handle)["textures"]}
    return _sources_cache


def tex_file(tex_id, role):
    entry = load_sources().get(tex_id)
    if not entry or role not in entry["maps"]:
        raise RuntimeError(f"texture {tex_id}/{role} is not in sources.json")
    path = os.path.join(REPO_ROOT, entry["maps"][role]["file"])
    if not os.path.exists(path):
        raise RuntimeError(f"{path} is missing. Run fetch_textures.py.")
    return path


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)
    return path


# ---------------------------------------------------------------------------
# Scene, render and colour management


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    return scene


def enable_gpu(scene):
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for device_type in ("OPTIX", "CUDA", "HIP", "ONEAPI", "METAL"):
        try:
            prefs.compute_device_type = device_type
        except TypeError:
            continue
        prefs.get_devices()
        gpus = [d for d in prefs.devices if d.type == device_type]
        if gpus:
            for device in prefs.devices:
                device.use = device.type == device_type
            scene.cycles.device = "GPU"
            return device_type
    scene.cycles.device = "CPU"
    return "CPU"


def setup_render(scene, width, height, samples=128, transparent=False, pixel_aspect_y=1.0,
                 box_filter=False, denoise=True, dither=1.0):
    scene.render.engine = "CYCLES"
    enable_gpu(scene)
    cycles = scene.cycles
    cycles.samples = samples
    cycles.use_adaptive_sampling = False
    cycles.seed = 7
    cycles.use_denoising = denoise
    if denoise:
        cycles.denoiser = "OPENIMAGEDENOISE"
    cycles.pixel_filter_type = "BOX" if box_filter else "BLACKMAN_HARRIS"
    cycles.filter_width = 1.0 if box_filter else 1.5
    cycles.max_bounces = 8
    cycles.transparent_max_bounces = 16
    cycles.caustics_reflective = False
    cycles.caustics_refractive = False
    cycles.sample_clamp_indirect = 4.0

    render = scene.render
    render.resolution_x = int(width)
    render.resolution_y = int(height)
    render.resolution_percentage = 100
    render.pixel_aspect_x = 1.0
    render.pixel_aspect_y = float(pixel_aspect_y)
    render.film_transparent = transparent
    render.use_compositing = False
    render.use_sequencer = False
    render.dither_intensity = dither

    scene.display_settings.display_device = "sRGB"
    view = scene.view_settings
    view.view_transform = "Standard"
    view.look = "None"
    view.exposure = 0.0
    view.gamma = 1.0
    view.use_curve_mapping = False


def set_output(scene, fmt, rgba=False, quality=88):
    settings = scene.render.image_settings
    if hasattr(settings, "media_type"):
        settings.media_type = "IMAGE"
    if fmt == "JPEG":
        settings.file_format = "JPEG"
        settings.color_mode = "RGB"
        settings.quality = quality
    else:
        settings.file_format = "PNG"
        settings.color_mode = "RGBA" if rgba else "RGB"
        settings.color_depth = "8"
        settings.compression = 90


def render_still(scene, path, fmt="PNG", rgba=False, quality=88):
    ensure_dir(os.path.dirname(path))
    set_output(scene, fmt, rgba=rgba, quality=quality)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


def read_png(path):
    """Return an (h, w, 4) float array, row 0 = top, values = stored 8-bit sRGB / 255."""
    image = bpy.data.images.load(path, check_existing=False)
    image.colorspace_settings.name = "Non-Color"  # raw stored values, no conversion
    width, height = image.size
    data = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(data)
    bpy.data.images.remove(image)
    return data.reshape(height, width, 4)[::-1]


def srgb_luma(rgb):
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def srgb_to_linear(value):
    value = np.asarray(value, dtype=np.float64)
    return np.where(value <= 0.04045, value / 12.92, ((value + 0.055) / 1.055) ** 2.4)


def measure_mean_luma(scene, preview_px=192, samples=24):
    """Quick low-resolution render; returns mean sRGB luma of the frame."""
    render = scene.render
    saved = (render.resolution_x, render.resolution_y, scene.cycles.samples, scene.cycles.use_denoising)
    aspect = render.resolution_y / render.resolution_x
    render.resolution_x = preview_px
    render.resolution_y = max(8, int(round(preview_px * aspect)))
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False
    path = os.path.join(tempfile.gettempdir(), "ow_calibration.png")
    render_still(scene, path, "PNG")
    pixels = read_png(path)
    render.resolution_x, render.resolution_y, scene.cycles.samples, scene.cycles.use_denoising = saved
    return float(srgb_luma(pixels[..., :3]).mean())


def calibrate_gain(scene, gain_node, target_luma, iterations=3, label=""):
    """Scale a material's albedo gain (a Value node) so the frame's mean sRGB luma hits the target.

    The light rig never changes; only the material brightness is tuned, so every asset keeps the
    same lighting (6.5 "光").
    """
    measured = None
    for _ in range(iterations):
        measured = measure_mean_luma(scene)
        ratio = float(srgb_to_linear(target_luma) / max(1e-4, srgb_to_linear(measured)))
        gain_node.outputs[0].default_value = float(np.clip(gain_node.outputs[0].default_value * ratio, 0.05, 4.0))
        if abs(measured - target_luma) < 0.004:
            break
    print(f"[calibrate] {label} target {target_luma:.3f} measured {measured:.3f} gain {gain_node.outputs[0].default_value:.3f}")
    return gain_node.outputs[0].default_value


# ---------------------------------------------------------------------------
# World, lights, cameras


def setup_world(scene, strength=None):
    world = bpy.data.worlds.new("ow_sky")
    scene.world = world
    if hasattr(world, "use_nodes"):
        try:
            world.use_nodes = True
        except (AttributeError, TypeError):
            pass
    nodes = world.node_tree.nodes
    background = nodes.get("Background") or nodes.new("ShaderNodeBackground")
    background.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    background.inputs["Strength"].default_value = LIGHT["sky_strength"] if strength is None else strength
    output = nodes.get("World Output") or nodes.new("ShaderNodeOutputWorld")
    world.node_tree.links.new(background.outputs["Background"], output.inputs["Surface"])
    return world


def add_sun(scene, strength=None):
    light = bpy.data.lights.new("ow_sun", "SUN")
    light.energy = LIGHT["sun_strength"] if strength is None else strength
    light.angle = math.radians(LIGHT["sun_angle_deg"])
    obj = bpy.data.objects.new("ow_sun", light)
    scene.collection.objects.link(obj)
    az = math.radians(LIGHT["sun_azimuth_deg"])
    el = math.radians(LIGHT["sun_elevation_deg"])
    to_sun = Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)))
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = to_sun.to_track_quat("Z", "Y")
    return obj


def add_ortho_camera_top(scene, x0, y0, width_m, height_m, z=200.0):
    """Top-down ortho camera covering [x0, x0+width] x [y0, y0+height]; image top = +Y (north)."""
    cam_data = bpy.data.cameras.new("ow_cam_top")
    cam_data.type = "ORTHO"
    cam_data.sensor_fit = "HORIZONTAL"
    cam_data.ortho_scale = width_m
    cam_data.clip_start = 0.1
    cam_data.clip_end = 1000.0
    cam = bpy.data.objects.new("ow_cam_top", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (x0 + width_m / 2.0, y0 + height_m / 2.0, z)
    cam.rotation_euler = (0.0, 0.0, 0.0)
    scene.camera = cam
    return cam


def add_ortho_camera_south(scene, x0, z0, width_m, height_m, y=-200.0):
    """Ortho camera looking north at a south facade; covers x [x0, x0+width], z [z0, z0+height]."""
    cam_data = bpy.data.cameras.new("ow_cam_south")
    cam_data.type = "ORTHO"
    cam_data.sensor_fit = "HORIZONTAL"
    cam_data.ortho_scale = width_m
    cam_data.clip_start = 0.1
    cam_data.clip_end = 1000.0
    cam = bpy.data.objects.new("ow_cam_south", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (x0 + width_m / 2.0, y, z0 + height_m / 2.0)
    cam.rotation_euler = (math.radians(90.0), 0.0, 0.0)
    scene.camera = cam
    return cam


# ---------------------------------------------------------------------------
# Meshes (bmesh, identity transforms, UVs in metres so textures keep world scale)


def _box_uv(bm):
    """Planar UVs in metres chosen per face from its normal (u east / v north or up)."""
    uv_layer = bm.loops.layers.uv.verify()
    for face in bm.faces:
        n = face.normal
        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        for loop in face.loops:
            co = loop.vert.co
            if az >= ax and az >= ay:
                uv = (co.x, co.y) if n.z >= 0 else (co.x, -co.y)
            elif ay >= ax:
                uv = (co.x, co.z) if n.y <= 0 else (-co.x, co.z)
            else:
                uv = (co.y, co.z) if n.x >= 0 else (-co.y, co.z)
            loop[uv_layer].uv = uv


def mesh_object(name, bm, material=None, collection=None):
    bm.normal_update()
    _box_uv(bm)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    (collection or bpy.context.scene.collection).objects.link(obj)
    if material is not None:
        mesh.materials.append(material)
    return obj


def box(name, x0, y0, z0, x1, y1, z1, material=None, collection=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    sx, sy, sz = (x1 - x0), (y1 - y0), (z1 - z0)
    for vert in bm.verts:
        vert.co.x = x0 + (vert.co.x + 0.5) * sx
        vert.co.y = y0 + (vert.co.y + 0.5) * sy
        vert.co.z = z0 + (vert.co.z + 0.5) * sz
    return mesh_object(name, bm, material, collection)


def cylinder(name, cx, cy, z0, z1, radius, material=None, segments=32, collection=None, axis="Z"):
    bm = bmesh.new()
    length = z1 - z0
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=radius, radius2=radius, depth=length)
    for vert in bm.verts:
        x, y, z = vert.co.x, vert.co.y, vert.co.z + length / 2.0
        if axis == "Z":
            vert.co = (cx + x, cy + y, z0 + z)
        elif axis == "X":  # cx/cy are (y, z) of the axis line, z0..z1 runs along X
            vert.co = (z0 + z, cx + x, cy + y)
        else:  # "Y": cx/cy are (x, z), z0..z1 runs along Y
            vert.co = (cx + x, z0 + z, cy + y)
    return mesh_object(name, bm, material, collection)


def plane(name, corners, material=None, collection=None):
    bm = bmesh.new()
    verts = [bm.verts.new(c) for c in corners]
    bm.faces.new(verts)
    return mesh_object(name, bm, material, collection)


def plane_xy(name, x0, y0, x1, y1, z, material=None, collection=None):
    return plane(name, [(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)], material, collection)


def plane_south(name, x0, z0, x1, z1, y, material=None, collection=None):
    """Vertical quad at depth y facing -Y (south, towards the facade camera)."""
    return plane(name, [(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)], material, collection)


def grid_plane_xy(name, x0, y0, x1, y1, z, material=None, cuts=1, collection=None):
    bm = bmesh.new()
    nx = max(1, cuts)
    ny = max(1, cuts)
    verts = [[bm.verts.new((x0 + (x1 - x0) * i / nx, y0 + (y1 - y0) * j / ny, z)) for i in range(nx + 1)] for j in range(ny + 1)]
    for j in range(ny):
        for i in range(nx):
            bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
    return mesh_object(name, bm, material, collection)


# ---------------------------------------------------------------------------
# Shader node builder


def _input(node, key):
    if isinstance(key, int):
        return node.inputs[key]
    for socket in node.inputs:
        if socket.identifier == key and socket.enabled:
            return socket
    for socket in node.inputs:
        if socket.identifier == key:
            return socket
    for socket in node.inputs:
        if socket.name == key and socket.enabled:
            return socket
    return node.inputs[key]


def _output(node, key):
    if isinstance(key, int):
        return node.outputs[key]
    for socket in node.outputs:
        if socket.identifier == key and socket.enabled:
            return socket
    for socket in node.outputs:
        if socket.name == key and socket.enabled:
            return socket
    return node.outputs[key]


class Nodes:
    """Small helper to write shader graphs as expressions. Values may be sockets or constants."""

    def __init__(self, tree):
        self.tree = tree
        self.nodes = tree.nodes
        self.links = tree.links
        self._images = {}

    def new(self, node_type, **props):
        node = self.nodes.new(node_type)
        for key, value in props.items():
            setattr(node, key, value)
        return node

    def set(self, node, key, value):
        socket = _input(node, key)
        if isinstance(value, bpy.types.NodeSocket):
            self.links.new(value, socket)
        elif value is not None:
            if hasattr(socket, "default_value"):
                current = socket.default_value
                try:
                    length = len(current)
                except TypeError:
                    length = 0
                if length and not isinstance(value, (tuple, list)):
                    value = (value,) * length if length != 4 else (value, value, value, 1.0)
                if length == 4 and isinstance(value, (tuple, list)) and len(value) == 3:
                    value = (*value, 1.0)
                socket.default_value = value
        return node

    def node(self, node_type, inputs=None, **props):
        node = self.new(node_type, **props)
        for key, value in (inputs or {}).items():
            self.set(node, key, value)
        return node

    # --- coordinates
    def uv(self):
        return _output(self.new("ShaderNodeTexCoord"), "UV")

    def position(self):
        return _output(self.new("ShaderNodeNewGeometry"), "Position")

    def object_random(self):
        return _output(self.new("ShaderNodeObjectInfo"), "Random")

    def separate(self, vector):
        node = self.node("ShaderNodeSeparateXYZ", {"Vector": vector})
        return node.outputs["X"], node.outputs["Y"], node.outputs["Z"]

    def combine(self, x=0.0, y=0.0, z=0.0):
        return self.node("ShaderNodeCombineXYZ", {"X": x, "Y": y, "Z": z}).outputs["Vector"]

    # --- math
    def math(self, op, a, b=None, c=None, clamp=False):
        node = self.new("ShaderNodeMath", operation=op, use_clamp=clamp)
        self.set(node, 0, a)
        if b is not None:
            self.set(node, 1, b)
        if c is not None:
            self.set(node, 2, c)
        return node.outputs[0]

    def add(self, a, b, clamp=False):
        return self.math("ADD", a, b, clamp=clamp)

    def sub(self, a, b, clamp=False):
        return self.math("SUBTRACT", a, b, clamp=clamp)

    def mul(self, a, b, clamp=False):
        return self.math("MULTIPLY", a, b, clamp=clamp)

    def vmath(self, op, a, b=None, scale=None):
        node = self.new("ShaderNodeVectorMath", operation=op)
        self.set(node, 0, a)
        if b is not None:
            self.set(node, 1, b)
        if scale is not None:
            self.set(node, "Scale", scale)
        return node.outputs["Value"] if op in ("DOT_PRODUCT", "LENGTH", "DISTANCE") else node.outputs["Vector"]

    def vscale(self, vector, factor):
        return self.vmath("SCALE", vector, scale=factor)

    def add_vec(self, vector, offset):
        return self.vmath("ADD", vector, offset)

    def map_range(self, value, from_min, from_max, to_min=0.0, to_max=1.0, smooth=False, clamp=True):
        node = self.new("ShaderNodeMapRange", interpolation_type="SMOOTHSTEP" if smooth else "LINEAR", clamp=clamp)
        self.set(node, "Value", value)
        self.set(node, "From Min", from_min)
        self.set(node, "From Max", from_max)
        self.set(node, "To Min", to_min)
        self.set(node, "To Max", to_max)
        return node.outputs["Result"]

    def mix(self, factor, a, b, blend="MIX", clamp_result=False):
        node = self.new("ShaderNodeMix", data_type="RGBA", blend_type=blend, clamp_result=clamp_result)
        self.set(node, "Factor_Float", factor)
        self.set(node, "A_Color", a)
        self.set(node, "B_Color", b)
        return _output(node, "Result_Color")

    def mixf(self, factor, a, b):
        node = self.new("ShaderNodeMix", data_type="FLOAT")
        self.set(node, "Factor_Float", factor)
        self.set(node, "A_Float", a)
        self.set(node, "B_Float", b)
        return _output(node, "Result_Float")

    def hsv(self, color, hue=0.5, saturation=1.0, value=1.0):
        node = self.node("ShaderNodeHueSaturation", {"Hue": hue, "Saturation": saturation, "Value": value, "Color": color})
        return node.outputs["Color"]

    def luma(self, color):
        return self.node("ShaderNodeRGBToBW", {"Color": color}).outputs["Val"]

    def value(self, v, label=None):
        node = self.new("ShaderNodeValue")
        node.outputs[0].default_value = v
        if label:
            node.label = label
            node.name = label
        return node

    def rgb(self, color):
        node = self.new("ShaderNodeRGB")
        node.outputs[0].default_value = (*color, 1.0) if len(color) == 3 else color
        return node.outputs[0]

    # --- textures
    def image(self, path, vector, non_color=False, interpolation="Cubic", extension="REPEAT"):
        key = (path, non_color)
        image = self._images.get(key)
        if image is None:
            image = bpy.data.images.load(path, check_existing=True)
            if non_color:
                image.colorspace_settings.name = "Non-Color"
            self._images[key] = image
        node = self.new("ShaderNodeTexImage", interpolation=interpolation, extension=extension)
        node.image = image
        self.set(node, "Vector", vector)
        return node

    def tex(self, tex_id, role, vector, **kwargs):
        non_color = role != "color"
        node = self.image(tex_file(tex_id, role), vector, non_color=non_color, **kwargs)
        if role in ("color",):
            return node.outputs["Color"]
        if role == "normal":
            return node.outputs["Color"]
        return node.outputs["Color"] if role == "opacity" else self.luma(node.outputs["Color"])

    def noise(self, vector, w=None, scale=1.0, detail=4.0, roughness=0.55, distortion=0.0, dims="3D"):
        node = self.new("ShaderNodeTexNoise", noise_dimensions=dims)
        self.set(node, "Vector", vector)
        if w is not None and dims == "4D":
            self.set(node, "W", w)
        self.set(node, "Scale", scale)
        self.set(node, "Detail", detail)
        self.set(node, "Roughness", roughness)
        self.set(node, "Distortion", distortion)
        return node

    def voronoi(self, vector, w=None, scale=1.0, feature="F1", dims="3D", randomness=1.0, distance="EUCLIDEAN"):
        node = self.new("ShaderNodeTexVoronoi", voronoi_dimensions=dims, feature=feature, distance=distance)
        self.set(node, "Vector", vector)
        if w is not None and dims == "4D":
            self.set(node, "W", w)
        self.set(node, "Scale", scale)
        self.set(node, "Randomness", randomness)
        return node

    # --- periodic coordinates for seamless tiles
    def periodic(self, position, period_x=None, period_y=None, offset=(0.0, 0.0, 0.0, 0.0), stretch=(1.0, 1.0)):
        """Embed (x, y) on a torus so procedural noise repeats exactly every period (metres).

        Returns (vector, w, dims) for noise/voronoi nodes. Distances are preserved locally (the
        circle radius is period / 2pi). `stretch` scales the x/y axes before embedding (anisotropic
        noise); a periodic axis keeps its period regardless of stretch.
        """
        x, y, _ = self.separate(position)
        comps = []
        if period_x:
            radius = period_x / (2.0 * math.pi) * stretch[0]
            angle = self.mul(x, 2.0 * math.pi / period_x)
            comps += [self.mul(self.math("COSINE", angle), radius), self.mul(self.math("SINE", angle), radius)]
        else:
            comps += [self.mul(x, stretch[0])]
        if period_y:
            radius = period_y / (2.0 * math.pi) * stretch[1]
            angle = self.mul(y, 2.0 * math.pi / period_y)
            comps += [self.mul(self.math("COSINE", angle), radius), self.mul(self.math("SINE", angle), radius)]
        else:
            comps += [self.mul(y, stretch[1])]
        comps = [self.add(c, offset[i]) for i, c in enumerate(comps)]
        if len(comps) == 2:
            return self.combine(comps[0], comps[1], offset[2]), None, "3D"
        if len(comps) == 3:
            return self.combine(*comps), None, "3D"
        return self.combine(comps[0], comps[1], comps[2]), comps[3], "4D"

    def pnoise(self, position, period_x, period_y, scale, detail=4.0, roughness=0.55, seed=0.0, distortion=0.0, stretch=(1.0, 1.0)):
        vector, w, dims = self.periodic(position, period_x, period_y, offset=(seed * 13.1, seed * 7.7, seed * 3.3, seed * 5.9), stretch=stretch)
        return self.noise(vector, w, scale=scale, detail=detail, roughness=roughness, distortion=distortion, dims=dims)

    def pvoronoi(self, position, period_x, period_y, scale, feature="F1", seed=0.0, randomness=1.0):
        vector, w, dims = self.periodic(position, period_x, period_y, offset=(seed * 13.1, seed * 7.7, seed * 3.3, seed * 5.9))
        return self.voronoi(vector, w, scale=scale, feature=feature, dims=dims, randomness=randomness)

    # --- shading
    def normal_map(self, color, strength=1.0):
        return self.node("ShaderNodeNormalMap", {"Color": color, "Strength": strength}).outputs["Normal"]

    def bump(self, height, strength=1.0, distance=0.02, normal=None):
        node = self.node("ShaderNodeBump", {"Height": height, "Strength": strength, "Distance": distance})
        if normal is not None:
            self.set(node, "Normal", normal)
        return node.outputs["Normal"]

    def principled(self, base_color, roughness=0.8, normal=None, metallic=0.0, specular=0.5, alpha=None):
        node = self.new("ShaderNodeBsdfPrincipled")
        self.set(node, "Base Color", base_color)
        self.set(node, "Roughness", roughness)
        self.set(node, "Metallic", metallic)
        self.set(node, "Specular IOR Level", specular)
        if normal is not None:
            self.set(node, "Normal", normal)
        if alpha is not None:
            self.set(node, "Alpha", alpha)
        return node.outputs["BSDF"]

    def emission(self, color, strength=1.0):
        return self.node("ShaderNodeEmission", {"Color": color, "Strength": strength}).outputs["Emission"]

    def transparent(self):
        return self.new("ShaderNodeBsdfTransparent").outputs["BSDF"]

    def holdout(self):
        return self.new("ShaderNodeHoldout").outputs["Holdout"]

    def mix_shader(self, factor, a, b):
        node = self.new("ShaderNodeMixShader")
        self.set(node, 0, factor)
        self.links.new(a, node.inputs[1])
        self.links.new(b, node.inputs[2])
        return node.outputs["Shader"]

    def output(self, shader):
        out = self.new("ShaderNodeOutputMaterial")
        self.links.new(shader, out.inputs["Surface"])
        return out


def new_material(name):
    material = bpy.data.materials.new(name)
    if hasattr(material, "use_nodes"):
        try:
            material.use_nodes = True
        except (AttributeError, TypeError):
            pass
    material.node_tree.nodes.clear()
    return material, Nodes(material.node_tree)


def flat_material(name, color, roughness=0.8, metallic=0.0):
    material, nb = new_material(name)
    nb.output(nb.principled(color, roughness=roughness, metallic=metallic))
    return material


def emission_material(name, color, strength=1.0):
    material, nb = new_material(name)
    nb.output(nb.emission(color, strength))
    return material


# ---------------------------------------------------------------------------
# Emission layer (<key>_emit.png): the same camera, emissive parts only


class EmitLayer:
    """Tracks emissive objects. The base render uses each object's "off" material; the emit render
    swaps in emission for emitters, a clear shader for glass and holdout for everything else."""

    def __init__(self):
        self.emitters = {}
        self.glass = set()

    def add(self, obj, color, strength=1.0):
        self.emitters[obj.name] = (tuple(color), strength)

    def add_glass(self, obj):
        self.glass.add(obj.name)

    def render(self, scene, path):
        holdout, nb = new_material("ow_emit_holdout")
        nb.output(nb.holdout())
        clear, nb = new_material("ow_emit_clear")
        nb.output(nb.transparent())
        saved = {}
        emit_cache = {}
        for obj in scene.objects:
            if obj.type not in {"MESH", "CURVE", "FONT", "SURFACE", "META"}:
                continue
            saved[obj.name] = [slot.material for slot in obj.material_slots]
            if obj.name in self.emitters:
                key = self.emitters[obj.name]
                if key not in emit_cache:
                    emit_cache[key] = emission_material(f"ow_emit_{len(emit_cache)}", key[0], key[1])
                replacement = emit_cache[key]
            elif obj.name in self.glass:
                replacement = clear
            else:
                replacement = holdout
            if not obj.material_slots:
                obj.data.materials.append(replacement)
            for slot in obj.material_slots:
                slot.material = replacement
        hidden_lights = []
        for obj in scene.objects:
            if obj.type == "LIGHT" and not obj.hide_render:
                obj.hide_render = True
                hidden_lights.append(obj)
        world_strength = scene.world.node_tree.nodes["Background"].inputs["Strength"]
        saved_strength = world_strength.default_value
        world_strength.default_value = 0.0
        saved_transparent = scene.render.film_transparent
        scene.render.film_transparent = True
        saved_denoise = scene.cycles.use_denoising
        scene.cycles.use_denoising = False
        render_still(scene, path, "PNG", rgba=True)
        scene.cycles.use_denoising = saved_denoise
        scene.render.film_transparent = saved_transparent
        world_strength.default_value = saved_strength
        for obj in hidden_lights:
            obj.hide_render = False
        for obj in scene.objects:
            if obj.name in saved:
                materials = saved[obj.name]
                if not materials:
                    obj.data.materials.clear()
                for slot, material in zip(obj.material_slots, materials):
                    slot.material = material
        return path


def save_blend(path):
    """Work file for hand tweaks (asset-src/ is git-ignored). No .blend1 backups."""
    ensure_dir(os.path.dirname(path))
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=path, compress=True)
