# Silent Press

A one-page, strictly monochrome site about subtraction as a design method. It is both an editorial argument and a working instrument: the Studio section generates a complete poster from a seed, lets you change its structure, density, type scale and ink, downloads the result as SVG, and encodes the exact settings in a shareable URL.

## Design decisions

- **One ink, no colour.** The palette is equal-channel greys only, including diagrams, generated SVG, shadows, favicon and the optional page inversion.
- **Typographic hierarchy over decoration.** Grotesk headlines, serif editorial copy and monospaced captions create contrast without a second hue.
- **The lens.** A pointer-tracked masked duplicate of the headline inverts a small circle over the wordmark, making the idea of negative space literal.
- **Deterministic artwork.** A seeded PRNG drives grid, orbit and stack compositions. The same settings always produce the same poster, which makes links reproducible.
- **Progressive enhancement.** All copy is present in the HTML. JavaScript adds the poster engine, grain texture, reveal animations, scroll progress and navigation helpers; reveal animations are only applied when the `js` class exists.

## Technical decisions

- Plain `index.html`, `styles.css` and `js/app.js` with relative paths: no build step, no package install, no network requests, and it opens directly from `file://` or any repository subpath.
- Poster output is inline SVG generated as a string; download uses a Blob and object URL. Thumbnails use the same generator with grain disabled.
- Keyboard support: skip link, labelled controls, visible focus, `aria-live` status, `aria-pressed` inversion toggle, Escape to close the menu, and `R` to reshuffle.
- Respects `prefers-reduced-motion`: the marquee, reveals, lens and smooth scrolling are disabled.
- The repository's Vite scaffold imports these same files so `npm run build` renders an identical page while the deliverable folder remains standalone.

## What would improve with more time

- A print stylesheet and a CMYK-safe export path for physical production.
- More composition structures, editable typographic content and a small edition archive persisted locally.
- Expanded screen-reader descriptions of each generated composition, and manual testing across a wider range of assistive technology.
