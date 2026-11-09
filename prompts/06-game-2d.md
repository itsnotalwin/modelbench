# 06 · 2D Puzzle Game

## Run parameters
- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

Use these values in the output folder and metadata. Do not invent them.

## The brief
Create one complete, original **2D puzzle game**.

You choose the title, theme, visual direction, central puzzle mechanic, level design, characters (if any), tone and presentation. Make creative decisions yourself. Do not follow a supplied story or copy an existing game.

## What the game must deliver
- A clear, original puzzle mechanic that players can understand and use in interesting ways.
- A complete playable experience with multiple thoughtfully designed, solvable challenges.
- Responsive controls, clear feedback and a useful explanation/tutorial for the rules.
- A way to restart a challenge and recover from mistakes, such as undo where appropriate.
- Meaningful progression and a clear completion state.
- Keyboard and touch support where suitable.
- Progress/settings saved locally when persistence makes sense.

## Quality bar
Make it feel like a finished game, not a mechanics demo. Prioritise clever design, readable visuals, satisfying feedback, good pacing and a strong sense of identity. Decide what will make the game memorable; do not wait for the prompt to provide the idea.

## Acceptance checklist
- The central mechanic is original, functional and clearly communicated.
- Every included challenge is completable and behaves consistently.
- Controls, feedback, restart and progression work.
- The game is usable at desktop and phone sizes.
- Any self-test checks real game behaviour rather than displaying a hard-coded pass.

## Submission contract
Create exactly one folder named **game-2d__MODEL_SLUG__RUN_DATE__vVERSION**. Put **index.html** and **meta.json** at its root; include only essential local runtime files in **assets/** if needed. Do not create variants, extra pages, README/audit files, screenshots, dependency folders or build output. Do not paste source code into chat.

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-2d",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "06",
  "prompt_label": "2D Puzzle Game",
  "notes": "One or two honest sentences describing the build and any known limitations."
}
~~~

ZIP this one folder. The ZIP filename is ignored for routing. Test the game in a browser if possible; otherwise perform a code-level check and disclose the limitation. Report only the folder path and honest test status.
