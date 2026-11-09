# 15 · Action Roguelite

## Run parameters

Replace these placeholders with the exact values supplied for this run. They must match the output folder and metadata exactly.

- MODEL_SLUG: MODEL_SLUG
- RUN_DATE: RUN_DATE
- VERSION: VERSION

Do not guess missing run parameters. If any value has not been supplied, ask the organiser before creating files.

## The challenge

Create one original action roguelite. You choose the perspective, setting, world, visual style, player abilities, combat approach, enemies, upgrade design and structure of a run. Every attempt should create interesting decisions and a reason to try again. Build a complete playable game loop, not just a combat sandbox or an upgrade menu.

## What the build must deliver

1. Implement a repeatable run structure with meaningful variation between attempts. Variation may come from procedural generation, authored combinations, branching choices or another deliberate system.
2. Build responsive movement and a satisfying action or combat system. Player abilities and enemy behaviours must be readable and responsive.
3. Create multiple distinguishable enemy or challenge types and an escalation curve that changes the pressure on the player.
4. Provide meaningful rewards and upgrades that alter how the player approaches the run. Choices should have distinct consequences rather than being simple numerical decoration.
5. Include a final challenge, boss or clear completion condition, plus useful feedback for health, rewards, upgrades and run state.
6. Complete the full flow: start, play, pause, defeat, victory, results and restart. Persist appropriate long-term unlocks or best results without making a failed run impossible to recover from.

## Quality bar

Make the result feel like a finished, intentionally designed product. Make strong creative and technical decisions independently; do not ask the organiser to choose the concept, visual direction, content, mechanics or implementation. Use a distinctive identity and a consistent visual language. Prioritise clarity, responsiveness, satisfying interaction and meaningful detail over decorative complexity.

Every visible control must work. Every important interaction must create a real state change and give appropriate feedback. Avoid placeholder sections, dead buttons, fake charts, non-functional menus, empty world geometry and features that only look interactive. A smaller coherent experience is better than a large collection of unfinished systems.

## Acceptance checklist

- [ ] A complete run can be started, played and brought to a valid ending.
- [ ] Repeated runs offer meaningful variation.
- [ ] Movement, action/combat, enemies and upgrades affect real game state.
- [ ] Difficulty escalates fairly and the final challenge/completion condition works.
- [ ] Failure, victory, results and restart states behave correctly.
- [ ] The game remains stable and usable on desktop and phone.

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

**game-roguelite__MODEL_SLUG__RUN_DATE__vVERSION**

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact values for this run:

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
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder and metadata must use the exact run parameters. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in meta.json.

When finished, report only the project folder path and an honest test status.
