# 2D game — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> Save the model's output and upload it to the `inbox/` folder on GitHub, renamed exactly as:
>
> `game2d__{model}__{YYYY-MM-DD}__v1.html`
>
> Example: `game2d__claude-sonnet-4-5__2026-11-06__v1.html`
> The GitHub Action (`auto-sort`) then moves it to `runs/{date}_{model}_game2d_v1/` automatically.

---

## Model prompt (send everything below this line)

Build a complete 2D game as one single HTML file. The genre, concept, theme, mechanics, art style and name are entirely up to you. Choose something you can make feel excellent rather than something familiar and safe.

Hard rules:
- Everything lives in ONE .html file (HTML, CSS and JS inline). No external asset files of any kind: no images, sprites, audio or font files.
- All art (characters, environments, UI, effects) and all sound must be created by you in code: canvas, SVG, CSS or shaders for visuals, synthesised audio (Web Audio). It needs deliberate art direction and visible craft, not placeholder rectangles and circles.
- No library is required. If you use one, load it from a CDN at an exact pinned version.
- It must run by opening the file in a current evergreen browser.

Game quality:
- A complete game loop: title screen, clear onboarding, core gameplay, escalating challenge or progression, fail/win state, restart, and saved high score or progress (guard storage access with try/catch).
- Keyboard and mouse controls, with touch or gamepad support where it suits the game. On-screen control hints and a pause function.
- Game feel: animation, particles, screen shake or equivalent feedback, parallax or depth, sound and music. Stable framerate, delta-time based movement, crisp rendering at any resolution or pixel density, handles window resize and tab visibility changes.
- No placeholders, TODOs or unfinished mechanics. It should be fun for at least a few minutes.

Process:
- Do not ask me questions. Make every decision yourself.
- Before finishing, review your code for bugs, runtime errors, soft-locks and balance problems, and fix them.
- Deliver the finished file (if you cannot create files directly, output it in full in a single code block), followed by a note of under 150 words covering the concept, the controls, and what you are proudest of.
