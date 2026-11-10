# ModelBench

ModelBench is a one-shot AI build benchmark focused on **web development, games, visual work and simulated worlds**. It contains fifteen demanding challenges spanning those families. Each model run is one finished artifact.

**Live dashboard:** https://itsnotalwin.github.io/modelbench/

## How submissions work

1. Choose one of the fifteen challenges in [Prompts](prompts/README.md).
2. The prompt identifies the executing model, uses the current system date and fixes version to `1`. No organiser input is required.
3. The model creates one folder named `CATEGORY__MODEL__YYYY-MM-DD__v1` containing `index.html`, `meta.json` and essential local assets only.
4. ZIP that folder.
5. Upload the ZIP to [inbox/](inbox/README.md). The importer routes from `meta.json`, not the ZIP filename.

## The fifteen challenges

- **01 Brand & Business Website** — responsive brand website and enquiry flow.
- **02 Interactive Content Website** — rich content, storytelling and useful interactions.
- **03 Complete Web Application** — connected workflows and persistent application state.
- **04 Original 2D Game** — genre and creative direction chosen by the model.
- **05 Original 3D Game** — model-chosen genre with genuine 3D gameplay.
- **06 End-to-End Game Masterpiece** — original world, characters, full storyline, dialogue, choices, quests, interconnected gameplay, art, sound and a complete ending.
- **07 Interactive Machine Explainer** — physically accurate mechanism, timeline control, part inspection and what-if simulation.
- **08 First-Person 3D Game** — pointer-lock movement, authored environment and reactive opposition.
- **09 Browser Desktop OS** — window manager, shared virtual filesystem and eight-plus apps.
- **10 Living 3D World** — streaming procedural world with weather, time and inhabitants.
- **11 Generative Artwork** — seeded, reproducible, real-time composition.
- **12 Professional Creative Tool** — layered, non-destructive editor with real file IO.
- **13 Strategy Game with AI** — rules engine plus an opponent built on real search or evaluation.
- **14 Physics Engine & Playground** — rigid-body engine written from scratch, with tooling.
- **15 Floating Pagoda Island** — a fixed brief: procedural pagoda, floating geology, water, light and atmosphere.

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
- `category`: one of the fifteen canonical slugs.
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
manifest.json                 generated dashboard data and fifteen-challenge catalog
prompts/catalog.json          canonical challenge catalog
prompts/01-*.md … 15-*.md     fifteen standalone mega-prompts
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
