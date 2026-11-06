# 2D game — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model must deliver one HTML file and state its name at the top of the reply.
> Save that file as the name the model gave, or name it yourself exactly:
>
> `game2d__{model}__{YYYY-MM-DD}__v1.html`
>
> Example: `game2d__claude-sonnet-4-5__2026-11-06__v1.html`
> Upload that **.html** (never .rar) to `inbox/`. The Action files it as `runs/{date}_{model}_game2d_v1/index.html`, which the dashboard previews.

---

## Model prompt (send everything below this line)

Build a complete 2D game as one single HTML file. The genre, concept, theme, mechanics, art style and name are entirely up to you. Choose something you can make feel excellent rather than something familiar and safe.

Hard rules:
- Everything lives in ONE .html file (HTML, CSS and JS inline). No external asset files of any kind: no images, sprites, audio or font files.
- All art (characters, environments, UI, effects) and all sound must be created by you in code: canvas, SVG, CSS or shaders for visuals, synthesised audio (Web Audio). It needs deliberate art direction and visible craft, not placeholder rectangles and circles.
- No library is required. If you use one, load it from a CDN at an exact pinned version only.
- It must run by opening the file directly in a current evergreen browser, with no server, no build step and no install — and must also work when served from a static host such as GitHub Pages from a subfolder. Use no absolute paths.

Game quality:
- A complete game loop: title screen, clear onboarding, core gameplay, escalating challenge or progression, fail/win state, restart, and saved high score or progress (guard storage access with try/catch).
- Keyboard and mouse controls, with touch or gamepad support where it suits the game. On-screen control hints and a pause function.
- Game feel: animation, particles, screen shake or equivalent feedback, parallax or depth, sound and music. Stable framerate, delta-time based movement, crisp rendering at any resolution or pixel density, handles window resize and tab visibility changes.
- No placeholders, TODOs or unfinished mechanics. It should be fun for at least a few minutes.

Deliverable — **naming is mandatory, read it twice:**
- One file only, named exactly: `game2d__{model-slug}__{YYYY-MM-DD}__v1.html`
  Example: `game2d__claude-sonnet-4-5__2026-11-06__v1.html`
  Use today's date (YYYY-MM-DD) and your own model name, lowercased, spaces replaced with hyphens. Do not use a creative file name, uppercase or spaces.
- State that exact file name as the first line of your reply.

Process:
- Do not ask me questions. Make every decision yourself.
- Before finishing, review your code for bugs, runtime errors, soft-locks and balance problems, and fix them.
- Output the complete file in a single code block, followed by a note of under 150 words covering the concept, the controls, and what you are proudest of.
