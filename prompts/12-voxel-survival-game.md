# 12 · Voxel Sandbox Game

## Run parameters

Replace these placeholders with the exact values supplied for this run. They must match the output folder and metadata exactly.

- MODEL_SLUG: MODEL_SLUG
- RUN_DATE: RUN_DATE
- VERSION: VERSION

Do not guess missing run parameters. If any value has not been supplied, ask the organiser before creating files.

## The challenge

Create one original voxel-based 3D game. You choose the world, setting, visual language, perspective, atmosphere, player abilities and gameplay loop. It may lean towards survival, creative construction, exploration or a combination. The voxel world itself must be a central, editable part of the experience rather than a decorative texture or static scene.

## What the build must deliver

1. Generate or construct a genuinely three-dimensional voxel world with readable materials and enough terrain variation to invite exploration.
2. Implement reliable block selection, removal and placement. World edits must update the actual geometry and collision state correctly.
3. Provide an inventory or equivalent material-management system that reflects what the player collects and places.
4. Include meaningful crafting, construction, survival or progression systems that use the world materials and affect play.
5. Make movement, interaction and world updates performant enough for a useful playable area. Use chunking, batching or another appropriate strategy where needed.
6. Persist important world edits and player progress. Provide clear controls for desktop and touch or a clear explanation of supported input.

## Quality bar

Make the result feel like a finished, intentionally designed product. Make strong creative and technical decisions independently; do not ask the organiser to choose the concept, visual direction, content, mechanics or implementation. Use a distinctive identity and a consistent visual language. Prioritise clarity, responsiveness, satisfying interaction and meaningful detail over decorative complexity.

Every visible control must work. Every important interaction must create a real state change and give appropriate feedback. Avoid placeholder sections, dead buttons, fake charts, non-functional menus, empty world geometry and features that only look interactive. A smaller coherent experience is better than a large collection of unfinished systems.

## Acceptance checklist

- [ ] The world is real 3D voxel geometry rather than a visual imitation.
- [ ] Mining and placement update the world and collision correctly.
- [ ] Inventory reflects collected and consumed materials.
- [ ] Crafting, construction or progression affects actual gameplay.
- [ ] World edits and meaningful progress survive reload.
- [ ] Movement, controls and rendering remain usable as the world changes.

## Technical expectations

- Deliver a browser-first project that runs from its index.html entry point on a static host. Use an appropriate client-side implementation and include only dependencies that are genuinely needed.
- Do not require a backend, private API, secret key, build service or manual setup to demonstrate the core experience.
- Handle browser storage, invalid input, empty states, errors and reloads deliberately wherever relevant to the product.
- Use semantic structure, accessible labels, visible keyboard focus, sensible contrast, keyboard support and reduced-motion preferences.
- Make the experience responsive. Do not sacrifice core usability on smaller screens.
- Test the actual experience in a browser when possible. If browser testing is unavailable, perform a careful code-level smoke check and report that limitation honestly.
- Do not claim that something was tested unless it was actually tested.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**game-voxel__MODEL_SLUG__RUN_DATE__vVERSION**

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact values for this run:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-voxel",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "12",
  "prompt_label": "Voxel Sandbox Game",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder and metadata must use the exact run parameters. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in meta.json.

When finished, report only the project folder path and an honest test status.
