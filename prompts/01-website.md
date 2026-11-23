# 01 · Website

## Automatic run identity — never ask the organiser or user

Resolve the run metadata yourself before creating files. Do not ask the user or organiser for model, date, version, category, project title or creative direction.

1. **MODEL_SLUG:** Identify the model actually executing this prompt from the active system/runtime model identifier. Prefer the exact identifier including its variant; otherwise use the public model name exposed by the environment. If provider-qualified, keep the model portion after the final slash. Lowercase it, replace spaces, underscores and other non-alphanumeric characters with hyphens, retain letters, digits, dots and hyphens, collapse repeated hyphens and trim punctuation. Never invent a model identity. If no identity is exposed, use `unknown-model` and disclose that in metadata notes.
2. **RUN_DATE:** Use the current calendar date supplied by system/runtime context in `YYYY-MM-DD` format. If unavailable, use the current UTC date from the runtime. Never use the prompt edit date or a file timestamp.
3. **VERSION:** Always use the integer `1`. Never ask, infer, increment or substitute another value.

Use the resolved values in both the output folder and `meta.json`. Do not pause for confirmation and do not leave placeholders in the finished files.

## The brief

Build a website. The subject, concept, audience, layout and structure are entirely up to you. Choose something you can make genuinely exceptional rather than something safe or generic.

Constraints:
- Strictly monochrome: only black, white and shades of grey, everywhere (type, UI, imagery, shadows, gradients, SVGs, favicon). No accent colour, ever.
- Treat this as a showcase of the best you are capable of: art direction, typography, layout, motion, interaction, copywriting, accessibility, performance and engineering craft. Make bold, original decisions. Avoid anything that looks templated.
- Fully responsive, keyboard accessible, respects prefers-reduced-motion, works in current evergreen browsers.
- No placeholders, lorem ipsum, TODOs, broken links or dead buttons. Every element must be real and functional.
- All imagery must be created by you (SVG, canvas, CSS, shaders, etc.). No external image files or stock assets.
- Static only, no build step, ready to deploy on GitHub Pages as-is. Use relative paths so it works from a repository subfolder. Avoid external dependencies; if one is truly worth it, pin an exact version and justify it.

Deliverable — **naming is mandatory, read it twice:**
- Everything lives inside ONE folder named exactly: `{YYYY-MM-DD}_{model-slug}_website_v1`
  Example: `2026-11-06_claude-sonnet-4-5_website_v1`
  Use today's date (YYYY-MM-DD) and your own model name, lowercased, spaces replaced with hyphens. No creative folder name, no uppercase, no spaces.
- `index.html` at the **root** of that folder is required — it is the single entry point. Opening it must fully render the site with no server, no build step and no install, both from `file://` and from GitHub Pages.
- All CSS, JS and assets must be referenced with relative paths from inside that folder (e.g. `styles.css`, `js/app.js`) so the site works when the folder is served from a repository subpath.
- Include a short `README.md` in the folder covering the concept, key design and technical decisions, and what you would improve with more time.

Process:
- Do not ask me questions. Make every decision yourself and deliver the finished work in one go.
- State the exact folder name at the top of your reply, then the full folder tree, then every file in full in its own code block.
- Before finishing, review your own work, test it if you have the tools to, and fix any problems you find.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**website__MODEL_SLUG__RUN_DATE__v1**

Replace the model and date tokens using the rules above. The suffix is always `v1`.

At the folder root include **index.html** and **meta.json**. Include local source files and an `assets/` directory only when required by the finished project. Keep everything for this single project inside that folder.

Do not create alternate concepts, multiple versions, additional HTML entry points, README/audit files, screenshots, dependency folders, package files or build output. Do not create files outside the project folder. Do not paste source code into chat.

The metadata file must contain this structure, with your resolved model slug and date and the fixed integer version 1:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "website",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "01",
  "prompt_label": "Website",
  "notes": "A concise, honest description of the completed project and any known limitations."
}
~~~

Replace both tokens. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. ZIP filenames are not routing keys. Do not include scores or self-awarded evaluations in metadata.

When finished, report only the project folder path and an honest test status.
