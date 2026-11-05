"""Local helper: scaffold a run folder, or just validate a filename.
Usage: python tools/new_run.py --model claude-sonnet-4-5 --category website [--version 1]
Prints the exact filename to use when uploading via GitHub web into inbox/.
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--category", required=True, choices=["website", "saas", "game2d", "game3d"])
    ap.add_argument("--version", type=int, default=1)
    ap.add_argument("--date", default="")
    args = ap.parse_args()
    from datetime import date
    d = args.date or date.today().isoformat()
    model = args.model.lower().replace(" ", "-")
    slug = f"{d}_{model}_{args.category}_v{args.version}"
    print(f"Upload into inbox/ as:  {args.category}__{model}__{d}__v{args.version}.html")
    print(f"  (or .zip if the model output is a folder — zip must have index.html at its root)")
    print(f"Target after Action:    runs/{slug}/index.html")
    run_dir = RUNS / slug
    run_dir.mkdir(parents=True, exist_ok=True)
    meta = run_dir / "meta.json"
    if not meta.exists():
        meta.write_text(json.dumps({
            "slug": slug, "model": model, "category": args.category, "date": d,
            "version": args.version, "entry": "index.html",
            "path": f"runs/{slug}/index.html",
            "scores": {"visual": None, "functionality": None, "prompt_following": None},
            "notes": "",
        }, indent=2) + "\n", encoding="utf-8")
    print(f"Scaffolded (local only, not pushed unless you add it): {run_dir}")


if __name__ == "__main__":
    main()
