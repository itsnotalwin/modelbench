# ModelBench · One-shot build suite

ModelBench now contains **15 one-shot build challenges**. Each prompt asks a model to create one substantial, usable product in one pass. One prompt produces one project folder; one ZIP contains that one project; its **meta.json** is the routing source of truth.

## The fifteen challenges

| # | Challenge | Category slug | Primary capability tested | Prompt |
|---|---|---|---|---|
| 01 | Flagship Brand Experience | site-brand | Visual identity, conversion design, product detail and validated form flow | 01-site-brand.md |
| 02 | Interactive Editorial Investigation | site-editorial | Editorial craft, evidence, data visualisation and scrollytelling | 02-interactive-editorial.md |
| 03 | Commerce and Booking Marketplace | site-store | Search, filtering, inventory, cart maths and transactional state | 03-marketplace.md |
| 04 | Operations Command Centre | dashboard | Dense information design, linked metrics, drill-downs and event simulation | 04-command-centre.md |
| 05 | Project Operations Workspace | workspace | CRUD, synchronized views, planning, persistence and data integrity | 05-project-workspace.md |
| 06 | Echo Courier — Original 2D Puzzle Game | game-2d | Game rules, deterministic state, level design and input handling | 06-game-2d.md |
| 07 | Parallax Archive — Interactive 3D World | game-3d | Real 3D geometry, camera interaction, spatial puzzles and rendering | 07-spatial-world.md |
| 08 | Living Systems Simulator | sim | Numerical modelling, coupled state, reproducibility and scientific communication | 08-simulation-lab.md |
| 09 | Poster Foundry — Creative Production Studio | creative-studio | Direct manipulation, layers, editing history and real file export | 09-creative-studio.md |
| 10 | Pulse Loom — Browser Music Workstation | music | Web Audio, sequencer timing, sound design, persistence and WAV export | 10-music-studio.md |
| 11 | Mosslight Isles — 3D Colony Builder | mosslight-isles | 3D settlement simulation, worker AI, pathfinding and production logistics | 11-mosslight-isles.md |
| 12 | Voxel Wilds — Block Survival Sandbox | voxel-wilds | Editable voxel rendering, first-person controls, crafting and persistent world state | 12-voxel-wilds.md |
| 13 | Neon Alley '94 — 16-bit Beat-'em-up | neon-alley | Arcade combat, hitboxes, combos, enemy AI and boss telegraphs | 13-neon-alley.md |
| 14 | Skyline Circuit — 3D Arcade Racer | skyline-circuit | 3D track, vehicle physics, rival AI, checkpoints and lap timing | 14-skyline-circuit.md |
| 15 | The Lantern Below — Action Roguelite | lantern-below | Seeded dungeons, combat systems, enemy AI, relic builds and boss phases | 15-lantern-below.md |

## Game-development focus

The suite now contains **7 game challenges out of 15**. The five additions test distinct disciplines: a living 3D colony simulation, editable voxel survival, a 16-bit side-scrolling brawler, a 3D arcade racer and a seeded action roguelite. The broader web, data, productivity, simulation and creative challenges remain in the suite.

The 3D colony brief uses broad settlement-simulation ideas: visible production chains, autonomous inhabitants, readable buildings, logistics and fog-shrouded islands. It is an original setting and implementation brief, not a request to reproduce another game's characters, art, levels or proprietary content. Background reference: [Pioneers of Pagonia official overview](https://www.pioneersofpagonia.com/) and [developer discussion of building art and readability](https://steamcommunity.com/games/2155180/announcements/detail/693094122829905929).

## Benchmark design principles and research

These original prompts borrow task-design and evaluation lessons from public benchmarks:

- **App-Bench** evaluates single-shot application generation without human edits. Its tasks use autonomous decision-making plus explicit, testable requirements. ModelBench adopts that discipline for static-hosted artifacts. [App-Bench](https://appbench.ai/) · [methodology](https://appbench.ai/blog).
- **WebAppBench** combines prompt-specific acceptance assertions with runtime checks across functionality, code quality, visual quality and security. ModelBench likewise checks concrete state transitions, calculations, persistence and export, rather than appearance alone. [WebAppBench methodology](https://webappbench.com/metrics).
- **UI-Bench** and the **UI Quality Bench** test varied interface types and judge hierarchy, responsiveness, semantics, accessibility, interaction and visual craft. ModelBench preserves craft as a separate score from completeness and robustness. [UI-Bench](https://ui-bench.dev/) · [UI Quality Bench dataset](https://huggingface.co/datasets/revelohq/ui-quality-bench).
- **CanvasBench** includes real design tasks around responsive behavior, interaction states, rhythm, consistency and micro-interactions. ModelBench requires coherent workflows rather than static mockups. [CanvasBench](https://www.framer.com/canvasbench/).
- **Design2Code** uses real webpage examples with automatic and human visual evaluation. ModelBench is not a screenshot-replication test, but follows the lesson that rendered output should be inspected rather than judged from source alone. [Design2Code](https://arxiv.org/abs/2403.03163).
- **Text Arena (formerly WebDev Arena)** uses anonymous pairwise human preferences to compare generated applications. Pairwise review can complement ModelBench's six-axis scorecard. [Text Arena overview](https://epoch.ai/benchmarks/webdev-arena).

## How to run a challenge

1. Choose exactly one prompt and fill in MODEL_SLUG, RUN_DATE and VERSION at the top.
2. Run every model from a clean, isolated workspace with equivalent tool access. Do not provide other models' submissions or repair the first output during a one-shot run.
3. The model creates one folder named CATEGORY__MODEL_SLUG__DATE__vN. It contains index.html, meta.json and only essential runtime assets.
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
  "prompt_label": "Flagship Brand Experience",
  "notes": "One or two honest sentences describing the build and known limitations."
}
~~~

The importer uses model, category, date and version from the JSON. A ZIP filename or internal folder name cannot override them. Categories must match prompts/catalog.json. Invalid ZIPs stay in the inbox with a clear error; an existing run is never overwritten. Do not put ratings or self-awarded scores in model-authored metadata.

## Shared ModelBench scorecard

Keep these organizer-owned dimensions stable across all fifteen challenges:

- **Completeness** — required features and acceptance criteria are genuinely present.
- **Robustness** — edge cases, error states, persistence and state consistency.
- **Craft** — visual quality, information hierarchy, interaction design and polish.
- **Depth** — substance of the product, systems, content, mechanics or model complexity.
- **Originality** — distinct ideas and execution rather than generic templates.
- **Performance** — runtime stability, responsive behavior, accessibility and efficient implementation.

Score the artifact itself. A polished screenshot cannot compensate for dead interactions; a long source file cannot compensate for an incoherent product; a self-authored audit cannot substitute for independent testing.
