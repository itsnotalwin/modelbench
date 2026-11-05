"""Sort inbox/ uploads into runs/{date}_{model}_{category}_v{n}/ and rebuild manifest.
Stdlib only. Run locally: python tools/sort_inbox.py  (also run by GitHub Action)

Accepted inbox filenames (case-insensitive extension):
  {category}__{model}__{YYYY-MM-DD}__v{n}.html
  {category}__{model}__{YYYY-MM-DD}__v{n}.zip
Categories: website | saas | game2d | game3d
Model: lowercase letters, digits, hyphens (e.g. claude-sonnet-4-5, gpt-5, grok-4-1)
.zip must contain a single top folder (or files at root) with index.html at its root.
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
CATEGORIES = {"website", "saas", "game2d", "game3d"}
PATTERN = re.compile(
    r"^(?P<category>[a-z0-9]+)__(?P<model>[a-z0-9][a-z0-9\-]*)__(?P<date>\d{4}-\d{2}-\d{2})__v(?P<n>\d+)$",
    re.IGNORECASE,
)


def parse(stem: str):
    m = PATTERN.match(stem.strip())
    if not m:
        return None
    category = m.group("category").lower()
    if category not in CATEGORIES:
        return None
    return {
        "category": category,
        "model": m.group("model").lower(),
        "date": m.group("date"),
        "v": int(m.group("n")),
    }


def slug_for(info) -> str:
    return f"{info['date']}_{info['model']}_{info['category']}_v{info['v']}"


def write_meta(run_dir: Path, info, source_name: str) -> None:
    meta_path = run_dir / "meta.json"
    if meta_path.exists():
        return
    meta = {
        "slug": run_dir.name,
        "model": info["model"],
        "category": info["category"],
        "date": info["date"],
        "version": info["v"],
        "entry": "index.html",
        "path": f"runs/{run_dir.name}/index.html",
        "source_file": source_name,
        "scores": {"visual": None, "functionality": None, "prompt_following": None},
        "notes": "",
    }
    meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")


def safe_extract(zf: zipfile.ZipFile, dest: Path) -> None:
    dest_resolved = dest.resolve()
    for member in zf.infolist():
        target = (dest / member.filename).resolve()
        if not str(target).startswith(str(dest_resolved)):
            raise ValueError(f"unsafe zip entry: {member.filename}")
    zf.extractall(dest)


def handle_zip(src: Path, run_dir: Path) -> None:
    run_dir.mkdir(parents=True, exist_ok=True)
    tmp = run_dir.parent / (run_dir.name + ".__tmp__")
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir(parents=True)
    with zipfile.ZipFile(src) as zf:
        safe_extract(zf, tmp)
    # If zip has a single top-level folder, use its contents; else use root.
    children = [p for p in tmp.iterdir() if not p.name.startswith("__MACOSX")]
    if len(children) == 1 and children[0].is_dir():
        src_root = children[0]
    else:
        src_root = tmp
    if not (src_root / "index.html").exists():
        shutil.rmtree(tmp, ignore_errors=True)
        raise ValueError("zip must contain index.html at the root of its folder")
    for item in src_root.iterdir():
        dest = run_dir / item.name
        if dest.exists():
            shutil.rmtree(dest) if dest.is_dir() else dest.unlink()
        shutil.move(str(item), str(dest))
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
        info = parse(f.stem)
        if not info or f.suffix.lower() not in {".html", ".htm", ".zip"}:
            skipped.append(f.name)
            print(f"SKIP (bad name): {f.name}")
            continue
        slug = slug_for(info)
        run_dir = RUNS / slug
        if run_dir.exists() and (run_dir / "index.html").exists():
            skipped.append(f.name)
            print(f"SKIP (already exists): {slug}")
            continue
        try:
            if f.suffix.lower() == ".zip":
                handle_zip(f, run_dir)
            else:
                handle_html(f, run_dir)
        except Exception as e:
            print(f"ERROR {f.name}: {e}")
            skipped.append(f.name)
            continue
        write_meta(run_dir, info, f.name)
        f.unlink()
        moved.append(slug)
        print(f"MOVED {f.name} -> runs/{slug}/")
    # Rebuild manifest always (cheap, keeps dashboard in sync)
    sys.path.insert(0, str(ROOT / "tools"))
    import build_manifest
    build_manifest.main()
    print(f"done: moved={moved} skipped={skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
