# 01 · Website — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> Save the model's reply as `website__<model-slug>__<YYYY-MM-DD>__v1.html` (use the exact name the model put on its first line; rename it if it did not). Upload the **.html** to `inbox/`. Never upload a .rar.
> The sorter files it as `runs/<date>_<model>_website_v1/index.html`.

---

## Model prompt (send everything below this line)

Build one complete, polished website as a single HTML file. You choose the subject: a place, a product, a person, a movement, a company you invent, a festival, a museum, a tool, a research lab, anything. Pick something specific and surprising rather than a generic SaaS or restaurant page.

**Ground rules**
- You choose the name, look, tone and structure. Do not ask questions and do not hedge. Decide and build in one pass.
- One self-contained HTML file: HTML, CSS and JS inline. No external images, audio, data or model files. System fonts only.
- Must run opened directly from disk (`file://`) and when hosted on GitHub Pages from a subfolder. No server, no build step, no install, no absolute paths.
- No lorem ipsum, placeholder text, TODOs or dead buttons. Every control must do something.

**What the site must contain**
- At least 5 distinct sections or screens (hash routing is fine if you build pages).
- Real written copy with a point of view, not filler.
- An original identity: name, logo drawn in inline SVG, a deliberate colour system, a clear type hierarchy.
- At least 3 bespoke illustrations or diagrams drawn in SVG or CSS, not stock shapes.
- One interactive element with real behaviour: a filter, a calculator, a configurator, a validated form, or a lightbox.
- Motion on scroll or hover that respects `prefers-reduced-motion`.
- A contact or signup form with validation and a success state.
- Working mobile navigation, semantic HTML, alt text, keyboard focus styles.
- No horizontal overflow at 390px or 1440px.

**Deliverable — naming is mandatory**
- Your file must be named exactly: `website__{model-slug}__{YYYY-MM-DD}__v1.html`
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file name, no uppercase letters, no spaces.
- Your first line is that exact file name. Then the complete file in one code block. After the block, five bullets on your key creative choices and one known limitation. Nothing else.

---
