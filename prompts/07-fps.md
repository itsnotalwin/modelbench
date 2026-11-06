# First-person shooter (Three.js) — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model must deliver one `.html` file and state its name at the top of the reply.
> Save it as exactly:
>
> `game3d__{model}__{YYYY-MM-DD}__v1.html`
>
> Example: `game3d__claude-sonnet-4-5__2026-11-06__v1.html`
> Upload that **.html** (never .rar) to `inbox/`. The Action files it as `runs/{date}_{model}_game3d_v1/`, previewable on the dashboard.

---

## Model prompt (send everything below this line)

You are a senior browser game developer specializing in Three.js.

Build a single-file HTML5 browser-based first-person shooter using Three.js (import via CDN: https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js).

**Primary Goal:** A playable FPS with a working gun, visible targets, ammo tracking, hit detection with visual feedback, and sound effects.

**Visual Direction:**
- Dark warehouse / shooting range environment
- Floor: dark concrete texture (procedural noise pattern, no image files)
- Targets: bright red circular bullseye SVG textures on flat planes, 5 targets placed at varying distances (5m to 20m)
- Gun model: visible in bottom-right of screen as a simple 3D box geometry with dark metallic material (a stylized gun shape using merged BoxGeometry)
- Muzzle flash: a white/yellow PointLight that appears for 80ms on fire

**Required Features:**
1. **Pointer lock controls** — Click to lock mouse for look; WASD for movement; Space to jump (one jump, no double jump)
2. **Shooting** — Left mouse click fires. Gun recoil animation (camera kicks up 0.05 radians then eases back over 200ms)
3. **Ammo system** — 30 rounds per magazine. HUD shows "24 / 30" style counter. R key reloads (1.5 second reload animation with HUD text "RELOADING...")
4. **Hit detection** — Raycaster fires from camera center. If it hits a target mesh, that target shows a bullet hole (small dark circle decal added to target surface) and flashes white for 150ms
5. **Target score** — Each target has 3 hit zones: bullseye (50pts), inner ring (25pts), outer ring (10pts). Score shown in HUD top-left
6. **Sound effects** — Use Web Audio API (no external audio files): gunshot = short noise burst (white noise + fast decay), reload click = lower frequency click, target hit = higher pitched ping
7. **Kill / reset** — When all 5 targets are hit in the bullseye, show a "RANGE CLEARED" overlay with score and a "Play Again" button that resets targets and ammo
8. **Crosshair** — CSS-based crosshair in center of screen. Expands slightly on fire (CSS transition)

**Hard Technical Constraint:**
Hit detection must use THREE.Raycaster fired from camera position in camera direction. Proximity-based collision is not acceptable. Bullet holes must persist on the target mesh surface (do not clear them on miss).

**Fallback Instruction:**
If Three.js gun geometry is too complex, replace with a visible rectangular block in the bottom-right viewport. All gameplay systems must still function.

**Difficulty Extension:**
Add moving targets — 2 of the 5 targets oscillate left/right on a sine wave path. Hitting a moving target awards 1.5× score multiplier.

**NAMING (mandatory):** State the file name as the first line of your reply, named EXACTLY with the benchmark prefix: `game3d__{model-slug}__{YYYY-MM-DD}__v1.html` — for example `game3d__claude-sonnet-4-5__2026-11-06__v1.html`. Use today's date and your own model name, lowercased, spaces replaced with hyphens. Do not use a creative file name, uppercase or spaces. The file must run by opening it directly — no server, no build step — and work from a static host such as GitHub Pages.
