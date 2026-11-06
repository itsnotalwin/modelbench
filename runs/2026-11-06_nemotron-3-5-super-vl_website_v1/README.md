# MONO.

A studio site for work without colour.

**Strictly monochrome.** Everything — type, UI, imagery, shadows, gradients, SVGs, favicon — is black, white or a shade of grey. There is no accent colour, ever. A `filter: grayscale(100%)` on the root element makes that guarantee literal: even a mistake cannot introduce colour anywhere on the page.

## Concept

MONO. is a generative design studio that treats constraint as the medium. Without colour to lean on, composition, hierarchy, motion and typography have to do all the work. The site is its own demonstration:

- **Hero** — a pointer-reactive flow field drawn in canvas from a dependency-free Perlin noise implementation; still under reduced motion.
- **Weight study** — a live type specimen: drag the slider to redraw letterforms between hairline and black using only CSS `font-weight` and system fonts.
- **Line field** — a second generative canvas piece inside a work card.
- **CSS composition** — overlapping rotated shapes built only from boxes, borders and transforms.
- **About** — a generative signature drawn in canvas.
- **Contact** — a working `mailto:` link with a clipboard copy button.

No stock imagery, no lorem ipsum, no web fonts, no external scripts, no cookies, no build step.

## Design decisions

- Extreme typographic scale contrast (display copy down to 0.7rem micro-captions), ragged-right composition, generous whitespace.
- One typeface family (system UI sans + system mono); voice is dry and direct.
- Sticky, keyboard-navigable navigation with visible `focus-visible` outlines (black on light sections, white on dark).
- Skip link for keyboard users; every button and link is real and functional.

## Technical decisions

- Static HTML/CSS/JS only. Relative paths throughout — deploys as-is to GitHub Pages from the root or a repository subfolder.
- Zero external dependencies; nothing is pinned because nothing external is loaded.
- Canvas buffers scaled to `devicePixelRatio` (capped at 2); animation loops pause when the tab is hidden.
- Responsive: fluid `clamp()` typography, CSS grid that stacks on mobile, collapsible navigation.
- Accessibility: semantic HTML, `aria-hidden` on decorative canvases, `role="img"` on the generative signature, `prefers-reduced-motion` honored plus a manual motion toggle stored in `localStorage`.
- Monochrome enforced both by palette discipline and by the root-level grayscale filter.

## What I would improve with more time

- Additional generative pieces (a print specimen section, an interactive font mixer exporting SVG).
- A dark theme variant with tuned contrast rather than inverted black sections.
- A print stylesheet optimised for physical output.
- Static SVG fallbacks for the canvas pieces, for browsers without canvas support (canvas is progressive enhancement; all content is available without it).

## Deploy

Copy the folder into any repository and enable GitHub Pages. All paths are relative, so it works from the root or a subfolder. No build step, no install, no environment variables.
