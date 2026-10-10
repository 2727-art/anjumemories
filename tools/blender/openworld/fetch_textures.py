"""Download the CC0 textures used by the open-world asset pipeline and record them in sources.json.

WORLD_DESIGN.md 6.4: only CC0 sites (Poly Haven, ambientCG). Downloads go to
asset-src/openworld/cache/ (git-ignored); sources.json is the record that lets anyone re-fetch them.

Usage (Python 3.10+, standard library only):
    python tools/blender/openworld/fetch_textures.py            # download missing files, rewrite sources.json
    python tools/blender/openworld/fetch_textures.py --verify   # check cached files against sources.json only

Files that already exist with the expected checksum are not downloaded again, and keep their
recorded downloadedAt.
"""

import argparse
import datetime
import hashlib
import io
import json
import os
import sys
import urllib.request
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
CACHE_DIR = os.path.join(REPO_ROOT, "asset-src", "openworld", "cache")
SOURCES_PATH = os.path.join(HERE, "sources.json")
USER_AGENT = "lastmemo-openworld-asset-pipeline/1.0 (local Blender build; CC0 textures)"

# Poly Haven map names -> role names used by the Blender scripts and sources.json.
POLYHAVEN_MAPS = {
    "color": "Diffuse",
    "normal": "nor_gl",
    "roughness": "Rough",
    "displacement": "Displacement",
    "ao": "AO",
}
# ambientCG file suffixes inside the download zip.
AMBIENTCG_MAPS = {
    "color": "Color",
    "opacity": "Opacity",
    "normal": "NormalGL",
    "roughness": "Roughness",
    "displacement": "Displacement",
}

# What the pilot (WORLD_DESIGN.md 6.10) uses. Add entries here for the remaining A-C assets.
TEXTURES = [
    {
        "id": "aerial_asphalt_01", "site": "polyhaven", "resolution": "2k",
        "maps": ["color", "normal", "roughness"],
        "usedFor": ["ow-asphalt-a (base, one repeat per tile)", "ow-asphalt-b (base, turned 90 degrees)", "ow-prop-crack-c (rim)"],
    },
    {
        "id": "asphalt_02", "site": "polyhaven", "resolution": "1k",
        "maps": ["color", "displacement"],
        "usedFor": ["ow-asphalt-a / -b, ow-parking (fine detail)", "ow-dash-*, ow-zebra-*, ow-edgeline-* (paint grain)"],
    },
    {
        "id": "concrete_pavers", "site": "polyhaven", "resolution": "1k",
        "maps": ["color", "normal", "displacement", "ao"],
        "usedFor": ["ow-sidewalk"],
    },
    {
        "id": "concrete_layers_02", "site": "polyhaven", "resolution": "1k",
        "maps": ["color", "normal", "roughness"],
        "usedFor": ["ow-bld-a01 (walls, parapet, penthouse)"],
    },
    {
        "id": "dirty_concrete", "site": "polyhaven", "resolution": "1k",
        "maps": ["color", "normal", "roughness"],
        "usedFor": ["ow-bld-a01 (roof slab)"],
    },
    {
        "id": "concrete_moss", "site": "polyhaven", "resolution": "1k",
        "maps": ["color"],
        "usedFor": ["ow-bld-a01 (moss on roof and wall base)", "ow-sidewalk (moss in joints)", "ow-plaza (moss along joints)"],
    },
    {
        "id": "rusted_shutter", "site": "polyhaven", "resolution": "1k",
        "maps": ["color", "normal", "roughness"],
        "usedFor": ["ow-bld-a01 (shop shutters)"],
    },
    {
        "id": "rusty_metal_02", "site": "polyhaven", "resolution": "1k",
        "maps": ["color", "normal", "roughness"],
        "usedFor": ["ow-bld-a01 (outdoor AC units, tank stand, pipes)"],
    },
    {
        "id": "Leaking003", "site": "ambientcg", "resolution": "1K-JPG",
        "maps": ["opacity"],
        "usedFor": ["ow-bld-a01 (rain streaks under windows)"],
    },
    {
        "id": "Leaking008", "site": "ambientcg", "resolution": "1K-JPG",
        "maps": ["opacity"],
        "usedFor": ["ow-bld-a01 (splash grime at the wall base)"],
    },
    # 6.10 step 5: the remaining ground tiles, markings and props.
    {
        "id": "grass_ground", "site": "polyhaven", "resolution": "1k",
        "maps": ["color", "normal"],
        "usedFor": ["ow-park (grass)", "ow-plaza / ow-lot (weeds)"],
    },
    {
        "id": "withered_grass", "site": "polyhaven", "resolution": "1k",
        "maps": ["color"],
        "usedFor": ["ow-park (dry grass)", "ow-lot / ow-parking (weeds)"],
    },
    {
        "id": "dry_decay_leaves", "site": "polyhaven", "resolution": "1k",
        "maps": ["color"],
        "usedFor": ["ow-park (leaf litter)"],
    },
    {
        "id": "brown_mud_leaves_01", "site": "polyhaven", "resolution": "1k",
        "maps": ["color"],
        "usedFor": ["ow-park (bare soil)", "ow-plaza (missing slabs)", "ow-lot (soil)", "ow-prop-crack-c (slopes)"],
    },
    {
        "id": "concrete_floor_01", "site": "polyhaven", "resolution": "1k",
        "maps": ["color", "normal"],
        "usedFor": ["ow-plaza (stone slabs)"],
    },
    {
        "id": "granular_concrete", "site": "polyhaven", "resolution": "1k",
        "maps": ["color", "normal"],
        "usedFor": ["ow-curb-h/-v", "ow-lot (old foundation slabs)", "ow-prop-drain (frame)", "ow-prop-debris-* (concrete chunks)"],
    },
    {
        "id": "asphalt_04", "site": "polyhaven", "resolution": "1k",
        "maps": ["color", "normal"],
        "usedFor": ["ow-parking", "ow-asphalt-b"],
    },
    {
        "id": "asphalt_07", "site": "polyhaven", "resolution": "1k",
        "maps": ["color"],
        "usedFor": ["ow-asphalt-b (repair patches)", "ow-prop-manhole (patch ring)"],
    },
    {
        "id": "gravel_ground_01", "site": "polyhaven", "resolution": "1k",
        "maps": ["color", "normal"],
        "usedFor": ["ow-lot (gravel)"],
    },
    {
        "id": "concrete_debris", "site": "polyhaven", "resolution": "1k",
        "maps": ["color"],
        "usedFor": ["ow-lot (rubble)", "ow-prop-debris-*", "ow-prop-crack-c (sinkhole)"],
    },
    {
        "id": "gravel", "site": "polyhaven", "resolution": "1k",
        "maps": ["color"],
        "usedFor": ["ow-asphalt-b (pothole fill)", "ow-prop-crack-*"],
    },
    {
        "id": "bark_brown_01", "site": "polyhaven", "resolution": "1k",
        "maps": ["color"],
        "usedFor": ["ow-prop-tree-* (branches)"],
    },
    {
        "id": "rust_coarse_01", "site": "polyhaven", "resolution": "1k",
        "maps": ["color", "normal", "roughness"],
        "usedFor": ["ow-prop-car-c-* (burnt-out car)", "ow-prop-barricade-* (feet)", "ow-prop-debris-c / -d (steel, rebar)"],
    },
    {
        "id": "LeafSet014", "site": "ambientcg", "resolution": "1K-JPG",
        "maps": ["color", "opacity"],
        "usedFor": ["ow-prop-tree-a (green canopy)", "ow-prop-puddle-* (floating leaves, hue-shifted to autumn)"],
    },
    {
        "id": "LeafSet007", "site": "ambientcg", "resolution": "1K-JPG",
        "maps": ["color", "opacity"],
        "usedFor": ["ow-prop-tree-b / -c (autumn and withered leaves)"],
    },
]


def http_get(url):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def http_json(url):
    return json.loads(http_get(url).decode("utf-8"))


def digest(path_or_bytes, algorithm):
    h = hashlib.new(algorithm)
    if isinstance(path_or_bytes, (bytes, bytearray)):
        h.update(path_or_bytes)
    else:
        with open(path_or_bytes, "rb") as handle:
            for chunk in iter(lambda: handle.read(1 << 20), b""):
                h.update(chunk)
    return h.hexdigest()


def rel(path):
    return os.path.relpath(path, REPO_ROOT).replace(os.sep, "/")


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_previous():
    if not os.path.exists(SOURCES_PATH):
        return {}
    try:
        with open(SOURCES_PATH, encoding="utf-8") as handle:
            data = json.load(handle)
        return {entry["id"]: entry for entry in data.get("textures", [])}
    except (OSError, ValueError, KeyError):
        return {}


def cached_record(spec, previous):
    """The previous record trimmed to the maps in spec, when every file is cached and checks out.

    Lets the script run offline (and skip the site APIs) once everything is downloaded.
    """
    maps = previous.get("maps") or {}
    if not previous or previous.get("resolution") != spec["resolution"] or any(role not in maps for role in spec["maps"]):
        return None
    for role in spec["maps"]:
        item = maps[role]
        path = os.path.join(REPO_ROOT, item["file"])
        if not os.path.exists(path):
            return None
        algorithm = "md5" if "md5" in item else "sha256"
        if digest(path, algorithm) != item.get(algorithm):
            return None
    record = dict(previous)
    record["maps"] = {role: maps[role] for role in spec["maps"]}
    record["downloadedAt"] = max(m["downloadedAt"] for m in record["maps"].values())
    record["usedFor"] = spec["usedFor"]
    for role in spec["maps"]:
        print(f"  ok      {maps[role]['file']}")
    return record


def fetch_polyhaven(spec, previous):
    cached = cached_record(spec, previous)
    if cached:
        return cached
    asset_id, res = spec["id"], spec["resolution"]
    info = http_json(f"https://api.polyhaven.com/info/{asset_id}")
    files = http_json(f"https://api.polyhaven.com/files/{asset_id}")
    out_dir = os.path.join(CACHE_DIR, "polyhaven", asset_id)
    os.makedirs(out_dir, exist_ok=True)
    maps = {}
    for role in spec["maps"]:
        entry = files[POLYHAVEN_MAPS[role]][res]["jpg"]
        url, md5, size = entry["url"], entry["md5"], entry["size"]
        path = os.path.join(out_dir, os.path.basename(url))
        old = (previous.get("maps") or {}).get(role, {})
        if os.path.exists(path) and digest(path, "md5") == md5:
            downloaded_at = old.get("downloadedAt") or previous.get("downloadedAt") or now_iso()
            print(f"  ok      {rel(path)}")
        else:
            data = http_get(url)
            if digest(data, "md5") != md5:
                raise RuntimeError(f"md5 mismatch for {url}")
            with open(path, "wb") as handle:
                handle.write(data)
            downloaded_at = now_iso()
            print(f"  fetched {rel(path)} ({len(data) // 1024} KB)")
        maps[role] = {"url": url, "file": rel(path), "bytes": size, "md5": md5, "downloadedAt": downloaded_at}
    dims = info.get("dimensions") or [0, 0]
    return {
        "id": asset_id,
        "site": "Poly Haven",
        "name": info.get("name", asset_id),
        "url": f"https://polyhaven.com/a/{asset_id}",
        "license": "CC0",
        "licenseUrl": "https://polyhaven.com/license",
        "authors": sorted((info.get("authors") or {}).keys()),
        "realWorldSizeMeters": [round(dims[0] / 1000.0, 3), round(dims[1] / 1000.0, 3)],
        "downloadedAt": max(m["downloadedAt"] for m in maps.values()),
        "resolution": res,
        "maps": maps,
        "usedFor": spec["usedFor"],
    }


def fetch_ambientcg(spec, previous):
    cached = cached_record(spec, previous)
    if cached:
        return cached
    asset_id, attribute = spec["id"], spec["resolution"]
    data = http_json(f"https://ambientcg.com/api/v2/full_json?id={asset_id}&include=downloadData")
    asset = data["foundAssets"][0]
    downloads = [
        item
        for folder in asset["downloadFolders"].values()
        for category in folder["downloadFiletypeCategories"].values()
        for item in category["downloads"]
        if item["attribute"] == attribute
    ]
    if not downloads:
        raise RuntimeError(f"{asset_id}: no {attribute} download")
    zip_url = downloads[0]["fullDownloadPath"]
    out_dir = os.path.join(CACHE_DIR, "ambientcg", asset_id)
    os.makedirs(out_dir, exist_ok=True)
    ext = ".png" if "PNG" in attribute else ".jpg"
    wanted = {role: f"{asset_id}_{attribute}_{AMBIENTCG_MAPS[role]}{ext}" for role in spec["maps"]}
    old_maps = previous.get("maps") or {}
    have_all = all(
        os.path.exists(os.path.join(out_dir, name)) and digest(os.path.join(out_dir, name), "sha256") == old_maps.get(role, {}).get("sha256")
        for role, name in wanted.items()
    )
    if have_all:
        downloaded_at = previous.get("downloadedAt") or now_iso()
        print(f"  ok      {rel(out_dir)}")
    else:
        archive = zipfile.ZipFile(io.BytesIO(http_get(zip_url)))
        members = {os.path.basename(name): name for name in archive.namelist()}
        for role, name in wanted.items():
            if name not in members:
                raise RuntimeError(f"{asset_id}: {name} missing in zip")
            # Write by basename only (never trust paths inside the archive).
            with open(os.path.join(out_dir, name), "wb") as handle:
                handle.write(archive.read(members[name]))
            print(f"  fetched {rel(os.path.join(out_dir, name))}")
        downloaded_at = now_iso()
    maps = {}
    for role, name in wanted.items():
        path = os.path.join(out_dir, name)
        maps[role] = {
            "url": zip_url,
            "zipMember": name,
            "file": rel(path),
            "bytes": os.path.getsize(path),
            "sha256": digest(path, "sha256"),
            "downloadedAt": downloaded_at,
        }
    return {
        "id": asset_id,
        "site": "ambientCG",
        "name": asset.get("displayName", asset_id),
        "url": f"https://ambientcg.com/view?id={asset_id}",
        "license": "CC0",
        "licenseUrl": "https://docs.ambientcg.com/license/",
        "authors": ["ambientCG (Lennart Demes)"],
        "realWorldSizeMeters": None,
        "downloadedAt": downloaded_at,
        "resolution": attribute,
        "maps": maps,
        "usedFor": spec["usedFor"],
    }


def verify_only():
    previous = load_previous()
    problems = 0
    for spec in TEXTURES:
        entry = previous.get(spec["id"])
        if not entry:
            print(f"missing record: {spec['id']}")
            problems += 1
            continue
        for role, item in entry["maps"].items():
            path = os.path.join(REPO_ROOT, item["file"])
            if not os.path.exists(path):
                print(f"missing file: {item['file']}")
                problems += 1
            elif "md5" in item and digest(path, "md5") != item["md5"]:
                print(f"checksum mismatch: {item['file']}")
                problems += 1
            elif "sha256" in item and digest(path, "sha256") != item["sha256"]:
                print(f"checksum mismatch: {item['file']}")
                problems += 1
    print("verify:", "OK" if problems == 0 else f"{problems} problem(s)")
    return problems == 0


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--verify", action="store_true", help="only check cached files against sources.json")
    args = parser.parse_args()
    if args.verify:
        sys.exit(0 if verify_only() else 1)

    previous = load_previous()
    records = []
    for spec in TEXTURES:
        print(f"{spec['site']}: {spec['id']} ({spec['resolution']})")
        fetch = fetch_polyhaven if spec["site"] == "polyhaven" else fetch_ambientcg
        records.append(fetch(spec, previous.get(spec["id"], {})))

    document = {
        "version": 1,
        "description": "CC0 textures used by tools/blender/openworld (WORLD_DESIGN.md 6.4). Re-fetch with fetch_textures.py.",
        "cacheDir": rel(CACHE_DIR),
        "proceduralOnly": [
            "window glass (shader only, no texture)",
            "lane/crosswalk paint (shader only; grain from asphalt_02)",
        ],
        "aiRepaint": [],
        "textures": records,
    }
    with open(SOURCES_PATH, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(document, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"wrote {rel(SOURCES_PATH)} ({len(records)} textures)")


if __name__ == "__main__":
    main()
