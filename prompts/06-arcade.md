# 06 · Arcade pack — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> Save the model's reply as `arcade__<model-slug>__<YYYY-MM-DD>__v1.html` (use the exact name the model put on its first line; rename it if it did not). Upload the **.html** to `inbox/`. Never upload a .rar.
> The sorter files it as `runs/<date>_<model>_arcade_v1/index.html`.

---

## Model prompt (send everything below this line)

Build an arcade pack as a single HTML file: **exactly five complete, different, playable mini-games**, chosen by you, selected from one menu. Five skins of one game do not count. Give each game different core verbs and, where it suits, a different viewpoint (top-down, side-on, first-person, grid, rhythm lane, and so on).

**Ground rules**
- You choose the games, names, theme and art style. Do not ask questions and do not hedge. Decide and build in one pass.
- One self-contained HTML file: HTML, CSS and JS inline. No external images, fonts, audio files or libraries.
- All art is made in code (canvas, SVG or CSS). All sound is synthesised with Web Audio.
- Must run opened directly from disk (`file://`) and when hosted on GitHub Pages from a subfolder.
- No placeholder art, TODOs or unfinished mechanics.

**Each of the five games must have**
- A title and an onboarding screen with the goal and the controls.
- Progressive difficulty.
- A real win state and a real lose state.
- Score, pause (`P` or `Esc`), restart, and back-to-menu.
- Keyboard controls and pointer or touch support.
- At least one sound effect for a key event, and some background sound.
- A high score stored in `localStorage`, guarded with `try/catch`.
- Delta-time movement, and no soft-lock (the player must always be able to recover or restart).

**Menu and self-test**
- The main menu lists all five games with a one-line pitch and the best score for each.
- Press `T` on the menu to run a self-test. It starts each game, simulates about two seconds of play with fixed timesteps, forces a win or a loss, and reports pass or fail for each game, with any exception shown.

**Quality bar**
- Each game should be fun for at least two minutes.
- Stable 60fps on a mid-range laptop.
- Crisp rendering at any window size and pixel density.

**Deliverable — naming is mandatory**
- Your file must be named exactly: `arcade__{model-slug}__{YYYY-MM-DD}__v1.html`
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file name, no uppercase letters, no spaces.
- Your first line is that exact file name. Then the complete file in one code block. After the block, five bullets on your key creative choices and one known limitation. Nothing else.

---
