# 04 · Original 2D Game

## Automatic run identity — never ask the organiser or user

Resolve the run metadata yourself before creating files. Do not ask the user or organiser for model, date, version, category, project title or creative direction.

1. **MODEL_SLUG:** Identify the model actually executing this prompt from the active system/runtime model identifier. Prefer the exact identifier including its variant; otherwise use the public model name exposed by the environment. If provider-qualified, keep the model portion after the final slash. Lowercase it, replace spaces, underscores and other non-alphanumeric characters with hyphens, retain letters, digits, dots and hyphens, collapse repeated hyphens and trim punctuation. Never invent a model identity. If no identity is exposed, use `unknown-model` and disclose that in metadata notes.
2. **RUN_DATE:** Use the current calendar date supplied by system/runtime context in `YYYY-MM-DD` format. If unavailable, use the current UTC date from the runtime. Never use the prompt edit date or a file timestamp.
3. **VERSION:** Always use the integer `1`. Never ask, infer, increment or substitute another value.

Use the resolved values in both the output folder and `meta.json`. Do not pause for confirmation and do not leave placeholders in the finished files.

## The challenge

Design and build one complete original 2D game. You choose the genre and subgenre, premise, setting, tone, art style, perspective, controls, mechanics, content structure and progression — all of it is yours. Any game genre is valid. Puzzle, platformer, shooter, tactics, racing, rhythm, management, roguelike, sports, survival, narrative, or something without a name yet — all are welcome. Do not default to puzzles, do not default to the obvious, and do not present options: choose one direction and commit to it completely.

The game must be playable within ten seconds of opening it, understandable without a manual, and worth a second run.

## Who you are building for — mobile first

Assume a real person opens this on a phone, one hand, half-engaged, on a patchy connection, and has never seen your work before. That person is the primary user; the desktop is the second screen.

- Design the phone layout first at 390 x 844, then scale up. Nothing may break at 320px; nothing may feel like a stretched phone at 1440px.
- Nothing important may live behind hover. Every action needs a touch path, tap targets at least 44 x 44px with breathing room between them, and gestures that do not fight the browser.
- Use dynamic viewport units (`100dvh`), respect safe-area insets, keep scrolling native, and never trap the page inside a fixed-height container.
- Type must be readable at arm's length without zooming: body text at least 16px, line lengths roughly 45-75 characters, contrast at WCAG AA or better in both light and dark contexts you create.
- Assume a mid-range Android rather than a workstation: keep the first load small, defer what is not needed, and stay smooth while scrolling and while animating.

## The bar

- A complete loop: a title or attract state, teaching that happens by playing, a core activity with real decisions, escalation that changes how you play, a fail or win state, and an instant restart. One run should feel finished, not truncated.
- Mechanics that are actually simulated: movement with weight and acceleration, collision that never tunnels or snags, deterministic timing, delta-time everywhere, and rules the player can learn and exploit.
- Game feel as a feature: hit-stop, easing, screen shake used with restraint, particles, squash and stretch, transitional animation, and audio feedback on every meaningful event. Synthesised sound is enough; silence is not.
- Authored content and a coherent identity: a palette, a typeface or lettering treatment, character or object design, and a world with a point of view. Procedural content is welcome but must be seeded and shaped, not random noise.
- Controls that suit the design: keyboard and pointer on desktop, real touch controls on phones (no "play on desktop" walls), and a pause that always works, including on tab blur.
- Persistence of what matters: best score, progress, settings, with storage guarded and a clear reset.

## Creative freedom — the concept is yours

We are scoring execution, not obedience. Choose the subject, the people, the tone, the structure, the visual language and the implementation yourself. Do not ask questions, do not offer a menu of options, do not wait for approval: commit to one strong direction and carry it all the way through.

Then avoid anything that smells templated: no stock hero-plus-three-cards landing page, no framework demo aesthetic, no lorem ipsum, no "your text here", no fake logos in a trust bar, no icon soup. Have a point of view, and hold it consistently across every screen, state and error message.

## Work like a studio — use everything your environment gives you

You are not writing an answer, you are shipping a product. Use every capability you actually have, in this order of preference:

- **Files.** Write real files to disk; never paste the deliverable into chat.
- **Shell.** If you have a terminal, use it: scaffold, count assets, serve the build locally, check total payload size.
- **Browser.** If you have a browser, devtools, a screenshot tool or automation, use them: load the real build, watch the console, click through every flow, resize to phone width, look at what renders, and fix what you see. A build you have not looked at is not finished.
- **Tooling.** If you have linters, formatters, type checkers or test runners, run them and fix what they report.
- **Generation.** If you can synthesise or generate assets — SVG, canvas, WebGL/shaders, procedural textures, fonts, audio, images, video — or optimise them, do it deliberately. Production-grade assets you made beat grey placeholder boxes every time.
- **Measurement.** If you can measure load time, layout shift, paint and frame rate, measure them, then improve the numbers you do not like.

Verify, fix, re-verify. Report only what you actually observed; if a capability was unavailable, say so plainly in the `meta.json` notes instead of implying a test you did not run.

## Acceptance — a reviewer will check

1. One folder, `index.html` plays cold in a current browser, no console errors.
2. The genre is model-chosen and coherent; the loop is complete and winnable or losable.
3. Collision, timing and controls are reliable; no soft-locks, no frame-rate dependence.
4. Feedback on every action: motion, particles, sound, UI response.
5. Touch controls genuinely playable at 390px, keyboard on desktop.
6. It is fun for at least five minutes, which is the whole point.

## Technical and delivery expectations

- One browser-first project that runs from `index.html` on static hosting — no server, build step, secret key, paid API, external account or manual setup for the core experience.
- Self-contained and portable: local assets, relative paths, works from a repository subfolder and, where the browser allows, from `file://`.
- No placeholder content, dead controls, fake interactions or console errors. Every visible control produces a real outcome.
- Accessible by default: semantic landmarks, labelled controls, visible focus, a keyboard path through every flow, reduced-motion support, and colour that never carries meaning alone.
- Every asset earns its bytes. State a payload budget for the first view and hold it.
- Robust under abuse: empty data, huge data, rapid input, interrupted storage, resized window, backgrounded tab, lost connection. Guard storage access with `try/catch` and never lose the user's work silently.
- Test the actual experience in a browser when available. Otherwise do a careful code-level smoke check and disclose the limitation honestly. Never claim a test you did not run.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**game-2d__MODEL_SLUG__RUN_DATE__v1**

Replace the model and date tokens using the rules above. The suffix is always `v1`.

At the folder root include **index.html** and **meta.json**. Include local source files and an `assets/` directory only when required by the finished project. Keep everything for this single project inside that folder.

Do not create alternate concepts, multiple versions, additional HTML entry points, README/audit files, screenshots, dependency folders, package files or build output. Do not create files outside the project folder. Do not paste source code into chat.

The metadata file must contain this structure, with your resolved model slug and date and the fixed integer version 1:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-2d",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "04",
  "prompt_label": "Original 2D Game",
  "notes": "A concise, honest description of the completed project and any known limitations."
}
~~~

Replace both tokens. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. ZIP filenames are not routing keys. Do not include scores or self-awarded evaluations in metadata.

When finished, report only the project folder path and an honest test status.
