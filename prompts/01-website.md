# 01 · Website — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `website__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate, complete websites**, each as its own single HTML file. Each one is about a different subject that you choose: a place, a product, a person, a movement, a company you invent, a festival, a museum, a tool, a research lab. No two may share a name, subject or visual identity. Avoid the generic SaaS or restaurant page.

**Ground rules (apply to all three)**
- You choose the names, look, tone and structure. Do not ask questions and do not hedge. Decide and build.
- Each file is self-contained: HTML, CSS and JS inline. No external images, audio, data or model files. System fonts only.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder. No server, no build, no install, no absolute paths.
- No lorem ipsum, placeholder text, TODOs or dead buttons.

**What each website must contain**
- At least 5 distinct sections or screens (hash routing is fine if you build pages).
- Real written copy with a point of view, not filler.
- An original identity: name, logo drawn in inline SVG, a deliberate colour system, a clear type hierarchy.
- At least 3 bespoke illustrations or diagrams drawn in SVG or CSS.
- One interactive element with real behaviour: a filter, a calculator, a configurator, a validated form, or a lightbox.
- Motion on scroll or hover that respects `prefers-reduced-motion`.
- A contact or signup form with validation and a success state.
- Working mobile navigation, semantic HTML, alt text, visible keyboard focus.
- No horizontal overflow at 390px or 1440px.

**Mobile-first and installable (mandatory, every file)**
- Design for a 390px-wide portrait phone first, then scale up to desktop. Touch is the primary input: every control is at least 44px, nothing depends on hover, and the first interaction works with one thumb.
- Works in portrait and landscape, handles `resize` and `orientationchange`, and respects `env(safe-area-inset-*)` so nothing hides behind a notch or the home bar.
- Fits the screen: use `100dvh`, no page scrolling in games and toys, and `touch-action` set on play areas so pinch and double-tap do not zoom the page.
- Mobile specifics for this test: a thumb-reachable navigation (a bottom bar, or a full-screen menu), sections that stack into one column, body text at least 16px, fluid SVG art, and no hover-only menus.
- The file must be installable as a Progressive Web App. The benchmark host places `manifest.webmanifest`, `sw.js` and `icons/` next to your file. Your file must reference them. Put exactly these lines in `<head>` (set `theme-color` to your own palette colour):

```html
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b0d12">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
```

  and this line just before `</body>`:

```html
<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});</script>
```

- Do not create the manifest, service worker or icon files yourself. The file must still open and work from disk even when they are missing. Once installed, the app must run offline after its first load, so keep runtime network use to the CDN libraries your prompt allows.

**Delivery — naming is mandatory**
- File names are `website__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per website: its subject, the key creative choice, and one known limitation. Nothing else.

---
