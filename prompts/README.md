# ModelBench · One-shot build suite

ModelBench contains **16 one-shot build challenges**. Each prompt asks a model to create one substantial, usable product in one pass. One prompt produces one project folder; one ZIP contains that one project; its **meta.json** is the sole routing source of truth.

## The sixteen challenges

| # | Challenge | Category slug | Primary capability tested | Prompt |
|---|---|---|---|---|
| 01 | Original Brand Website | site-brand | Distinct identity and offer | 01-site-brand.md |
| 02 | Interactive Editorial Feature | site-editorial | 800–1,100 words | 02-interactive-editorial.md |
| 03 | Commerce Marketplace | site-store | 10+ coherent catalogue items | 03-marketplace.md |
| 04 | Interactive Data Dashboard | dashboard | 24+ coherent records | 04-command-centre.md |
| 05 | Project Workspace | workspace | 3 projects and 15+ work items | 05-project-workspace.md |
| 06 | Original 2D Game | game-2d | Complete genre-independent 2D game | 06-game-2d.md |
| 07 | 3D Exploration Game | game-3d | Real 3D environment | 07-spatial-world.md |
| 08 | Interactive System Simulation | sim | 4+ coupled state variables | 08-simulation-lab.md |
| 09 | Creative Design Studio | creative-studio | Editable composition | 09-creative-studio.md |
| 10 | Browser Music Studio | music | 4 distinct sound sources or voices | 10-music-studio.md |
| 11 | 3D Colony Builder | game-colony | Explorable 3D world | 11-3d-colony-builder.md |
| 12 | Voxel Sandbox Game | game-voxel | Editable 3D voxel terrain | 12-voxel-survival-game.md |
| 13 | 2D Action Brawler | game-brawler | Playable character | 13-2d-beat-em-up.md |
| 14 | 3D Racing Game | game-racer | Real 3D vehicle and course | 14-3d-racing-game.md |
| 15 | Action Roguelite | game-roguelite | Replayable run structure | 15-action-roguelite.md |
| 16 | Masterpiece Game | game-masterpiece | Ultimate game-design and implementation challenge | 4+ interconnected systems; 3+ varied situations; meaningful progression; exceptional craft, audio and reliability | 16-masterpiece-game.md |

## Creative freedom and benchmark fairness

Every prompt defines a capability area and a demanding quality bar, not a pre-written concept. Models choose their own subject, identity, names, content, data, setting, mechanics, characters, visual direction and implementation wherever those choices are not essential to the category being tested. The prompt suite deliberately avoids supplied fictional brands, named worlds, preset characters, prescribed lore, exact product catalogues and fixed art directions.

The challenge boundary remains consistent across models: one finished artifact, the same core acceptance checks and the same submission contract. This lets us compare creative judgement as well as implementation quality, without handing every model the same solution.

Eight challenges focus on games: open-ended 2D game design, 3D exploration, 3D colony building, voxel sandbox design, 2D action brawling, 3D racing, action roguelite systems and the all-direction Masterpiece Game capstone. Challenge 16 deliberately allows any genre and presentation; its difficulty comes from integration, depth and finish rather than a prescribed concept. They test different game-development skills while leaving the creative concept open.

## Benchmark design principles and research

These original prompts borrow task-design and evaluation lessons from public benchmarks:

- **App-Bench** evaluates single-shot application generation without human edits. Its tasks use autonomous decision-making plus explicit, testable requirements. ModelBench adopts that discipline for static-hosted artifacts. [App-Bench](https://appbench.ai/) · [methodology](https://appbench.ai/blog).
- **WebAppBench** combines prompt-specific acceptance assertions with runtime checks across functionality, code quality, visual quality and security. ModelBench likewise checks concrete state transitions, calculations, persistence and export, rather than appearance alone. [WebAppBench methodology](https://webappbench.com/metrics).
- **UI-Bench** and the **UI Quality Bench** test varied interface types and judge hierarchy, responsiveness, semantics, accessibility, interaction and visual craft. ModelBench preserves craft as a separate score from completeness and robustness. [UI-Bench](https://ui-bench.dev/) · [UI Quality Bench dataset](https://huggingface.co/datasets/revelohq/ui-quality-bench).
- **CanvasBench** includes real design tasks around responsive behavior, interaction states, rhythm, consistency and micro-interactions. ModelBench requires coherent workflows rather than static mockups. [CanvasBench](https://www.framer.com/canvasbench/).
- **Design2Code** uses real webpage examples with automatic and human visual evaluation. ModelBench is not a screenshot-replication test, but follows the lesson that rendered output should be inspected rather than judged from source alone. [Design2Code](https://arxiv.org/abs/2403.03163).
- **Text Arena (formerly WebDev Arena)** uses anonymous pairwise human preferences to compare generated applications. Pairwise review can complement ModelBench's six-axis scorecard. [Text Arena overview](https://epoch.ai/benchmarks/webdev-arena).

## How to run a challenge

1. Choose exactly one prompt. The executing model resolves its own model identifier and the current system date automatically; version is always 1. No run details need to be supplied by the organiser.
2. Run every model from a clean, isolated workspace with equivalent tool access. Do not provide other models' submissions or repair the first output during a one-shot run. If the runtime exposes no model identity, the prompt uses `unknown-model` and records that limitation rather than asking for a value.
3. The model creates one folder named CATEGORY__MODEL_SLUG__YYYY-MM-DD__v1. The model slug and date are resolved automatically. It contains index.html, meta.json and only essential runtime assets.
4. ZIP that folder and upload the ZIP to inbox/. The ZIP filename may be anything. The importer reads and validates meta.json to determine category, model, date and version.
5. Independently review the rendered app and exercise its acceptance checklist. A model's self-reported test result is not proof.

## Submission contract

Each ZIP must contain exactly one project root (one top-level folder, or files directly at the ZIP root). The project root must contain index.html, meta.json and optionally assets/ for essential runtime assets.

Required metadata:

~~~json
{
  "schema_version": 1,
  "model": "gpt-6",
  "category": "site-brand",
  "date": "2026-11-09",
  "version": 1,
  "entry": "index.html",
  "prompt": "01",
  "prompt_label": "Original Brand Website",
  "notes": "One or two honest sentences describing the build and known limitations."
}
~~~

The importer uses model, category, date and version from the JSON. Every new prompt run uses version 1. A ZIP filename or internal folder name cannot override them. Categories must match prompts/catalog.json. Invalid ZIPs stay in the inbox with a clear error; an existing run is never overwritten. Do not put ratings or self-awarded scores in model-authored metadata.

## Shared ModelBench scorecard

Keep these organizer-owned dimensions stable across all sixteen challenges:

- **Completeness** — required features and acceptance criteria are genuinely present.
- **Robustness** — edge cases, error states, persistence and state consistency.
- **Craft** — visual quality, information hierarchy, interaction design and polish.
- **Depth** — substance of the product, systems, content, mechanics or model complexity.
- **Originality** — distinct ideas and execution rather than generic templates.
- **Performance** — runtime stability, responsive behavior, accessibility and efficient implementation.

Score the artifact itself. A polished screenshot cannot compensate for dead interactions; a long source file cannot compensate for an incoherent product; a self-authored audit cannot substitute for independent testing.
