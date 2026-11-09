# 08 · Short animated film — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> Save the model's reply as `motion__<model-slug>__<YYYY-MM-DD>__v1.html` (use the exact name the model put on its first line; rename it if it did not). Upload the **.html** to `inbox/`. Never upload a .rar.
> The sorter files it as `runs/<date>_<model>_motion_v1/index.html`.

---

## Model prompt (send everything below this line)

Build a short animated film as a single HTML file, made entirely in code: canvas, SVG, CSS animation or WebGL. It must have its own soundtrack and sound design, synthesised with Web Audio. You choose the story, the characters, the setting and the style. No characters or worlds from existing IP.

**Ground rules**
- You choose everything creative. Do not ask questions and do not hedge. Decide and build in one pass.
- One self-contained HTML file. No external video, audio, image or font files.
- Must run opened directly from disk (`file://`) and when hosted on GitHub Pages from a subfolder.
- No placeholder art, TODOs or dead controls.

**What the film must have**
- **5 to 7 scenes** totalling **45 to 90 seconds** of run time. Each scene has a clear narrative or visual purpose.
- Title card and on-screen captions or dialogue. Text is readable at 390px wide and at 1440px wide.
- Designed transitions between scenes (not just a cut): wipes, morphs, camera moves, or whatever suits the film.
- A soundtrack that changes with the scenes, plus at least three sound effects tied to specific moments.
- A **Start** button (Web Audio needs a user gesture to begin).
- A timeline bar with play, pause, restart, scrubbing, and a scene list that jumps to a scene.
- A **Record** button that captures the film to a WebM download using `MediaRecorder` when the browser supports it. If not supported, show a clear message and keep the rest working.
- The film must play the same way on every restart. Target 60fps and make timing depend on the clock, not frame count.

**Deliver with the file**
- The file's first line gives the exact file name (see below). Inside the file, a title comment block summarises the story and each scene's shot in a line.

**Deliverable — naming is mandatory**
- Your file must be named exactly: `motion__{model-slug}__{YYYY-MM-DD}__v1.html`
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file name, no uppercase letters, no spaces.
- Your first line is that exact file name. Then the complete file in one code block. After the block, five bullets on your key creative choices and one known limitation. Nothing else.

---
