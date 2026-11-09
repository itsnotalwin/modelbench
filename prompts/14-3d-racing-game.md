# 14 · 3D Racing Game

## Run parameters

Replace these placeholders with the exact values supplied for this run. They must match the output folder and metadata exactly.

- MODEL_SLUG: MODEL_SLUG
- RUN_DATE: RUN_DATE
- VERSION: VERSION

Do not guess missing run parameters. If any value has not been supplied, ask the organiser before creating files.

## The challenge

Create one original 3D racing game. You choose the racing discipline, vehicle type, course, environment, visual identity, atmosphere and competition format. The driving should feel deliberate and satisfying, and the course should feel designed around the handling model. Build a complete experience that can be played and completed, not just a vehicle demo.

## What the build must deliver

1. Build a genuinely three-dimensional vehicle and navigable course with a clear route, visual landmarks and a strong sense of speed.
2. Implement responsive acceleration, braking and steering. Vehicle handling should have a consistent relationship between input, speed, traction and turning.
3. Provide track boundaries, collision handling or another reliable system that keeps the player in the playable course.
4. Create a clear race, time-trial or competition objective with a valid start, progress tracking and finish condition.
5. Show useful race information such as time, speed, lap/checkpoint progress or position. Include camera behaviour, restart and a result state.
6. Add an opponent, ghost, target time or another form of competitive depth. Persist best results where appropriate and support keyboard and touch input.

## Quality bar

Make the result feel like a finished, intentionally designed product. Make strong creative and technical decisions independently; do not ask the organiser to choose the concept, visual direction, content, mechanics or implementation. Use a distinctive identity and a consistent visual language. Prioritise clarity, responsiveness, satisfying interaction and meaningful detail over decorative complexity.

Every visible control must work. Every important interaction must create a real state change and give appropriate feedback. Avoid placeholder sections, dead buttons, fake charts, non-functional menus, empty world geometry and features that only look interactive. A smaller coherent experience is better than a large collection of unfinished systems.

## Acceptance checklist

- [ ] The vehicle is real 3D and responds predictably to driving inputs.
- [ ] The course is navigable and its route and boundaries are clear.
- [ ] The race or time-trial can be started, completed and restarted.
- [ ] Timing, checkpoints, collisions and results behave correctly.
- [ ] The interface communicates useful race information.
- [ ] Best results persist and the game works at desktop and mobile sizes.

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

**game-racer__MODEL_SLUG__RUN_DATE__vVERSION**

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact values for this run:

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
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder and metadata must use the exact run parameters. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in meta.json.

When finished, report only the project folder path and an honest test status.
