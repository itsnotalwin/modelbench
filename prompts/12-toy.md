# 12 · Fun toys — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `toy__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate, complete toys**, each as its own single HTML file. A toy is an interactive playground with no score, no win state and no lose state. Its only job is joy. Each toy uses a different medium and a different kind of delight. Examples of the kind of toy: a sound toy you play with pads or a keyboard and that paints as it plays, a physics sandbox where things bounce, stack and break, a generative brush or stamp studio, a fireworks or weather machine, a creature or crowd that reacts to the cursor, a music box that composes itself. Pick three that surprise.

This is a vibe-coding test. The bar: a stranger does something within two seconds and is still playing after two minutes. Make it feel like a hand-crafted indie toy with real personality.

**Ground rules (apply to all three)**
- You choose the names, theme, art style and sound. Do not ask questions and do not hedge. Decide and build.
- Each file is one self-contained HTML file: HTML, CSS and JS inline. No external images, fonts, audio files or libraries.
- All visuals are made in code (canvas, SVG or CSS). All sound is synthesised with Web Audio.
- Must open directly from disk (`file://`) and work on GitHub Pages from a subfolder. Works offline.
- No placeholder art, no TODOs, no dead controls.

**What each toy must have**
- A clear first interaction within two seconds, with no instructions needed to start playing. A one-line hint can appear and fade.
- At least three modes, tools, instruments or settings the user can switch between.
- One hidden surprise that a curious user will find by poking around, such as an easter egg, a secret mode or a rare event.
- Juice: at least six of the following, in a mix that suits the toy. Screen shake, particle bursts, squash-and-stretch, trails, eased transitions, colour shifts, sound that reacts to the user, glow, and a satisfying reaction to every input.
- Keyboard and pointer controls, plus touch.
- Undo or clear, and a **Save PNG** button that downloads the current picture.
- Share state through the URL hash, so reloading the link restores the same creation.
- Respects `prefers-reduced-motion` by calming the motion, not by removing the fun.
- Stable 60fps on a mid-range laptop, crisp at any window size and pixel density.

**Delivery — naming is mandatory**
- File names are `toy__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per toy: what it is, the hidden surprise, and one known limitation. Nothing else.
