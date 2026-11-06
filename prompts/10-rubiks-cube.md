# Rubik's Cube (3D) — benchmark prompt

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

You are a 3D browser graphics engineer.

Build a fully interactive 3D Rubik's Cube in a single HTML file using Three.js (CDN: https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js).

**Primary Goal:** A beautiful, smooth, fully functional 3D Rubik's Cube that the user can rotate face-by-face with keyboard or on-screen buttons, with satisfying sound effects and a solve detector.

**Visual Direction:**
- Black background (#000000)
- Cube pieces: dark grey (#222) base, colored face stickers with slight gloss (MeshStandardMaterial with roughness: 0.3, metalness: 0.1)
- Standard Rubik's colors: White=#FFFFFF, Yellow=#FFD700, Red=#CC0000, Orange=#FF6600, Blue=#0047AB, Green=#009B48
- Ambient light: soft white. Directional light from top-right
- Small gap (0.05 units) between cubie faces for visual depth
- Smooth face rotation: 300ms ease-in-out animation (no instant snapping)

**Required Features:**
1. **3×3×3 cube** — 27 cubies correctly assembled. Each face has 9 stickers in the correct color
2. **Orbit controls** — Click and drag to rotate the whole cube view (implement OrbitControls or equivalent without importing from examples — use mousedown/mousemove/mouseup on the renderer)
3. **Face moves (keyboard):**
   - U / u = Up face clockwise / counter-clockwise
   - D / d = Down face clockwise / counter-clockwise
   - R / r = Right face clockwise / counter-clockwise
   - L / l = Left face clockwise / counter-clockwise
   - F / f = Front face clockwise / counter-clockwise
   - B / b = Back face clockwise / counter-clockwise
4. **On-screen move buttons** — Panel showing all 12 moves (U, U', D, D', R, R', L, L', F, F', B, B') as clickable buttons
5. **Scramble button** — Applies 20 random valid moves with animation (executes them sequentially with 150ms delay between moves)
6. **Move counter** — Displays total moves made since last scramble
7. **Solve detector** — After every move, check if all 9 stickers on each face share the same color. If solved, show a "SOLVED! 🎉" overlay with move count and a confetti particle effect (Canvas 2D overlay)
8. **Sound effects (Web Audio API):**
   - Face move: a short mechanical "click" (short sine wave burst at 440Hz, 80ms duration, fast decay)
   - Scramble: rapid sequence of clicks
   - Solve: ascending 4-note chime (C4→E4→G4→C5, 150ms each)
9. **Undo button** — Reverses the last move (stores move history as a stack)
10. **Reset button** — Returns cube to solved state with a 500ms dissolve/reassemble animation

**Hard Technical Constraint:**
Face rotation must correctly update the cubie positions in a data structure — not just rotate visuals. After every move, the internal state (which cubie is at which position with which orientation) must be updated. The solve detector must read from this state, not from the visual colors.

**Fallback Instruction:**
If cubie orientation tracking becomes too complex, track color state as a 6×3×3 array (6 faces, 3 rows, 3 cols) and derive solved state from it. Visuals can be rebuilt from this array on each move.

**Difficulty Extension:**
Add a **Solve Hint** button — highlight the next best move using a simplified beginner's method (at minimum: detect and solve the white cross as step 1, highlight the relevant face button).

**NAMING (mandatory):** State the file name as the first line of your reply, named EXACTLY with the benchmark prefix: `game3d__{model-slug}__{YYYY-MM-DD}__v1.html` — for example `game3d__claude-sonnet-4-5__2026-11-06__v1.html`. Use today's date and your own model name, lowercased, spaces replaced with hyphens. Do not use a creative file name, uppercase or spaces. The file must run by opening it directly — no server, no build step — and work from a static host such as GitHub Pages.
