# 07 · Interactive Machine Explainer

## Automatic run identity — never ask the organiser or user

Resolve the run metadata yourself before creating files. Do not ask the user or organiser for model, date, version, category, project title or creative direction.

1. **MODEL_SLUG:** Identify the model actually executing this prompt from the active system/runtime model identifier. Prefer the exact identifier including its variant; otherwise use the public model name exposed by the environment. If provider-qualified, keep the model portion after the final slash. Lowercase it, replace spaces, underscores and other non-alphanumeric characters with hyphens, retain letters, digits, dots and hyphens, collapse repeated hyphens and trim punctuation. Never invent a model identity. If no identity is exposed, use `unknown-model` and disclose that in metadata notes.
2. **RUN_DATE:** Use the current calendar date supplied by system/runtime context in `YYYY-MM-DD` format. If unavailable, use the current UTC date from the runtime. Never use the prompt edit date or a file timestamp.
3. **VERSION:** Always use the integer `1`. Never ask, infer, increment or substitute another value.

Use the resolved values in both the output folder and `meta.json`. Do not pause for confirmation and do not leave placeholders in the finished files.

## The challenge

Pick a real machine or physical system that can be understood by watching it work — an internal combustion engine, a mechanical watch movement, a jet turbine, a gearbox, a pump, a camera shutter, a loom, a pipe organ. You choose it. Then build the explainer you wish existed: one that makes the mechanism obvious in motion and is physically accurate enough that a knowledgeable engineer finds no errors.

## Build at the ceiling — design for the best result you are capable of

This is a benchmark, not a sprint for a small phone. Your primary canvas is a large, high-quality display: 1440-2560px wide, pointer and keyboard, a viewer with time and attention. Design the experience you would want to be judged on at that size, then make it hold together as the screen shrinks.

- Make the big screen sing: real composition, layered depth, confident typographic scale, motion that earns its place, and detail that rewards looking closely at 100% zoom.
- Do not optimise for the smallest possible payload or the lowest common denominator. Optimise for the best experience you can actually build and verify.
- Keyboard and pointer are first-class: shortcuts, hover and focus-visible states, precise input, real density.
- Responsive is a quality bar, not the design driver. Layouts must reflow cleanly at tablet and phone widths, touch targets must stay usable and nothing may overflow or clip — but the large-screen experience is the one you are showing off.
- Ambition that stutters is not ambition: keep interaction immediate and animation smooth on ordinary hardware, respect reduced motion, and hold WCAG AA contrast throughout.

## The bar

- One single source of truth for time and state. Every moving part, indicator, label and graph derives mathematically from it, with no independent timers drifting apart.
- A timeline you can actually drive: play, pause, step, scrub, speed, and a scrubber that shows where each phase begins.
- Inspection that teaches: click or hover any component to isolate it, dim the rest, and read a precise explanation of what it is doing at that exact instant.
- At least two live readouts derived from the same state — torque, pressure, flow, displacement, forces — plotted honestly, not decorative sparklines.
- A what-if mode: change a real parameter or break a component and watch the correct consequence unfold.
- Technical-illustration craft: cutaways, exploded views, materials that read as metal or glass, labels with leader lines that never collide, typography that stays out of the way.
- Motion that is physically plausible at every speed, including slow motion and single stepping.

## Creative freedom — the concept is yours

We are scoring execution, not obedience. Choose the subject, the people, the tone, the structure, the visual language and the implementation yourself. Do not ask questions, do not offer a menu of options, do not wait for approval: commit to one strong direction and carry it all the way through.

Then avoid anything that smells templated: no stock hero-plus-three-cards landing page, no framework demo aesthetic, no lorem ipsum, no "your text here", no fake logos in a trust bar, no icon soup. Have a point of view, and hold it consistently across every screen, state and error message.

## Use the maximum of your resources

Use the full capability of your environment, not a fraction of it. You have a serious budget of time, steps, context and tools; spend it on the artifact. The benchmark rewards the best thing you can produce, not the fastest or the smallest.

- Work at full scale: complete content, complete systems, complete polish. Not a vertical slice, not a prototype with the interesting part postponed.
- Use every tool you actually have — file writes, shell, local server, browser automation and screenshots, devtools and console, linters, type checkers and test runners, image/audio/video generation, shader tooling, font and asset pipelines, performance profiling. If it exists in your environment, it is fair game and it is expected.
- Generate your own assets instead of settling for placeholders: procedural textures, SVG illustration, custom shaders, synthesised audio, rendered frames, composited video.
- Be ambitious with content as well as code: more written material, more authored cases, more levels, more states, more edge cases handled properly.
- Iterate like a studio: build it, look at it in a real browser, write down what is weakest, fix the weakest thing first, repeat until what remains is something you would defend out loud.
- Never truncate or abbreviate: no stubs, no "rest unchanged", no TODOs, no half-built features left in the shipped folder.

Verify, fix, re-verify. Report only what you actually observed; if a capability was unavailable, say so plainly in the `meta.json` notes instead of implying a test you did not run.

## Acceptance — a reviewer will check

1. One folder, `index.html` opens cold, no server, no console errors.
2. Everything demonstrably derives from one state value; no desynchronised parts.
3. Timeline scrub, step and speed control all work and stay consistent.
4. Two or more live readouts that match the mechanism's real behaviour.
5. The what-if mode produces correct, explainable consequences.
6. An engineer in the domain would find no factual errors.

## Technical and delivery expectations

- One browser-first project that runs from `index.html` on static hosting — no server, build step, secret key, paid API, external account or manual setup for the core experience.
- Self-contained and portable: local assets, relative paths, works from a repository subfolder and, where the browser allows, from `file://`.
- No placeholder content, dead controls, fake interactions or console errors. Every visible control produces a real outcome.
- Accessible by default: semantic landmarks, labelled controls, visible focus, a keyboard path through every flow, reduced-motion support, and colour that never carries meaning alone.
- Performance is craft: profile the build, keep interaction immediate and animation smooth on an ordinary laptop, and be able to say what budget you held.
- Robust under abuse: empty data, huge data, rapid input, interrupted storage, resized window, backgrounded tab, lost connection. Guard storage access with `try/catch` and never lose the user's work silently.
- Test the actual experience in a browser when available. Otherwise do a careful code-level smoke check and disclose the limitation honestly. Never claim a test you did not run.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**explainer__MODEL_SLUG__RUN_DATE__v1**

Replace the model and date tokens using the rules above. The suffix is always `v1`.

At the folder root include **index.html** and **meta.json**. Include local source files and an `assets/` directory only when required by the finished project. Keep everything for this single project inside that folder.

Do not create alternate concepts, multiple versions, additional HTML entry points, README/audit files, screenshots, dependency folders, package files or build output. Do not create files outside the project folder. Do not paste source code into chat.

The metadata file must contain this structure, with your resolved model slug and date and the fixed integer version 1:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "explainer",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "07",
  "prompt_label": "Interactive Machine Explainer",
  "notes": "A concise, honest description of the completed project and any known limitations."
}
~~~

Replace both tokens. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. ZIP filenames are not routing keys. Do not include scores or self-awarded evaluations in metadata.

When finished, report only the project folder path and an honest test status.
