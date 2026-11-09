# 08 · Short animated film — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `vis-motion__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate short animated films**, each 45–90 seconds, drawn entirely in code and scored with sound you synthesise. Each film tells a different story in a different visual language, and no two may share a character, a palette or a narrative shape. You choose the story, the style and the music. Do not ask questions and do not hedge. Decide and build in one pass. A loop of drifting shapes with a beat is not a film.

**Ground rules (apply to all three)**
- Each file is one self-contained HTML file: HTML, CSS and JS inline. No external images, fonts, audio files or model files.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder. No server, no build step, no install.
- No placeholder text, TODOs, dead controls or unfinished sections.
- Allowed libraries: none. Everything is built with the platform: no CDN scripts, no web fonts, no image or audio files.

**What each file must do**
- 45–90 seconds, 5–7 scenes, one clear arc with a beginning, a turn and an ending.
- All visuals in code (canvas, WebGL or SVG), one art direction, a consistent character or motif, and real staging: anticipation, follow-through, holds.
- A synthesised soundtrack written for the film: three or more layers, hits that land on cuts, and at least one deliberate silence that makes the ending work.
- A timeline: play, pause, scrub, restart, a scene list to jump to, and a time readout in seconds.
- In-page WebM recording with `MediaRecorder` and `canvas.captureStream`, a progress indicator, and a download.
- Deterministic: the same second always looks the same, so scrubbing is honest.
- A title card and end card, typeset with care.

**Juice: mandatory, at least six per file, and each file uses a different mix**
Screen shake, hit-stop (a few frames of freeze on impact), squash-and-stretch, particle bursts, floating popups, a screen flash on key events, parallax layers, eased UI transitions, a combo or streak multiplier with escalating feedback, palette shifts as intensity rises, music or sound that reacts to play, trails or motion blur, and a celebratory moment on a win.

**Mobile-first and installable (mandatory, every file)**
- Design for a 390px-wide portrait phone first, then scale up to desktop. Touch is the primary input: every control is at least 44px, nothing depends on hover, and the first interaction works with one thumb.
- Works in portrait and landscape, handles `resize` and `orientationchange`, and respects `env(safe-area-inset-*)` so nothing hides behind a notch or the home bar.
- Fits the screen: use `100dvh`, no accidental page scrolling, and `touch-action` set on interactive canvases so pinch and double-tap do not zoom the page.
- Mobile specifics: the film fills the width in landscape, the timeline stays reachable with one thumb, and every control is at least 44px.
- The file must be installable as a Progressive Web App. The benchmark host places `manifest.webmanifest`, `sw.js` and `icons/` next to your file. Your file must reference them. Put exactly these lines in `<head>` (set `theme-color` to your own palette colour):

```html
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b0d12">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
```

  and this line just before `</body>`:

```html
<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});</script>
```

- Do not create the manifest, service worker or icon files yourself. The file must still open and work from disk even when they are missing. Once installed, the app must run offline after its first load, so keep runtime network use to the CDN libraries this prompt allows.

**Delivery — naming is mandatory**
- File names are `vis-motion__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per file: its story in one line, the visual technique, and one known limitation. Nothing else.
