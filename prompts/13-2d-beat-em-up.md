# 13 · 2D Action Brawler

## Run parameters

Replace these placeholders with the exact values supplied for this run. They must match the output folder and metadata exactly.

- MODEL_SLUG: MODEL_SLUG
- RUN_DATE: RUN_DATE
- VERSION: VERSION

Do not guess missing run parameters. If any value has not been supplied, ask the organiser before creating files.

## The challenge

Create one original 2D side-scrolling action brawler. You choose the setting, cast, visual direction, tone, combat identity, enemy designs, stages and narrative approach. The focus is responsive close-range action with readable decisions and a satisfying sense of impact. Make it your own rather than reproducing an existing game's characters, moves or stages.

## What the build must deliver

1. Create a controllable character with responsive movement through a side-scrolling play space. Use lane/depth movement or another suitable spatial mechanic if it supports the design.
2. Build a combat system with multiple meaningful actions, reliable hit detection, readable attack timing and feedback for hits, damage, defence or evasion.
3. Implement at least two enemy behaviour types with distinct patterns, clear cues and fair opportunities to respond.
4. Structure play into a sequence of encounters or stages with escalation and a meaningful final encounter or completion condition.
5. Provide clear game states such as title, play, pause, defeat and victory, with reliable restart. Include a useful HUD for health and other relevant information.
6. Support keyboard controls and practical touch controls. Make the action readable at different screen sizes.

## Quality bar

Make the result feel like a finished, intentionally designed product. Make strong creative and technical decisions independently; do not ask the organiser to choose the concept, visual direction, content, mechanics or implementation. Use a distinctive identity and a consistent visual language. Prioritise clarity, responsiveness, satisfying interaction and meaningful detail over decorative complexity.

Every visible control must work. Every important interaction must create a real state change and give appropriate feedback. Avoid placeholder sections, dead buttons, fake charts, non-functional menus, empty world geometry and features that only look interactive. A smaller coherent experience is better than a large collection of unfinished systems.

## Acceptance checklist

- [ ] The player can move and fight through a complete playable encounter.
- [ ] Attacks, hit detection, damage and enemy reactions change real game state.
- [ ] Enemy behaviours differ and provide readable, fair challenges.
- [ ] The game has progression and a working final encounter or completion state.
- [ ] Title, pause, defeat, victory and restart flows behave correctly.
- [ ] The game remains readable and controllable on desktop and phone.

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

**game-brawler__MODEL_SLUG__RUN_DATE__vVERSION**

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact values for this run:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-brawler",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "13",
  "prompt_label": "2D Action Brawler",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder and metadata must use the exact run parameters. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in meta.json.

When finished, report only the project folder path and an honest test status.
