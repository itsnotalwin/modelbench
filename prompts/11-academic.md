# 11 · Academic explainer — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `academic__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate interactive explainers**, each as its own single HTML file. Each explainer teaches **one topic you choose**, at graduate or advanced undergraduate level, and the three topics must come from different fields. Examples of the kind of topic: a proof technique, a stochastic process, an information-theory result, a control-theory idea, an epidemiology model, a statistics concept that people misuse, a quantum or optics phenomenon, an economics or biology mechanism. Pick topics you understand well enough to teach accurately.

**Ground rules (apply to all three)**
- You choose the topics, titles and look. Do not ask questions and do not hedge. Decide and build.
- Each file is one self-contained HTML file. You may load MathJax or KaTeX from a CDN at an exact pinned version, or typeset the maths by hand.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder.
- No placeholder text, TODOs or dead controls.
- **Accuracy is part of the test.** A wrong equation, a wrong claim or an invented citation counts as a failed run.

**What each explainer must contain**
- A plain-language layer and a rigorous layer that the reader can switch between.
- The core mathematics, written correctly, with the assumptions stated.
- **At least 3 interactive visualisations** in which sliders or inputs change the result. An animation that only plays is not enough.
- A **worked example** with every step shown and explained.
- A **5-question quiz**, with answers hidden until submitted. Each wrong option gets an explanation of why it is wrong.
- A **common mistakes** section with at least 3 items.
- A **references** section. List only sources you are highly confident exist, with author, year and title. Mark any source you are unsure about as `unverified`. Do not invent DOIs or page numbers.
- A **What is still uncertain or contested** section. Be honest about open questions and the limits of the model.

**Mobile-first and installable (mandatory, every file)**
- Design for a 390px-wide portrait phone first, then scale up to desktop. Touch is the primary input: every control is at least 44px, nothing depends on hover, and the first interaction works with one thumb.
- Works in portrait and landscape, handles `resize` and `orientationchange`, and respects `env(safe-area-inset-*)` so nothing hides behind a notch or the home bar.
- Fits the screen: use `100dvh`, no page scrolling in games and toys, and `touch-action` set on play areas so pinch and double-tap do not zoom the page.
- Mobile specifics for this test: equations that scroll sideways rather than overflowing, thumb-sized sliders, large tappable quiz options, and the plain/rigorous switch at the top of the page.
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
- File names are `academic__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per explainer: its topic, the key creative choice, and one known limitation. Nothing else.
