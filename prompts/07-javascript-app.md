# 07 · JavaScript Application

## Automatic run identity — never ask the organiser or user

Resolve the run metadata yourself before creating files. Do not ask the user or organiser for model, date, version, category, project title or creative direction.

1. **MODEL_SLUG:** Identify the model actually executing this prompt from the active system/runtime model identifier. Prefer the exact identifier including its variant; otherwise use the public model name exposed by the environment. If provider-qualified, keep the model portion after the final slash. Lowercase it, replace spaces, underscores and other non-alphanumeric characters with hyphens, retain letters, digits, dots and hyphens, collapse repeated hyphens and trim punctuation. Never invent a model identity. If no identity is exposed, use `unknown-model` and disclose that in metadata notes.
2. **RUN_DATE:** Use the current calendar date supplied by system/runtime context in `YYYY-MM-DD` format. If unavailable, use the current UTC date from the runtime. Never use the prompt edit date or a file timestamp.
3. **VERSION:** Always use the integer `1`. Never ask, infer, increment or substitute another value.

Use the resolved values in both the output folder and `meta.json`. Do not pause for confirmation and do not leave placeholders in the finished files.

## The brief

Build a complete browser-based application using vanilla JavaScript. Choose the concept yourself: a productivity tool, personal organiser, planning system, research workspace, data manager or something entirely different. It should behave like a real application, not a static website with a few decorative buttons.

Requirements:
- Use HTML, CSS and vanilla JavaScript. Do not use React, Vue, Angular, Svelte or another frontend framework.
- No build step or installation should be required. Keep runtime dependencies to zero.
- Implement meaningful application state and structured data management.
- Include multiple views or functional sections connected by real workflows.
- Implement real interactions, form validation, useful feedback and robust error handling.
- Persist appropriate user data between sessions, with safe handling when browser storage is unavailable.
- Include import/export or another useful data portability feature where it suits the concept.
- Organise code into understandable modules or clearly separated sections.
- Handle empty states, invalid inputs, duplicate data, refreshes and unexpected user actions.
- Make the application responsive, keyboard accessible and usable on touch devices.

Invent the product, audience, visual identity, data model and workflows. Do not present a simulated backend as a real server integration. Clearly disclose any feature that necessarily remains local-only.

## Completion standard

Deliver a complete, coherent, working experience. Every visible control must do what it says. Do not use placeholder copy, fake functionality, dead links or unfinished panels. Review the implementation for runtime errors, responsive problems, keyboard issues and edge cases before submission. Be honest in the metadata notes about anything that remains incomplete.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**javascript-app__MODEL_SLUG__RUN_DATE__v1**

Replace the model and date tokens using the rules above. The suffix is always `v1`.

At the folder root include **index.html** and **meta.json**. Include local source files and an `assets/` directory only when required by the finished project. Keep everything for this single project inside that folder.

Do not create alternate concepts, multiple versions, additional HTML entry points, README/audit files, screenshots, dependency folders, package files or build output. Do not create files outside the project folder. Do not paste source code into chat.

The metadata file must contain this structure, with your resolved model slug and date and the fixed integer version 1:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "javascript-app",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "07",
  "prompt_label": "JavaScript Application",
  "notes": "A concise, honest description of the completed project and any known limitations."
}
~~~

Replace both tokens. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. ZIP filenames are not routing keys. Do not include scores or self-awarded evaluations in metadata.

When finished, report only the project folder path and an honest test status.
