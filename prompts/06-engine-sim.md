# 4-cylinder engine simulation — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model must deliver one `.html` file and state its name at the top of the reply.
> Save it as exactly:
>
> `engine__{model}__{YYYY-MM-DD}__v1.html`
>
> Example: `engine__claude-sonnet-4-5__2026-11-06__v1.html`
> Upload that **.html** (never .rar) to `inbox/`. The Action files it as `runs/{date}_{model}_engine_v1/`, previewable on the dashboard.

---

## Model prompt (send everything below this line)

You are a mechanical engineering visualization expert and a browser animation engineer.

Build a single-file HTML5 + CSS3 + vanilla JavaScript interactive simulation that teaches how a 4-cylinder internal combustion engine works.

**Primary Goal:** A real-time, animated, technically accurate visualization of the 4-stroke cycle (Intake → Compression → Power → Exhaust) across all 4 cylinders, with user controls.

**Visual Direction:**
- Dark engineering theme: #0D1117 background, #21262D panels, #58A6FF for active strokes, #F85149 for combustion flash
- Cylinders rendered as clean SVG cross-sections showing: piston, connecting rod, crankshaft, valves (intake = green, exhaust = red), spark plug
- Labels must appear on hover for each component
- Firing order: 1-3-4-2 (standard inline-4)

**Required Features:**
1. **4 cylinder SVG animation** — Each piston moves up/down sinusoidally driven by a shared crankshaft. Crankshaft offset: 0°, 180°, 360° (540°), 270° for firing order 1-3-4-2
2. **Stroke phase indicator** — Below each cylinder, a color-coded badge shows the current stroke name in real time
3. **Crankshaft rotation display** — A circular dial shows crankshaft angle (0–720°) updating every animation frame
4. **RPM control** — A slider (500–6000 RPM) controls animation speed. Display current RPM numerically
5. **Combustion flash** — When the power stroke fires, the cylinder interior briefly flashes red/orange for 100ms
6. **Valve animation** — Intake valve opens during intake stroke, exhaust valve opens during exhaust stroke (shown as small colored rectangles moving)
7. **Play / Pause / Reset** — Three buttons. Reset returns to 0° crankshaft position
8. **Stroke detail panel** — Clicking any cylinder freezes that cylinder's view and shows a sidebar explaining what is happening at that exact moment

**Hard Technical Constraint:**
The crankshaft angle must be the single source of truth. All piston positions, valve states, and stroke indicators must derive mathematically from `crankAngle % 720`. No separate timers per cylinder.

**Fallback Instruction:**
If SVG rendering becomes too complex, simplify cylinders to rectangles with moving piston rectangles — but all timing logic and controls must still function.

**Difficulty Extension:**
Add a torque curve graph panel (using Canvas) that updates in real time, showing which cylinder is contributing power at each crankshaft angle.

**NAMING (mandatory):** State the file name as the first line of your reply, named EXACTLY with the benchmark prefix: `engine__{model-slug}__{YYYY-MM-DD}__v1.html` — for example `engine__claude-sonnet-4-5__2026-11-06__v1.html`. Use today's date and your own model name, lowercased, spaces replaced with hyphens. Do not use a creative file name, uppercase or spaces. The file must run by opening it directly — no server, no build step — and work from a static host such as GitHub Pages.
