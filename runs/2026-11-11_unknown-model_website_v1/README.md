# Ordered — an atlas of tone, reduced to dots

A static, dependency-free field guide to halftone and dithering. Open `index.html`
directly from disk, or publish this folder as-is with GitHub Pages. There is no
build step, no package install, no network request and no image file: every picture
on the page is computed in the browser.

## Concept

A printing press can only put ink down or leave it off. Every grey in print is a
bargain: a short list of black marks, arranged so the eye agrees to see something
softer. Ordered treats that bargain as its subject.

1. **Hero: a dotted planet.** It is shaded cell by cell and drawn as halftone dots,
   ordered 4 × 4 squares or engraved lines. The light follows the pointer, arrow keys
   move it when the field has focus, and `D` changes the screen. The current frame can be saved as a PNG.
2. **Resolve.** A dune landscape made from noise, lit low. Scrolling turns its
   continuous tone into dots, one cell at a time.
3. **The problem.** A serif statement whose words light up as the section passes.
4. **Atlas Lab.** One source (sphere, ramp, or a word you type), with tone and
   contrast controls. Four kernels run live: threshold, Bayer 8 × 8, Floyd–Steinberg
   and Atkinson. Each method can be copied as working JavaScript or saved as a PNG.
5. **Step wedge.** Eleven flat tones with a dot-gain slider. The readout compares
   intended and printed tone, which shows why the midtones always come out darker.
6. **History.** Eight dated moments: Daguerre (1839), Talbot's screen (1852), Ben-Day
   tints (1879), the first newspaper halftone (1880), Bayer (1973), error diffusion
   (1976), Atkinson (1984), and blue noise (1987). The 1839, 1852, 1879 and 1880 entries
   were checked against published sources during the build; the rest are standard
   references that should be re-verified before any print use.

## Key design decisions

- **Strict monochrome.** Only `#0b0b0b`, `#efefef` and neutral greys appear anywhere,
  including the favicon, the grain overlay and the canvas output.
- **Ink and paper rhythm.** Sections alternate between black and off-white, echoing
  the subject of ink on paper. The header uses `mix-blend-mode: difference`, so it
  stays legible on both.
- **Typography from the system.** Helvetica Neue / Iowan Old Style / ui-monospace
  stacks. No web fonts means no requests and no flash of unstyled text. Scale
  contrast comes from a display size near 13 vw against small monospaced labels.
- **Hairline grid.** A 12-column grid with 1 px rules, so structure is visible without decoration.
- **Motion with restraint.** Pointer and scroll drive the imagery. Under
  `prefers-reduced-motion` the planet stops orbiting, the landscape is shown
  fully resolved without pinning, reveals are disabled and the statement is fully inked.

## Technical decisions

- **Classic scripts, not ES modules.** Module scripts are blocked from `file://` in
  some browsers, so every script is a plain `defer` script inside one namespace,
  `window.Ordered`.
- **Self-contained kernels.** Each dithering function carries its own logic, so
  `Function.prototype.toString()` returns runnable code for the "Copy source" button.
- **Bayer matrix from bit interleaving**, not a hard-coded table. It is verified in
  tests as a permutation of 0 to 63.
- **One canvas path per frame.** The planet and landscape batch all their dots into a
  single path and fill once. Updates are coalesced with `requestAnimationFrame`, and
  the device pixel ratio is capped at 2.
- **Procedural sources.** Hash-based value noise with a fractal sum. The landscape is a
  height field whose surface normals are lit by a Lambert term. The sphere is analytic.
- **Accessibility.** Skip link, real heading order, a focusable canvas with arrow-key
  control, `aria-pressed` toggles, roving arrow keys across the wedge, `aria-live`
  feedback for copy and save, visible focus rings, and body text at or above 4.5 : 1.
- **Clipboard fallback.** The asynchronous Clipboard API is tried first, then
  `execCommand('copy')` for browsers that block it.
- **Embedded in the Vite shell.** `src/App.tsx` imports these exact files with `?raw`
  and renders them in a full-screen iframe, so the Vite build serves the same site.

## What I would improve with more time

- A real browser test suite (Playwright across Chromium, Firefox and WebKit), covering
  keyboard paths, reduced-motion behaviour and PNG export.
- A blue-noise (void-and-cluster) kernel, which the history section describes but the
  lab does not yet demonstrate.
- A measured tone curve for the dot-gain model, in place of the simple midtone curve.
- A lower-cost hero mode for older phones, with fewer cells and an adaptive frame budget.
- A print stylesheet, so the step wedge and the Atlas outputs print at true scale.

## Testing status

- Verified: every script passes a syntax check; the dithering kernels pass unit
  tests (Bayer matrix is a permutation of 0–63, tone is preserved on flat fields, and
  pure black and white are exact); every DOM id the scripts use exists in the HTML;
  all colours are neutral greys; and the page runs without errors in a DOM emulator,
  with keyboard, pointer, slider and button paths exercised in both normal and
  reduced-motion modes.
- Not verified: visual inspection in real browsers, and PNG download behaviour outside
  an emulator. Test in Chromium, Firefox and Safari before relying on the layout.

## Files

- `index.html`: the single entry point and all content.
- `styles.css`: the design system, layout, responsive rules and reduced-motion rules.
- `js/core.js`: the namespace, dithering kernels, painting, PNG export and clipboard helpers.
- `js/sources.js`: procedural sphere, ramp, dune landscape and text sources.
- `js/hero.js`, `js/lab.js`, `js/wedge.js`, `js/resolve.js`: the four interactive modules.
- `js/app.js`: reveal-on-scroll, statement, section highlighting and the boot sequence.
