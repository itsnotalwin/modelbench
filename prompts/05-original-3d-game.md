# 05 · Original 3D Game

## Automatic run identity — never ask the organiser

Resolve the run metadata yourself before creating files. Do not ask the user or organiser for model, date, version, category, project title or creative direction.

1. **MODEL_SLUG:** Identify the model actually executing this prompt from the active system/runtime model identifier. Prefer the exact identifier including its variant; otherwise use the public model name exposed by the environment. If provider-qualified, keep the model portion after the final slash. Lowercase it, replace spaces, underscores and other non-alphanumeric characters with hyphens, retain letters, digits, dots and hyphens, collapse repeated hyphens and trim punctuation. Never invent a model identity. If no identity is exposed, use `unknown-model` and disclose that in metadata notes.
2. **RUN_DATE:** Use the current calendar date supplied by system/runtime context in `YYYY-MM-DD` format. If unavailable, use the current UTC date from the runtime. Never use the prompt edit date or a file timestamp.
3. **VERSION:** Always the integer `1`. Never ask, infer, increment or substitute another value.

Use the resolved values in both the output folder and `meta.json`. Do not pause for confirmation and do not leave placeholders in the finished files.

## The challenge

Create one complete, original, browser-playable 3D game. You choose the genre, subgenre, premise, world, player role, tone, art direction, camera, mechanics, controls, objective and progression. Any genre is valid: do not assume exploration, racing, combat, survival, building or any other particular format. The result must be a genuinely interactive 3D game, not a 3D scene with a token control.

## Quality bar

Build a real three-dimensional environment with convincing scale, depth, composition, lighting and meaningful spatial design. Implement responsive player interaction and a camera appropriate to your chosen genre. The world must contain authored content and meaningful things to do. Create a playable objective and progression, useful feedback, appropriate start/pause/restart/completion states and reliable input. Use 3D geometry and interaction as core gameplay, not just a decorative background. Support desktop and touch where practical, handle resizing and rendering failures, and keep performance stable.

## Technical and delivery expectations

- Build a browser-first project that runs from `index.html` on static hosting. Use local files and dependable dependencies.
- Do not require a backend, private API, secret key, account, build service or manual setup for the core experience.
- Include only files required by this one finished project. Keep assets local; do not make essential functionality depend on fragile remote services.
- Make the interface responsive, keyboard-usable, accessible and respectful of reduced-motion preferences.
- Every visible control must work. Avoid dead buttons, fake interactions, placeholder panels and unimplemented claims.
- Test the actual experience in a browser when available. Otherwise perform a careful code-level smoke check and disclose the limitation honestly. Never claim tests that were not run.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**game-3d__MODEL_SLUG__RUN_DATE__v1**

Replace the model and date tokens using the rules above. The suffix is always `v1`.

At the folder root include **index.html** and **meta.json**. Include local source files and an `assets/` directory only when required by the finished project. Keep everything for this single project inside that folder.

Do not create alternate concepts, multiple versions, additional HTML entry points, README/audit files, screenshots, dependency folders, package files or build output. Do not create files outside the project folder. Do not paste source code into chat.

The metadata file must contain this structure, with your resolved model slug and date and the fixed integer version 1:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-3d",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "05",
  "prompt_label": "Original 3D Game",
  "notes": "undefined"
}
~~~

Replace both tokens. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. ZIP filenames are not routing keys. Do not include scores or self-awarded evaluations in metadata.

When finished, report only the project folder path and an honest test status.
