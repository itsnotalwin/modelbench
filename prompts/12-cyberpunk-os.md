# Cyberpunk open-world simulation (BrowserOS + 3D city) — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model must deliver one `.html` file and state its name at the top of the reply.
> Save it as exactly:
>
> `cyberpunk__{model}__{YYYY-MM-DD}__v1.html`
>
> Example: `cyberpunk__claude-sonnet-4-5__2026-11-06__v1.html`
> Upload that **.html** (never .rar) to `inbox/`. The Action files it as `runs/{date}_{model}_cyberpunk_v1/`, previewable on the dashboard.

---

## Model prompt (send everything below this line)

Build a browser-based cyberpunk open-world simulation in a single HTML file combining:

- A BrowserOS desktop layer (draggable windows, taskbar, working apps)
- A first-person 3D city explorer (Three.js) with WASD movement inside the OS as a windowed app
- AI NPCs that navigate the city using A* pathfinding and respond to player proximity
- A dynamic economy (buy/sell items, prices fluctuate by supply/demand)
- Procedural city block generation using a seeded random algorithm
- An in-world browser (renders a fake website inside the 3D world as a texture)
- A physics vehicle system (car with torque, steering, suspension)
- Cinematic post-processing: bloom, chromatic aberration, vignette (via custom GLSL shaders)
- Multiplayer-ready architecture (WebSocket client connects to ws://localhost:8080, gracefully degrades if not available)
- Real-time weather system (rain particles, fog density changes, lightning flashes)
- A persistent save system (localStorage: player position, inventory, economy state)
- Full HUD: minimap, health, money, wanted level, weather indicator
- The experience must run at a stable 30+ FPS on a mid-range laptop (no WebGL2 extensions required)

The project should feel like a playable futuristic simulation, not a demo. Prioritize technical sophistication, visual excellence, performance optimization, large-scale architecture, emergent NPC behavior, and player immersion. The experience runs directly in the browser.

**NAMING (mandatory):** State the file name as the first line of your reply, named EXACTLY with the benchmark prefix: `cyberpunk__{model-slug}__{YYYY-MM-DD}__v1.html` — for example `cyberpunk__claude-sonnet-4-5__2026-11-06__v1.html`. Use today's date and your own model name, lowercased, spaces replaced with hyphens. Do not use a creative file name, uppercase or spaces. The file must run by opening it directly — no server, no build step — and work from a static host such as GitHub Pages.
