"""Render the open-world assets (WORLD_DESIGN.md 6).

Run with Blender (background mode):
    & "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" --background --factory-startup `
        --python tools/blender/openworld/build_all.py -- --out 画像/openworld

Options after "--":
    --out DIR        output root (default: 画像/openworld)
    --set pilot      asset set to build (only "pilot" exists until the pilot is approved, 6.10)
    --only K1,K2     build only these keys (e.g. ow-asphalt-a,ow-bld-a01)
    --quick          low sample counts for layout checks (do not ship these images)

Writes the images under --out and a manifest of what was built to
tools/blender/openworld/preview/pilot-manifest.json. The game reads 画像/openworld/manifest.json, which
publish_manifest.py writes from it with the approved keys only, so it never picks up unapproved art.
"""

import argparse
import json
import os
import sys
import time

sys.dont_write_bytecode = True  # keep __pycache__ out of the repository
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

import ow_building  # noqa: E402
import ow_common as ow  # noqa: E402
import ow_ground  # noqa: E402
import ow_markings  # noqa: E402

PILOT_KEYS = [
    "ow-asphalt-a",
    "ow-sidewalk",
    "ow-dash-v",
    "ow-dash-h",
    "ow-zebra-v",
    "ow-zebra-h",
    "ow-bld-a01",
]


def builder_for(key):
    if key in ow_ground.GROUND_TILES:
        return ow_ground.build
    if key in ow_markings.MARKINGS:
        return ow_markings.build
    if key in ow_building.BUILDINGS:
        return ow_building.build
    raise KeyError(key)


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(prog="build_all.py")
    parser.add_argument("--out", default=os.path.join(ow.REPO_ROOT, "画像", "openworld"))
    parser.add_argument("--set", default="pilot", choices=["pilot"])
    parser.add_argument("--only", default="")
    parser.add_argument("--quick", action="store_true")
    parser.add_argument("--manifest", default=os.path.join(ow.HERE, "preview", "pilot-manifest.json"))
    return parser.parse_args(argv)


def main():
    args = parse_args()
    out_root = os.path.abspath(args.out)
    keys = PILOT_KEYS
    if args.only:
        wanted = [k.strip() for k in args.only.split(",") if k.strip()]
        keys = [k for k in keys if k in wanted]
    quality = 0.25 if args.quick else 1.0

    manifest_path = os.path.abspath(args.manifest)
    previous = {}
    if os.path.exists(manifest_path):
        with open(manifest_path, encoding="utf-8") as handle:
            previous = {a["key"]: a for a in json.load(handle).get("assets", [])}

    for key in keys:
        started = time.time()
        print(f"=== {key}")
        entries = builder_for(key)(key, out_root, samples_scale=quality)
        for entry in entries:
            previous[entry["key"]] = entry
        print(f"=== {key} done in {time.time() - started:.1f}s")

    manifest = {
        "version": 1,
        "scalePxPerMeter": ow.PX_PER_M,
        "facadeVerticalScale": ow.FACADE_K,
        "blenderVersion": bpy.app.version_string,
        "set": args.set,
        "assets": [previous[k] for k in sorted(previous)],
    }
    ow.ensure_dir(os.path.dirname(manifest_path))
    with open(manifest_path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"wrote {manifest_path}")


if __name__ == "__main__":
    main()
