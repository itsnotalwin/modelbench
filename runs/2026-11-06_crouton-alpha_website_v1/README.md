# ACHROMA — The Institute for Monochrome

An interactive museum of the colourless. Zero colour. 101 greys. Every image on the page is drawn live by code in your browser.

## What this is

A single-page exhibition proving that black, white and grey — taken absolutely seriously — can carry art direction, education and delight. Six exhibits:

- **01 Invention of grey** — a seven-stop timeline (1826 → 2026), each stop with its own SVG plate.
- **02 Halftone lab** — a live dot field. Pitch, angle and ink density are sliders; the pointer adds ink. Pause, invert, re-seed and download the result as a PNG.
- **03 Optical rooms** — Mach bands, the Hermann grid and the checker-shadow illusion, each with working controls and a plain-English explanation.
- **04 One-bit engine** — four procedural scenes dithered into pure black/white with threshold, Bayer 2×2 / 4×4 / 8×8 and Floyd–Steinberg algorithms. Enlarged with hard edges, downloadable.
- **05 The grey scale** — 101 greys on one keyboard-operable ruler. Hex, lightness, WCAG contrast vs black/white and AA verdicts update live; copy any hex. Includes the site's own 8-token palette as a printed spec table.
- **06 Type tester** — set a line in the site's own system stack (size, weight, tracking, leading), read live CSS and copy it.

Plus a mouse-reactive hero dot field, a scrolling word strip, and three paper themes (Paper / Ash / Negative) that restage the whole site in different greys.

## Constraints honoured

- **Strictly monochrome** — only `#000`, greys and `#fff` anywhere: type, UI, canvas, SVG, shadows, gradients, favicon. No accent colour, ever.
- **No external images or stock** — all imagery is inline SVG or `<canvas>` drawn by `js/app.js`.
- **No external dependencies** — no frameworks, no webfonts, no CDNs. System font stacks only (`Helvetica / Georgia / system mono`).
- **Static, no build step** — open `index.html` from `file://`, or deploy the folder to GitHub Pages as-is.
- **Fully responsive** — fluid `clamp()` type, grids collapse to one column, the header collapses to a Menu button under 46rem.
- **Keyboard accessible** — skip link, every control is a native button/slider/input, the grey ruler is a `role="slider"` with arrow/Home/End support, the timeline supports arrow keys.
- **`prefers-reduced-motion` respected** — CSS kills marquee/smooth-scroll, JS stills all canvases and renders on demand instead.
- **No dead ends** — every button downloads, copies, toggles, prints or navigates. No placeholders.

## Design decisions

- **Type as the artwork.** Because colour is banned, the page must win on scale, weight, spacing and the sans/serif/mono trichotomy (Helvetica for structure, Georgia italics for voice, mono for data). Outlined section numerals (`-webkit-text-stroke`) give the giant index numbers without any image.
- **The interface demonstrates its own subject.** The theme switcher restages the design in different greys; Exhibit 05 literally publishes the palette the interface uses. The site is its own specimen.
- **Hard edges, no soft shadows-as-colour.** Depth comes from 2–3px rules, borders and double rules, not drop shadows — monochrome depth through structure.
- **Performance.** Vanilla JS, small canvases (halftone 900×520, dither 320×200), `IntersectionObserver` pauses off-screen animation, `requestAnimationFrame` throttling, passive scroll listener. Should hold 60 fps on modest hardware.
- **Favicon as manifesto.** Four squares, black/white/grey, on the same checker logic as the whole show.

## Files

```
index.html      entry point — semantic HTML for all six exhibits
styles.css      monochrome design system, themes, responsive + print
favicon.svg     checkerboard mark
js/app.js       all interactivity (themes, timeline, two canvas labs, optical rooms, grey scale, type tester)
README.md       this file
```

All paths are relative (`styles.css`, `js/app.js`, `favicon.svg`), so the folder works from a GitHub Pages subpath.

## What I would improve with more time

- A true variable-font lab if a locally bundled font were allowed.
- Voronoi/tone-mapped scenes and a photo-to-dither upload path (kept procedural-only for privacy/offline guarantee).
- A larger dither canvas with worker-based Floyd–Steinberg for speed at 800×500.
- A scroll-driven exhibition index with chapter markers and a reading-position readout.
- Sound-free, visual-only Morse/braille studies and a print-only A3 specimen poster generated from Exhibit 05.
