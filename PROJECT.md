# ModelBench Project

## Purpose
A static-hosted, one-shot AI benchmark focused on web development and game development. The six challenges are three web projects and three games. Each model produces one finished artifact; the inbox importer routes ZIP packages into immutable runs.

## Current benchmark shape
Six standalone prompts in `prompts/`: three web-development prompts followed by three game-development prompts. Prompt 06 is the end-to-end story-driven Game Masterpiece capstone.

## Key entry points
- `index.html` — dashboard.
- `prompts/catalog.json` — canonical challenge catalog used by dashboard and importer.
- `prompts/*.md` — standalone challenge briefs.
- `tools/sort_inbox.py` — safe ZIP intake and metadata validation.
- `tools/build_manifest.py` — generated dashboard manifest.
- `.github/workflows/auto-sort.yml` — inbox automation.

## Verify
Run `python -m unittest discover -s tests -v` and `node --test tests/dashboard-ratings.test.js`. Keep prompts, catalog, dashboard labels and importer validation aligned. Existing submissions are immutable; only an explicit organizer reset may clear runs.
