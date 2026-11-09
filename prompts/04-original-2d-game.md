# 04 · Original 2D Game

## Automatic run identity — never ask the organiser or user

Resolve the run metadata yourself before creating files. Do not ask the user or organiser for model, date, version, category, project title or creative direction.

1. **MODEL_SLUG:** Identify the model actually executing this prompt from the active system/runtime model identifier. Prefer the exact identifier including its variant; otherwise use the public model name exposed by the environment. If provider-qualified, keep the model portion after the final slash. Lowercase it, replace spaces, underscores and other non-alphanumeric characters with hyphens, retain letters, digits, dots and hyphens, collapse repeated hyphens and trim punctuation. Never invent a model identity. If no identity is exposed, use `unknown-model` and disclose that in metadata notes.
2. **RUN_DATE:** Use the current calendar date supplied by system/runtime context in `YYYY-MM-DD` format. If unavailable, use the current UTC date from the runtime. Never use the prompt edit date or a file timestamp.
3. **VERSION:** Always use the integer `1`. Never ask, infer, increment or substitute another value.

Use the resolved values in both the output folder and `meta.json`. Do not pause for confirmation and do not leave placeholders in the finished files.

## The challenge

Create one complete, original, browser-playable 2D game. You choose the genre and subgenre, premise, setting, tone, art style, perspective, core activity, mechanics, controls, content structure and progression. Any game genre is valid. Do not default to puzzles or assume a platformer, shooter, action game, strategy game, simulation, racing game or any other familiar format. Choose one direction independently and make it coherent. Do not ask the organiser to choose or present multiple concepts.

## Quality bar

Build a complete playable loop with a clear goal, meaningful decisions, rules that actually work and a satisfying outcome. Include enough designed content to demonstrate the chosen genre. Make movement, interaction, collision, simulation or opponent behaviour reliable wherever relevant. Give important actions immediate visual and/or audio feedback. Include a deliberate start/gameplay/pause/restart/result flow appropriate to the design. Choose controls that suit the game and support desktop and mobile sensibly. Persist progress, settings or results where appropriate. A small finished game is better than a large unfinished prototype.

## Technical and delivery expectations

- Build a browser-first project that runs from `index.html` on static hosting. Use local files and dependable dependencies.
- Do not require a backend, private API, secret key, account, build service or manual setup for the core experience.
- Include only files required by this one finished project. Keep assets local; do not make essential functionality depend on fragile remote services.
- Make the interface responsive, keyboard-usable, accessible and respectful of reduced-motion preferences.
- Every visible control must work. Avoid dead buttons, fake interactions, placeholder panels and unimplemented claims.
- Test the actual experience in a browser when available. Otherwise perform a careful code-level smoke check and disclose the limitation honestly. Never claim tests that were not run.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**game-2d__MODEL_SLUG__RUN_DATE__v1**

Replace the model and date tokens using the rules above. The suffix is always `v1`.

At the folder root include **index.html** and **meta.json**. Include local source files and an `assets/` directory only when required by the finished project. Keep everything for this single project inside that folder.

Do not create alternate concepts, multiple versions, additional HTML entry points, README/audit files, screenshots, dependency folders, package files or build output. Do not create files outside the project folder. Do not paste source code into chat.

The metadata file must contain this structure, with your resolved model slug and date and the fixed integer version 1:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-2d",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "04",
  "prompt_label": "Original 2D Game",
  "notes": "A concise, honest description of the completed project and any known limitations."
}
~~~

Replace both tokens. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. ZIP filenames are not routing keys. Do not include scores or self-awarded evaluations in metadata.

When finished, report only the project folder path and an honest test status.
