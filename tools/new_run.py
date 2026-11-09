"""Local helper: print the exact upload filename for a model + test.
Usage: python tools/new_run.py --model claude-sonnet-4-5 --category website [--version 1] [--date 2026-11-09]
Prints the filename to upload into inbox/ via GitHub web. Writes nothing.
"""
import argparse
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "prompts" / "catalog.json").read_text(encoding="utf-8"))
SLUGS = [p["slug"] for p in CATALOG["prompts"]]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--category", required=True, choices=SLUGS)
    ap.add_argument("--version", type=int, default=1)
    ap.add_argument("--date", default="")
    args = ap.parse_args()
    d = args.date or date.today().isoformat()
    model = args.model.lower().replace(" ", "-")
    print(f"Upload into inbox/ as:  {args.category}__{model}__{d}__v{args.version}.html")
    print(f"Becomes:                runs/{d}_{model}_{args.category}_v{args.version}/index.html")


if __name__ == "__main__":
    main()
