# 21 · Floating Pagoda Island

## Automatic run identity — never ask the organiser or user

Resolve the run metadata yourself before creating files. Do not ask the user or organiser for model, date, version, category, project title or creative direction.

1. **MODEL_SLUG:** Identify the model actually executing this prompt from the active system/runtime model identifier. Prefer the exact identifier including its variant; otherwise use the public model name exposed by the environment. If provider-qualified, keep the model portion after the final slash. Lowercase it, replace spaces, underscores and other non-alphanumeric characters with hyphens, retain letters, digits, dots and hyphens, collapse repeated hyphens and trim punctuation. Never invent a model identity. If no identity is exposed, use `unknown-model` and disclose that in metadata notes.
2. **RUN_DATE:** Use the current calendar date supplied by system/runtime context in `YYYY-MM-DD` format. If unavailable, use the current UTC date from the runtime. Never use the prompt edit date or a file timestamp.
3. **VERSION:** Always use the integer `1`. Never ask, infer, increment or substitute another value.

Use the resolved values in both the output folder and `meta.json`. Do not pause for confirmation and do not leave placeholders in the finished files.

## The brief

Build a floating island in the sky, crowned by a multi-tier pagoda, that a person can explore in a browser tab.

Build a floating island in the sky, crowned by a multi-tier pagoda, that a person can explore in a browser tab. This one is a set brief rather than an open one: the subject is fixed — floating island, pagoda, the sky around it — everything else about how it looks, feels and plays is yours.

The measure of success is whether it feels like a place: somewhere with weather, age, scale and quiet, not a model viewer with a nice gradient.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**island-pagoda__MODEL_SLUG__RUN_DATE__v1**

Replace the model and date tokens using the rules above. The suffix is always `v1`.

At the folder root include **index.html** and **meta.json**. Include local source files and an `assets/` directory only when required by the finished project. Keep everything for this single project inside that folder.

Do not create alternate concepts, multiple versions, additional HTML entry points, README/audit files, screenshots, dependency folders, package files or build output. Do not create files outside the project folder. Do not paste source code into chat.

The metadata file must contain this structure, with your resolved model slug and date and the fixed integer version 1:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "island-pagoda",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "21",
  "prompt_label": "Floating Pagoda Island",
  "notes": "A concise, honest description of the completed project and any known limitations."
}
~~~

Replace both tokens. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. ZIP filenames are not routing keys. Do not include scores or self-awarded evaluations in metadata.

When finished, report only the project folder path and an honest test status.
