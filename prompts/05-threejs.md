# 05 · three.js scenes — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> Save the model's reply as `threejs__<model-slug>__<YYYY-MM-DD>__v1.html` (use the exact name the model put on its first line; rename it if it did not). Upload the **.html** to `inbox/`. Never upload a .rar.
> The sorter files it as `runs/<date>_<model>_threejs_v1/index.html`.
>
> **Note:** the category slug is `threejs` (no hyphen). The sorter will reject `three-js`.

---

## Model prompt (send everything below this line)

Build a three.js experience as a single HTML file. It must contain **five distinct real-time 3D scenes**, each a different visual idea. Five colour variations of one object do not count.

**Libraries (pinned, required)**
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

**Ground rules**
- You choose the theme, name and look. Do not ask questions and do not hedge. Decide and build in one pass.
- Must run opened directly from disk (`file://`) and when hosted on GitHub Pages from a subfolder. Note: module imports from `file://` need the CDN, which is allowed; keep everything else inline.
- No placeholder text, TODOs or dead controls.

**What the experience must do**
- A visible scene menu listing all five scenes with a one-line description each. Switching is live, with a short transition. Keyboard shortcuts 1–5 switch scenes.
- At least **two scenes** use a custom `ShaderMaterial` with your own GLSL vertex and fragment shaders.
- Each scene is interactive: orbit controls or a direct interaction (pointer, drag, key input).
- Lighting that suits each scene. Use shadows in at least one scene. Use fog or tone mapping in at least one scene.
- Animation is delta-time based, so it runs the same at 30fps and 144fps.
- A HUD with the scene name, FPS, and a reset-camera key (`R`).
- Pixel ratio capped at 2, correct resize handling, and no leaks: when switching scene, dispose the previous scene's geometries, materials and textures. Say in your notes how you verified this.
- Must stay near 60fps on a mid-range laptop. Keep the polygon budget sensible.

**Deliverable — naming is mandatory**
- Your file must be named exactly: `threejs__{model-slug}__{YYYY-MM-DD}__v1.html`
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file name, no uppercase letters, no spaces.
- Your first line is that exact file name. Then the complete file in one code block. After the block, five bullets on your key creative choices and one known limitation. Nothing else.

---
