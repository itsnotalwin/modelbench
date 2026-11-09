# 02 · Useful app — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `webapp__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate, complete web apps**, each as its own single HTML file. Each app is a tool a real person would open every day, in a different domain. Avoid the obvious todo list. For inspiration only, not to copy: a music step sequencer, a recipe planner that rescales quantities, a flashcard spaced-repetition trainer, a kanban board with dependencies, a budget tool with charts, a markdown notebook with backlinks, a route and timetable planner, a habit tracker with streak logic. The three apps must be in three different domains.

**Ground rules (apply to all three)**
- You choose the names, domains, looks and data models. Do not ask questions and do not hedge. Decide and build.
- Each file is self-contained: HTML, CSS and JS inline. A CDN library is allowed only at an exact pinned version, and only if you need it.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder. No server, no build, no install.
- No placeholder text, TODOs or dead buttons.

**What each app must do**
- At least 3 core workflows that work end to end.
- Realistic seeded example data on first open, so the app is never empty. Include an empty-state design for when the user clears it.
- Create, edit and delete on the main entities, with undo for destructive actions.
- Search, plus at least two filters or sort modes.
- State persisted in `localStorage`, wrapped in `try/catch`, plus JSON export and import with validation.
- Keyboard shortcuts, and a shortcut help overlay (press `?`).
- Error messages written for a human, never raw exceptions.
- Responsive from 360px to 1440px.
- A **Run checks** button in a settings or about panel that tests the app's core logic and shows at least 10 named checks with pass or fail. All must pass.

**Mobile-first and installable (mandatory, every file)**
- Design for a 390px-wide portrait phone first, then scale up to desktop. Touch is the primary input: every control is at least 44px, nothing depends on hover, and the first interaction works with one thumb.
- Works in portrait and landscape, handles `resize` and `orientationchange`, and respects `env(safe-area-inset-*)` so nothing hides behind a notch or the home bar.
- Fits the screen: use `100dvh`, no page scrolling in games and toys, and `touch-action` set on play areas so pinch and double-tap do not zoom the page.
- Mobile specifics for this test: a bottom tab bar for the main views, swipe-to-delete with an undo toast, form fields using the right input types (date, number, email) so the phone keyboard fits, and no keyboard-only shortcut as the only way to do something.
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
- File names are `webapp__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per app: its domain, the key creative choice, and one known limitation. Nothing else.

---
