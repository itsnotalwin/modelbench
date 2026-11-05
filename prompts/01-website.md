# Website — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> **The model creates a folder, but it must be renamed to the benchmark prefix.**
> Rename the model's folder to `{date}_{model}_{category}_v1`, then zip it and name the zip:
>
> `website__{model}__{YYYY-MM-DD}__v1.zip`
>
> Example: rename `the-grey-index/` → `2026-11-06_claude-sonnet-4-5_website_v1/`, zip it as `website__claude-sonnet-4-5__2026-11-06__v1.zip`
> The GitHub Action (`auto-sort`) also renames it automatically on upload to `runs/{date}_{model}_website_v1/` — so the repo folder always uses the prefix, never the model's creative name. Contents are untouched.

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

Deliverable:
- Everything inside a single self-contained folder with its own creative, memorable name (lowercase-kebab-case). The entry point is index.html at the root of that folder.
- Include a short README.md in the folder covering the concept, key design and technical decisions, and what you would improve with more time.

Process:
- Do not ask me questions. Make every decision yourself and deliver the finished work in one go.
- If you cannot create files directly, output the folder tree followed by every file in full, each in its own code block, ready to copy into a repository.
- Before finishing, review your own work, test it if you have the tools to, and fix any problems you find.
