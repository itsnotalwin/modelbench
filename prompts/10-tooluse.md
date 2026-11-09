# 10 · Tool-calling playground — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `tooluse__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate tool-calling playgrounds**, each as its own single HTML file, in three different domains (for example travel, home inventory, a science or maths workbench, personal finance, a library). Each has **no network access** and **no real AI model**. In each one you design the agent: its tools, its planner and its executor. The point is to show, step by step, how a request turns into correct tool calls.

**Ground rules (apply to all three)**
- You choose the names, domains and look. Do not ask questions and do not hedge. Decide and build.
- Each file is one self-contained HTML file. No libraries, no external data. Any dataset you need is embedded in the file.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder.
- No placeholder text, TODOs or dead controls.

**What each playground must build**
1. **Tools.** At least **6 tools**, each with a name, a description, and a JSON-schema-style argument spec with types and required fields. Include a mix such as: a calculator, a unit or currency converter with embedded rates, date arithmetic, a searchable embedded dataset, a notes or task store with create, read, update and delete, and a mock API that can fail and return an error.
2. **Planner.** A deterministic planner you write (rules, a parser, or a small grammar). It turns natural-language requests into ordered tool calls. Include **at least 6 requests**, and at least two must need **3 or more chained calls**, where a later call uses the result of an earlier one.
3. **Executor.** Validates each call's arguments against its schema, rejects bad arguments with a clear message, retries a transient failure once, handles unknown tools, and never throws an uncaught error.
4. **Honest refusals.** A request the tools cannot answer gets an explicit refusal that names what is missing. The app never invents an answer.
5. **Trace panel.** For every step, show the request, the planned call, the validated arguments, the result or error, and the final answer, with a status for each step.
6. **Test suite.** At least **12 checks**, shown in a panel with pass or fail. Include valid calls, invalid arguments, a chained result, a failure with retry, an unknown tool, and an honest refusal.
7. **Extras.** A **Replay** button that re-runs the trace with a step delay. An **Export trace** button that downloads the trace as JSON.

**Quality bar**
- Layout, status indicators and keyboard use should feel like a real product.
- Correctness first: every answer shown must be right.

**Mobile-first and installable (mandatory, every file)**
- Design for a 390px-wide portrait phone first, then scale up to desktop. Touch is the primary input: every control is at least 44px, nothing depends on hover, and the first interaction works with one thumb.
- Works in portrait and landscape, handles `resize` and `orientationchange`, and respects `env(safe-area-inset-*)` so nothing hides behind a notch or the home bar.
- Fits the screen: use `100dvh`, no page scrolling in games and toys, and `touch-action` set on play areas so pinch and double-tap do not zoom the page.
- Mobile specifics for this test: a trace shown as a vertical timeline, requests typed into a large input with a send button, and tool details in a bottom sheet instead of a side panel.
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
- File names are `tooluse__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per playground: its domain, the key creative choice, and one known limitation. Nothing else.

---
