# Super Mario-style platformer (2D) — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model must deliver one `.html` file and state its name at the top of the reply.
> Save it as exactly:
>
> `game2d__{model}__{YYYY-MM-DD}__v1.html`
>
> Example: `game2d__claude-sonnet-4-5__2026-11-06__v1.html`
> Upload that **.html** (never .rar) to `inbox/`. The Action files it as `runs/{date}_{model}_game2d_v1/`, previewable on the dashboard.

---

## Model prompt (send everything below this line)

You are a browser game developer specializing in 2D platformers.

Build a complete classic Super Mario Bros.-style platformer game in a single HTML file using HTML5 Canvas and vanilla JavaScript only. No libraries, no external assets — all graphics are drawn programmatically using Canvas 2D API.

**Primary Goal:** A fully playable Mario-style platformer with responsive controls, multiple tile types, enemies, coins, a flagpole finish, and sound effects — all in one HTML file.

**Visual Direction:**
- Classic NES-style pixel art rendered as colored rectangles and shapes (no image files)
- Sky blue background (#5C94FC)
- Ground tiles: brown (#8B4513) fill, darker border
- Pipes: green (#00A800) with dark border
- Mario: red cap (rectangle), blue overalls, skin-colored face — animated with 2-frame walk cycle
- Coins: gold circles with spinning animation (scale X between 1 and 0.2 at 8fps)
- Enemies (Goomba): dark brown rectangle with feet, walking left
- Question blocks: gold (#FFD700) with "?" text, animate when hit
- Flagpole: grey pole, green flag at top

**Required Features:**
1. **Level layout** — Tile-based level defined as a 2D array. At minimum: 3 platform gaps (player must jump across), 2 pipes, 5 question blocks (3 contain coins, 1 contains a mushroom, 1 is empty), 8 goombas spread across the level, 1 flagpole at the end
2. **Mario physics:**
   - Gravity: constant downward acceleration (~0.5px/frame²)
   - Run: left/right arrow or A/D keys, max speed 6px/frame, acceleration 0.8, deceleration 1.2 when key released
   - Jump: Up arrow, W, or Space — variable height jump (hold longer = jump higher, max 300ms)
   - Coyote time: 80ms grace window to jump after walking off a platform
3. **Camera** — Horizontal scroll follows Mario. Camera locks at left edge (Mario can't go left of screen) and stops at level end
4. **Coin collection** — Walking into a coin removes it and triggers: +1 counter, floating "+1" text (rises and fades), coin sound
5. **Enemy AI (Goomba):**
   - Walks left at constant speed
   - Reverses direction on hitting a wall or edge
   - Stomping from above kills it (flatten animation for 500ms, then remove)
   - Side collision with Mario → Mario dies
6. **Question blocks** — Jumping from below triggers the block: bounce animation (moves up 8px, bounces back), spawns coin or mushroom from above
7. **Mushroom** — Slides right, falls with gravity. Mario collecting it grows Mario (scale 1.5×) and grants one extra hit
8. **Mario death** — On enemy side-hit (or falling into a pit): death animation (jump up then fall off screen), respawn at start, lives counter decrements. 3 lives total. Game over screen after 0 lives
9. **Flagpole finish** — Reaching the pole end triggers a slide-down animation, then "Level Clear!" screen with score + time bonus
10. **HUD** — Coin count, lives remaining, score, timer (counting down from 400), world label (1-1)
11. **Sound effects (Web Audio API — no files):**
    - Jump: mid-frequency rising chirp
    - Coin: high-pitch "ding" (A5, 100ms)
    - Stomp: low thud
    - Death: descending chromatic run (4 notes, 150ms each)
    - Power-up: 8-note ascending arpeggio
    - Level clear: 6-note jingle

**Hard Technical Constraint:**
Physics must be tile-based: collision detection checks against the tile map array, not against other game objects' bounding boxes. Mario's AABB must resolve collision on each axis independently (X first, then Y) to prevent corner-catching bugs.

**Fallback Instruction:**
If variable-height jump is too complex, use a fixed jump impulse. If mushroom logic becomes unstable, replace with a star that grants temporary invincibility (simpler state). Do not remove any enemy or level structure.

**Difficulty Extension:**
Add a second level (World 1-2) with an underground theme (black background, grey bricks, no sky): triggered automatically after Level 1 clear. Reuse the tile engine with a new tile array and spawn map.

**NAMING (mandatory):** State the file name as the first line of your reply, named EXACTLY with the benchmark prefix: `game2d__{model-slug}__{YYYY-MM-DD}__v1.html` — for example `game2d__claude-sonnet-4-5__2026-11-06__v1.html`. Use today's date and your own model name, lowercased, spaces replaced with hyphens. Do not use a creative file name, uppercase or spaces. The file must run by opening it directly — no server, no build step — and work from a static host such as GitHub Pages.
