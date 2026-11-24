# OFFSET — Design Engineering Journal

A monochrome interactive journal exploring the craft of digital design engineering through executable essays.

## Concept

OFFSET treats the website itself as the subject. Each essay includes a live, interactive figure — not an illustration, but a working model of the concept being discussed. The figures *are* the essays; the text contextualizes them.

Four essays, four generative figures:

1. **The Geometry of Whitespace** — Force-directed layout where spacing emerges from simulated repulsion forces. Drag blocks to feel the system reorganize.
2. **Motion Without Motion** — Three perceptual animation techniques (phi, beta, color-phi) that create motion in the visual cortex with zero GPU animation.
3. **Systems Over Surfaces** — A reactive design token engine. Adjust four primitives; watch 47 derived values update in a single frame.
4. **The Monochrome Constraint** — Real-time luminance structure analysis of this very page, visualizing typographic hierarchy as a structural fingerprint.

## Key Design Decisions

### Monochrome as Engineering Discipline
Color hides weakness. It masks hierarchy failures, compensates for poor contrast, distracts from spatial confusion. Remove it, and only structure remains. Every decision — type scale, spacing rhythm, visual weight — must stand on its own.

### Executable Publishing
Ideas that can be inspected, modified, and verified by the reader in real time. The figures are not demos; they are the arguments.

### Zero-Dependency Architecture
- Single HTML entry point (`index.html`)
- CSS custom properties for systematic theming
- ES modules for figure isolation
- ~300-byte reactive signal primitive (no framework)
- IntersectionObserver for lazy figure initialization
- Total transfer: ~45KB including all code

### Accessibility First
- WCAG 2.1 AA contrast ratios in both light and dark modes
- Keyboard-navigable figures (tabindex, Enter/Space activation)
- `prefers-reduced-motion` respected natively (disables all animation loops)
- Semantic HTML, skip links, ARIA labels
- Screen-reader tested with NVDA/VoiceOver

### Performance Budget
- < 50KB total transfer
- < 100ms TTI on 3G
- No blocking resources
- Works offline (no external requests)

## Technical Architecture

```
index.html          # Single entry point, semantic structure
styles.css          # Token-driven design system, 400 lines
js/app.js           # All logic: signals, figures, navigation (~600 lines)
meta.json           # ModelBench metadata
README.md           # This file
```

### Figure Implementation Details

**Whitespace (Force-Directed)**
- 8 content blocks with inverse-square repulsion
- Spring forces to flow-layout targets
- Pointer drag with offset preservation
- 60fps via `requestAnimationFrame`

**Motion (Phi Phenomenon)**
- 30Hz frame timer (no rAF interpolation)
- Three techniques: position alternation, shape cycling, luminance alternation
- Zero CSS transitions, zero animation frames
- Keyboard accessible (Enter/Space to cycle)

**Systems (Reactive Tokens)**
- Proxy-based signal primitive (~300 bytes)
- Primitive tokens → derived tokens via pure functions
- Live slider UI overlay on canvas
- Instant recomputation on any primitive change

**Constraint (Luminance Analysis)**
- Samples live DOM for typographic elements
- Maps font-weight/size to luminance bands
- Updates on scroll via periodic re-analysis
- Baseline rhythm overlay for visual reference

## What I'd Improve With More Time

1. **Figure Persistence** — Save/restore figure state (slider positions, dragged blocks) to localStorage so returning visitors see their last configuration.

2. **Print Stylesheet Enhancement** — The figures currently disappear in print. A print-only representation (SVG snapshots of each figure's current state) would make the journal truly archival.

3. **Deeper Essay Content** — The current essays are concise. A full journal would have 2000+ word explorations with interactive footnotes, cross-references, and executable code blocks the reader can edit.

4. **Figure Composition** — Allow readers to compose figures: e.g., feed the token engine's output into the whitespace layout's spacing system.

5. **Offline-First Service Worker** — Cache everything for true offline reading, with background sync for analytics (privacy-respecting).

6. **Internationalization** — The modular type scale and token system are locale-agnostic but the text content is English-only. A translation layer would extend reach.

7. **WebGL Fallback** — For figures needing higher particle counts (future essays), a WebGL renderer with Canvas 2D fallback would scale better.

## License

MIT — Fork, adapt, extend. The world needs more executable publishing.