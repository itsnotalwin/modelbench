# 09 · Short animated film — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `motion__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate short animated films**, each as its own single HTML file. Each film is made entirely in code: canvas, SVG, CSS animation or WebGL, with its own soundtrack and sound design synthesised in Web Audio. Each film has a different story, setting and style. No characters or worlds from existing IP.

**Ground rules (apply to all three)**
- You choose everything creative. Do not ask questions and do not hedge. Decide and build.
- Each file is one self-contained HTML file. No external video, audio, image or font files.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder.
- No placeholder art, TODOs or dead controls.

**What each film must have**
- **5 to 7 scenes** totalling **45 to 90 seconds**. Each scene has a clear narrative or visual purpose.
- A title card, plus on-screen captions or dialogue. Text readable at 390px and 1440px wide.
- Designed transitions between scenes (not just cuts): wipes, morphs, camera moves, or whatever suits the film.
- A soundtrack that changes with the scenes, plus at least three sound effects tied to specific moments.
- A **Start** button (Web Audio needs a user gesture to begin).
- A timeline bar with play, pause, restart, scrubbing, and a scene list that jumps to a scene.
- A **Record** button that captures the film to a WebM download using `MediaRecorder`, when supported. If not supported, show a clear message and keep the rest working.
- The film plays the same way on every restart. Timing depends on the clock, not on frame count. Target 60fps.

**Delivery — naming is mandatory**
- File names are `motion__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block. Put a title comment at the top of each file with a one-line summary of each scene.
- After the third file, give one short bullet list per film: its story, the key creative choice, and one known limitation. Nothing else.

---
