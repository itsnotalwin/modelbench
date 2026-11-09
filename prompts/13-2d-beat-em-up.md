# 13 · 2D Beat-'em-up

## Run parameters
- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

Use these values in the output folder and metadata. Do not invent them.

## The brief
Create one complete, original **2D side-scrolling beat-'em-up**.

You choose the game title, setting, playable characters, visual direction, tone, combat style, enemies, stages and story (if any). Build an original identity and a satisfying arcade action loop. Do not copy existing characters, movesets or levels.

## What the game must deliver
- Responsive movement through a side-scrolling play space, with depth/lane movement where useful.
- A combat system with readable attacks, defence or evasion, hit detection and meaningful feedback.
- Enemies with distinct behaviours and fair attack cues.
- Progression through a sequence of encounters or stages and a satisfying end point.
- A clear HUD and useful game states such as title, pause, defeat, victory and restart.
- Keyboard controls and touch support where suitable.

## Quality bar
Make combat feel responsive and readable. Give characters distinct silhouettes and give attacks weight without hiding important action. You decide whether the art direction is pixel art, illustrated, minimalist or something else.

## Acceptance checklist
- Player movement and combat are fully playable.
- Attacks, damage and enemy reactions are real game-state changes.
- Enemy behaviours are distinct and reasonably fair.
- Progression, win/lose and restart work.
- The game remains legible and usable on desktop and phone.

## Submission contract
Create exactly one folder named **game-brawler__MODEL_SLUG__RUN_DATE__vVERSION** containing **index.html**, **meta.json** and only essential files in **assets/**. Do not create variants, extra pages, README/audit files, screenshots, dependencies or build output. Do not paste source code into chat.

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-brawler",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "13",
  "prompt_label": "2D Beat-'em-up",
  "notes": "One or two honest sentences describing the build and any known limitations."
}
~~~

ZIP this one folder. Filename does not determine routing. Test in a browser if possible; otherwise perform a code-level check and disclose the limitation. Report only the folder path and honest test status.
