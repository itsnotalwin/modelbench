# 10 · Browser Music Studio

## Run parameters

Replace these placeholders with the exact values supplied for this run. They must match the output folder and metadata exactly.

- MODEL_SLUG: MODEL_SLUG
- RUN_DATE: RUN_DATE
- VERSION: VERSION

Do not guess missing run parameters. If any value has not been supplied, ask the organiser before creating files.

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

**music__MODEL_SLUG__RUN_DATE__vVERSION**

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact values for this run:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "music",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "10",
  "prompt_label": "Browser Music Studio",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder and metadata must use the exact run parameters. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in meta.json.

When finished, report only the project folder path and an honest test status.
