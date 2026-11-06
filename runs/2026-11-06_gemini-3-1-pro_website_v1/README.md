# SENSITOMETRY & SILVER — Monograph No. 04: The 256-Step Scale

**Folder:** `2026-11-06_gemini-3-1-pro_website_v1`  
**Deployment:** Zero-dependency static HTML/CSS/JS — opens directly via `file://` or from any GitHub Pages repository subpath with no build step.

---

## Concept

**Sensitometry & Silver (Monograph No. 04)** is an interactive typographic and optical exhibition dedicated to the physics, photochemistry, and perceptual psychophysics of achromatic light. Rather than treating monochrome as a mere absence of color, the site turns pure neutral luminance (`0x00` to `0xFF`, `0.00 logD` to `3.20 logD`) into both its editorial subject and its interactive instrument:

1. **I. Achromatic Spectrum & 11-Zone Step-Wedge:** A live client-side slit-scan interferometer canvas paired with an interactive Ansel Adams / Minor White 11-Zone step-wedge (`Zone 0` through `Zone X`) reporting real-time reflectance percentage, optical density (`logD`), exposure offset (`EV`), and 8-bit hexadecimal value.
2. **II. The Exhibition Contact Sheet (08 Procedural Plates):** Eight large-format and scientific monochrome plates synthesized deterministically in JavaScript using ridged multifractals, fractional Brownian motion, Voronoi cellular fractures, Fresnel caustic optics, Moiré diffraction rulings, and stroboscopic harmonic equations. Clicking any plate opens an inspection lightbox with a **2.6× optical grain loupe**, live pixel-computed **luminance histogram**, **Hurter–Driffield transfer curve**, and one-click **PNG export**.
3. **III. Darkroom Enlarger & Camera-Less Photogram Tray:** A wet-bench simulator allowing users to adjust Multigrade paper contrast (`Grade 00` to `Grade 5`), enlarger exposure time, edge burn vignette, silver halide grain clumping, and 1-bit halftone screening engines—or switch to unexposed silver-gelatin paper to expose camera-less photograms directly with collimated light tools and develop them in a simulated Dektol tray.
4. **IV. The Mathematics of Grey:** Three interactive psychophysics and halftone experiments covering Weber–Fechner perceptual gamma (`γ = 2.2`) vs. linear radiance quantization (`8-bit` down to `1-bit`), an 11-Zone physical surface material atlas, and a `2×` nearest-neighbor pixel microscope comparing Floyd–Steinberg error diffusion, Bayer `8×8` ordered dithering, and `45°` crossline halftone screens.
5. **V. Chronology of Achromatic Light (1839–2012):** A filterable historical lineage spanning Daguerre/Talbot photochemistry, Hurter & Driffield sensitometry, Ives crossline screens, Man Ray rayographs, the Zone System, Floyd–Steinberg dithering, and filterless monochrome CMOS sensors.

---

## Key Design & Technical Decisions

- **Strictly Neutral Monochrome (`R === G === B` Everywhere):** Every CSS custom property, border, shadow, range input thumb/track, focus outline, SVG telemetry curve, inline SVG favicon, and `<canvas>` pixel buffer uses pure neutral grayscale values across both **Archival Baryta Paper** (`#FFFFFF` ground / `#0A0A0A` ink) and **Darkroom Obsidian** (`#080808` ground / `#F5F5F5` ink) polarities.
- **Zero External Dependencies & `file://` Compatibility:** System editorial serif, geometric sans, and `tabular-nums` monospace stacks eliminate network latency, font flash, and external asset failures. Classic deferred `<script src="js/app.js" defer>` wrapped in an IIFE avoids ES-module `file://` CORS restrictions while keeping relative paths (`styles.css`, `js/app.js`) portable across GitHub Pages subpaths.
- **Cached Raw Exposure Buffers (`Float32Array`):** Procedural plates are synthesized once into normalized `0.0–1.0` floating-point exposure buffers and cached per resolution. Subsequent Hurter–Driffield sigmoid contrast adjustments, EV shifts, grain synthesis, and 1-bit dithering passes run directly over typed arrays in real time.
- **Accessibility & Reduced Motion:** Includes a skip link, semantic landmarks, `aria-live` sensitometric readouts, focus-trapped modal dialogs (`Escape` dismissal and focus restoration), full keyboard navigation for the 11-Zone step-wedge, 2.6× optical loupe, and photogram light-painting canvas, plus full support for `@media (prefers-reduced-motion: reduce)` and a manual `Field: Live / Static` toggle.

---

## What I Would Improve With More Time

1. **Web Worker Offloading for Ultra-High-Resolution Exports:** Moving `generatePlateBuffer` and Floyd–Steinberg error diffusion into a Blob-based inline Web Worker would allow `2400×1800` or `4000×3000` archival print exports without blocking the main UI thread.
2. **Split-Grade Dodge & Burn Brush Masks on Existing Negatives:** Extending the photogram brush canvas into a full local dodge/burn exposure mask layer (`±2.0 EV` regional brushes) over any of the 8 exhibition negatives, with before/after split-curtain comparison.
3. **Custom ICC / Baryta Paper Base & Selenium Split-Curve Presets:** Adding historical paper emulsions (e.g., *Ilford Multigrade FB Classic*, *Kodak Azo Contact Paper*, *Agfa Brovira*) with authentic toe/shoulder asymmetry and D-max ceiling limits.
