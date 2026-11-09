"""Print the ModelBench output-folder and ZIP metadata contract."""
import argparse
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "prompts" / "catalog.json").read_text(encoding="utf-8"))
PROMPTS = {p["slug"]: p for p in CATALOG["prompts"]}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--category", required=True, choices=sorted(PROMPTS))
    parser.add_argument("--version", type=int, default=1)
    parser.add_argument("--date", default="")
    args = parser.parse_args()

    model = args.model.lower().replace(" ", "-")
    if not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", model):
        parser.error("--model must be a slug using lowercase letters, digits, hyphens and dots")
    if args.version < 1:
        parser.error("--version must be a positive integer")
    run_date = args.date or date.today().isoformat()
    try:
        parsed = date.fromisoformat(run_date)
    except ValueError:
        parser.error("--date must be a real date in YYYY-MM-DD format")
    if parsed.isoformat() != run_date:
        parser.error("--date must use YYYY-MM-DD format")

    prompt = PROMPTS[args.category]
    folder = f"{args.category}__{model}__{run_date}__v{args.version}"
    metadata = {
        "schema_version": 1,
        "model": model,
        "category": args.category,
        "date": run_date,
        "version": args.version,
        "entry": "index.html",
        "prompt": prompt["no"],
        "prompt_label": prompt["title"],
        "notes": "Describe the completed build and any known limitations."
    }
    print(f"Create folder: {folder}/")
    print("Put index.html and meta.json at its root; add assets/ only when required.")
    print("ZIP the folder and upload it to inbox/ (the ZIP filename may be anything).")
    print("Required metadata:")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
