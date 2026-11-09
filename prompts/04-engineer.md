# 04 · Simulation tool — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> Save the model's reply as `engineer__<model-slug>__<YYYY-MM-DD>__v1.html` (use the exact name the model put on its first line; rename it if it did not). Upload the **.html** to `inbox/`. Never upload a .rar.
> The sorter files it as `runs/<date>_<model>_engineer_v1/index.html`.

---

## Model prompt (send everything below this line)

Build an interactive engineering simulation and design tool as a single HTML file. You choose the discipline and the system: for example a PID-controlled thermal chamber, a spring-mass-damper suspension, an RLC circuit, a truss under load, a water tank network, a heat exchanger, an inverted pendulum on a cart, an orbital transfer, a wind turbine power curve, a traffic network, a battery discharge model. Pick one that will show interesting behaviour.

**Ground rules**
- You choose the name and look. Do not ask questions and do not hedge. Decide and build in one pass.
- One self-contained HTML file with no external files. No libraries needed.
- Must run opened directly from disk (`file://`) and when hosted on GitHub Pages from a subfolder.
- No placeholder text, TODOs or dead controls.

**What the tool must do**
- Write the governing equations in the UI, correctly, with units. Name the numerical method you use (for example RK4 with a fixed step) and state the time step and why it is stable.
- At least **5 preset scenarios**, each demonstrating a different behaviour (for example underdamped, critically damped, saturation, instability, resonance). Each is selectable and clearly labelled with what it shows.
- At least **3 live plots** drawn on canvas, with axes, units, legend and a moving cursor. Plots update while the simulation runs.
- A canvas schematic of the physical system that animates from the simulated state, not a static picture.
- Sliders for every key parameter with sensible ranges and a numeric readout.
- Play, pause, step and reset. Time scale control.
- Export of the current run to CSV (time plus every signal).
- A **solver self-check panel** with at least 4 checks. At least two must compare the numerical solution to a known analytic result within a stated tolerance, and show pass or fail.
- Visual craft counts: clean layout, readable plots, a considered colour system.

**Deliverable — naming is mandatory**
- Your file must be named exactly: `engineer__{model-slug}__{YYYY-MM-DD}__v1.html`
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file name, no uppercase letters, no spaces.
- Your first line is that exact file name. Then the complete file in one code block. After the block, five bullets on your key creative choices and one known limitation. Nothing else.

---
