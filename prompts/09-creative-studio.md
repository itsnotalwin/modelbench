# 09 · Poster Foundry — Creative Production Studio

## Run parameters
Set these three values before starting the run. They must be the same values written into the output folder and metadata.

- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

If a value is still bracketed, stop and ask the organizer to fill it in. Do not invent the model identifier or date.

## The brief

Build **Poster Foundry**, a compact browser-based design studio for creating a strong typographic event poster. The user should be able to start with a blank canvas, add and arrange objects, refine a composition and export a real image. This is an editing tool, not a static poster pretending to be interactive.

The tool should ship with one attractive starter composition for a fictional event called **Night Market Radio**. The starter design is only a starting point; all included elements must be editable.

## Product requirements

1. Create a professional editor shell with a central canvas/artboard, a clear top toolbar, an object/layer panel and context-sensitive properties. On a phone, adapt into a touch-friendly editing layout rather than shrinking a desktop UI until it breaks.
2. Support adding, selecting, moving, resizing and rotating text objects and at least four vector shape types. Include fill and stroke controls, opacity and alignment/position controls.
3. Provide editable text properties: content, size, weight, alignment, line spacing and letter spacing. Use system fonts only; do not load remote fonts.
4. Implement a real layer list with visibility toggle, lock toggle, rename and reorder. Layer selection must match canvas selection.
5. Provide undo and redo for meaningful edit operations. Include keyboard shortcuts and clear feedback when an action cannot be undone.
6. Add alignment tools, snap guides or grid snapping, canvas zoom and pan, plus a safe reset-to-starter action.
7. Export the actual composition as SVG and PNG at the chosen output size. The export must include the current visible objects and omit hidden layers. Do not export a screenshot of the editor chrome.
8. Save the document locally across reloads. Provide a named save/load or JSON export/import path. Imported data must be validated before replacing the current document.
9. Include a useful starter design, at least two canvas sizes or aspect ratios, and sensible empty-selection states. Every visible tool must perform its advertised action.

## Quality bar

The editor should feel like a small but thoughtfully made creative product. Make direct manipulation pleasant, selection handles clear, controls visually calm and hierarchy obvious. Avoid the appearance of a generic admin dashboard. The starter poster should demonstrate strong type composition, spacing and shape rhythm while remaining easy to change.

Use inline SVG/canvas and vanilla JavaScript in one HTML file. No external drawing libraries, image services, fonts, backend or build step. Use accessible labels, keyboard alternatives for drag-only actions, visible focus and reduced-motion support. Protect against malformed imports and corrupted saved state.

## Acceptance checklist

Before finishing, verify that:
- Text and all supported shapes can be added, selected, transformed and styled.
- Canvas selection and layer-panel selection remain synchronized.
- Visibility, lock, rename and reorder work.
- Undo/redo restores the document accurately.
- Alignment/snapping and zoom/pan work without losing the artboard.
- SVG and PNG export match the current visible composition.
- Save/reload and JSON export/import round-trip the editable document.
- Invalid import is rejected without destroying the current document.
- The editor remains usable at desktop and phone widths.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**creative-studio__MODEL_SLUG__RUN_DATE__vVERSION**

At its root, put **index.html** and **meta.json**. Include **assets/** only if an essential runtime asset is required. Do not output multiple posters as separate products, three variants, additional HTML pages, README/audit files, screenshots, dependency folders or build output. The single starter poster belongs inside the editor as editable data. Create files in the workspace; do not paste source code into chat.

Use this valid UTF-8 metadata:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "creative-studio",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "09",
  "prompt_label": "Poster Foundry — Creative Production Studio",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder and metadata must use the exact run parameters. The organizer ZIPs the folder; ZIP filename is ignored. Test core editing and export flows in a browser if available. Otherwise perform and disclose a code-level smoke check. Report only folder path and honest test status.
