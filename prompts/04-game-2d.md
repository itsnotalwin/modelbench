# 04 · Original 2D game — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `game-2d__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate, complete 2D games**. Each one must stand on a core mechanic you invent — not a known genre with a twist, but a new verb. If a reviewer can finish the sentence "this is basically ___ with ___", the game has failed. You choose the mechanic, the theme, the art and the sound. Do not ask questions and do not hedge. Decide and build in one pass. Nostalgia is not originality: no shooter, no platformer, no falling-block puzzler, no snake, no endless runner, no tower defence.

**Ground rules (apply to all three)**
- Each file is one self-contained HTML file: HTML, CSS and JS inline. No external images, fonts, audio files or model files.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder. No server, no build step, no install.
- No placeholder text, TODOs, dead controls or unfinished sections.
- Allowed libraries: none. Everything is built with the platform: no CDN scripts, no web fonts, no image or audio files.

**What each file must do**
- A core mechanic you can state in one sentence, and that sentence appears on the title screen. It must be impossible to write that sentence about a game that already exists.
- 3+ systems that interact with the mechanic (a resource, a hazard, an upgrade, a timer, a spatial rule) so the game has depth, not only novelty. A player should find a second layer within 60 seconds.
- 5+ escalating stages or waves, each adding a rule rather than only speed.
- A real win state and a real lose state, score, a high score in `localStorage` (try/catch), pause, instant restart, and a run that lasts 60–240 seconds.
- Art direction of its own: all art in code (canvas, SVG or CSS), one deliberate palette, a consistent silhouette language, and a HUD that reads at a glance.
- Delta-time movement, stable 60fps, crisp at any pixel density, and no soft-locks: the player can always recover or restart.
- Controls taught in the first ten seconds by playing, not by a wall of text. Keyboard plus pointer or touch.

**Juice: mandatory, at least six per file, and each file uses a different mix**
Screen shake, hit-stop (a few frames of freeze on impact), squash-and-stretch, particle bursts, floating popups, a screen flash on key events, parallax layers, eased UI transitions, a combo or streak multiplier with escalating feedback, palette shifts as intensity rises, music or sound that reacts to play, trails or motion blur, and a celebratory moment on a win.

**Self-test**
Press `T` on the title screen. It should start the game, simulate about three seconds of play with fixed timesteps, force a win and a loss, and report pass or fail for each, with any exception shown.

**Mobile-first and installable (mandatory, every file)**
- Design for a 390px-wide portrait phone first, then scale up to desktop. Touch is the primary input: every control is at least 44px, nothing depends on hover, and the first interaction works with one thumb.
- Works in portrait and landscape, handles `resize` and `orientationchange`, and respects `env(safe-area-inset-*)` so nothing hides behind a notch or the home bar.
- Fits the screen: use `100dvh`, no accidental page scrolling, and `touch-action` set on interactive canvases so pinch and double-tap do not zoom the page.
- Mobile specifics: on-screen controls (a virtual stick or tap zones, at least 56px, in thumb reach and not covering the action), tap to start, and a play area that letterboxes cleanly in portrait and landscape.
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
- File names are `game-2d__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per file: its mechanic in one sentence, the systems built on it, and one known limitation. Nothing else.
