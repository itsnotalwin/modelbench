# 10 · Browser Music Studio

## Automatic run identity — Never ask the organiser for these values

Resolve these three values yourself before creating the project. Never ask the organiser or user for MODEL_SLUG, RUN_DATE or VERSION. They are run metadata, not questions or creative choices.

1. **MODEL_SLUG:** Identify the model that is actually executing this prompt from the active system/runtime model identifier. Prefer the exact model identifier, including its variant, when exposed; otherwise use the public model name supplied by the environment. If it is provider-qualified (for example, `provider/model-name`), keep the model portion. Convert it to lowercase and replace spaces, underscores and other characters with hyphens; retain only letters, digits, dots and hyphens, collapse repeated hyphens and remove leading/trailing punctuation. Do not use the benchmark category, prompt title, organiser's name or an assumed model. If the runtime exposes no model identity at all, use `unknown-model` and disclose that limitation briefly in `meta.json` notes rather than inventing an identity.
2. **RUN_DATE:** Use the current calendar date supplied by your system/runtime context, formatted as `YYYY-MM-DD`. If that context does not provide a date, use the current UTC calendar date from the runtime. Do not use the prompt's edit date or a file timestamp.
3. **VERSION:** Always use the integer `1`. This is fixed. Never ask, infer, increment or substitute another version.

Use the resolved values consistently in the output folder and `meta.json`. Do not pause for confirmation and do not leave literal placeholders in the finished files.

## The challenge

Design and build one browser-based music-making instrument or workstation. You choose the musical approach, workflow, interface, visual language and sonic identity. It could centre on performance, sequencing, composition or an original hybrid. The result should feel like an instrument someone can explore and control, not a grid of buttons that emits unrelated beeps.

## What the build must deliver

1. Generate sound in the browser using the Web Audio API. Do not use copyrighted songs, commercial samples, remote audio files or unlicensed sound libraries.
2. Provide at least four independently controllable sound sources, voices or layers with recognisably different timbres or roles.
3. Create a clear way to perform or arrange music. Choose controls suitable for the concept, such as a keyboard, sequencer, timeline, pads or another coherent interaction model.
4. Implement meaningful musical controls such as tempo, pitch, scale, envelope, effects, rhythm, dynamics or modulation as appropriate. Each visible control must affect the sound or musical state.
5. Provide reliable transport or performance controls, immediate stop/silence, master level and protection against runaway volume or clipping. Audio must start only after a user gesture.
6. Persist useful project state locally and support validated project export/import plus a genuine audio export, such as WAV, that contains the current composition or performance.

## Quality bar

Make the result feel like a finished, intentionally designed product. Make strong creative and technical decisions independently; do not ask the organiser to choose the concept, visual direction, content, mechanics or implementation. Use a distinctive identity and a consistent visual language. Prioritise clarity, responsiveness, satisfying interaction and meaningful detail over decorative complexity.

Every visible control must work. Every important interaction must create a real state change and give appropriate feedback. Avoid placeholder sections, dead buttons, fake charts, non-functional menus, empty world geometry and features that only look interactive. A smaller coherent experience is better than a large collection of unfinished systems.

## Acceptance checklist

- [ ] Audio is generated in the browser after a user gesture and never starts automatically.
- [ ] At least four sound sources or voices are independently controllable and meaningfully distinct.
- [ ] The chosen performance/composition workflow works end to end.
- [ ] Musical controls affect the sound or arrangement as described.
- [ ] Stop silences playback immediately and timing remains stable during sustained use.
- [ ] Projects round-trip and audio export contains valid, non-silent audio.

## Technical expectations

- Deliver a browser-first project that runs from its index.html entry point on a static host. Use an appropriate client-side implementation and include only dependencies that are genuinely needed.
- Do not require a backend, private API, secret key, build service or manual setup to demonstrate the core experience.
- Handle browser storage, invalid input, empty states, errors and reloads deliberately wherever relevant to the product.
- Use semantic structure, accessible labels, visible keyboard focus, sensible contrast, keyboard support and reduced-motion preferences.
- Make the experience responsive. Do not sacrifice core usability on smaller screens.
- Test the actual experience in a browser when possible. If browser testing is unavailable, perform a careful code-level smoke check and report that limitation honestly.
- Do not claim that something was tested unless it was actually tested.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**music__MODEL_SLUG__RUN_DATE__v1**

Before creating it, replace `MODEL_SLUG` and `RUN_DATE` using the automatic run-identity rules above. The suffix must always be `v1`.

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact automatically resolved model slug and date. Keep `version` as the JSON number `1`:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "music",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "10",
  "prompt_label": "Browser Music Studio",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

Replace the two metadata tokens with the values you resolved yourself. Do not ask the organiser for them and do not submit unresolved placeholder text. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in `meta.json`.

When finished, report only the project folder path and an honest test status.
