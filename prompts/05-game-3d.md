# 05 · Original 3D game — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `game-3d__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate, complete 3D games** in three.js. Each one must be built on a mechanic that only works because the world has depth — space, perspective, occlusion or light is part of the rule, not the decoration. You invent the mechanic, the world, the art direction and the sound. Do not ask questions and do not hedge. Decide and build in one pass. No driving games, no shooters, no collectathons, no corridor runners.

**Ground rules (apply to all three)**
- Each file is one self-contained HTML file: HTML, CSS and JS inline. No external images, fonts, audio files or model files.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder. No server, no build step, no install.
- No placeholder text, TODOs, dead controls or unfinished sections.
- Allowed library: three.js only, pinned below. Everything visual and audible is built in code.

**What each file must do**
- A mechanic that could not exist in 2D, stated in one sentence on the title screen.
- A custom `ShaderMaterial` with your own GLSL doing visible work (terrain, water, glow, distortion, dissolve), not a gradient backdrop.
- 5+ stages, or one world that visibly changes as you progress. Real win and lose states, score, pause, restart.
- Camera craft: eased follow, FOV kick on speed, shake on impact, and a camera that never fights the player.
- 60fps on a mid-range laptop: instancing or merged geometry where counts grow, no per-frame allocation in the loop, and a render scale that drops if frames fall.
- Keyboard, pointer and touch, with on-screen controls on phones.

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

**Juice: mandatory, at least six per file, and each file uses a different mix**
Screen shake, hit-stop (a few frames of freeze on impact), squash-and-stretch, particle bursts, floating popups, a screen flash on key events, parallax layers, eased UI transitions, a combo or streak multiplier with escalating feedback, palette shifts as intensity rises, music or sound that reacts to play, trails or motion blur, and a celebratory moment on a win.

**Self-test**
Press `T` on the title screen. It should start the game, simulate about three seconds of play with fixed timesteps, force a win and a loss, and report pass or fail for each, with any exception shown.

**Mobile-first and installable (mandatory, every file)**
- Design for a 390px-wide portrait phone first, then scale up to desktop. Touch is the primary input: every control is at least 44px, nothing depends on hover, and the first interaction works with one thumb.
- Works in portrait and landscape, handles `resize` and `orientationchange`, and respects `env(safe-area-inset-*)` so nothing hides behind a notch or the home bar.
- Fits the screen: use `100dvh`, no accidental page scrolling, and `touch-action` set on interactive canvases so pinch and double-tap do not zoom the page.
- Mobile specifics: on-screen movement and camera controls at least 56px in thumb reach, a fixed render scale on phones, and a play area that letterboxes cleanly in portrait and landscape.
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
- File names are `game-3d__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per file: its mechanic, the shader's job, and one known limitation. Nothing else.
