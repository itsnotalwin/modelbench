# 01 · Website — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `website__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate, complete websites**, each as its own single HTML file. Each one is about a different subject that you choose: a place, a product, a person, a movement, a company you invent, a festival, a museum, a tool, a research lab. No two may share a name, subject or visual identity. Avoid the generic SaaS or restaurant page.

**Ground rules (apply to all three)**
- You choose the names, look, tone and structure. Do not ask questions and do not hedge. Decide and build.
- Each file is self-contained: HTML, CSS and JS inline. No external images, audio, data or model files. System fonts only.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder. No server, no build, no install, no absolute paths.
- No lorem ipsum, placeholder text, TODOs or dead buttons.

**What each website must contain**
- At least 5 distinct sections or screens (hash routing is fine if you build pages).
- Real written copy with a point of view, not filler.
- An original identity: name, logo drawn in inline SVG, a deliberate colour system, a clear type hierarchy.
- At least 3 bespoke illustrations or diagrams drawn in SVG or CSS.
- One interactive element with real behaviour: a filter, a calculator, a configurator, a validated form, or a lightbox.
- Motion on scroll or hover that respects `prefers-reduced-motion`.
- A contact or signup form with validation and a success state.
- Working mobile navigation, semantic HTML, alt text, visible keyboard focus.
- No horizontal overflow at 390px or 1440px.

**Delivery — naming is mandatory**
- File names are `website__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per website: its subject, the key creative choice, and one known limitation. Nothing else.

---
