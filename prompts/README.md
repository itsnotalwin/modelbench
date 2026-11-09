# Prompts — ModelBench v3 (ten open-ended tests)

Each file is one benchmark prompt, kept separate so it can be copied on its own. The top of each file is an uploader header that is **never sent to the model**. Everything under the `## Model prompt` divider is what the model receives.

The model chooses the concept, name, style and genre in every test. The requirements set the bar, not the subject.

| # | Test | Slug | Family | File | Bar |
|---|------|------|--------|------|-----|
| 01 | Website | `website` | Web | `01-website.md` | 5+ screens, real copy, bespoke SVG art, a working interactive element |
| 02 | Useful app | `webapp` | Web app | `02-webapp.md` | 3 end-to-end workflows, undo, JSON import/export, 10 passing self-checks |
| 03 | Algorithms lab | `codelab` | Coding | `03-codelab.md` | 6+ algorithms written from scratch, 30+ assertions, editable code that re-runs the tests |
| 04 | Simulation tool | `engineer` | Engineering | `04-engineer.md` | 5+ scenarios, 3+ live plots, CSV export, analytic solver check |
| 05 | three.js scenes | `threejs` | 3D | `05-threejs.md` | 5+ different scenes, custom GLSL in 2+, no external model files |
| 06 | Arcade pack | `arcade` | Games | `06-arcade.md` | 5 distinct playable games in one file, each with win/lose, sound and a self-test |
| 07 | Procedural images | `image` | Images | `07-image.md` | 5+ distinct images generated in code, seeded, PNG download |
| 08 | Short animated film | `motion` | Video | `08-motion.md` | 5–7 scenes, 45–90 s, synthesised soundtrack, timeline, WebM recording |
| 09 | Tool-calling playground | `tooluse` | Tool use | `09-tooluse.md` | 6+ tools with schemas, 6+ requests including chained calls, honest refusals, 12 passing checks |
| 10 | Academic explainer | `academic` | Academic | `10-academic.md` | Correct maths, 3+ sliders that change results, worked example, quiz, honest references |

`catalog.json` is the single source of truth for these slugs. `tools/sort_inbox.py`, `tools/new_run.py` and the dashboard all read it, so a new test is added in one file.

## Scoring

Six axes, each 0–5, saved to each run's `meta.json`: **completeness, robustness, craft, depth, originality, performance**. Also log: first-try result, console errors, FPS on a mid-range laptop, and file size.

## Naming

Every prompt asks the model to name its file `{slug}__{model-slug}__{YYYY-MM-DD}__v1.html` and state it on its first line. If the model does not follow the rule, rename the file to the same pattern before uploading.
