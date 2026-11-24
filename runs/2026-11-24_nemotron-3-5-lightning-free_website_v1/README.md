# Monochrome Website

**Folder:** `website__nemotron-3-5-lightning-free__2026-11-24__v1`

## Concept

This is a deliberately monochrome showcase website, exploring what's possible within a strictly black, white, and greyscale palette. Every visual element — backgrounds, text, shadows, borders, SVGs — uses only shades of black and white. No accent colours, no imagery borrowed from elsewhere, no build step, no framework, and no external dependencies.

## Key Design Decisions

- **Strict monochrome palette**: Background `#fafafa`, foreground `#212121`, muted `#666666`, accent black. All colors are chosen from the black-white spectrum.
- **Typography-first**: System font stack with large-scale heading scales using `clamp()` for fluid responsiveness.
- **Generative SVG patterns**: The "Works" section references three conceptual pieces — *Interference*, *Strata*, and *Contrast* — each exploring different aspects of monochrome visual language.
- **Responsive grid**: Works grid flows from 1 column (mobile) to 3 columns (desktop).
- **Accessibility-first**: Skip links, focus-visible outlines, semantic HTML, ARIA labels, keyboard-navigible navigation.
- **Reduced-motion media query**: All transitions honor `prefers-reduced-motion`; scroll animations and sticky header are disabled when reduced motion is preferred.
- **No build step**: Plain HTML, CSS, and JavaScript. Openable directly from `file://`. Works from a GitHub Pages repository subfolder using relative paths.

## Technical Notes

- `styles.css` — ~80 lines of CSS custom properties, media queries, and reduced-motion queries. No external CSS framework.
- `js/app.js` — vanilla JS for focus management, skip-link behavior, scroll observations, and focus-aware navigation. No dependencies.
- `favicon.svg` — monochrome SVG favicon (64x64, white background with black and white circles).
- All paths are relative from the project root folder.

## What Would Improve With More Time

- Additional generative SVG art pieces in the works gallery
- Dark/light mode toggle (still monochrome, but using value range)
- More sophisticated typographic scale with optical size variations
- CSS custom properties for color theming within the monochrome constraint
- Performance optimization for very low-end browsers