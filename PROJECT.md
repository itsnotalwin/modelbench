# ModelBench Project

## Purpose
A static-hosted benchmark for comparing one-shot AI-generated websites, applications, games, simulations and creative tools. The dashboard presents submissions; prompts define the tasks; the inbox importer routes ZIP packages into immutable runs.

## Current benchmark shape
Ten standalone prompts in prompts/ each produce one complete project folder containing index.html and meta.json. The ZIP filename is not a routing key. The ZIP's meta.json supplies model, category, date and version.

## Key entry points
- index.html — dashboard UI.
- prompts/catalog.json — canonical challenge catalog used by the dashboard and importer.
- prompts/*.md — standalone challenge briefs and acceptance checks.
- tools/sort_inbox.py — safe ZIP intake, metadata validation and run creation.
- tools/build_manifest.py — generated dashboard manifest.
- .github/workflows/auto-sort.yml — inbox automation.

## Verify
Run python -m unittest discover -s tests -v, then python tools/sort_inbox.py and python tools/build_manifest.py. Keep prompt metadata, catalog slugs, ZIP importer and inbox documentation aligned. Preserve existing runs and the dashboard visual design unless explicitly requested.
