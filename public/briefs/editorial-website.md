# 04 · Editorial Website

## Automatic run identity — never ask the organiser or user

Resolve the run metadata yourself before creating files. Do not ask the user or organiser for model, date, version, category, project title or creative direction.

1. **MODEL_SLUG:** Identify the model actually executing this prompt from the active system/runtime model identifier. Prefer the exact identifier including its variant; otherwise use the public model name exposed by the environment. If provider-qualified, keep the model portion after the final slash. Lowercase it, replace spaces, underscores and other non-alphanumeric characters with hyphens, retain letters, digits, dots and hyphens, collapse repeated hyphens and trim punctuation. Never invent a model identity. If no identity is exposed, use `unknown-model` and disclose that in metadata notes.
2. **RUN_DATE:** Use the current calendar date supplied by system/runtime context in `YYYY-MM-DD` format. If unavailable, use the current UTC date from the runtime. Never use the prompt edit date or a file timestamp.
3. **VERSION:** Always use the integer `1`. Never ask, infer, increment or substitute another value.

Use the resolved values in both the output folder and `meta.json`. Do not pause for confirmation and do not leave placeholders in the finished files.

## The brief

Create a complete editorial publication for a subject of your choice. It could be a digital magazine, architecture journal, cultural publication, photography journal, fashion publication, research review or something entirely original. Choose a subject you can make genuinely compelling.

The publication must feel like a real editorial product, not a generic landing page. Invent its name, editorial point of view, visual identity, content structure and voice. Write substantial original content rather than filler.

Requirements:
- Use semantic HTML5 and CSS3 as the foundation. No React, Vue, Angular or UI component frameworks.
- Build a homepage and at least two additional content pages with meaningful, working internal navigation.
- Establish a distinctive typographic system, responsive grid and deliberate spacing rhythm.
- Include substantial editorial content: headlines, standfirsts, body copy, captions, metadata and related reading.
- Use original artwork made with CSS or SVG, or locally created assets. Do not rely on hotlinked images or external stock assets.
- Include responsive navigation, appropriate article structure, accessible landmarks, skip link, visible focus and useful alt text.
- Use JavaScript only for enhancements that genuinely need it; the publication must remain readable and navigable without JavaScript.
- Respect prefers-reduced-motion and avoid layout shifts.

The subject, audience, name, editorial voice, art direction and page structure are yours. Do not copy an existing publication or use a supplied example concept.

## Completion standard

Deliver a complete, coherent, working experience. Every visible control must do what it says. Do not use placeholder copy, fake functionality, dead links or unfinished panels. Review the implementation for runtime errors, responsive problems, keyboard issues and edge cases before submission. Be honest in the metadata notes about anything that remains incomplete.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**editorial-website__MODEL_SLUG__RUN_DATE__v1**

Replace the model and date tokens using the rules above. The suffix is always `v1`.

At the folder root include **index.html** and **meta.json**. Include local source files and an `assets/` directory only when required by the finished project. Keep everything for this single project inside that folder.

Do not create alternate concepts, multiple versions, additional HTML entry points, README/audit files, screenshots, dependency folders, package files or build output. Do not create files outside the project folder. Do not paste source code into chat.

The metadata file must contain this structure, with your resolved model slug and date and the fixed integer version 1:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "editorial-website",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "04",
  "prompt_label": "Editorial Website",
  "notes": "A concise, honest description of the completed project and any known limitations."
}
~~~

Replace both tokens. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. ZIP filenames are not routing keys. Do not include scores or self-awarded evaluations in metadata.

When finished, report only the project folder path and an honest test status.
