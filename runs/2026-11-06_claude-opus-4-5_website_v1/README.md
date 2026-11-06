# Umbra: a field manual for the shadow of the Moon

A single-page site about the **total solar eclipse of 2 August 2027**. Totality lasts up to 6 min 23 s near Luxor, the longest over land until 2114. The site is built for people deciding whether to go, where to stand, and what to do with those minutes.

Open `index.html`. There is no build step, no server and no dependencies. It works from `file://` and from a GitHub Pages subfolder.

## Concept

An eclipse is a monochrome event. The brief allowed only black, white and greys, so the eclipse sets the art direction instead of fighting it.

- **The page is the sky.** In the opening sequence, scrolling moves the Moon across the Sun, and the page background follows a logarithmic brightness model. It hardly dims through 90% coverage, then drops to black in the last percent. That is the main thing people misunderstand about eclipses, and here you see it happen rather than read about it.
- **Diagram, then spectacle.** In daylight the Moon is drawn as a dashed hairline, labelled "invisible in daylight", like a technical plate. At totality the hairlines fade and the corona appears.
- **Six sections, each with one job:** Sequence (feel it), Light (understand it), Path (choose a place), Rehearse (prepare), Calendar (the long view), Field notes (do it safely).

## Key design decisions

- **Type:** a classical serif for display and editorial text, monospace for instrument readouts, and a neutral sans for body copy. All three are system font stacks, so nothing is downloaded and nothing reflows while fonts load.
- **The arrivals board** borrows from airport split-flap displays. Aswan is listed with a struck-through `0m 00s`: it gets 99.8% coverage and no totality, which makes the point of section 02 with real data.
- **The calendar** draws every total eclipse to 2039 as a bar scaled to its duration. 2027's bar dominates, and the countdown runs live.
- **The rehearsal** is a real-time, full-screen run-through of totality for a chosen city, with timed prompts. It is there because "it felt like forty seconds" is the most common thing first-timers say afterwards.
- **Copy** is written to be accurate, specific and short. Times are rounded and labelled as approximate, and the sources are credited.

## Technical decisions

- **One renderer, three canvases.** `makeRenderer()` draws the sky, stars, corona, Sun and Moon for the sequence, the light meter and the rehearsal.
- **The corona** is generated once per size from a seeded PRNG: about 1,600 gradient strokes (helmet streamers bent towards the equator, plus polar plumes) cached to an offscreen canvas. It is then drawn rotated and layered so it moves very slowly. Textures are built during idle time so totality never stutters.
- **Baily's beads emerge from the geometry.** The Moon's edge is a noisy polygon (summed sines standing in for lunar valleys), so as the gap closes, the last crescent breaks into beads by itself. The diamond-ring glow is keyed to the true gap width.
- **Physics:** coverage comes from the exact circle-overlap area. Perceived brightness is `log10(daylight remaining)` over six decades, roughly from sunlight down to corona level.
- **Performance:** rendering runs on demand (scroll, input, resize), and continuous animation runs only while the corona is visible and its canvas is on screen (IntersectionObserver). Device pixel ratio is capped at 2, and resized canvases are redrawn immediately so they never flash.
- **Accessibility:**
  - Semantic landmarks, a skip link and a skip-the-sequence link.
  - Every control is a native button, radio or range input with visible focus.
  - Chapter text stays in the accessibility tree so screen readers get the whole story in order, and the canvas label updates with each phase.
  - The slider has an `aria-valuetext`; presets announce through a polite live region.
  - The rehearsal uses `<dialog>` (focus containment, Esc to close, focus returned to the start button) and announces prompts politely.
  - Flap-board cells keep the real text in visually hidden spans.
  - Touch targets are at least 44 px.
- **`prefers-reduced-motion`:** CSS animations and transitions are removed, smooth scrolling is turned off, the corona stops rotating, the board doesn't flap, and continuous loops stop. Scroll-driven changes stay, because the user controls them directly.
- **Monochrome everywhere:** the favicon is an inline SVG, the film grain is SVG turbulence passed through `feColorMatrix saturate=0`, the range thumb is half black and half white, and selection, scrollbar and focus colours are all grey.

## Data

The decade tables and the 2027 greatest-eclipse figures come from Fred Espenak (NASA GSFC). Times are converted from TD to UT (about −70 s) and rounded. City durations are compiled from several published predictions for the 2027 path, which agree to within a few seconds.

## With more time I would

- Add a true orthographic globe with the umbral path, using a compact embedded coastline (TopoJSON quantised into a JS module), without giving up the no-dependency rule.
- Compute local contact times for any coordinate from Besselian elements, instead of a fixed list of cities.
- Port the corona to a small WebGL shader with flow noise for richer, more physical movement, keeping canvas 2D as the fallback.
- Ship a self-hosted, subset variable serif for full typographic control across platforms.
- Test with NVDA, JAWS, VoiceOver and TalkBack on real devices, and on low-end Android hardware.
