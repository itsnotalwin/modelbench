# DIM — The Hour Between

## Concept

*DIM* is a single-page, strictly monochrome interactive field guide to dusk and the
hour between day and night. The idea: dusk isn't a switch, it's a long, polite exhale
of light before the dark. The site is framed as the log of a fictional coastal signal
keeper — a keeper who turns the beacon, writes down the fog, sleeps in the chair.

The page moves through five movements — Arrival, The Turn, The Grey, The Night, The
Return — and closes on dawn returning.

## Design decisions

- **Palette:** black, white and a hand-built scale of ten greys. No accent colour
  exists anywhere. Typography, UI chrome, skies, stars, fog and SVG are all in family.
- **Type:** system font stacks only (Helvetica Neue grotesk display, Georgia serif for
  quotes, ui-monospace for eyebrows/numbers). No webfont requests, no layout shift.
- **Motion:** hero lines rise on load, marquee runs, scroll reveals fade/rise via
  IntersectionObserver. All disabled under `prefers-reduced-motion`.
- **Imagery:** all artwork is CSS/SVG — layered radial-gradient skies, generated star
  field, gradient fog, moon glow, SVG favicon, film-grain overlay via inline SVG
  turbulence. Zero image files, zero external assets.

## Technical decisions

- Static hand-written HTML/CSS/vanilla JS. No framework, no build step, no dependencies.
- All assets referenced with relative paths (`styles.css`, `js/app.js`, `favicon.svg`) —
  works from `file://` and from any GitHub Pages subpath.
- Semantic landmarks, skip link, `aria-live` on the light dial readout, real range input,
  visible `:focus-visible` rings, `scroll-margin` under the fixed header, AA-ish contrast
  within the monochrome set.
- Fully responsive (fluid `clamp()` type, wrapping header/dial/facts), keyboard operable.

## With more time

- Real audio (foghorn, beacon) mixed into a small timeline.
- Scroll-driven sky animation (stars dimming, fog rolling) via rAF instead of the
  manual light dial.
- Print stylesheet and reduced-data mode.

## Run

Open `index.html` directly, or serve the folder statically. No server required.
