# The Grey Index

An interactive atlas from black to white — a single-page, strictly monochrome
website mapping all 256 shades of grey (0–255) and the things in the world
made from them.

Live concept: there is no colour on the page, by design. The constraint is
the subject. Every tool on the page is about value, contrast and tone — the
skeleton that remains when hue is removed.

## What's inside

- **Hero** — a luminosity slider that repaints the hero background live
  (0–255), flipping text black/white automatically for legibility, with a
  copy-hex button and a deterministic "shade of the day" (derived from the date).
- **01 · The Ramp** — all 256 swatches as a keyboard-navigable grid
  (arrow keys, Home/End, roving tabindex). Selecting a swatch fills an
  inspector (hex, RGB, WCAG relative luminance, contrast vs. black/white,
  historical named greys where they exist) and can copy the hex or send the
  shade to the Contrast Lab.
- **02 · Contrast Lab** — text/background shade pickers (sliders + hex
  fields) computing the real WCAG 2.x contrast ratio with AA/AAA pass/fail
  grades for normal and large text, plus swap and invert.
- **03 · The Halftone Press** — a live canvas halftone renderer. A subject
  (figure / wave / word) is drawn in code, sampled pixel-by-pixel, then
  re-drawn as rotated dots. Controls for spacing, screen angle, dot gain and
  invert, a "surprise me" randomiser, a dot counter and a real PNG download.
- **04 · The Type Tester** — system-serif / sans / mono specimen with size,
  weight, tracking, leading and uppercase controls, live CSS output and
  copy-CSS.
- **05 · The Archive** — 24 real specimens (charcoal, elephant hide, fog,
  tarnished silver, third-generation photocopies…) with live search,
  category filters, darkness/alpha sorting and a `<dialog>` dossier per
  specimen.
- **06 · The Essay** — a short original long-form piece on grey in
  photography, nature and architecture, with a "mark as read" state.
- Scroll progress bar, scrolling hex marquee, section reveals, live clock,
  footer colophon and a keyboard-shortcuts dialog (`?`).

## Design decisions

- **Strictly monochrome.** Only `#000`, `#fff` and grey values are used
  anywhere — CSS, SVG favicon, canvas art, shadows (black with alpha),
  gradients and selection styling. No accent colour exists to cheat with.
- **No external anything.** No web fonts (system serif/sans/mono stacks are
  composed deliberately), no images, no libraries, no build step. All imagery
  is SVG or canvas generated at runtime. This is also the performance story:
  the whole site is three small files.
- **Typography as the visual system.** Huge serif numerals (0→255) carry the
  hero; mono is reserved for data. Ruled 2px black borders and numbered
  sections (`01 / The Ramp`) give it an index/archive character rather than a
  template look.
- **Accessibility is functional, not decorative:** skip link, semantic
  landmarks, labelled controls with `<output>`, roving-tabindex grid with
  `aria-label`s, native `<dialog>` elements, visible focus rings, live
  regions for counts and toasts, and full `prefers-reduced-motion` support
  (marquee, smooth scroll, reveals and transitions all switch off).
- **Responsive:** fluid `clamp()` type, grids collapse to one column under
  ~1000px, the ramp goes 16 → 8 columns on small screens, and navigation
  becomes a toggle button with `aria-expanded`.

## Files

```
the-grey-index/
├── index.html    entry point — all content and structure
├── styles.css    all styling (monochrome design system)
├── app.js        all behaviour (ramp, contrast maths, halftone, archive…)
├── favicon.svg   hand-drawn monochrome mark
└── README.md     this file
```

Deploy as-is to GitHub Pages (copy the folder into a repo, or serve the
folder from `gh-pages`). All paths are relative, so it works from a
repository subfolder.

## What I'd improve with more time

- A printable "ramp poster" view (print stylesheet exporting all 256 shades).
- More halftone subjects, including a user-uploaded image processed locally
  in the browser (no upload ever leaves the device).
- Archive entries with a small hand-drawn SVG glyph each instead of a flat
  swatch, and cross-links between specimens of similar value.
- Persist the last inspected shade / contrast pair in `localStorage`.
- A WebAudio "tone" mode mapping shade value to a sine pitch — still
  monochrome, but audible — behind an explicit opt-in button.
