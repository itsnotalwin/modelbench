# The Quiet Index

A single-page field guide to silence: its physics, its architecture and the places that keep it. The subject was chosen for this brief; the site is an editorial atlas rather than a product or portfolio.

## Concept

Silence is treated as a material with texture. The page moves from an interactive anechoic chamber, through a ledger of seven quiet places, to a decibel scale you can scrub. The visual language borrows from measurement instruments and library catalogues: hairline rules, a strict monochrome palette, serif display type and a single bold diagram.

## Design decisions

- Pure black, white and grey. No accent colour, including in the favicon.
- Georgia for editorial type, Arial for instrument copy — an intentionally unfashionable but legible pairing.
- Motion is sparse: one page-load reveal, pointer-driven ripples in the chamber, and a short transition when a ledger entry changes. `prefers-reduced-motion` disables all of it.
- The chamber diagram, all seven field-note illustrations, the grain texture and the favicon are generated in SVG/CSS. There are no image files and no external assets.
- Sound is opt-in. When enabled, Web Audio generates a low sine tone whose gain and filter respond to pointer distance; there are no audio files.

## Technical decisions

- Static HTML, CSS and vanilla JS with relative paths. Opens directly from `file://` and works from a GitHub Pages subfolder.
- No build step, packages, fonts, frameworks, network calls or tracking.
- Keyboard support: skip link, focus-visible outlines, arrow-key control of both the chamber probe and the decibel slider, and native buttons for the ledger.
- Accessible names, live regions for the changing readouts, and a text description of the chamber SVG.

## With more time

I would add a fourth section on the physiological effects of silence, refine the field-note illustrations into a more coherent series, and test the page on a broader set of screen readers and older browsers.
