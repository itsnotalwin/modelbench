# 12 · Voxel Sandbox Game

## Automatic run identity — never ask the organiser

Resolve these three values yourself before creating the project. They are run metadata, not questions for the user.

1. **MODEL_SLUG:** Identify the model that is actually executing this prompt from the active system/runtime model identifier. Prefer the exact model identifier, including its variant, when exposed; otherwise use the public model name supplied by the environment. If it is provider-qualified (for example, `provider/model-name`), keep the model portion. Convert it to lowercase and replace spaces, underscores and other characters with hyphens; retain only letters, digits, dots and hyphens, collapse repeated hyphens and remove leading/trailing punctuation. Do not use the benchmark category, prompt title, organiser's name or an assumed model. Never ask the user. If the runtime exposes no model identity at all, use `unknown-model` and disclose that limitation briefly in `meta.json` notes rather than inventing an identity.
2. **RUN_DATE:** Use the current calendar date supplied by your system/runtime context, formatted as `YYYY-MM-DD`. If that context does not provide a date, use the current UTC calendar date from the runtime. Do not use the prompt's edit date or a file timestamp. Never ask the user.
3. **VERSION:** Always use the integer `1`. This is fixed. Do not ask, infer, increment or substitute another version.

Use the resolved values consistently in the output folder and `meta.json`. Do not pause for confirmation and do not leave literal placeholders in the finished files.## The challenge

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

**game-voxel__MODEL_SLUG__RUN_DATE__v1**

Before creating it, replace `MODEL_SLUG` and `RUN_DATE` using the automatic run-identity rules above. The suffix must always be `v1`.

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact automatically resolved model slug and date. Keep `version` as the JSON number `1`:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-voxel",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "12",
  "prompt_label": "Voxel Sandbox Game",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

Replace the two metadata tokens with the values you resolved yourself. Do not ask the organiser for them and do not submit unresolved placeholder text. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in `meta.json`.

When finished, report only the project folder path and an honest test status.
