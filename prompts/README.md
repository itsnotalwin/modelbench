# Prompts — ModelBench v4 (twelve open-ended tests, three outputs each)

Each file is one benchmark prompt, kept separate so it can be copied on its own. The top of each file is an uploader header that is **never sent to the model**. Everything under the `## Model prompt` divider is what the model receives.

Every test asks for **three separate, standalone outputs** (`v1`, `v2`, `v3`), each a different concept. Every output is **mobile-first** and **installable** as a Progressive Web App. The model chooses the subject, name and style. The bar sets the quality the three files must reach.

| # | Test | Slug | Family | File | Bar (per file) |
|---|------|------|--------|------|----------------|
| 01 | Website | `website` | Web | `01-website.md` | 5+ screens, real copy, bespoke SVG art, a working interactive element |
| 02 | Useful app | `webapp` | Web app | `02-webapp.md` | 3 end-to-end workflows, undo, JSON import/export, 10 passing self-checks |
| 03 | Algorithms lab | `codelab` | Coding | `03-codelab.md` | 6+ algorithms from scratch, 30+ assertions, editable code that re-runs the tests |
| 04 | Simulation tool | `engineer` | Engineering | `04-engineer.md` | 5+ scenarios, 3+ live plots, CSV export, analytic solver check |
| 05 | three.js scenes | `threejs` | 3D art | `05-threejs.md` | One real-time 3D piece, custom GLSL, no external model or texture files |
| 06 | 2D games | `game2d` | 2D games | `06-game2d.md` | Playable genre, 6+ juice effects, win and lose, self-test that passes |
| 07 | 3D games | `game3d` | 3D games | `07-game3d.md` | Playable three.js game, custom ShaderMaterial, 6+ juice effects, self-test that passes |
| 08 | Procedural images | `image` | Images | `08-image.md` | One large seeded render, 3+ sliders, palette, PNG download |
| 09 | Short animated film | `motion` | Video | `09-motion.md` | 45–90 s, 5–7 scenes, synthesised soundtrack, timeline, WebM recording |
| 10 | Tool-calling playground | `tooluse` | Tool use | `10-tooluse.md` | 6+ tools with schemas, 6+ requests including chained calls, 12 passing checks |
| 11 | Academic explainer | `academic` | Academic | `11-academic.md` | Correct maths, 3+ sliders that change results, worked example, quiz |
| 12 | Fun toys | `toy` | Toys | `12-toy.md` | Playful, no score: 3+ modes, a hidden surprise, Save PNG, URL-shareable state |

## What every prompt asks for

- **Three files per test**, named `{slug}__{model}__{date}__v1.html`, `v2`, `v3`.
- **Mobile-first:** designed for a 390px portrait phone first, touch-first (44px+ controls), safe-area aware, and fitted to `100dvh`. Each test also gets its own mobile specifics (for example on-screen controls for games, a bottom tab bar for apps).
- **Installable:** the model's HTML links `manifest.webmanifest` and `icons/`, and registers `sw.js`. The benchmark host supplies those files. The model does not create them.

## Adding or changing a test

`catalog.json` is the single source of truth for slugs and labels. `tools/sort_inbox.py`, `tools/new_run.py` and the dashboard all read it. To add a test, add it to the catalog and write its prompt file, and nowhere else.

## Scoring

Six axes, each 0–5, saved to each run's `meta.json`: **completeness, robustness, craft, depth, originality, performance**. Also logged: first-try result, console errors, FPS on a mid-range phone and laptop, and file size.
