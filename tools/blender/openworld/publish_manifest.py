"""Publish approved assets to 画像/openworld/manifest.json, the file the game reads (WORLD_DESIGN.md 6.7).

    python tools/blender/openworld/publish_manifest.py
    python tools/blender/openworld/publish_manifest.py --exclude ow-bld-a01   # leave unapproved keys out
    python tools/blender/openworld/publish_manifest.py --only ow-asphalt-a,ow-sidewalk

Standard library only. Reads the manifest written by build_all.py (default: preview/build-manifest.json),
keeps the approved keys and adds "hash" to each asset: the first 12 hex digits of the SHA-256 of its
files. The game requests every file as <file>?v=<hash>, so re-rendered images reach players even though
画像/* is served with an immutable cache header (_headers). The manifest itself is requested with a
fresh query on every load.

Run verify_assets.py --manifest 画像/openworld/manifest.json afterwards; it also checks the hashes.
"""

import argparse
import hashlib
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
DEFAULT_ROOT = os.path.join(REPO_ROOT, "画像", "openworld")
HASH_LENGTH = 12
BUILDING_FILE_FIELDS = ("roof", "roofEmit", "south", "southEmit")
PROP_EXTRA_FIELDS = ("water",)  # optional companion images of a prop, hashed after its "file"


def asset_files(asset):
    """Files of one manifest entry, relative to the asset root, in a fixed order."""
    if asset.get("type") == "building":
        return [asset[field] for field in BUILDING_FILE_FIELDS if asset.get(field)]
    return [asset["file"]] + [asset[field] for field in PROP_EXTRA_FIELDS if asset.get(field)]


def asset_hash(root, asset):
    digest = hashlib.sha256()
    for rel in asset_files(asset):
        with open(os.path.join(root, rel), "rb") as handle:
            digest.update(handle.read())
    return digest.hexdigest()[:HASH_LENGTH]


def split_keys(text):
    return [key.strip() for key in text.split(",") if key.strip()]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=os.path.join(HERE, "preview", "build-manifest.json"))
    parser.add_argument("--root", default=DEFAULT_ROOT)
    parser.add_argument("--out", default=os.path.join(DEFAULT_ROOT, "manifest.json"))
    parser.add_argument("--only", default="", help="publish only these keys (comma separated)")
    parser.add_argument("--exclude", default="", help="leave these keys out (comma separated)")
    args = parser.parse_args()

    with open(args.source, encoding="utf-8") as handle:
        source = json.load(handle)
    only, exclude = set(split_keys(args.only)), set(split_keys(args.exclude))
    unknown = (only | exclude) - {asset["key"] for asset in source["assets"]}
    if unknown:
        parser.error(f"unknown keys: {sorted(unknown)}")

    assets = []
    for asset in source["assets"]:
        if (only and asset["key"] not in only) or asset["key"] in exclude:
            continue
        published = dict(asset)
        published["hash"] = asset_hash(args.root, asset)
        assets.append(published)

    manifest = {key: value for key, value in source.items() if key not in ("set", "assets")}
    manifest["assets"] = sorted(assets, key=lambda asset: asset["key"])
    with open(args.out, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"wrote {os.path.relpath(args.out, REPO_ROOT)} ({len(assets)} assets)")
    for asset in manifest["assets"]:
        print(f"  {asset['key']:16s} {asset['hash']}")


if __name__ == "__main__":
    main()
