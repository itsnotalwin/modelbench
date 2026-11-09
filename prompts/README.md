# Prompts — ModelBench v5 (fifteen open-ended tests, three outputs each)

Each file is one benchmark prompt, kept separate so it can be copied on its own. The top of each file is an uploader header that is **never sent to the model**. Everything under the `## Model prompt` divider is what the model receives.

Every test asks for **three separate, standalone outputs** (`v1`, `v2`, `v3`), each a different concept. Every output is **mobile-first** and **installable** as a Progressive Web App. The model chooses the subject, name and style. The bar sets the quality the three files must reach.

The set is four groups: **three websites**, **three games**, **three visual pieces**, **six creative pieces**. Games and visual tests are judged on originality as much as on execution, so the game prompts forbid copying a known genre.

| # | Test | Slug | Family | File | Bar (per file) |
|---|------|------|--------|------|----------------|
| 01 | Brand site | `site-brand` | Web | `01-site-brand.md` | 6+ sections, 900+ words in the brand's voice, SVG identity, one working interactive element |
| 02 | Editorial feature | `site-editorial` | Web | `02-site-editorial.md` | 1200+ words, 6+ layout devices, section nav with progress, 3+ data figures, footnotes |
| 03 | Storefront | `site-store` | Web | `03-site-store.md` | 12+ items, variants that change price and stock, working cart with undo, 3-step demo checkout |
| 04 | Original 2D game | `game-2d` | Games | `04-game-2d.md` | Invented core verb, 3+ interacting systems, 6+ juice effects, win and lose, self-test that passes |
| 05 | Original 3D game | `game-3d` | Games | `05-game-3d.md` | Custom ShaderMaterial, invented 3D mechanic, 6+ juice effects, win and lose, self-test that passes |
| 06 | Two-player duel | `game-duel` | Games | `06-game-duel.md` | One device, two humans or human vs AI, 3 fair difficulty levels, invented mechanic, self-test |
| 07 | Procedural image | `vis-image` | Visual | `07-vis-image.md` | 2400px+ render, seeded and reproducible, 3+ live controls, PNG export at 2x |
| 08 | Short animated film | `vis-motion` | Visual | `08-vis-motion.md` | 45–90 s, 5–7 scenes, synthesised score, scrubbing timeline, WebM recording |
| 09 | 3D shader piece | `vis-3d` | Visual | `09-vis-3d.md` | Custom GLSL doing the real work, three movements, pointer/scroll/gyro response, 60fps, capture |
| 10 | Branching story | `story` | Creative | `10-story.md` | 1500+ words, 12+ nodes, 3+ endings, state that changes scenes, save and restore |
| 11 | Music machine | `music` | Creative | `11-music.md` | 8+ synthesised voices, 3+ scales, drift-free clock, WAV export, pattern save/load |
| 12 | Playful toy | `toy` | Creative | `12-toy.md` | First interaction in 2s, 3+ modes, a hidden surprise, Save PNG, URL-shareable state |
| 13 | Interactive explainer | `teach` | Creative | `13-teach.md` | Correct mathematics, 3+ live parameters, worked example, 5-question quiz, honest sources |
| 14 | Living simulation | `sim` | Creative | `14-sim.md` | 4+ coupled variables, stated integrator, 3+ scenarios, 3+ live plots, CSV export, analytic check |
| 15 | One idea | `idea` | Creative | `15-idea.md` | One invented interaction, a second layer to discover, a real payoff, a way to capture it |

## What every prompt asks for

- **Three files per test**, named `{slug}__{model}__{date}__v1.html`, `v2`, `v3`.
- **Mobile-first:** designed for a 390px portrait phone first, touch-first (44px+ controls), safe-area aware, and fitted to `100dvh`. Each test also gets its own mobile specifics (for example on-screen controls for games, a bottom tab bar for apps).
- **Installable:** the model's HTML links `manifest.webmanifest` and `icons/`, and registers `sw.js`. The benchmark host supplies those files. The model does not create them.

## Adding or changing a test

`catalog.json` is the single source of truth for slugs and labels. `tools/sort_inbox.py`, `tools/new_run.py` and the dashboard all read it. To add a test, add it to the catalog and write its prompt file, and nowhere else.

## Scoring

Six axes, each 0–5, saved to each run's `meta.json`: **completeness, robustness, craft, depth, originality, performance**. Also logged: first-try result, console errors, FPS on a mid-range phone and laptop, and file size.
