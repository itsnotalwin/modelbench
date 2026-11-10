# ModelBench Project

## Purpose
A static-hosted, one-shot AI benchmark spanning web development, games, visual work and simulated worlds. The fifteen challenges cover three web projects, six games, two visual tools and two world builds. Each model produces one finished artifact; the inbox importer routes ZIP packages into immutable runs.

## Current benchmark shape
Fifteen standalone prompts in `prompts/`. Prompts 01-06 are the original core (three web, three games) with 06 as the story-driven Game Masterpiece capstone; 07-15 add the machine explainer, first-person game, browser OS, living world, generative art, creative tool, strategy AI, physics engine and the fixed-brief Floating Pagoda Island.

## Key entry points
- `index.html` — dashboard.
- `prompts/catalog.json` — canonical challenge catalog used by dashboard and importer.
- `prompts/*.md` — standalone challenge briefs.
- `tools/sort_inbox.py` — safe ZIP intake and metadata validation.
- `tools/build_manifest.py` — generated dashboard manifest.
- `.github/workflows/auto-sort.yml` — inbox automation.

## Verify
Run `python -m unittest discover -s tests -v` and `node --test tests/dashboard-ratings.test.js`. Keep prompts, catalog, dashboard labels and importer validation aligned. Existing submissions are immutable; only an explicit organizer reset may clear runs.
