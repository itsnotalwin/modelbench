# ModelBench · Six mega-prompts

ModelBench now contains **six one-shot challenges**: three focused on web development and three focused on game development. Each prompt produces exactly one finished project folder and one ZIP. The model resolves its own model identity and current date; version is always 1. The organiser is never asked for run metadata.

## The six challenges

| # | Challenge | Category slug | Primary capability |
|---|---|---|---|
| 01 | Brand & Business Website | site-brand | Brand identity, responsive marketing website and conversion flow |
| 02 | Interactive Content Website | site-editorial | Content architecture, storytelling and useful interactive web experiences |
| 03 | Complete Web Application | web-app | Connected workflows, persistent state, CRUD and robust application UX |
| 04 | Original 2D Game | game-2d | Model-chosen genre and a complete playable 2D experience |
| 05 | Original 3D Game | game-3d | Model-chosen genre and a genuinely interactive 3D game |
| 06 | End-to-End Game Masterpiece | game-masterpiece | Full game production: world, cast, story, dialogue, quests, systems, art, sound and ending |

## Creative freedom

Prompts define the capability being tested and a demanding quality bar, not a pre-written concept. Models choose names, ideas, stories, characters, data, visual direction and implementation wherever those choices are not essential to the challenge. In particular, the 2D and 3D game prompts do not prescribe a genre. Challenge 06 asks the model to create an entire story-driven game from opening to ending and to use every relevant capability actually available in its environment.

## Fairness and evaluation

Run each model from a clean, isolated workspace with equivalent tool access. Do not show it other submissions or repair its first output during a one-shot run. Review the rendered artifact and exercise the acceptance criteria independently. A model's self-reported test status is not proof.

The shared six-axis scorecard remains unchanged:
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
  "category": "site-brand",
  "date": "2026-11-09",
  "version": 1,
  "entry": "index.html",
  "prompt": "01",
  "prompt_label": "Brand & Business Website",
  "notes": "A concise, honest description of the build and known limitations."
}
```

The category must match one of the six slugs in `catalog.json`. The version is always integer `1`. The importer rejects invalid or duplicate submissions without overwriting existing runs. Ratings and evaluation logs remain organizer-owned.

## Repository map

- `index.html` — dashboard.
- `prompts/catalog.json` — canonical six-challenge catalogue.
- `prompts/01-*.md` through `prompts/06-*.md` — standalone mega-prompts.
- `manifest.json` — generated dashboard data.
- `inbox/` — incoming ZIP submissions.
- `runs/` — accepted immutable submissions.
- `tools/` — importer, manifest and PWA utilities.
- `tests/` — importer, prompt and dashboard regression tests.
