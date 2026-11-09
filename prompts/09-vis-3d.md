# 09 · 3D shader piece — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `vis-3d__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate real-time 3D art pieces** in three.js, where the shader carries the idea. Each explores a different visual question, and no two may share a palette, a form or a motion logic. You choose the concept, the form and the constraint. Do not ask questions and do not hedge. Decide and build in one pass. A rotating primitive with a colour ramp is a fail.

**Ground rules (apply to all three)**
- Each file is one self-contained HTML file: HTML, CSS and JS inline. No external images, fonts, audio files or model files.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder. No server, no build step, no install.
- No placeholder text, TODOs, dead controls or unfinished sections.
- Allowed library: three.js only, pinned below. Everything visual and audible is built in code.

**What each file must do**
- Your own GLSL doing the real work: raymarching, vertex displacement, particle fields, signed-distance forms or feedback passes.
- Three movements or phases the piece passes through over about 90 seconds, each with its own visual logic, joined by a designed transition rather than a fade.
- Responds to pointer or scroll, and to device orientation on phones, with easing. Never a hard snap.
- One deliberate constraint that gives it identity (a single hue, a grid, a repeated glyph, a physical rule) and one moment of surprise.
- 60fps at 1080p on a mid-range laptop, with the render scale dropping automatically if frames fall and a subtle readout saying so.
- Capture: a PNG of the current frame at 2x and a 10-second WebM clip.
- A two-sentence artist statement on screen and a one-line controls hint.

**three.js (pinned, the only allowed library)**
- Load it with exactly this importmap in `<head>`:

```html
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
} }
</script>
```

- Import from `three` and `three/addons/...` (for example `three/addons/controls/OrbitControls.js`, or `EffectComposer` and `UnrealBloomPass` for glow). No other CDN, no `.glb`/`.gltf` models, no texture or HDRI image files. Build geometry, materials, lights, particles and shaders yourself. Procedural canvas textures are allowed. Sound is synthesised with Web Audio.

**Mobile-first and installable (mandatory, every file)**
- Design for a 390px-wide portrait phone first, then scale up to desktop. Touch is the primary input: every control is at least 44px, nothing depends on hover, and the first interaction works with one thumb.
- Works in portrait and landscape, handles `resize` and `orientationchange`, and respects `env(safe-area-inset-*)` so nothing hides behind a notch or the home bar.
- Fits the screen: use `100dvh`, no accidental page scrolling, and `touch-action` set on interactive canvases so pinch and double-tap do not zoom the page.
- Mobile specifics: the piece fills the screen, gestures replace hover, device orientation drives the same parameter as the pointer, and a hint line explains it once.
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
- File names are `vis-3d__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per file: the visual question, the shader technique, and one known limitation. Nothing else.
