# 12 · Voxel Survival Sandbox

## Run parameters
- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

Use these values in the output folder and metadata. Do not invent them.

## The brief
Create one complete, original **voxel-based sandbox or survival game**.

You choose the title, setting, world generation, visual language, camera perspective, creatures, crafting, building systems, tone and objectives. The genre can lean toward survival, creative building, exploration or a blend. Make the creative calls yourself; do not reproduce an existing game's world or assets.

## What the game must deliver
- A genuinely three-dimensional voxel world that can be explored and modified.
- Reliable block selection, removal and placement.
- An inventory or equivalent system for collected materials.
- Meaningful crafting, construction or progression.
- A compelling reason to explore, create or survive.
- Efficient world rendering and updates that remain usable as the world changes.
- Persistence for world edits and player progress where appropriate.
- Controls suitable for desktop and touch.

## Quality bar
The world should feel cohesive and inviting to explore. Make terrain and materials visually readable, interactions satisfying and building predictable. Choose the scale and complexity that best showcase your approach while maintaining good performance.

## Acceptance checklist
- Terrain is real 3D voxel geometry and can be edited.
- Mining/removal and placement update the world correctly.
- Inventory and crafting/building systems affect actual gameplay.
- The game has a clear progression or open-ended activity loop.
- World changes and meaningful progress persist where expected.
- Controls, performance and rendering failure are handled.

## Submission contract
Create exactly one folder named **game-voxel__MODEL_SLUG__RUN_DATE__vVERSION** containing **index.html**, **meta.json** and only essential files in **assets/**. Do not create variants, extra pages, README/audit files, screenshots, dependencies or build output. Do not paste source code into chat.

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-voxel",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "12",
  "prompt_label": "Voxel Survival Sandbox",
  "notes": "One or two honest sentences describing the build and any known limitations."
}
~~~

ZIP this one folder. Filename does not determine routing. Test in a browser or local HTTP server if possible; otherwise perform a code-level check and disclose the limitation. Report only the folder path and honest test status.
