# FOLD — website

A static, single-entry-point editorial site for the fictional monthly publication **FOLD**: "a monthly of type, paper and the edge between."

## Concept

FOLD is a publication about the things that fold — lines, sheets, pages and the space between two of them. The site presents five short stories, the practice behind the office, and a way to write to it. The design is strictly monochrome (black, white and shades of grey).

## Design notes

- **Typography:** Georgia-family stack for body and display (`Iowan Old Style` → `Palatino Linotype` → `Palatino` → `Georgia`), system sans for labels; headings are large and left-aligned; body copy is measured at ~62ch.
- **Motion:** the hero sheets settle in with a staggered drop, hero letters fade in, and story cards bloom into view when scrolled into range. All animations are disabled under `prefers-reduced-motion`.
- **Interaction:** stories are `<details>` accordions (grouped by `name`, so one open closes the others), with the native keyboard behaviour. Hover and focus states are drawn with solid greyscale outlines.
- **Imagery:** all artwork is hand-drawn SVG (the folded-sheet hero animation, the per-story glyphs, the typewriter illustration, the favicon). No external images or fonts.

## Technical decisions

- One file: `index.html` is the single entry point; CSS lives in an inline `<style>` block and the script is a small inline function, so the site runs with no build step, no install and no network.
- Relative paths (`assets/favicon.svg`) so it works from a GitHub Pages subfolder.
- Semantic HTML with ARIA labels, `:focus-visible` outlines, a skip link, a print stylesheet, and a `lang="en"` attribute.
- Scroll reveal uses `IntersectionObserver` when available, with a static fallback; the story bodies remain visible without JavaScript.
- Monochrome: every colour is black, white or a greyscale value (`--ink #111111`, `--meta #696969`, `--line #e4e4e4`, hero `--hero-bg #111111` / `--hero-ink #f7f7f7`, etc.).

## What I would improve with more time

- A PDF export of the issue.
- A real RSS/Atom feed behind a small static data file.
- An archive of past issues with per-issue pages.
- Heavier testing across screen readers and older browsers.
