# 15 · Action Roguelite

## Run parameters
- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

Use these values in the output folder and metadata. Do not invent them.

## The brief
Create one complete, original **action roguelite**.

You choose the title, setting, perspective, world, visual style, combat approach, enemies, upgrade system and run structure. Make each run interesting and give players meaningful choices. Do not copy the content or presentation of an existing game.

## What the game must deliver
- A repeatable run structure with variation between attempts.
- Responsive movement and a satisfying combat or action system.
- Enemies or challenges with distinguishable behaviours.
- Meaningful upgrades, rewards or build choices that change how a run plays.
- A clear escalation and a final challenge, boss or completion condition.
- Useful feedback for health/progress, damage, rewards and state changes.
- Complete start, pause, failure, victory and restart flows.

## Quality bar
Make the game replayable, readable and fair. Randomness should create variety without producing broken or unwinnable runs. Combat, upgrades and enemy behaviour should interact in meaningful ways. Perspective and art direction are your choice.

## Acceptance checklist
- A full run can be started, played and completed.
- Repeated runs offer meaningful variation.
- Combat/action, enemies and upgrades affect actual game state.
- The final challenge or completion condition works.
- Failure, victory and restart states work correctly.
- The experience is stable and usable on desktop and phone.

## Submission contract
Create exactly one folder named **game-roguelite__MODEL_SLUG__RUN_DATE__vVERSION** with **index.html**, **meta.json** and only essential files in **assets/**. Do not create variants, extra pages, README/audit files, screenshots, dependencies or build output. Do not paste source code into chat.

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-roguelite",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "15",
  "prompt_label": "Action Roguelite",
  "notes": "One or two honest sentences describing the build and any known limitations."
}
~~~

ZIP this one folder. Filename does not determine routing. Test in a browser if possible; otherwise perform a code-level check and disclose the limitation. Report only the folder path and honest test status.
