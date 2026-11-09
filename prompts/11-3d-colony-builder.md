# 11 · 3D Colony Builder

## Automatic run identity — never ask the organiser

Resolve these three values yourself before creating the project. They are run metadata, not questions for the user.

1. **MODEL_SLUG:** Identify the model that is actually executing this prompt from the active system/runtime model identifier. Prefer the exact model identifier, including its variant, when exposed; otherwise use the public model name supplied by the environment. If it is provider-qualified (for example, `provider/model-name`), keep the model portion. Convert it to lowercase and replace spaces, underscores and other characters with hyphens; retain only letters, digits, dots and hyphens, collapse repeated hyphens and remove leading/trailing punctuation. Do not use the benchmark category, prompt title, organiser's name or an assumed model. Never ask the user. If the runtime exposes no model identity at all, use `unknown-model` and disclose that limitation briefly in `meta.json` notes rather than inventing an identity.
2. **RUN_DATE:** Use the current calendar date supplied by your system/runtime context, formatted as `YYYY-MM-DD`. If that context does not provide a date, use the current UTC calendar date from the runtime. Do not use the prompt's edit date or a file timestamp. Never ask the user.
3. **VERSION:** Always use the integer `1`. This is fixed. Do not ask, infer, increment or substitute another version.

Use the resolved values consistently in the output folder and `meta.json`. Do not pause for confirmation and do not leave literal placeholders in the finished files.## The challenge

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

**game-colony__MODEL_SLUG__RUN_DATE__v1**

Before creating it, replace `MODEL_SLUG` and `RUN_DATE` using the automatic run-identity rules above. The suffix must always be `v1`.

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact automatically resolved model slug and date. Keep `version` as the JSON number `1`:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-colony",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "11",
  "prompt_label": "3D Colony Builder",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

Replace the two metadata tokens with the values you resolved yourself. Do not ask the organiser for them and do not submit unresolved placeholder text. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in `meta.json`.

When finished, report only the project folder path and an honest test status.
