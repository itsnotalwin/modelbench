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

**Mobile-first and installable (mandatory, every file)**
- Design for a 390px-wide portrait phone first, then scale up to desktop. Touch is the primary input: every control is at least 44px, nothing depends on hover, and the first interaction works with one thumb.
- Works in portrait and landscape, handles `resize` and `orientationchange`, and respects `env(safe-area-inset-*)` so nothing hides behind a notch or the home bar.
- Fits the screen: use `100dvh`, no page scrolling in games and toys, and `touch-action` set on play areas so pinch and double-tap do not zoom the page.
- Mobile specifics for this test: plots that stack vertically in portrait and widen in landscape, sliders with a thumb-sized track (44px+), preset scenarios as a horizontally swipeable row, and readouts legible without zooming.
- The file must be installable as a Progressive Web App. The benchmark host places `manifest.webmanifest`, `sw.js` and `icons/` next to your file. Your file must reference them. Put exactly these lines in `<head>` (set `theme-color` to your own palette colour):

```html
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b0d12">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
```

  and this line just before `</body>`:

```html
<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});</script>
```

- Do not create the manifest, service worker or icon files yourself. The file must still open and work from disk even when they are missing. Once installed, the app must run offline after its first load, so keep runtime network use to the CDN libraries your prompt allows.

**Delivery — naming is mandatory**
- File names are `engineer__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per tool: its discipline, the key creative choice, and one known limitation. Nothing else.

---
