# 14 · 3D Racing Game

## Run parameters
- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

Use these values in the output folder and metadata. Do not invent them.

## The brief
Create one complete, original **3D racing game**.

You choose the title, vehicles, racing discipline, course design, environment, art direction, atmosphere and competition format. It can be arcade, simulation-inspired, futuristic, off-road or another coherent direction. Make the driving experience your own.

## What the game must deliver
- A genuinely three-dimensional vehicle and navigable course.
- Responsive acceleration, braking and steering with believable handling.
- Track boundaries, collisions or another clear system for keeping the race playable.
- A clear race, time-trial or competition objective.
- Useful camera behaviour, speed/position/time feedback and restart.
- Opponents, ghost racing or another suitable way to create competitive depth.
- Keyboard and touch controls where suitable.

## Quality bar
Prioritise satisfying vehicle handling and a strong sense of speed. The course should feel designed, not randomly assembled. Visual style and racing format are open creative choices.

## Acceptance checklist
- Vehicle controls produce consistent, understandable movement.
- The course is navigable and the objective can be completed.
- Collisions/boundaries and race progression behave correctly.
- The interface communicates important race information.
- Results or best times persist where appropriate.
- The game works at desktop and phone sizes.

## Submission contract
Create exactly one folder named **game-racer__MODEL_SLUG__RUN_DATE__vVERSION** with **index.html**, **meta.json** and only essential files in **assets/**. Do not create variants, extra pages, README/audit files, screenshots, dependencies or build output. Do not paste source code into chat.

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-racer",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "14",
  "prompt_label": "3D Racing Game",
  "notes": "One or two honest sentences describing the build and any known limitations."
}
~~~

ZIP this one folder. Filename does not determine routing. Test on GitHub Pages or a local HTTP server if possible; otherwise perform a code-level check and disclose the limitation. Report only the folder path and honest test status.
