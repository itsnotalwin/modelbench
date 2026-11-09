# 13 · Interactive explainer — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `teach__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate interactive explainers**, each teaching one genuinely hard idea from mathematics, science or engineering, from first principles. Each is a different field and a different teaching device, and no two may share a diagram or a structure. You choose the topics. Do not ask questions and do not hedge. Decide and build in one pass. A wall of text with one slider is the wrong answer.

**Ground rules (apply to all three)**
- Each file is one self-contained HTML file: HTML, CSS and JS inline. No external images, fonts, audio files or model files.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder. No server, no build step, no install.
- No placeholder text, TODOs, dead controls or unfinished sections.
- Allowed libraries: none. Everything is built with the platform: no CDN scripts, no web fonts, no image or audio files.

**What each file must do**
- One hard idea, explained from first principles, with the mathematics correct: state the equations, define every symbol, and keep units consistent.
- 3+ parameters that change a live result (a plot, a simulation, a diagram), with a reset and a 'surprise me' case.
- One worked example carried through with real numbers, and one limiting case where the idea breaks down.
- 5 quiz questions with explanations that teach, including one common misconception.
- Honest sources: cite works that exist, and label invented figures as illustrative. Never fabricate a citation.
- A 'why it matters' section with one concrete application, without hype.
- Notation set properly: real minus signs, proper fractions or MathML/SVG, and equations that scroll sideways on a phone instead of shrinking.

**Mobile-first and installable (mandatory, every file)**
- Design for a 390px-wide portrait phone first, then scale up to desktop. Touch is the primary input: every control is at least 44px, nothing depends on hover, and the first interaction works with one thumb.
- Works in portrait and landscape, handles `resize` and `orientationchange`, and respects `env(safe-area-inset-*)` so nothing hides behind a notch or the home bar.
- Fits the screen: use `100dvh`, no accidental page scrolling, and `touch-action` set on interactive canvases so pinch and double-tap do not zoom the page.
- Mobile specifics: equations and tables scroll sideways instead of shrinking, sliders are 44px tall with real thumb targets, and the quiz shows one question per screen.
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

- Do not create the manifest, service worker or icon files yourself. The file must still open and work from disk even when they are missing. Once installed, the app must run offline after its first load, so keep runtime network use to the CDN libraries this prompt allows.

**Delivery — naming is mandatory**
- File names are `teach__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per file: the idea, the teaching device, and one known limitation. Nothing else.
