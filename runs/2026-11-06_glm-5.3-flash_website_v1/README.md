# GRAIN — A Specimen Book of Dithering

An interactive, monochrome editorial site about dithering: the craft of
persuading two colours (black and white) to behave like a thousand. Every
image on the page is procedural — spheres, moons, seas and hills computed
from seeded noise, then halftoned live in the browser. No photographs, no
stock assets, no external requests.

## Concept

The site is art-directed as a printer's specimen book. The conceit is that
the reader has walked into a press room: the algorithms are presented as
"specimens" with catalogue cards, a comparison section is "the line-up",
and the interactive playground is "the plate room" where visitors steer
the light around a scene and watch the grain answer. The monochrome
constraint isn't a limitation here — it's the subject matter.

## Structure

- `index.html` — the whole book: hero with a live dithered moon whose
  light follows the pointer, manifesto, seven algorithm specimens,
  a five-way gradient comparison with a live exposure control, the
  interactive Plate Room, a history timeline (1882 → now), and a colophon.
- `css/style.css` — monochrome editorial design system (light/dark themes).
- `js/grain.js` — the engine: five procedural scenes, ten halftone
  algorithms, lazy plate rendering, scroll spy, theme toggle.

## Key design decisions

- **Strictly two-value plates.** Dither canvases output pure black and
  white (a "shades" slider can soften to greys in the Plate Room). The
  plates stay white even in dark mode — they are paper, not pixels.
- **All imagery is computed.** Scenes are hand-written luminance fields
  (sphere, procedural moon with craters and maria, sea, fbm terrain, a
  gradient ramp). The blue-noise screen is a real 32×32 void-and-cluster
  matrix (Ulichney, 1993) generated in the browser on first use.
- **Typography from the system shelf.** Serif for reading, monospace for
  measurement — zero font downloads, zero layout shift.
- **Editorial layout devices:** registration marks on the plates,
  dithered gradient dividers between sections, a drop-cap manifesto,
  hairline-ruled catalogue cards, a print stylesheet.

## Technical notes

- Static, no build step, no dependencies, fully relative paths — drop the
  folder into any repo and enable GitHub Pages.
- Plates render at device pixel ratio (capped at 2) into a small grid,
  then upscale with smoothing off for crisp cells. Rendering is lazy
  (IntersectionObserver), re-rendered on resize (ResizeObserver), and
  rAF-throttled.
- The animated hero light is capped at ~24 fps and only runs while the
  canvas is on screen.
- Accessibility: semantic landmarks, skip link, scroll-spy navigation
  with `aria-current`, native form controls with labelled outputs,
  `aria-live` plate readout, canvases exposed as `role="img"` with
  descriptions, visible focus rings, `prefers-reduced-motion` fully
  honoured (static hero, no reveals, no smooth scroll), and a light/dark
  theme that respects `prefers-color-scheme` and persists.
- Tested logic (algorithms, scenes, void-and-cluster) outside the browser
  via the `globalThis.GRAIN` export.

## What I'd improve with more time

- A magnifier loupe in the Plate Room to inspect individual dither cells.
- More subjects (a portrait bust, drapery) and a proper atkinson-vs-floyd
  side-by-side "diffusion race" at matched tone.
- Multi-level error-diffusion tone curves, and perceptual (gamma-aware)
  luminance as a toggle rather than an assumption.
- Prefers-contrast handling and a high-contrast print variant.
- Sub-pixel font rendering tweaks for very small mono labels on Windows.
