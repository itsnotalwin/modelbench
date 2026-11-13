# ModelBench Project

## Purpose
A static-hosted, one-shot AI benchmark spanning web development, games, visual work and simulated worlds. The twenty-two challenges span websites, applications, games, visual tools, simulations and worlds. Each model produces one finished artifact; the inbox importer routes ZIP packages into immutable runs.

## Current benchmark shape
Twenty-two standalone prompts in `prompts/`, 01-22. Prompts 01-20 are themed open briefs; 21 is a fixed subject (Floating Pagoda Island); 22 is a fixed source (refresh the live Shutterhaus Visuals site).

## Key entry points
- `index.html` — dashboard.
- `prompts/catalog.json` — canonical challenge catalog used by dashboard and importer.
- `prompts/*.md` — standalone challenge briefs.
- `tools/sort_inbox.py` — safe ZIP intake and metadata validation.
- `tools/build_manifest.py` — generated dashboard manifest.
- `.github/workflows/auto-sort.yml` — inbox automation.

## Verify
Run `python -m unittest discover -s tests -v` and `node --test tests/dashboard-ratings.test.js`. Keep prompts, catalog, dashboard labels and importer validation aligned. Existing submissions are immutable; only an explicit organizer reset may clear runs.
