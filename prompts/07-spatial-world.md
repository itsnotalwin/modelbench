# 07 · 3D Exploration Game

## Run parameters
- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

Use these values in the output folder and metadata. Do not invent them.

## The brief
Create one complete, original **3D exploration game**.

You choose the title, world, genre interpretation, perspective, art direction, atmosphere, characters, story (if any), interactions and objective. Build a world and experience that show your own creative judgement. Do not follow a supplied theme or copy an existing game.

## What the game must deliver
- A genuinely three-dimensional, explorable environment with a functioning camera.
- Responsive player movement or another suitable way to navigate the world.
- Meaningful interactions, discoveries or challenges that make exploration worthwhile.
- A clear objective and satisfying sense of progression or completion.
- Readable controls and feedback, with keyboard and touch support where suitable.
- Good performance, responsive resizing and a useful fallback when 3D rendering is unavailable.

Use Three.js **0.160.0** from its pinned jsDelivr ES module URL as the only external library. Generate or create the world assets yourself; do not rely on remote models or textures.

## Quality bar
Treat this as a small but finished game world, not a bare 3D viewer. Choose the art direction, game loop and interactions freely. Make the environment cohesive and the player experience intuitive. Visual craft and originality matter as much as technical execution.

## Acceptance checklist
- The scene uses real 3D geometry and a working camera.
- Navigation and world interaction function reliably.
- The player has a clear reason to explore and a way to make progress.
- Keyboard/touch and resizing are handled.
- Rendering failure is explained rather than leaving a blank screen.

## Submission contract
Create exactly one folder named **game-3d__MODEL_SLUG__RUN_DATE__vVERSION**. Put **index.html** and **meta.json** at its root, with only essential local runtime files in **assets/** if needed. Do not create variants, extra pages, README/audit files, screenshots, dependency folders or build output. Do not paste source code into chat.

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-3d",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "07",
  "prompt_label": "3D Exploration Game",
  "notes": "One or two honest sentences describing the build and any known limitations."
}
~~~

ZIP this one folder. The ZIP filename is ignored for routing. Test on GitHub Pages or a local HTTP server if possible; otherwise perform a code-level check and disclose the limitation. Report only the folder path and honest test status.
