# ModelBench

ModelBench is a one-shot AI build benchmark focused on **web development, games, visual work and simulated worlds**. It contains twenty-two demanding challenges spanning those families. Each model run is one finished artifact.

**Live dashboard:** https://itsnotalwin.github.io/modelbench/

## How submissions work

1. Choose one of the twenty-two challenges in [Prompts](prompts/README.md).
2. The prompt identifies the executing model, uses the current system date and fixes version to `1`. No organiser input is required.
3. The model creates one folder named `CATEGORY__MODEL__YYYY-MM-DD__v1` containing `index.html`, `meta.json` and essential local assets only.
4. ZIP that folder.
5. Upload the ZIP to [inbox/](inbox/README.md). The importer routes from `meta.json`, not the ZIP filename.

## The challenges

- **01 Website** — open brief: any subject, brand, content and visual direction.
- **02 SaaS for Clearing Agents** — working customs-clearing product with real domain logic.
- **03 2D Game** — complete 2D game, genre chosen by the model.
- **04 3D Game** — complete 3D game, genre and camera chosen by the model.
- **05 Restaurant Website** — menu, reservations and ordering with a distinct identity.
- **06 Machine Explainer** — accurate interactive explanation of a real mechanism.
- **07 First-Person Game** — pointer-lock 3D game with authored environment.
- **08 Arcade Game** — score-attack design with seeded runs and a leaderboard.
- **09 Browser Operating System** — window manager, shared filesystem, eight-plus apps.
- **10 Rubik's Cube** — 3D cube with direct manipulation and a working solver.
- **11 Platformer** — original mechanic twist, four levels and a boss.
- **12 Living 3D World** — streaming procedural world with weather and inhabitants.
- **13 Data Story** — linked custom visualisations over a generated dataset.
- **14 Generative Art** — seeded, reproducible, real-time composition.
- **15 Music Instrument** — real Web Audio engine with sequencer and export.
- **16 Creative Tool** — layered non-destructive editing with real file IO.
- **17 Emergent Simulation** — thousands of agents from simple rules.
- **18 Strategy Game** — rules engine plus an AI built on real search.
- **19 Spreadsheet** — formula engine, 100k-row grid and charts.
- **20 Physics Engine** — rigid-body engine written from scratch.
- **21 Floating Pagoda Island** — the fixed subject: procedural pagoda on a floating island.
- **22 Production Site Refresh** — the fixed source: rebuild a live production portfolio a generation better.

## Metadata contract

Every ZIP must contain a UTF-8 `meta.json` at its project root:

```json
{
  "schema_version": 1,
  "model": "gpt-6",
  "category": "site-brand",
  "date": "2026-11-09",
  "version": 1,
  "entry": "index.html",
  "prompt": "01",
  "prompt_label": "Brand & Business Website",
  "notes": "A concise, honest description of the build and known limitations."
}
```

- `model`: runtime model slug, lowercase.
- `category`: one of the twenty-two canonical slugs.
- `date`: real ISO date in `YYYY-MM-DD`.
- `version`: always integer `1`; never ask or increment it.
- `entry`: `index.html` at project root.
- `prompt` and `prompt_label`: challenge number and title.
- `notes`: honest description and known limitations.

The sorter validates metadata, safely extracts the ZIP and creates `runs/{date}_{model}_{category}_v{n}/`. Invalid archives remain in inbox with actionable errors. Existing runs are never overwritten.

## Ratings

The six-axis rating system remains unchanged: completeness, robustness, craft, depth, originality and performance. Ratings are organizer-owned and stored in the current browser; export/import remains available.

## Repository map

```text
index.html                    dashboard UI
manifest.json                 generated dashboard data and twenty-two-challenge catalog
prompts/catalog.json          canonical challenge catalog
prompts/01-*.md … 22-*.md     twenty-two standalone challenge briefs
inbox/                        incoming ZIP packages and archived prior uploads
runs/<run-slug>/              accepted submissions
tools/sort_inbox.py           safe ZIP intake and routing
tools/build_manifest.py       generates manifest.json
tools/pwa.py                  dashboard and run install assets
tests/                         regression and dashboard tests
.github/workflows/auto-sort.yml
                               inbox automation
```

## Local maintenance

```bash
python -m unittest discover -s tests -v
node --test tests/dashboard-ratings.test.js
python tools/sort_inbox.py
python tools/build_manifest.py
python tools/pwa.py
python -m http.server 8000
```
