# 03 · Complete Web Application

## Automatic run identity — never ask the organiser or user

Resolve the run metadata yourself before creating files. Do not ask the user or organiser for model, date, version, category, project title or creative direction.

1. **MODEL_SLUG:** Identify the model actually executing this prompt from the active system/runtime model identifier. Prefer the exact identifier including its variant; otherwise use the public model name exposed by the environment. If provider-qualified, keep the model portion after the final slash. Lowercase it, replace spaces, underscores and other non-alphanumeric characters with hyphens, retain letters, digits, dots and hyphens, collapse repeated hyphens and trim punctuation. Never invent a model identity. If no identity is exposed, use `unknown-model` and disclose that in metadata notes.
2. **RUN_DATE:** Use the current calendar date supplied by system/runtime context in `YYYY-MM-DD` format. If unavailable, use the current UTC date from the runtime. Never use the prompt edit date or a file timestamp.
3. **VERSION:** Always use the integer `1`. Never ask, infer, increment or substitute another value.

Use the resolved values in both the output folder and `meta.json`. Do not pause for confirmation and do not leave placeholders in the finished files.

## The challenge

Invent and ship a real application that removes a specific, believable friction from someone's working day. You choose the domain, the user, the data model and the feature set — but the product must be something a person could genuinely adopt, not a CRUD demo wearing a product hat.

Think like the person who has to use it every morning: what do they do first, what do they repeat, what would make them close the tab?

## Who you are building for — mobile first

Assume a real person opens this on a phone, one hand, half-engaged, on a patchy connection, and has never seen your work before. That person is the primary user; the desktop is the second screen.

- Design the phone layout first at 390 x 844, then scale up. Nothing may break at 320px; nothing may feel like a stretched phone at 1440px.
- Nothing important may live behind hover. Every action needs a touch path, tap targets at least 44 x 44px with breathing room between them, and gestures that do not fight the browser.
- Use dynamic viewport units (`100dvh`), respect safe-area insets, keep scrolling native, and never trap the page inside a fixed-height container.
- Type must be readable at arm's length without zooming: body text at least 16px, line lengths roughly 45-75 characters, contrast at WCAG AA or better in both light and dark contexts you create.
- Assume a mid-range Android rather than a workstation: keep the first load small, defer what is not needed, and stay smooth while scrolling and while animating.

## The bar

- At least three connected workflows that share real application state, in a coherent navigation model, so that work done in one place is visibly reflected everywhere else.
- Genuine data operations: create, read, update, delete, plus whatever the domain actually needs — reassignment, status transitions, bulk actions, duplication, archiving. Rules are enforced and illegal states are rejected with a clear reason.
- Search, filtering, sorting and saved views that stay in sync with the underlying data, and stay usable when the dataset gets large.
- A data layer with real thinking behind it: stable IDs, timestamps, versioning or history where it matters, `localStorage`/IndexedDB persistence with `try/catch` guards, migration or reset provided deliberately, and import/export of the user's data in a portable format.
- Every state designed, not just the happy path: empty, first-run, loading, partial, error, conflict, oversized input, and recovery. Inline validation with specific messages instead of generic red text.
- Speed and density done properly: keyboard shortcuts, a command palette or equivalent, undo for destructive actions, bulk selection, and a table or board that stays legible and fast.
- Onboarding that teaches the product by using it, sample data that demonstrates depth and is clearly editable or removable, and a README-free experience: the interface explains itself.

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

1. One folder, `index.html` opens cold, no console errors, data survives reload.
2. Three or more workflows sharing state, with real CRUD and enforced rules.
3. Search, filter, sort, and an import/export round-trip that works.
4. Empty, error and recovery states exist and are written in plain language.
5. Keyboard path through the core workflow; touch-friendly on a phone.
6. It would survive a week of real daily use without silent data loss.

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

**web-app__MODEL_SLUG__RUN_DATE__v1**

Replace the model and date tokens using the rules above. The suffix is always `v1`.

At the folder root include **index.html** and **meta.json**. Include local source files and an `assets/` directory only when required by the finished project. Keep everything for this single project inside that folder.

Do not create alternate concepts, multiple versions, additional HTML entry points, README/audit files, screenshots, dependency folders, package files or build output. Do not create files outside the project folder. Do not paste source code into chat.

The metadata file must contain this structure, with your resolved model slug and date and the fixed integer version 1:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "web-app",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "03",
  "prompt_label": "Complete Web Application",
  "notes": "A concise, honest description of the completed project and any known limitations."
}
~~~

Replace both tokens. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. ZIP filenames are not routing keys. Do not include scores or self-awarded evaluations in metadata.

When finished, report only the project folder path and an honest test status.
