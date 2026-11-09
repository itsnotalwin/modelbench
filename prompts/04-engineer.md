# 04 · Simulation tool — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `engineer__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate, complete engineering simulation tools**, each as its own single HTML file. Each tool models a different discipline or system that you choose, for example: a PID-controlled thermal chamber, a spring-mass-damper suspension, an RLC circuit, a truss under load, a water tank network, a heat exchanger, an inverted pendulum on a cart, an orbital transfer, a wind turbine power curve, a battery discharge model. The three must come from three different disciplines.

**Ground rules (apply to all three)**
- You choose the names and look. Do not ask questions and do not hedge. Decide and build.
- Each file is one self-contained HTML file with no external files. No libraries needed.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder.
- No placeholder text, TODOs or dead controls.

**What each tool must do**
- Write the governing equations in the UI, correctly, with units. Name the numerical method (for example RK4 with a fixed step) and state the time step and why it is stable.
- At least **5 preset scenarios**, each demonstrating a different behaviour (for example underdamped, critically damped, saturation, instability, resonance). Each is selectable and labelled with what it shows.
- At least **3 live plots** on canvas, with axes, units, legend and a moving cursor.
- A canvas schematic of the physical system that animates from the simulated state.
- Sliders for every key parameter with sensible ranges and a numeric readout.
- Play, pause, step and reset, plus a time-scale control.
- CSV export of the current run (time plus every signal).
- A **solver self-check panel** with at least 4 checks. At least two compare the numerical solution to a known analytic result within a stated tolerance, and show pass or fail.
- Visual craft counts: clean layout, readable plots, a considered colour system.

**Delivery — naming is mandatory**
- File names are `engineer__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per tool: its discipline, the key creative choice, and one known limitation. Nothing else.

---
