# 06 · 2D Puzzle Game

## Run parameters

Replace these placeholders with the exact values supplied for this run. They must match the output folder and metadata exactly.

- MODEL_SLUG: MODEL_SLUG
- RUN_DATE: RUN_DATE
- VERSION: VERSION

Do not guess missing run parameters. If any value has not been supplied, ask the organiser before creating files.

## The challenge

Design and build one complete original 2D puzzle game. You decide the premise, setting, visual style, tone, player role, rules, puzzle mechanic, level structure and progression. The mechanic should be understandable, offer room for mastery and produce interesting decisions. Do not imitate an existing game's levels, characters, branding or presentation.

## What the build must deliver

1. Invent a central puzzle mechanic and teach it clearly through the opening interaction. The player should understand what actions are available and why they matter.
2. Create at least six designed, solvable stages or challenges with a deliberate difficulty curve. Avoid relying on random layouts that may be impossible to solve.
3. Implement reliable game state, collision or rule resolution, win detection and clear feedback for successful and invalid actions.
4. Provide restart and undo or another fair recovery mechanism. Add hints only if they support the design without solving the game automatically.
5. Support keyboard and touch input with clear controls. Include complete title, playing, pause where appropriate, stage-complete and game-complete states.
6. Save meaningful progress locally and restore it safely after reload.

## Quality bar

Make the result feel like a finished, intentionally designed product. Make strong creative and technical decisions independently; do not ask the organiser to choose the concept, visual direction, content, mechanics or implementation. Use a distinctive identity and a consistent visual language. Prioritise clarity, responsiveness, satisfying interaction and meaningful detail over decorative complexity.

Every visible control must work. Every important interaction must create a real state change and give appropriate feedback. Avoid placeholder sections, dead buttons, fake charts, non-functional menus, empty world geometry and features that only look interactive. A smaller coherent experience is better than a large collection of unfinished systems.

## Acceptance checklist

- [ ] The game has an original, understandable puzzle mechanic.
- [ ] At least six stages are playable and can be completed.
- [ ] Rules, state changes, invalid moves and completion are communicated clearly.
- [ ] Undo/restart or equivalent recovery works reliably.
- [ ] Keyboard and touch controls are both usable.
- [ ] Progress persists and the game remains responsive at common screen sizes.

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

**game-2d__MODEL_SLUG__RUN_DATE__vVERSION**

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact values for this run:

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
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder and metadata must use the exact run parameters. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in meta.json.

When finished, report only the project folder path and an honest test status.
