# 06 · 2D games — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `game2d__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate, complete 2D games**, each as its own single HTML file. Each game is a different genre with different core verbs. Examples of the kind of genre: a bullet-hell shooter, a physics puzzler, a rhythm runner, a tower defence, a roguelike, a pinball table, a swinging-rope platformer, a snake with a twist. No two may be variants of the same game.

This is a vibe-coding test. The bar: a stranger should grin, laugh or swear within ten seconds of opening it, and still want one more go after ten minutes. A tutorial made of rectangles does not count. Make it feel like a hand-crafted indie game.

**Ground rules (apply to all three)**
- You choose the names, theme, art style and sound. Do not ask questions and do not hedge. Decide and build.
- Each file is one self-contained HTML file: HTML, CSS and JS inline. No external images, fonts, audio files or libraries.
- All art is made in code (canvas, SVG or CSS) with deliberate art direction. All sound is synthesised with Web Audio.
- Must open directly from disk (`file://`) and work on GitHub Pages from a subfolder.
- No placeholder art, no TODOs, no unfinished mechanics.

**Juice: mandatory, at least six per game, and each game uses a different mix**
Screen shake, hit-stop (a few frames of freeze on impact), squash-and-stretch on sprites, particle bursts, floating damage or score popups, a screen flash on key events, parallax layers, eased UI transitions, a combo multiplier with escalating feedback, palette shifts as the game heats up, music or sound that reacts to play (layers, pitch or tempo that respond to combos), trails or motion blur, and a celebratory moment on a win.

**Each game must have**
- A title screen with a one-line pitch, the controls, and a "press any key" start.
- Progressive difficulty, a real win state and a real lose state.
- Score, a high score stored in `localStorage` (guarded with `try/catch`), pause (`P` or `Esc`), instant restart.
- Keyboard controls, plus pointer or touch.
- Delta-time movement, stable 60fps on a mid-range laptop, crisp at any window size and pixel density.
- No soft-locks: the player can always recover or restart.

**Self-test**
Press `T` on the title screen. It starts the game, simulates about three seconds of play with fixed timesteps, forces a win and a loss, and reports pass or fail for each, with any exception shown.

**Delivery — naming is mandatory**
- File names are `game2d__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per game: its genre, the juice you used, and one known limitation. Nothing else.
