# 09 · SVG Drawing Studio

## Automatic run identity — never ask the organiser or user

Resolve the run metadata yourself before creating files. Do not ask the user or organiser for model, date, version, category, project title or creative direction.

1. **MODEL_SLUG:** Identify the model actually executing this prompt from the active system/runtime model identifier. Prefer the exact identifier including its variant; otherwise use the public model name exposed by the environment. If provider-qualified, keep the model portion after the final slash. Lowercase it, replace spaces, underscores and other non-alphanumeric characters with hyphens, retain letters, digits, dots and hyphens, collapse repeated hyphens and trim punctuation. Never invent a model identity. If no identity is exposed, use `unknown-model` and disclose that in metadata notes.
2. **RUN_DATE:** Use the current calendar date supplied by system/runtime context in `YYYY-MM-DD` format. If unavailable, use the current UTC date from the runtime. Never use the prompt edit date or a file timestamp.
3. **VERSION:** Always use the integer `1`. Never ask, infer, increment or substitute another value.

Use the resolved values in both the output folder and `meta.json`. Do not pause for confirmation and do not leave placeholders in the finished files.

## The brief

Build a browser-based vector drawing studio using SVG as its primary graphics and document format. Users must be able to create and edit artwork in the application; displaying a pre-made SVG gallery is not enough.

Requirements:
- SVG must be the primary rendering format. Do not use Canvas or WebGL as the main drawing surface.
- Allow users to create and edit multiple shape types, such as rectangles, ellipses, lines, polygons and freeform paths.
- Include selection, movement, resizing and rotation with clear handles and accurate pointer coordinates.
- Provide controls for fill, stroke, stroke width, opacity and other useful vector properties.
- Include at least one meaningful advanced vector operation, such as editable Bézier nodes, path drawing, grouping, alignment or layering.
- Include undo and redo that correctly restore document state.
- Provide a useful starter document or sample artwork on first launch.
- Allow users to export a valid, self-contained SVG file. PNG export is welcome but does not replace SVG export.
- Make the workspace usable with mouse, keyboard and touch where appropriate.
- Handle zoom, pan, resizing, empty documents and invalid file input gracefully.
- Use accessible controls, visible focus and a coherent professional workspace.

Choose the application's identity, visual direction, tool arrangement and sample artwork yourself. The exported SVG should remain editable in other vector applications.

## Completion standard

Deliver a complete, coherent, working experience. Every visible control must do what it says. Do not use placeholder copy, fake functionality, dead links or unfinished panels. Review the implementation for runtime errors, responsive problems, keyboard issues and edge cases before submission. Be honest in the metadata notes about anything that remains incomplete.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**svg-studio__MODEL_SLUG__RUN_DATE__v1**

Replace the model and date tokens using the rules above. The suffix is always `v1`.

At the folder root include **index.html** and **meta.json**. Include local source files and an `assets/` directory only when required by the finished project. Keep everything for this single project inside that folder.

Do not create alternate concepts, multiple versions, additional HTML entry points, README/audit files, screenshots, dependency folders, package files or build output. Do not create files outside the project folder. Do not paste source code into chat.

The metadata file must contain this structure, with your resolved model slug and date and the fixed integer version 1:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "svg-studio",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "09",
  "prompt_label": "SVG Drawing Studio",
  "notes": "A concise, honest description of the completed project and any known limitations."
}
~~~

Replace both tokens. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. ZIP filenames are not routing keys. Do not include scores or self-awarded evaluations in metadata.

When finished, report only the project folder path and an honest test status.
