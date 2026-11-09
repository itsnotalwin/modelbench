# 03 · Algorithms lab — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `codelab__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate, complete algorithms labs**, each as its own single HTML file. Each lab covers a different family of algorithms that you choose, for example: sorting and searching; graph algorithms; dynamic programming; string matching; computational geometry; scheduling; compression; probability and sampling; numerical methods. The three families must be different. In each lab, implement **at least six algorithms from scratch** in plain JavaScript. Do not call a built-in that does the work for you (for example `Array.prototype.sort` in a sorting lab).

**Ground rules (apply to all three)**
- You choose the names, theme and look. Do not ask questions and do not hedge. Decide and build.
- Each file is one self-contained HTML file with no external files and no libraries.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder.
- No placeholder text, TODOs or dead buttons.

**What each lab must do**
- For each algorithm: a visual, step-by-step animation driven by a step generator, with play, pause, step, speed and reset.
- A live input editor for each algorithm, so the user can type in their own data and watch it run.
- A complexity note per algorithm that is correct for the implementation shown.
- A test panel with **at least 30 assertions** against your implementations. Include edge cases: empty input, one element, duplicates, negative numbers, disconnected graphs, unreachable targets. Show pass or fail for each. For failures, show expected against actual.
- An editor pane (a textarea is fine) where the user can rewrite the body of one algorithm and re-run the tests. Run the edited code in a sandbox (`new Function` or a Web Worker) with a time limit, so a syntax error or infinite loop does not freeze or crash the page.
- A benchmark panel that times each algorithm on inputs of size 1,000, 10,000 and 100,000, labelled as measured on this machine.
- A short limitations list naming what your implementations do not handle.

**Mobile-first and installable (mandatory, every file)**
- Design for a 390px-wide portrait phone first, then scale up to desktop. Touch is the primary input: every control is at least 44px, nothing depends on hover, and the first interaction works with one thumb.
- Works in portrait and landscape, handles `resize` and `orientationchange`, and respects `env(safe-area-inset-*)` so nothing hides behind a notch or the home bar.
- Fits the screen: use `100dvh`, no page scrolling in games and toys, and `touch-action` set on play areas so pinch and double-tap do not zoom the page.
- Mobile specifics for this test: visualisations that scale to the screen, a code editor in a monospace textarea at a readable size with the run button in thumb reach, large step controls, and tests as a scrollable list.
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
- File names are `codelab__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per lab: its family, the key creative choice, and one known limitation. Nothing else.

---
