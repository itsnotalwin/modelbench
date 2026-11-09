# 08 · Living Systems Simulator

## Run parameters
Set these three values before starting the run. They must be the same values written into the output folder and metadata.

- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

If a value is still bracketed, stop and ask the organizer to fill it in. Do not invent the model identifier or date.

## The brief

Build a rigorous, interactive **Living Systems Lab** that lets a user explore how a small grassland ecosystem changes over time. This is a simulation tool, not an animated illustration. The model must update numerical state, expose its assumptions and show the consequences of changing the environment.

Use four state variables:
- **B** — grass biomass index, bounded from 0 to 100.
- **H** — herbivore population index, bounded from 0 to 100.
- **P** — predator population index, bounded from 0 to 50.
- **W** — water availability index, bounded from 0 to 1.

Use the following baseline dynamics. Let **R** be the rainfall target, between 0.2 and 1.0.

- dB/dt = 0.65 × B × (1 − B/100) − 0.008 × H × B − 0.45 × (1 − W) × B
- dH/dt = 0.035 × H × (B/(B+20)) − 0.055 × H − 0.015 × P × H
- dP/dt = 0.022 × P × (H/(H+10)) − 0.04 × P
- dW/dt = 0.18 × (R − W) − 0.0005 × H × W

The baseline initial state is B=65, H=32, P=8, W=0.7. These equations form a simplified fictional teaching model, not a scientifically calibrated prediction of a real ecosystem. Use the equations as written and label state units as indices.

## Product requirements

1. Build a clear simulation workspace with a live ecosystem view, readable controls, model status and a concise explanation of what each state variable means.
2. Implement a real numerical integrator. Prefer RK4 with a fixed time step and stable substeps. Explain the chosen method and step size in the UI. Clamp state variables to their stated bounds and handle non-finite values safely.
3. Provide controls for rainfall target R and at least two scenario presets. Include **Balanced**, **Drought** and **Wet recovery** presets with clearly stated parameter and initial-state differences. A preset must reset the simulation to its documented state.
4. Include play, pause, single-step, reset and simulation-speed controls. The simulation must be deterministic for the same starting state, parameters and step sequence.
5. Show four live time-series plots for B, H, P and W, with axes, units/indices and a visible current time. Charts must reflect the underlying simulation state.
6. Show at least one meaningful relationship or phase plot, such as herbivores versus biomass. It must use actual simulation samples, not decorative data.
7. Add visible event markers or annotations for notable transitions such as a population collapse, low-water threshold or recovery. State the threshold rule used.
8. Allow CSV export of the simulation history, including time, all state variables and the active rainfall parameter. Provide a way to clear/restart the history.
9. Include a short explanation of limitations and a “what happens if?” exploration area that helps users formulate and compare scenarios.
10. Make the interface responsive and accessible. Avoid animation that makes graph labels or numerical changes impossible to inspect.

## Quality bar

The mathematics must be implemented consistently with the equations above. Controls must alter the actual dynamics. Charts must be honest and legible, and scenario labels must correspond to the underlying initial conditions and parameters. The user should be able to pause, inspect a moment, change a parameter and repeat a run.

Use a self-contained HTML file with inline CSS/JS. No remote APIs, libraries, fonts or images. Draw the charts with canvas or SVG. Use semantic controls, keyboard access, sufficient contrast, reduced-motion support and no console errors.

## Acceptance checklist

Before finishing, verify that:
- The four derivatives match the equations in the brief.
- The fixed-step integrator advances all four variables and clamps them safely.
- Play/pause/single-step/reset/speed and scenario presets work.
- The same initial state and step sequence produce the same results.
- All five plots update from simulation data and display useful axes/labels.
- CSV export contains the actual simulated history and correct headers.
- Threshold events use documented rules and are not hard-coded decoration.
- The limitations of the simplified fictional model are stated clearly.
- Desktop and phone layouts are functional.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**sim__MODEL_SLUG__RUN_DATE__vVERSION**

Inside, include **index.html**, **meta.json**, and only essential runtime files in **assets/** if needed. Do not create multiple simulations, three variants, extra pages, README/audit files, screenshots, package files, dependencies or build output. Keep the app in one HTML page with inline CSS/JS. Create the files in the workspace; do not paste code into chat.

The valid UTF-8 metadata must contain:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "sim",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "08",
  "prompt_label": "Living Systems Simulator",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

Use the exact run parameters. The organizer ZIPs the folder; the ZIP filename is not used for routing. Test the simulation in a browser if available. Otherwise perform a code-level smoke check and disclose it. Report only the folder path and honest test status.
