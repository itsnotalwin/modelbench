"""Sort inbox/ uploads into runs/{date}_{model}_{category}_v{n}/ and rebuild manifest.json.
Stdlib only. Run locally: python tools/sort_inbox.py  (also run by the GitHub Action)

Categories come from prompts/catalog.json, the single source of truth.

Accepted inbox filenames (case-insensitive extension):
  {category}__{model}__{YYYY-MM-DD}__v{n}.html   <- the normal upload
  {category}__{model}__{YYYY-MM-DD}__v{n}.zip    <- folder outputs, index.html at its root
Model: lowercase letters, digits, hyphens and dots (e.g. claude-sonnet-4-5, glm-5.3-flash, gpt-5)

The run lands in runs/{date}_{model}_{category}_v{n}/ with index.html as its entry.
Existing runs are never overwritten: a retest is always a new v{n}.
"""
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INBOX = ROOT / "inbox"
RUNS = ROOT / "runs"
CATALOG = json.loads((ROOT / "prompts" / "catalog.json").read_text(encoding="utf-8"))
PROMPTS = {p["slug"]: p for p in CATALOG["prompts"]}
CATEGORIES = set(PROMPTS)

# Model slug aliases: normalise variant spellings to one canonical slug so a
# model's runs always group together in the dashboard.
MODEL_ALIASES = {
    "glm-5-3-flash": "glm-5.3-flash",
}

SCORE_AXES = ["completeness", "robustness", "craft", "depth", "originality", "performance"]

PATTERN = re.compile(
    r"^(?P<category>[a-z0-9]+)__(?P<model>[a-z0-9][a-z0-9\-.]*?)__(?P<date>\d{4}-\d{2}-\d{2})__v(?P<n>\d+)$",
    re.IGNORECASE,
)


def normalise_model(model: str) -> str:
    model = model.lower()
    return MODEL_ALIASES.get(model, model)


def parse(stem: str):
    m = PATTERN.match(stem.strip())
    if not m:
        return None
    category = m.group("category").lower()
    if category not in CATEGORIES:
        return None
    return {
        "category": category,
        "model": normalise_model(m.group("model")),
        "date": m.group("date"),
        "v": int(m.group("n")),
    }


def slug_for(info) -> str:
    return f"{info['date']}_{info['model']}_{info['category']}_v{info['v']}"


def write_meta(run_dir: Path, info, source_name: str, entry: str = "index.html") -> None:
    meta_path = run_dir / "meta.json"
    if meta_path.exists():
        return
    prompt = PROMPTS[info["category"]]
    meta = {
        "slug": run_dir.name,
        "model": info["model"],
        "category": info["category"],
        "prompt": prompt["no"],
        "prompt_label": prompt["title"],
        "date": info["date"],
        "version": info["v"],
        "entry": entry,
        "path": f"runs/{run_dir.name}/{entry}",
        "source_file": source_name,
        "scores": {axis: None for axis in SCORE_AXES},
        "log": {"ran_first_try": None, "console_errors": None, "fps": None, "file_size_kb": None},
        "notes": "" if entry == "index.html" else f"Entry is {entry} (not index.html). Run it locally per the folder's README.",
    }
    meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")


def safe_extract(zf: zipfile.ZipFile, dest: Path) -> None:
    dest_resolved = dest.resolve()
    for member in zf.infolist():
        target = (dest / member.filename).resolve()
        if not str(target).startswith(str(dest_resolved)):
            raise ValueError(f"unsafe zip entry: {member.filename}")
    zf.extractall(dest)


def handle_zip(src: Path, run_dir: Path) -> str:
    """The folder inside the zip (whatever the model called it) becomes runs/<slug>/,
    contents untouched. Entry priority: index.html > any root .html > README.md.
    Returns the entry path relative to run_dir."""
    run_dir.mkdir(parents=True, exist_ok=True)
    tmp = run_dir.parent / (run_dir.name + ".__tmp__")
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir(parents=True)
    try:
        with zipfile.ZipFile(src) as zf:
            safe_extract(zf, tmp)
        children = [p for p in tmp.iterdir() if not p.name.startswith("__MACOSX")]
        if len(children) == 1 and children[0].is_dir():
            src_root = children[0]
        else:
            src_root = tmp
        if (src_root / "index.html").exists():
            entry = "index.html"
        else:
            htmls = sorted(p.name for p in src_root.iterdir() if p.is_file() and p.suffix.lower() in {".html", ".htm"})
            if htmls:
                entry = htmls[0]
            elif (src_root / "README.md").exists():
                entry = "README.md"
            else:
                raise ValueError("zip must contain index.html (or a root .html / README.md)")
        for item in list(src_root.iterdir()):
            dest = run_dir / item.name
            if dest.exists():
                shutil.rmtree(dest) if dest.is_dir() else dest.unlink()
            shutil.move(str(item), str(dest))
        return entry
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def handle_html(src: Path, run_dir: Path) -> None:
    run_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, run_dir / "index.html")


def main() -> int:
    moved, skipped = [], []
    if not INBOX.exists():
        print("no inbox/")
        return 0
    for f in sorted(INBOX.iterdir()):
        if f.is_dir() or f.name.startswith(".") or f.name.lower() == "readme.md":
            continue
        if f.suffix.lower() not in {".html", ".htm", ".zip"}:
            skipped.append(f.name)
            print(f"SKIP (unsupported extension, use .html or .zip, never .rar): {f.name}")
            continue
        info = parse(f.stem)
        if not info:
            skipped.append(f.name)
            print(f"SKIP (bad name, want {{category}}__{{model}}__{{date}}__v{{n}} with a category from prompts/catalog.json): {f.name}")
            continue
        slug = slug_for(info)
        run_dir = RUNS / slug
        if run_dir.exists() and (run_dir / "meta.json").exists():
            skipped.append(f.name)
            print(f"SKIP (already exists, bump v{{n}} for a retest): {slug}")
            continue
        try:
            entry = "index.html"
            if f.suffix.lower() == ".zip":
                entry = handle_zip(f, run_dir)
            else:
                handle_html(f, run_dir)
        except Exception as e:  # keep the file in inbox/ and log why
            print(f"ERROR {f.name}: {e}")
            skipped.append(f.name)
            continue
        write_meta(run_dir, info, f.name, entry)
        f.unlink()
        moved.append(slug)
        print(f"MOVED {f.name} -> runs/{slug}/")
    sys.path.insert(0, str(ROOT / "tools"))
    import build_manifest
    build_manifest.main()
    print(f"done: moved={moved} skipped={skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
