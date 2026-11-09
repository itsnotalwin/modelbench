"""Scan runs/*/meta.json and write manifest.json for the dashboard.
Also embeds the test catalog from prompts/catalog.json, so the dashboard needs one fetch.
Stdlib only. Run: python tools/build_manifest.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"
OUT = ROOT / "manifest.json"
CATALOG = json.loads((ROOT / "prompts" / "catalog.json").read_text(encoding="utf-8"))
SCORE_AXES = ["completeness", "robustness", "craft", "depth", "originality", "performance"]


def load_meta(run_dir: Path) -> dict:
    meta_path = run_dir / "meta.json"
    meta = {}
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            meta = {}
    slug = run_dir.name
    parts = slug.split("_")
    meta.setdefault("slug", slug)
    meta.setdefault("model", parts[1] if len(parts) > 1 else "unknown")
    meta.setdefault("category", parts[2] if len(parts) > 2 else "unknown")
    meta.setdefault("date", parts[0] if parts else "")
    meta.setdefault("entry", "index.html")
    meta.setdefault("path", f"runs/{slug}/{meta['entry']}")
    meta.setdefault("notes", "")
    meta.setdefault("log", {})
    scores = meta.setdefault("scores", {})
    for axis in SCORE_AXES:
        scores.setdefault(axis, None)
    meta["files"] = sorted(str(p.relative_to(run_dir)).replace("\\", "/") for p in run_dir.rglob("*") if p.is_file())
    return meta


def has_entry(run_dir: Path) -> bool:
    # Entry is meta.json's "entry" if set, else index.html.
    entry = "index.html"
    meta_path = run_dir / "meta.json"
    if meta_path.exists():
        try:
            entry = json.loads(meta_path.read_text(encoding="utf-8")).get("entry", entry)
        except Exception:
            pass
    return (run_dir / entry).exists()


def main() -> None:
    runs = []
    if RUNS.exists():
        for d in sorted(RUNS.iterdir()):
            if not d.is_dir() or d.name.startswith(("_", ".")):
                continue
            if not has_entry(d):
                continue
            runs.append(load_meta(d))
    runs.sort(key=lambda r: (r.get("date", ""), r.get("category", ""), r.get("model", "")), reverse=True)
    manifest = {
        "generated_from": "runs/",
        "count": len(runs),
        "catalog": CATALOG["prompts"],
        "axes": SCORE_AXES,
        "runs": runs,
    }
    OUT.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"manifest.json: {len(runs)} run(s), {len(CATALOG['prompts'])} tests")


if __name__ == "__main__":
    main()
