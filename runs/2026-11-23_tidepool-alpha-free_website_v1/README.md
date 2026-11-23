# The Press House

A monochrome study of paper, type and the slow machinery that turns one into the other.

## Concept

The site is a tour of the craft: pulp (the raw material), the press (the animation), the sheets (the gallery) and the ages (the timeline). It is strictly black, white and shades of grey — no accent colour, no external images, no fonts fetched over the network.

## Key design and technical decisions

- **Palette** — paper `#f5f5f5`, ghost `#e6e6e6`, rule `#d4d4d4`, mid `#999999`, deep `#222222`, ink `#1a1a1a`. Every colour is a shade of grey; `::selection` reuses the lightest shade.
- **Typography** — a serif stack for body and display (Iowan Old Style, Palatino Linotype, Palatino, Georgia) and a system sans stack for labels, captions and controls.
- **The press** — an inline SVG schematic; the ring of eight dots is rotated by the script through `setAttribute`, the angle is read out live, and `prefers-reduced-motion` switches the interaction to static stepped angles.
- **The sheets** — four inline SVG patterns (stipple, skeleton, word cut, folio); activating a face toggles the note panel via `aria-expanded`.
- **The timeline** — static, revealed one item at a time by `IntersectionObserver`; disabled under reduced motion.
- **Keyboard** — a sticky topbar with an hamburger toggle and ArrowUp/ArrowDown navigation; gallery faces and the press are buttons with full keyboard support; a skip link comes first.
- **Engineering** — one folder, one entry point: `index.html`, `styles.css`, `js/app.js`, all relative paths so the folder can sit in a GitHub Pages subdirectory. No build step, no dependencies, no placeholders.

## Verified while building

- `node --check js/app.js` — clean.
- Every colour in `styles.css` and `index.html` is greyscale (`r == g == b`).
- Every `href`, `src`, `aria-controls` and `aria-describedby` reference resolves to an existing file or an id in the document.

## What would be improved with more time

- More sheet patterns and interactive variants of them.
- A print style sheet and a PDF version of a sheet.
- Variable speed for the press, more timeline entries, and a paper-strength quiz.
- Full cross-browser testing and a CSS lint pass.
