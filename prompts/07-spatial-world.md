# 07 · 3D Exploration Game

## Run parameters

Replace these placeholders with the exact values supplied for this run. They must match the output folder and metadata exactly.

- MODEL_SLUG: MODEL_SLUG
- RUN_DATE: RUN_DATE
- VERSION: VERSION

Do not guess missing run parameters. If any value has not been supplied, ask the organiser before creating files.

## The challenge

Create one original 3D exploration game. Invent the world, premise, atmosphere, player abilities, visual style, discovery systems and objective. The experience should reward curiosity and make the environment feel like a place to explore, not merely a 3D scene used as a backdrop. Decide what the player is trying to understand, find, change or accomplish.

## What the build must deliver

1. Build a genuinely three-dimensional environment with readable scale, depth, landmarks and spatial composition. Use geometry, materials, lighting and atmosphere deliberately.
2. Implement responsive player movement and a camera suitable for the chosen perspective. Controls must feel intentional and remain usable when the viewport changes.
3. Give the player meaningful ways to interact with the world. Interactions should reveal information, change the environment, unlock paths or otherwise affect progress.
4. Create a clear objective and a progression structure that makes exploration purposeful. Provide useful feedback for discoveries, obstacles and completed goals.
5. Include enough authored environmental variation to make navigation interesting. Avoid an empty plane with a few decorative objects or a static fly-through.
6. Support keyboard and pointer input, plus touch controls where practical. Handle resize, pause/restart and rendering failure gracefully.

## Quality bar

Make the result feel like a finished, intentionally designed product. Make strong creative and technical decisions independently; do not ask the organiser to choose the concept, visual direction, content, mechanics or implementation. Use a distinctive identity and a consistent visual language. Prioritise clarity, responsiveness, satisfying interaction and meaningful detail over decorative complexity.

Every visible control must work. Every important interaction must create a real state change and give appropriate feedback. Avoid placeholder sections, dead buttons, fake charts, non-functional menus, empty world geometry and features that only look interactive. A smaller coherent experience is better than a large collection of unfinished systems.

## Acceptance checklist

- [ ] The environment is real 3D geometry with meaningful spatial depth and visual landmarks.
- [ ] Movement and camera controls work consistently.
- [ ] World interactions cause visible and meaningful state changes.
- [ ] The player can understand the objective and make measurable progress.
- [ ] The environment contains enough variation to reward exploration.
- [ ] The experience handles resizing and remains playable on supported desktop and mobile devices.

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

**game-3d__MODEL_SLUG__RUN_DATE__vVERSION**

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact values for this run:

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
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder and metadata must use the exact run parameters. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in meta.json.

When finished, report only the project folder path and an honest test status.
