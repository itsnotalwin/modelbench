# 03 · 2D Game

## Automatic run identity — never ask the organiser or user

Resolve the run metadata yourself before creating files. Do not ask the user or organiser for model, date, version, category, project title or creative direction.

1. **MODEL_SLUG:** Identify the model actually executing this prompt from the active system/runtime model identifier. Prefer the exact identifier including its variant; otherwise use the public model name exposed by the environment. If provider-qualified, keep the model portion after the final slash. Lowercase it, replace spaces, underscores and other non-alphanumeric characters with hyphens, retain letters, digits, dots and hyphens, collapse repeated hyphens and trim punctuation. Never invent a model identity. If no identity is exposed, use `unknown-model` and disclose that in metadata notes.
2. **RUN_DATE:** Use the current calendar date supplied by system/runtime context in `YYYY-MM-DD` format. If unavailable, use the current UTC date from the runtime. Never use the prompt edit date or a file timestamp.
3. **VERSION:** Always use the integer `1`. Never ask, infer, increment or substitute another value.

Use the resolved values in both the output folder and `meta.json`. Do not pause for confirmation and do not leave placeholders in the finished files.

## The brief

Build a complete 2D game as one single HTML file. The genre, concept, theme, mechanics, art style and name are entirely up to you. Choose something you can make feel excellent rather than something familiar and safe.

Hard rules:
- Everything lives in ONE .html file (HTML, CSS and JS inline). No external asset files of any kind: no images, sprites, audio or font files.
- All art (characters, environments, UI, effects) and all sound must be created by you in code: canvas, SVG, CSS or shaders for visuals, synthesised audio (Web Audio). It needs deliberate art direction and visible craft, not placeholder rectangles and circles.
- No library is required. If you use one, load it from a CDN at an exact pinned version only.
- It must run by opening the file directly in a current evergreen browser, with no server, no build step and no install — and must also work when served from a static host such as GitHub Pages from a subfolder. Use no absolute paths.

Game quality:
- A complete game loop: title screen, clear onboarding, core gameplay, escalating challenge or progression, fail/win state, restart, and saved high score or progress (guard storage access with try/catch).
- Keyboard and mouse controls, with touch or gamepad support where it suits the game. On-screen control hints and a pause function.
- Game feel: animation, particles, screen shake or equivalent feedback, parallax or depth, sound and music. Stable framerate, delta-time based movement, crisp rendering at any resolution or pixel density, handles window resize and tab visibility changes.
- No placeholders, TODOs or unfinished mechanics. It should be fun for at least a few minutes.

Deliverable — **naming is mandatory, read it twice:**
- One file only, named exactly: `game2d__{model-slug}__{YYYY-MM-DD}__v1.html`
  Example: `game2d__claude-sonnet-4-5__2026-11-06__v1.html`
  Use today's date (YYYY-MM-DD) and your own model name, lowercased, spaces replaced with hyphens. Do not use a creative file name, uppercase or spaces.
- State that exact file name as the first line of your reply.

Process:
- Do not ask me questions. Make every decision yourself.
- Before finishing, review your code for bugs, runtime errors, soft-locks and balance problems, and fix them.
- Output the complete file in a single code block, followed by a note of under 150 words covering the concept, the controls, and what you are proudest of.

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
  "prompt": "03",
  "prompt_label": "2D Game",
  "notes": "A concise, honest description of the completed project and any known limitations."
}
~~~

Replace both tokens. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. ZIP filenames are not routing keys. Do not include scores or self-awarded evaluations in metadata.

When finished, report only the project folder path and an honest test status.
