# 02 · Useful app — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> Save the model's reply as `webapp__<model-slug>__<YYYY-MM-DD>__v1.html` (use the exact name the model put on its first line; rename it if it did not). Upload the **.html** to `inbox/`. Never upload a .rar.
> The sorter files it as `runs/<date>_<model>_webapp_v1/index.html`.

---

## Model prompt (send everything below this line)

Build one complete, genuinely useful web app as a single HTML file. You choose the domain: a tool a real person would open every day. Avoid the obvious todo list. Examples to inspire you, not to copy: a music step sequencer, a recipe planner that rescales quantities, a flashcard spaced-repetition trainer, a kanban board with dependencies, a budget tool with charts, a markdown notebook with backlinks, a route and timetable planner, a habit tracker with streak logic.

**Ground rules**
- You choose the name, domain, look and data model. Do not ask questions and do not hedge. Decide and build in one pass.
- One self-contained HTML file: HTML, CSS and JS inline. No external files. A CDN library is allowed only at an exact pinned version, and only if you need it.
- Must run opened directly from disk (`file://`) and when hosted on GitHub Pages from a subfolder. No server, no build step, no install.
- No placeholder text, TODOs or dead buttons.

**What the app must do**
- At least 3 core workflows that work end to end (for example create, schedule, review). Show what a real user would do first.
- Realistic seeded example data on first open, so the app is never empty on arrival. Include an empty-state design for when the user clears it.
- Create, edit and delete on the main entities, with undo for destructive actions.
- Search, plus at least two filters or sort modes.
- State persisted in `localStorage`, wrapped in `try/catch`, plus JSON export and import with validation of the imported data.
- Keyboard shortcuts, with a shortcut help overlay (press `?`).
- Error messages written for a human, never raw exceptions.
- Responsive from 360px to 1440px.
- A **Run checks** button in a settings or about panel that tests the app's core logic and shows at least 10 named checks with pass or fail. All of them must pass.

**Deliverable — naming is mandatory**
- Your file must be named exactly: `webapp__{model-slug}__{YYYY-MM-DD}__v1.html`
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file name, no uppercase letters, no spaces.
- Your first line is that exact file name. Then the complete file in one code block. After the block, five bullets on your key creative choices and one known limitation. Nothing else.

---
