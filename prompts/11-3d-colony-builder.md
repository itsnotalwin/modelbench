# 11 · 3D Colony Builder

## Run parameters
- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

Use these values in the output folder and metadata. Do not invent them.

## The brief
Create one complete, original **3D colony-building game**.

You choose the title, setting, world, visual style, tone, inhabitants, resources, buildings, economy, gameplay systems and overall objective. A living settlement with visible activity is a natural fit for this genre, but decide how your own game should work. Do not copy an existing game's content or presentation.

## What the game must deliver
- A genuinely three-dimensional world that the player can explore and shape.
- Functional construction or settlement expansion.
- Inhabitants, workers or autonomous agents with visible behaviours.
- Resource gathering, production, storage and meaningful logistics.
- Systems that interact, creating interesting decisions rather than decorative counters.
- A clear objective, progression path or satisfying open-ended play loop.
- Useful camera/build controls and save/load where appropriate.

## Quality bar
Make the settlement feel alive and give the player meaningful decisions. Choose the simulation depth and visual identity yourself. Prioritise legibility, coherent systems, responsive controls and a convincing sense that the world changes because of the player's decisions.

## Acceptance checklist
- The world is real-time or interactively simulated, not a static illustration.
- Construction changes the world and has functional consequences.
- Agents/inhabitants behave visibly and interact with the simulation.
- Resources and logistics affect what the settlement can do.
- The player can understand the current state and make progress.
- The experience is stable, responsive and appropriately persistent.

## Submission contract
Create exactly one folder named **game-colony__MODEL_SLUG__RUN_DATE__vVERSION** with **index.html**, **meta.json** and only essential files in **assets/**. Do not create variants, extra pages, README/audit files, screenshots, dependencies or build output. Do not paste code into chat.

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-colony",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "11",
  "prompt_label": "3D Colony Builder",
  "notes": "One or two honest sentences describing the build and any known limitations."
}
~~~

ZIP this one folder. Filename does not determine routing. Test in a browser if possible; otherwise perform a code-level check and disclose the limitation. Report only the folder path and honest test status.
