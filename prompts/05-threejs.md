# 05 · three.js scenes — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `threejs__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate three.js experiences**, each as its own single HTML file. Each one is a different visual idea. Three colour variations of one object do not count.

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

Then import from `three` and `three/addons/...` (for example `three/addons/controls/OrbitControls.js`). No other CDN, no `.glb`/`.gltf` models, no texture or HDRI image files. Build geometry, materials, lights, particles and shaders yourself. Procedural canvas textures are allowed.

**Ground rules (apply to all three)**
- You choose the theme, name and look. Do not ask questions and do not hedge. Decide and build.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder.
- No placeholder text, TODOs or dead controls.

**What each experience must do**
- One complete interactive 3D scene: orbit controls or a direct interaction (pointer, drag, key input).
- At least one custom `ShaderMaterial` with your own GLSL vertex and fragment shaders.
- Lighting that suits the scene. Shadows, fog or tone mapping where they help.
- Animation that is delta-time based, so it runs the same at 30fps and 144fps.
- A HUD with the scene's name, a one-line description, FPS, and a reset-camera key (`R`).
- Pixel ratio capped at 2 and correct resize handling.
- No leaks: say in your notes how you verified that geometries, materials and textures are disposed when the scene is torn down.
- Near 60fps on a mid-range laptop. Keep the polygon budget sensible.

**Mobile-first and installable (mandatory, every file)**
- Design for a 390px-wide portrait phone first, then scale up to desktop. Touch is the primary input: every control is at least 44px, nothing depends on hover, and the first interaction works with one thumb.
- Works in portrait and landscape, handles `resize` and `orientationchange`, and respects `env(safe-area-inset-*)` so nothing hides behind a notch or the home bar.
- Fits the screen: use `100dvh`, no page scrolling in games and toys, and `touch-action` set on play areas so pinch and double-tap do not zoom the page.
- Mobile specifics for this test: touch orbit (one-finger drag rotates, pinch zooms), a HUD kept out of the thumb zones, a pixel ratio that holds 60fps on a phone GPU, and a layout that fills the screen in both orientations.
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
- File names are `threejs__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per experience: its visual idea, the key creative choice, and one known limitation. Nothing else.

---
