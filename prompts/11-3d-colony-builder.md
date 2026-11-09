# 11 · 3D Colony Builder

## Run parameters

Replace these placeholders with the exact values supplied for this run. They must match the output folder and metadata exactly.

- MODEL_SLUG: MODEL_SLUG
- RUN_DATE: RUN_DATE
- VERSION: VERSION

Do not guess missing run parameters. If any value has not been supplied, ask the organiser before creating files.

## The challenge

Create one original 3D colony-building game. You decide the setting, world, inhabitants, resources, structures, economy, art direction, tone and player objective. Make the settlement an interconnected system that visibly changes as the player makes decisions. The theme and exact mechanics are open, but building and developing a living settlement must be central to play.

## What the build must deliver

1. Build a navigable, genuinely 3D world with a useful camera and readable terrain, structures and inhabitants.
2. Let the player place, modify or upgrade structures. Construction must change the world and have functional consequences.
3. Implement autonomous inhabitants, workers or agents with visible behaviours connected to the settlement's systems.
4. Create meaningful resource gathering, production, storage and logistics. At least three resource types or equivalent constraints should interact with construction and progression.
5. Give the player clear feedback about needs, production, bottlenecks and the consequences of decisions. Provide a goal, progression path or satisfying open-ended loop.
6. Support useful building and camera controls, pause/speed controls where appropriate, and save/load of meaningful world state.

## Quality bar

Make the result feel like a finished, intentionally designed product. Make strong creative and technical decisions independently; do not ask the organiser to choose the concept, visual direction, content, mechanics or implementation. Use a distinctive identity and a consistent visual language. Prioritise clarity, responsiveness, satisfying interaction and meaningful detail over decorative complexity.

Every visible control must work. Every important interaction must create a real state change and give appropriate feedback. Avoid placeholder sections, dead buttons, fake charts, non-functional menus, empty world geometry and features that only look interactive. A smaller coherent experience is better than a large collection of unfinished systems.

## Acceptance checklist

- [ ] The world is interactive 3D and can be explored.
- [ ] Construction changes the world and affects the simulation.
- [ ] Agents behave visibly and respond to the settlement state.
- [ ] Resources, production and logistics influence available actions.
- [ ] The player can understand bottlenecks and make meaningful progress.
- [ ] Save/load restores the settlement and the experience remains responsive.

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

**game-colony__MODEL_SLUG__RUN_DATE__vVERSION**

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact values for this run:

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
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder and metadata must use the exact run parameters. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in meta.json.

When finished, report only the project folder path and an honest test status.
