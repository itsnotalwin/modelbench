# ModelBench challenge prompts

ModelBench contains 15 open-ended challenges across websites, games, visual experiments and creative software. Each prompt defines the product challenge and its acceptance bar while leaving the model room to invent the concept, visual language and implementation.

## Challenge catalog

| # | Challenge | Slug | Family | Prompt file |
|---|---|---|---|---|
| 01 | Brand site | `site-brand` | Web | `01-site-brand.md` |
| 02 | Editorial feature | `site-editorial` | Web | `02-site-editorial.md` |
| 03 | Storefront | `site-store` | Web | `03-site-store.md` |
| 04 | Original 2D game | `game-2d` | Games | `04-game-2d.md` |
| 05 | Original 3D game | `game-3d` | Games | `05-game-3d.md` |
| 06 | Two-player duel | `game-duel` | Games | `06-game-duel.md` |
| 07 | Procedural image | `vis-image` | Visual | `07-vis-image.md` |
| 08 | Short animated film | `vis-motion` | Visual | `08-vis-motion.md` |
| 09 | 3D shader piece | `vis-3d` | Visual | `09-vis-3d.md` |
| 10 | Branching story | `story` | Creative | `10-story.md` |
| 11 | Music machine | `music` | Creative | `11-music.md` |
| 12 | Playful toy | `toy` | Creative | `12-toy.md` |
| 13 | Interactive explainer | `teach` | Creative | `13-teach.md` |
| 14 | Living simulation | `sim` | Creative | `14-sim.md` |
| 15 | One idea | `idea` | Creative | `15-idea.md` |

The catalog in `catalog.json` is the single source of truth for challenge slugs, labels, families, summaries and acceptance requirements. The sorter and dashboard read it directly.

## Artifact and ZIP handoff

A ZIP represents one challenge, one model and one version. Package each version separately and upload each ZIP separately. The recommended ZIP structure is one project folder containing:

- `index.html`: the runnable entry point.
- `meta.json`: required submission metadata.
- Supporting assets required by the project (if any).

The project folder may be placed inside the ZIP as a single top-level directory, or its files may be placed at the ZIP root. The inbox sorter supports both layouts. Use `index.html` as the entry point.

The ZIP filename is the intake key:

```
{category}__{model}__{YYYY-MM-DD}__v{n}.zip
```

Example: `game-2d__gpt-6__2026-11-09__v1.zip`.

## Required meta.json fields

The model-authored `meta.json` must be valid JSON and include:

```json
{
  "model": "gpt-6",
  "category": "game-2d",
  "date": "2026-11-09",
  "version": 1,
  "entry": "index.html",
  "prompt": "04",
  "prompt_label": "Original 2D game",
  "notes": "One or two sentences describing the build, its core mechanic and any known limitations."
}
```

Use the exact challenge slug from `catalog.json`. The metadata values must agree with the ZIP filename. The filename routes the upload; `meta.json` provides the descriptive record used by the dashboard. Put the actual description and known limitations in `notes`. Do not add self-awarded scores.

## Scoring

Organizers evaluate each run on six axes, each scored from 0 to 5:

- Completeness
- Robustness
- Craft
- Depth
- Originality
- Performance

Ratings are organizer-owned and stored separately from model-authored descriptive metadata.

## Adding or changing a challenge

Update `catalog.json` and the corresponding prompt file together. The catalog drives the dashboard labels, challenge filters, PWA descriptions and intake validation. Keep this guide aligned whenever the challenge list or delivery contract changes.
