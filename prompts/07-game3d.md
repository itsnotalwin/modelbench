# 07 · 3D games — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `game3d__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate, complete 3D games**, each as its own single HTML file, rendered with three.js. Each game has a different genre, camera and core verbs. Examples: a flight or hover-racer, a first-person maze or heist, a third-person chase game, a physics stacker, a top-down arena. No two may be variants of the same game.

This is a vibe-coding test. The bar: a stranger should grin within ten seconds and still want one more go after ten minutes. Make it feel like a hand-crafted indie game, with real game feel: weight, impact, speed and a sense of danger or delight.

**Libraries (pinned, required, identical in all three)**
Load three.js from the CDN with an import map, exactly:

```html
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
} }
</script>
```

Then import from `three` and `three/addons/...` (for example `three/addons/controls/OrbitControls.js`, or `EffectComposer` and `UnrealBloomPass` for glow). No other CDN, no `.glb`/`.gltf` models, no texture or HDRI image files. Build geometry, materials, lights, particles and shaders yourself. Procedural canvas textures are allowed. Sound is synthesised with Web Audio.

**Ground rules (apply to all three)**
- You choose the names, theme and look. Do not ask questions and do not hedge. Decide and build.
- Must open directly from disk (`file://`) and work on GitHub Pages from a subfolder.
- No placeholder art, TODOs or unfinished mechanics.

**Juice: mandatory, at least six per game, and each game uses a different mix**
Camera shake, an FOV kick on speed or impact, hit-stop, squash-and-stretch on the player or objects, particle bursts and trails, emissive glow or bloom, a screen flash on key events, dynamic light pulses, eased camera moves, a combo or chain system with escalating feedback, reactive music or sound layers, and a celebratory moment on a win.

**Each game must have**
- At least one custom `ShaderMaterial` with your own GLSL, used in a visible way (for example a glowing grid, a water surface, a shield, a dissolve effect).
- A title screen with the goal and the controls, and a "press any key" start.
- Progressive difficulty, a real win state and a real lose state.
- Score, a high score stored in `localStorage` (guarded with `try/catch`), pause (`P` or `Esc`), instant restart.
- Keyboard and mouse controls, plus touch where it suits the game.
- Delta-time movement, a HUD with FPS, pixel ratio capped at 2, correct resize handling, and stable 60fps on a mid-range laptop.
- No soft-locks, and clean disposal of geometries and materials when restarting.

**Self-test**
Press `T` on the title screen. It starts the game, simulates about three seconds of play with fixed timesteps, forces a win and a loss, and reports pass or fail for each, with any exception shown.

**Mobile-first and installable (mandatory, every file)**
- Design for a 390px-wide portrait phone first, then scale up to desktop. Touch is the primary input: every control is at least 44px, nothing depends on hover, and the first interaction works with one thumb.
- Works in portrait and landscape, handles `resize` and `orientationchange`, and respects `env(safe-area-inset-*)` so nothing hides behind a notch or the home bar.
- Fits the screen: use `100dvh`, no page scrolling in games and toys, and `touch-action` set on play areas so pinch and double-tap do not zoom the page.
- Mobile specifics for this test: two-thumb controls (move on the left, look or action on the right), a camera framed for a small screen, reduced post-processing on phones, and a landscape-first layout with a working portrait fallback.
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

- Do not create the manifest, service worker or icon files yourself. The file must still open and work from disk even when they are missing. Once installed, the app must run offline after its first load, so keep runtime network use to the CDN libraries your prompt allows.

**Delivery — naming is mandatory**
- File names are `game3d__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per game: its genre, the juice you used, and one known limitation. Nothing else.
