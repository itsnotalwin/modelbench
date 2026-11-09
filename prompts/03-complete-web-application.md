# 03 · Complete Web Application

## Automatic run identity — never ask the organiser

Resolve the run metadata yourself before creating files. Do not ask the user or organiser for model, date, version, category, project title or creative direction.

1. **MODEL_SLUG:** Identify the model actually executing this prompt from the active system/runtime model identifier. Prefer the exact identifier including its variant; otherwise use the public model name exposed by the environment. If provider-qualified, keep the model portion after the final slash. Lowercase it, replace spaces, underscores and other non-alphanumeric characters with hyphens, retain letters, digits, dots and hyphens, collapse repeated hyphens and trim punctuation. Never invent a model identity. If no identity is exposed, use `unknown-model` and disclose that in metadata notes.
2. **RUN_DATE:** Use the current calendar date supplied by system/runtime context in `YYYY-MM-DD` format. If unavailable, use the current UTC date from the runtime. Never use the prompt edit date or a file timestamp.
3. **VERSION:** Always the integer `1`. Never ask, infer, increment or substitute another value.

Use the resolved values in both the output folder and `meta.json`. Do not pause for confirmation and do not leave placeholders in the finished files.

## The challenge

Invent and build a complete browser application that solves a coherent problem for a clearly defined user. You choose the product concept, audience, feature set, information architecture and visual identity. It may be a productivity tool, management system, research tool, personal utility, planning product, creator tool or another useful application. Build a working product, not a dashboard-shaped screenshot.

## Quality bar

Implement at least three connected workflows that share real application state. Include create/read/update/delete operations where appropriate, useful search and filtering, meaningful validation, clear empty/loading/error/success states, persistent data across reloads, and portable import/export where suitable. Related views must stay synchronized. Include realistic sample data only where it helps demonstrate the product, and make it editable. Every control must have a meaningful outcome. Design a coherent navigation model, responsive layouts, keyboard support and accessible forms. Prioritise reliability and workflow depth over feature count.

## Technical and delivery expectations

- Build a browser-first project that runs from `index.html` on static hosting. Use local files and dependable dependencies.
- Do not require a backend, private API, secret key, account, build service or manual setup for the core experience.
- Include only files required by this one finished project. Keep assets local; do not make essential functionality depend on fragile remote services.
- Make the interface responsive, keyboard-usable, accessible and respectful of reduced-motion preferences.
- Every visible control must work. Avoid dead buttons, fake interactions, placeholder panels and unimplemented claims.
- Test the actual experience in a browser when available. Otherwise perform a careful code-level smoke check and disclose the limitation honestly. Never claim tests that were not run.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**web-app__MODEL_SLUG__RUN_DATE__v1**

Replace the model and date tokens using the rules above. The suffix is always `v1`.

At the folder root include **index.html** and **meta.json**. Include local source files and an `assets/` directory only when required by the finished project. Keep everything for this single project inside that folder.

Do not create alternate concepts, multiple versions, additional HTML entry points, README/audit files, screenshots, dependency folders, package files or build output. Do not create files outside the project folder. Do not paste source code into chat.

The metadata file must contain this structure, with your resolved model slug and date and the fixed integer version 1:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "web-app",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "03",
  "prompt_label": "Complete Web Application",
  "notes": "undefined"
}
~~~

Replace both tokens. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. ZIP filenames are not routing keys. Do not include scores or self-awarded evaluations in metadata.

When finished, report only the project folder path and an honest test status.
