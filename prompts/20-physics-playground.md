# Physics engine and playground — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model must deliver one `.html` file and state its name at the top of the reply.
> Save it as exactly:
>
> `physics__{model}__{YYYY-MM-DD}__v1.html`
>
> Example: `physics__claude-sonnet-4-5__2026-11-06__v1.html`
> Upload that **.html** (never .rar) to `inbox/`. The Action files it as `runs/{date}_{model}_physics_v1/`, previewable on the dashboard.

---

## Model prompt (send everything below this line)

Write your own 2D rigid-body physics engine from scratch (no physics library) and build something delightful on top of it: a sandbox, a puzzle game, a Rube Goldberg machine builder, a toy workshop. The engine must be properly good, and the application layer must make that goodness fun.

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

What "real" means here (all of it must genuinely work):
- Circles and convex polygons, static and dynamic bodies, proper collision detection (SAT or GJK), contact resolution with friction and restitution, joints (distance, revolute, spring), and sleeping; a 10-high box tower must stand stable
- Fixed timestep, 500+ bodies at 60 FPS, a debug overlay (AABBs, contacts, normals, joints), and slow-motion and single-step controls
- User tools to spawn, drag, throw, cut, join and edit bodies, with save and load of scenes and a set of built-in scenarios or levels that show off the engine

Craft:
- A gorgeous rendering style for a physics toy: materials, shadows, trails, particles, satisfying sound on impact scaled by force
- Responsive, tactile interaction on both mouse and touch

Engineering:
- Stable framerate (delta-time or fixed timestep as appropriate), crisp at any resolution and devicePixelRatio, handles window resize and tab visibility changes, no console errors, no memory leaks.
- Keyboard accessible where it makes sense, respects prefers-reduced-motion, sensible touch support.

Deliverable: **naming is mandatory, read it twice:**
- One file only, named exactly: `physics__{model-slug}__{YYYY-MM-DD}__v1.html`
  Example: `physics__claude-sonnet-4-5__2026-11-06__v1.html`
  Use today's date (YYYY-MM-DD) and your own model name, lowercased, spaces replaced with hyphens. Do not use a creative file name, uppercase or spaces.
- State that exact file name as the first line of your reply.

Process:
- Do not ask me questions. Make every decision yourself.
- Before finishing, review your code for bugs, runtime errors, soft-locks, performance problems and edge cases, and fix them.
- Output the complete file in a single code block. Never truncate, abbreviate or write "rest unchanged".
- Follow it with a note of under 150 words covering the concept, the controls, and what you are proudest of.
