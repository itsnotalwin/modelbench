# ModelBench · Twenty-one challenges

ModelBench contains **twenty-one one-shot challenges** spanning websites, applications, games, visual tools, simulations and worlds. Each prompt produces exactly one finished project folder and one ZIP. The model resolves its own model identity and current date; version is always 1. The organiser is never asked for run metadata.

Prompt text is authored by the organiser. The only additions made to each prompt file are the automatic run-identity block and the submission contract that carries the folder name, `meta.json` fields and category slug.

## The challenges

| # | Challenge | Category slug | Family |
|---|---|---|---|
| 01 | Website | website | Web |
| 02 | SaaS for Clearing Agents | saas | Web |
| 03 | 2D Game | game-2d | Games |
| 04 | 3D Game | game-3d | Games |
| 05 | Restaurant Website | restaurant | Web |
| 06 | Machine Explainer | explainer | Web |
| 07 | First-Person Game | game-fps | Games |
| 08 | Arcade Game | arcade | Games |
| 09 | Browser Operating System | os-sim | Web |
| 10 | Rubik's Cube | rubiks-cube | Games |
| 11 | Platformer | platformer | Games |
| 12 | Living 3D World | world-3d | Worlds |
| 13 | Data Story | data-story | Visual |
| 14 | Generative Art | generative-art | Visual |
| 15 | Music Instrument | synth-studio | Visual |
| 16 | Creative Tool | creative-tool | Web |
| 17 | Emergent Simulation | emergent-sim | Worlds |
| 18 | Strategy Game | game-strategy | Games |
| 19 | Spreadsheet | spreadsheet | Web |
| 20 | Physics Engine | physics | Games |
| 21 | Floating Pagoda Island | island-pagoda | Worlds |

## Creative freedom

Challenges 01-20 are open briefs: the model chooses the subject, name, audience, tone, art direction and implementation wherever the brief does not require something specific. Challenge 21 is the single fixed-subject brief — a floating island crowned by a multi-tier pagoda — where everything about how it looks, feels and plays is still the model's decision.

## Fairness and evaluation

Run each model from a clean, isolated workspace with equivalent tool access. Do not show it other submissions or repair its first output during a one-shot run. Review the rendered artifact and exercise the acceptance criteria independently. A model's self-reported test status is not proof.

The shared six-axis scorecard:
- **Completeness** — the requested experience is genuinely present.
- **Robustness** — state, edge cases, persistence and error handling work.
- **Craft** — visual quality, hierarchy, interaction and polish.
- **Depth** — meaningful product workflows, content or gameplay systems.
- **Originality** — distinct ideas and execution.
- **Performance** — runtime stability, responsiveness, accessibility and efficiency.

## Run a challenge

1. Choose exactly one prompt and give it to the model in a clean workspace.
2. The model identifies its own runtime model slug, uses the current system date and fixes version to `1`. Never ask the organiser for these values.
3. It creates one folder named `CATEGORY__MODEL_SLUG__YYYY-MM-DD__v1` with `index.html`, `meta.json` and only essential local assets.
4. ZIP that one folder and upload the ZIP to [inbox/](../inbox/README.md).
5. The importer routes the package using `meta.json`, not the ZIP filename or folder name.

## Required metadata

```json
{
  "schema_version": 1,
  "model": "gpt-6",
  "category": "website",
  "date": "2026-11-09",
  "version": 1,
  "entry": "index.html",
  "prompt": "01",
  "prompt_label": "Website",
  "notes": "A concise, honest description of the build and known limitations."
}
```

The category must match one of the twenty-one slugs in `catalog.json`. The version is always integer `1`. The importer rejects invalid or duplicate submissions without overwriting existing runs. Ratings and evaluation logs remain organizer-owned.

## Repository map

- `index.html` — dashboard.
- `prompts/catalog.json` — canonical challenge catalogue.
- `prompts/01-*.md` through `prompts/21-*.md` — standalone challenge briefs.
- `manifest.json` — generated dashboard data.
- `inbox/` — incoming ZIP submissions.
- `runs/` — accepted immutable submissions.
- `tools/` — importer, manifest and PWA utilities.
- `tests/` — importer, prompt and dashboard regression tests.
