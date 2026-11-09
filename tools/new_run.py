"""Print the ModelBench output-folder and ZIP metadata contract.

The prompt suite derives model identity and date automatically. This helper
uses an optional model override or a model identifier from the environment.
Version is intentionally fixed at 1 for every prompt-generated run.
"""
import argparse
import json
import os
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "prompts" / "catalog.json").read_text(encoding="utf-8"))
PROMPTS = {p["slug"]: p for p in CATALOG["prompts"]}
MODEL_ENV_VARS = ("MODELBENCH_MODEL", "MODEL_ID", "OPENAI_MODEL", "ANTHROPIC_MODEL", "GEMINI_MODEL", "GOOGLE_MODEL")


def normalise_model(value: str) -> str:
    """Convert a runtime model identifier/display name to the importer's safe slug."""
    label = value.strip().lower()
    if "/" in label:
        label = label.rsplit("/", 1)[-1]
    label = re.sub(r"[^a-z0-9.-]+", "-", label)
    label = re.sub(r"-{2,}", "-", label).strip(".-")
    if not re.fullmatch(r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?", label):
        raise ValueError("model identifier could not be converted to a safe slug")
    return label


def detect_model() -> str:
    """Use an available model environment variable, otherwise an explicit unknown marker."""
    for key in MODEL_ENV_VARS:
        value = os.environ.get(key, "").strip()
        if value:
            return normalise_model(value)
    return "unknown-model"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=None, help="optional explicit model override; otherwise detected from runtime environment")
    parser.add_argument("--category", required=True, choices=sorted(PROMPTS))
    parser.add_argument("--date", default="", help="optional date override; defaults to the current system date")
    args = parser.parse_args()

    try:
        model = normalise_model(args.model) if args.model else detect_model()
    except ValueError as exc:
        parser.error(str(exc))

    run_date = args.date or date.today().isoformat()
    try:
        parsed = date.fromisoformat(run_date)
    except ValueError:
        parser.error("--date must be a real date in YYYY-MM-DD format")
    if parsed.isoformat() != run_date:
        parser.error("--date must use YYYY-MM-DD format")

    version = 1
    prompt = PROMPTS[args.category]
    folder = f"{args.category}__{model}__{run_date}__v{version}"
    metadata = {
        "schema_version": 1,
        "model": model,
        "category": args.category,
        "date": run_date,
        "version": version,
        "entry": "index.html",
        "prompt": prompt["no"],
        "prompt_label": prompt["title"],
        "notes": "Describe the completed build and any known limitations."
    }
    if model == "unknown-model":
        print("NOTICE: no model identifier was available in the environment; set MODELBENCH_MODEL to identify this run.")
    print(f"Create folder: {folder}/")
    print("Put index.html and meta.json at its root; add assets/ only when required.")
    print("ZIP the folder and upload it to inbox/ (the ZIP filename may be anything).")
    print("Version is fixed at 1.")
    print("Required metadata:")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
