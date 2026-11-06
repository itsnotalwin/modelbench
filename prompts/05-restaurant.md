# Restaurant website — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model must deliver one `.html` file and state its name at the top of the reply.
> Save it as exactly:
>
> `cafe__{model}__{YYYY-MM-DD}__v2.html`
>
> Example: `cafe__claude-sonnet-4-5__2026-11-06__v2.html`
> Upload that **.html** (never .rar) to `inbox/`. The Action files it as `runs/{date}_{model}_cafe_v2/`, previewable on the dashboard.

---

## Model prompt (send everything below this line)

Build the complete website for a café, restaurant or bar that you invent. Name, cuisine, city, story and identity are entirely up to you. No menu is supplied: you write everything, including a full menu. Choose a concept with a strong point of view and make it feel like a real place people would book a table at tonight.

The bar:
- This is a test of the absolute ceiling of what you can build in one response. Not a demo, not a prototype, not a tech showcase: a finished product with the polish of work from a top studio.
- Be ambitious in scope AND exacting in execution. If you must choose, depth beats breadth, but nothing you include may be half-built. Every control works, every state is handled, nothing is a placeholder.
- Art direction comes first. Before writing code, decide the visual identity (palette, type, motion language, sound) and hold to it with taste. Avoid anything that looks default, templated or generic.
- Include at least one detail that rewards a closer look, something a user only discovers by playing with it and thinks "they thought of that".

Hard rules:
- Everything lives in ONE .html file (HTML, CSS and JS inline). No external asset files of any kind: no images, models, textures, audio or font files.
- All visuals and all sound are created by you in code (canvas, SVG, CSS, WebGL/shaders, Web Audio). They need deliberate art direction and visible craft, not placeholder shapes.
- No library is required. If you use one, load it from a CDN at an exact pinned version only.
- It must run by opening the file directly in a current evergreen browser, with no server, no build step and no install, and must also work when served from a static host such as GitHub Pages from a subfolder. Relative paths only.
- Guard every storage access (localStorage/IndexedDB) with try/catch.
- Google Fonts via a CSS link is the only other permitted external resource. The page must still look good offline with a considered fallback stack.

What "real" means here (all of it must genuinely work):
- A full menu of at least 30 appetising, specific items across sensible categories, each with a real description, price, and dietary markers; search plus dietary and category filters that work instantly
- A reservation flow with date, time and party-size logic, validation, unavailable slots and a confirmation state; plus an order or basket flow with quantities, totals and persistence
- "Open now" status computed from real opening hours against the visitor's clock, special-hours handling, and a working mobile navigation
- Copy that sounds like the place: story, chef or owner voice, microcopy, error messages. No lorem ipsum, no dead links or buttons

Craft:
- A distinctive identity: SVG wordmark, palette, type pairing and layout system chosen deliberately and held throughout
- Food that looks desirable without photographs: illustrate dishes and atmosphere in SVG, canvas, CSS or shaders at a level that makes someone hungry
- Motion that sells the mood (scroll choreography, hover states, page transitions) without hurting performance

Engineering:
- Stable framerate (delta-time or fixed timestep as appropriate), crisp at any resolution and devicePixelRatio, handles window resize and tab visibility changes, no console errors, no memory leaks.
- Keyboard accessible where it makes sense, respects prefers-reduced-motion, sensible touch support.

Deliverable: **naming is mandatory, read it twice:**
- One file only, named exactly: `cafe__{model-slug}__{YYYY-MM-DD}__v2.html`
  Example: `cafe__claude-sonnet-4-5__2026-11-06__v2.html`
  Use today's date (YYYY-MM-DD) and your own model name, lowercased, spaces replaced with hyphens. Do not use a creative file name, uppercase or spaces.
- State that exact file name as the first line of your reply.

Process:
- Do not ask me questions. Make every decision yourself.
- Before finishing, review your code for bugs, runtime errors, soft-locks, performance problems and edge cases, and fix them.
- Output the complete file in a single code block. Never truncate, abbreviate or write "rest unchanged".
- Follow it with a note of under 150 words covering the concept, the controls, and what you are proudest of.
