# Website — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model must put everything in a folder named `{YYYY-MM-DD}_{model-slug}_website_v1` with `index.html` at its root.
> If it used a different folder name, rename the folder to that prefix, then zip the folder and name the zip:
>
> `website__{model}__{YYYY-MM-DD}__v1.zip`
>
> Example: `website__claude-sonnet-4-5__2026-11-06__v1.zip` (containing `2026-11-06_claude-sonnet-4-5_website_v1/index.html`)
> Upload the **.zip** (never .rar) to `inbox/`. The Action unpacks it to `runs/{date}_{model}_website_v1/` and the dashboard previews `index.html`.

---

## Model prompt (send everything below this line)

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
