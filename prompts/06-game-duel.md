# 06 · Two-player duel — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `game-duel__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate, complete two-player games** played on one device: split touch, a shared keyboard, or hot-seat turns. Each must rest on a mechanic you invent, and no two may share a name, a mechanic or a match shape. You choose the sport, the theme and the art. Do not ask questions and do not hedge. Decide and build in one pass. A Pong clone, a fighting-game clone or a quiz is the wrong answer.

**Ground rules (apply to all three)**
- Each file is one self-contained HTML file: HTML, CSS and JS inline. No external images, fonts, audio files or model files.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder. No server, no build step, no install.
- No placeholder text, TODOs, dead controls or unfinished sections.
- Allowed libraries: none. Everything is built with the platform: no CDN scripts, no web fonts, no image or audio files.

**What each file must do**
- A game for two players on one device, on an invented mechanic, with both players given the same information and the same controls.
- An AI opponent with 3 difficulty levels that obeys exactly the same rules and information as a human. No hidden stat boosts, no extra speed, no seeing through walls. Difficulty comes from search depth, reaction time or risk appetite, and you say which on screen.
- Balance you can show: with the AI on medium, a first-time player should win roughly half the matches. Keep a match history on screen that supports the claim.
- A best-of-5 match flow: round intro, score, rematch, and a winner screen worth reaching.
- 6+ juice effects, at least one of them on the losing side as well as the winning side.
- Delta-time movement, stable 60fps, pause, instant restart, and no soft-locks.

**Juice: mandatory, at least six per file, and each file uses a different mix**
Screen shake, hit-stop (a few frames of freeze on impact), squash-and-stretch, particle bursts, floating popups, a screen flash on key events, parallax layers, eased UI transitions, a combo or streak multiplier with escalating feedback, palette shifts as intensity rises, music or sound that reacts to play, trails or motion blur, and a celebratory moment on a win.

**Self-test**
Press `T` on the title screen. It should run AI versus AI for three rounds at each difficulty, and report illegal moves, stalls and timeouts, with any exception shown.

**Mobile-first and installable (mandatory, every file)**
- Design for a 390px-wide portrait phone first, then scale up to desktop. Touch is the primary input: every control is at least 44px, nothing depends on hover, and the first interaction works with one thumb.
- Works in portrait and landscape, handles `resize` and `orientationchange`, and respects `env(safe-area-inset-*)` so nothing hides behind a notch or the home bar.
- Fits the screen: use `100dvh`, no accidental page scrolling, and `touch-action` set on interactive canvases so pinch and double-tap do not zoom the page.
- Mobile specifics: two touch zones on one screen (or a hot-seat turn screen), each at least 72px, and no control that needs two hands on the same spot.
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
- File names are `game-duel__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per file: its mechanic, how the AI is fair, and one known limitation. Nothing else.
