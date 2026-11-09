# 09 · Creative Design Studio

## Run parameters

Replace these placeholders with the exact values supplied for this run. They must match the output folder and metadata exactly.

- MODEL_SLUG: MODEL_SLUG
- RUN_DATE: RUN_DATE
- VERSION: VERSION

Do not guess missing run parameters. If any value has not been supplied, ask the organiser before creating files.

## The challenge

Invent and build a browser-based creative tool for making and editing one kind of visual composition. You choose the creative discipline, intended user, design language, canvas format, starter content and the editor's workflow. It must be a genuine working tool, not a showcase page with inert controls. The creative output and the interface should both demonstrate strong visual judgement.

## What the build must deliver

1. Provide a usable canvas or artboard with a coherent, editable document model. Support text and multiple visual object types or similarly meaningful editable elements appropriate to the chosen discipline.
2. Build a layer or object panel that stays synchronized with canvas selection. Support selection, visibility, locking, renaming, reordering and deletion where appropriate.
3. Implement practical transform and style controls, such as position, size, rotation, alignment, colour, typography or other controls relevant to the creative format.
4. Provide reliable undo and redo. Include zoom and pan or another practical way to work with the composition at different scales.
5. Persist the editable document locally and support validated project export/import. Provide a genuine final export in at least two useful formats, including SVG and PNG when the chosen output is vector-compatible.
6. Include one editable starter composition that demonstrates the tool without dictating the user's creative direction. It must be made from editable document elements, not a flattened image.

## Quality bar

Make the result feel like a finished, intentionally designed product. Make strong creative and technical decisions independently; do not ask the organiser to choose the concept, visual direction, content, mechanics or implementation. Use a distinctive identity and a consistent visual language. Prioritise clarity, responsiveness, satisfying interaction and meaningful detail over decorative complexity.

Every visible control must work. Every important interaction must create a real state change and give appropriate feedback. Avoid placeholder sections, dead buttons, fake charts, non-functional menus, empty world geometry and features that only look interactive. A smaller coherent experience is better than a large collection of unfinished systems.

## Acceptance checklist

- [ ] The editor opens into an actual editable document and not a static mockup.
- [ ] Canvas and layer/object selection remain synchronized.
- [ ] Core object creation, transformation and styling work.
- [ ] History accurately restores prior document states.
- [ ] Save/reload and project export/import preserve editability.
- [ ] Final exports contain the current composition and are usable files.

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

**creative-studio__MODEL_SLUG__RUN_DATE__vVERSION**

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact values for this run:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "creative-studio",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "09",
  "prompt_label": "Creative Design Studio",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder and metadata must use the exact run parameters. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in meta.json.

When finished, report only the project folder path and an honest test status.
