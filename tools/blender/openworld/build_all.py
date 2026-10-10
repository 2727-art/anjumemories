"""Render the open-world assets (WORLD_DESIGN.md 6).

Run with Blender (background mode):
    & "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" --background --factory-startup `
        --python tools/blender/openworld/build_all.py -- --out 画像/openworld

Options after "--":
    --out DIR        output root (default: 画像/openworld)
    --set pilot|all  asset set to build: the 6.10 pilot, or every asset of 6.6 A-D (default: all)
    --only K1,K2     build only these keys of the set (e.g. ow-asphalt-a,ow-bld-a01)
    --quick          low sample counts for layout checks (do not ship these images)

Writes the images under --out and a manifest of what was built to
tools/blender/openworld/preview/build-manifest.json (entries of earlier runs are kept). The game reads 画像/openworld/manifest.json, which
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
import ow_props  # noqa: E402

PILOT_KEYS = [
    "ow-asphalt-a",
    "ow-sidewalk",
    "ow-dash-v",
    "ow-dash-h",
    "ow-zebra-v",
    "ow-zebra-h",
    "ow-bld-a01",
]
# Everything in 6.6 A-D, in the order that matters most in game (ground first, props last).
ALL_KEYS = PILOT_KEYS[:-1] + [
    "ow-park", "ow-plaza", "ow-parking", "ow-lot", "ow-asphalt-b",
    "ow-curb-h", "ow-curb-v", "ow-edgeline-v", "ow-edgeline-h", "ow-grit",
] + ow_props.keys() + ["ow-bld-a01"]
SETS = {"pilot": PILOT_KEYS, "all": ALL_KEYS}


def builder_for(key):
    if key in ow_ground.keys():
        return ow_ground.build
    if key in ow_markings.MARKINGS:
        return ow_markings.build
    if key in ow_building.BUILDINGS:
        return ow_building.build
    if key in ow_props.keys():
        return ow_props.build
    raise KeyError(key)


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(prog="build_all.py")
    parser.add_argument("--out", default=os.path.join(ow.REPO_ROOT, "画像", "openworld"))
    parser.add_argument("--set", default="all", choices=sorted(SETS))
    parser.add_argument("--only", default="")
    parser.add_argument("--quick", action="store_true")
    parser.add_argument("--manifest", default=os.path.join(ow.HERE, "preview", "build-manifest.json"))
    return parser.parse_args(argv)


def main():
    args = parse_args()
    out_root = os.path.abspath(args.out)
    keys = SETS[args.set]
    if args.only:
        wanted = [k.strip() for k in args.only.split(",") if k.strip()]
        unknown = sorted(set(wanted) - set(keys))
        if unknown:
            raise SystemExit(f"not in --set {args.set}: {unknown}")
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
        "assets": [previous[k] for k in sorted(previous)],
    }
    ow.ensure_dir(os.path.dirname(manifest_path))
    with open(manifest_path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"wrote {manifest_path}")


if __name__ == "__main__":
    main()
