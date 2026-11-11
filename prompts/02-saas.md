# 02 · SaaS for Clearing Agents

## Automatic run identity — never ask the organiser or user

Resolve the run metadata yourself before creating files. Do not ask the user or organiser for model, date, version, category, project title or creative direction.

1. **MODEL_SLUG:** Identify the model actually executing this prompt from the active system/runtime model identifier. Prefer the exact identifier including its variant; otherwise use the public model name exposed by the environment. If provider-qualified, keep the model portion after the final slash. Lowercase it, replace spaces, underscores and other non-alphanumeric characters with hyphens, retain letters, digits, dots and hyphens, collapse repeated hyphens and trim punctuation. Never invent a model identity. If no identity is exposed, use `unknown-model` and disclose that in metadata notes.
2. **RUN_DATE:** Use the current calendar date supplied by system/runtime context in `YYYY-MM-DD` format. If unavailable, use the current UTC date from the runtime. Never use the prompt edit date or a file timestamp.
3. **VERSION:** Always use the integer `1`. Never ask, infer, increment or substitute another value.

Use the resolved values in both the output folder and `meta.json`. Do not pause for confirmation and do not leave placeholders in the finished files.

## The brief

Build a working SaaS product for clearing agents (the customs clearing and freight forwarding side of international trade). What the product is, who it serves within that world, which problems it solves and how it is structured is up to you. Pick a sharp, genuinely useful angle and commit to it.

"Working" means real, not a mockup:
- A user can sign up or sign in (or otherwise enter the product), and real data flows end to end: create, read, update, delete, search, filter, status changes, and documents or outputs they can actually use.
- Data persists between sessions.
- Core workflows are fully implemented, validate input, and handle errors and empty states. It ships with realistic seed/demo data so it is usable on first launch.
- It includes the domain-specific logic (calculations, validations, document generation, statuses, etc.) that someone working in this industry would expect. It must not be generic CRUD with a relabelled theme.

Design:
- Strictly monochrome: only black, white and shades of grey, everywhere. No accent colour, ever.
- SaaS-grade UX: dense but legible, keyboard friendly, responsive, accessible, with considered typography, motion and states. Make it feel like a product people would pay for.

Engineering:
- The product must run on a fresh machine with at most one install command and one start command, documented in the README.
- No paid services, API keys or external accounts required. No hardcoded secrets.
- Sensible project structure, security basics (input validation, auth where appropriate), and tests for the core logic.

Deliverable — **naming and entry point are mandatory, read them twice:**
- Everything lives inside ONE folder named exactly: `{YYYY-MM-DD}_{model-slug}_saas_v1`
  Example: `2026-11-06_claude-sonnet-4-5_saas_v1`
  Use today's date (YYYY-MM-DD) and your own model name, lowercased, spaces replaced with hyphens. No creative folder name, no uppercase, no spaces.
- **`index.html` at the root of that folder is required and must be a fully working version of the product that runs with NO server, NO build step and NO install** — opened directly (`file://`) or served from a static host such as GitHub Pages. It must contain the real product: sign in/up, seeded demo data, full CRUD, search, filters, status transitions and document/CSV output, with state persisted in `localStorage` (every storage access wrapped in `try/catch`). All CSS and JS referenced with relative paths from inside the folder.
- If you also want to ship a server-backed implementation (Python/Node/etc.), put it alongside as extra credit in a clearly named subfolder, documented in the README. The `index.html` build is the primary deliverable and must not depend on it.
- Include a `README.md` covering what it is, how to run it, the architecture, what is implemented, the demo credentials, and known limitations.

Process:
- Do not ask me questions. Make every decision yourself and deliver the finished work in one go.
- State the exact folder name at the top of your reply, then the full folder tree, then every file in full in its own code block.
- Before finishing, review and run/test your work if you have the tools to, and fix any problems you find. Confirm `index.html` works with no server before you finish.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**saas__MODEL_SLUG__RUN_DATE__v1**

Replace the model and date tokens using the rules above. The suffix is always `v1`.

At the folder root include **index.html** and **meta.json**. Include local source files and an `assets/` directory only when required by the finished project. Keep everything for this single project inside that folder.

Do not create alternate concepts, multiple versions, additional HTML entry points, README/audit files, screenshots, dependency folders, package files or build output. Do not create files outside the project folder. Do not paste source code into chat.

The metadata file must contain this structure, with your resolved model slug and date and the fixed integer version 1:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "saas",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "02",
  "prompt_label": "SaaS for Clearing Agents",
  "notes": "A concise, honest description of the completed project and any known limitations."
}
~~~

Replace both tokens. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. ZIP filenames are not routing keys. Do not include scores or self-awarded evaluations in metadata.

When finished, report only the project folder path and an honest test status.
