"""Refresh the compact catalog that the Next.js explorer renders.

Reads the repo's own manifest.json, runs/ and prompts/ by default, so it stays in
step with tools/build_manifest.py and needs no network access. Pass --remote to
bootstrap from the published GitHub files instead.

Editorial copy (title, description, cover art) is carried over from the existing
src/data/catalog.json, so a rebuild never invents new copy or rescoring.
"""
import argparse
import concurrent.futures
import html
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://raw.githubusercontent.com/itsnotalwin/modelbench/main/"
CATALOG = ROOT / "src" / "data" / "catalog.json"

# Display names come from the artifacts themselves, never from invented scores.
CURATED = {
    ("beam-free", "website"): ("Gravity", "A generative study of motion and attraction.", "gravity", 1),
    ("ernie-5.5-flash-preview-free", "game-2d"): ("Lumenfall", "An arcade survival game of light and wind.", "lumenfall", 2),
    ("ernie-5.5-flash-preview-free", "restaurant"): ("Marrow & Tide", "A wood-fired kitchen on the coast of Maine.", "marrow-tide", 3),
    ("longcat-2.5-free", "website"): ("Halftone", "An interactive almanac of the monochrome image.", "halftone", 4),
    ("beam-free", "saas"): ("ClearDesk", "A connected workspace for freight operations.", "cleardesk", 5),
    ("claude-sonnet-5-5", "website"): ("Gnomon", "An interactive exploration of time and shadow.", "gnomon", 6),
}
ART_BY_CATEGORY = {
    "website": "halftone", "saas": "cleardesk", "game-2d": "lumenfall",
    "restaurant": "marrow-tide", "site-refresh": "gnomon",
}
BLURB_BY_CATEGORY = {
    "website": "A complete, model-built editorial experience.",
    "saas": "A working customs and clearance workspace.",
    "game-2d": "A self-contained, single-prompt arcade game.",
    "restaurant": "An independent restaurant, brought to life.",
    "site-refresh": "A one-shot refresh of a production portfolio.",
}
FIELDS = ("no", "slug", "title", "family", "summary", "requirement")


class Source:
    """Repo files by default; the published site with --remote."""

    def __init__(self, remote: bool):
        self.remote = remote

    def text(self, path: str) -> str:
        local = ROOT / path
        if not self.remote and local.is_file():
            return local.read_text(encoding="utf-8")
        return urllib.request.urlopen(
            SOURCE + urllib.parse.quote(path, safe="/"), timeout=35
        ).read().decode("utf-8")


def previous_runs() -> dict:
    if not CATALOG.is_file():
        return {}
    try:
        data = json.loads(CATALOG.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    return {run["slug"]: run for run in data.get("runs", [])}


def title_from_artifact(item: dict, src: Source) -> str:
    fallback = item.get("prompt_label") or item["category"]
    try:
        source = src.text(item["path"])
    except Exception:
        return fallback
    match = re.search(r"<title[^>]*>(.*?)</title>", source, re.S | re.I)
    full = html.unescape(match[1].strip()) if match else fallback
    title = re.split(r"\s[—·|]\s|: ", full)[0]
    if item["category"] == "site-refresh":
        title = "Shutterhaus Visuals"
    return title.title() if title.isupper() else title


def run_entry(item: dict, known: dict | None, src: Source) -> dict:
    entry = {
        "slug": item["slug"], "model": item["model"], "category": item["category"],
        "date": item["date"], "path": item["path"], "notes": item.get("notes", ""),
        "version": item.get("version", 1), "scores": item.get("scores", {}),
    }
    if known:  # Keep established editorial copy and ordering.
        entry.update({k: known[k] for k in ("title", "description", "art") if k in known})
        entry["position"] = known.get("position", int(known.get("number", 100) or 100))
    if "title" not in entry:
        curated = CURATED.get((item["model"], item["category"]))
        if curated:
            title, description, art, position = curated
        else:
            title = title_from_artifact(item, src)
            description = BLURB_BY_CATEGORY.get(item["category"], item.get("prompt_label", item["category"]))
            art = ART_BY_CATEGORY.get(item["category"], "gravity")
            position = 100
        entry.update(title=title, description=description, art=art, position=position)
    return entry


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--remote", action="store_true", help="read the published manifest instead of the repo")
    args = parser.parse_args()

    src = Source(args.remote)
    manifest = json.loads(src.text("manifest.json"))
    known = previous_runs()

    def brief(item: dict) -> None:
        dest = ROOT / "public" / "briefs" / (item["slug"] + ".md")
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(src.text(f"prompts/{item['no']}-{item['slug']}.md"), encoding="utf-8")

    with concurrent.futures.ThreadPoolExecutor(8) as pool:
        runs = list(pool.map(lambda r: run_entry(r, known.get(r["slug"]), src), manifest["runs"]))
        list(pool.map(brief, manifest["catalog"]))

    runs.sort(key=lambda run: (run["position"], run["date"], run["slug"]))
    for index, run in enumerate(runs):
        run["number"] = str(index + 1).zfill(3)
        del run["position"]

    challenges = [{field: c[field] for field in FIELDS} for c in manifest["catalog"]]
    payload = {"challenges": challenges, "runs": runs}
    CATALOG.parent.mkdir(parents=True, exist_ok=True)
    CATALOG.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Synced {len(runs)} runs and {len(challenges)} challenge briefs ({CATALOG.stat().st_size:,} bytes).")


if __name__ == "__main__":
    main()
