# Endless runner (2D) — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model must deliver one `.html` file and state its name at the top of the reply.
> Save it as exactly:
>
> `runner__{model}__{YYYY-MM-DD}__v1.html`
>
> Example: `runner__claude-sonnet-4-5__2026-11-06__v1.html`
> Upload that **.html** (never .rar) to `inbox/`. The Action files it as `runs/{date}_{model}_runner_v1/`, previewable on the dashboard.

---

## Model prompt (send everything below this line)

You are a 2D browser game developer.

Build a single-file HTML5 Canvas endless runner game inspired by Subway Surfers. No external libraries — vanilla JavaScript + Canvas API only.

**Primary Goal:** A smooth, addictive endless runner where the player dodges obstacles, collects coins, and the speed increases over time. The game must feel responsive and satisfying.

**Visual Direction:**
- Isometric-style 2.5D perspective OR a clean side-scrolling view (choose whichever renders better)
- 3 lanes: left, center, right
- Color palette: vibrant — sky blue background, green lane surfaces, gold coins, red obstacles, bright character sprite
- Character: a simple geometric character (circle head + rectangle body) with running animation (2-frame leg swap at 8fps)
- Coins: gold circles with a star outline
- Obstacles: red/orange solid boxes (barriers) and overground obstacles (pipes) that require jumping

**Required Features:**
1. **Lane switching** — Left/Right arrow keys or A/D keys smoothly animate the character between lanes (150ms tween)
2. **Jump** — Up arrow or W. Standard parabolic arc. Double jump allowed (one mid-air jump only)
3. **Slide** — Down arrow or S. Character shrinks to half height for 600ms to dodge overhead obstacles
4. **Coin collection** — Coins spawn in patterns (straight line, diagonal, arc). Collision detection triggers a +1 coin counter with a floating "+1" text animation
5. **Obstacle collision** — On hit, show a red flash overlay, play a crash sound (Web Audio), and transition to Game Over screen
6. **Speed progression** — Start at scroll speed 5px/frame. Increase by 0.001 every frame (effectively doubles speed at ~5000 frames)
7. **Score** — Distance traveled (in meters, 100px = 1m). Displayed top-center
8. **Coin counter** — Top-right. Coins carry over to a high-score screen
9. **Power-ups (2 minimum):**
   - **Magnet** — Coins within 150px auto-collect for 5 seconds (show magnet icon on HUD)
   - **Shield** — Absorbs one collision (show blue aura around character)
10. **Game Over screen** — Shows score, coins collected, personal best, and a "Try Again" button
11. **Sound** — Web Audio API: coin collect = short high ping, crash = low thud, jump = quick whoosh

**Hard Technical Constraint:**
Lane positions must be defined as exact X coordinates (e.g., leftLane=200, centerLane=400, rightLane=600). Character X position must tween toward the target lane coordinate. Collision detection must use AABB (Axis-Aligned Bounding Box) — not distance-based.

**Fallback Instruction:**
If 2.5D isometric rendering is too complex, use clean 2D side-scroll. Do not sacrifice gameplay responsiveness for visual complexity.

**Difficulty Extension:**
Add a combo multiplier: collecting 5 consecutive coins without missing increments a multiplier (×1 → ×2 → ×3 → max ×5). Breaking the chain resets it. Show multiplier in HUD.

**NAMING (mandatory):** State the file name as the first line of your reply, named EXACTLY with the benchmark prefix: `runner__{model-slug}__{YYYY-MM-DD}__v1.html` — for example `runner__claude-sonnet-4-5__2026-11-06__v1.html`. Use today's date and your own model name, lowercased, spaces replaced with hyphens. Do not use a creative file name, uppercase or spaces. The file must run by opening it directly — no server, no build step — and work from a static host such as GitHub Pages.
