# 07 · Parallax Archive — Interactive 3D World

## Run parameters
Set these three values before starting the run. They must be the same values written into the output folder and metadata.

- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

If a value is still bracketed, stop and ask the organizer to fill it in. Do not invent the model identifier or date.

## The brief

Build **Parallax Archive**, one polished, interactive 3D exploration puzzle. The player is a survey drone inside a suspended archive of impossible objects. Each object looks ordinary from one angle and resolves into a meaningful symbol only when the camera is moved to the correct viewpoint. The player explores a small spatial world, discovers alignments and unlocks the archive.

The core experience must depend on actual 3D geometry, depth, perspective and camera movement. A 2D illustration with a zoom slider is not an acceptable substitute.

## Product requirements

1. Build one coherent 3D scene with a clear visual identity, designed composition, lighting, materials, atmosphere and readable interaction cues. Generate all geometry procedurally. Do not use external model, texture, HDRI or image files.
2. Use Three.js **0.160.0** as the only external library, loaded from its pinned jsDelivr ES module URL. Do not use other frameworks, libraries or remote assets. The page must run when deployed on GitHub Pages; local file execution is not required for this module-based task.
3. Implement camera orbit, zoom and reset controls. Pointer drag and touch gestures must work without hijacking browser page navigation. Provide a keyboard alternative for rotating the camera and selecting objects.
4. Create at least four distinct archive objects or puzzle stations. Each station must use a different spatial relationship, projection or alignment idea. The player must be able to inspect an object, discover the target alignment and receive clear success feedback.
5. Include a clear objective, a short tutorial, progress indicators, a resettable puzzle state and a completion sequence. The player must understand why each station is solved.
6. Add a useful information panel for the selected object, including its clue and current puzzle state. Make selection work with pointer and keyboard.
7. Handle window resizing, device-pixel ratio, lost WebGL context or renderer failure gracefully. Include an honest fallback message if WebGL is unavailable.
8. Keep rendering efficient. Avoid unbounded object creation, runaway animation loops, excessive shadows or expensive post-processing.

## Quality bar

This should feel like a small art-directed 3D world, not a library demo. The silhouette, material language, camera behavior, lighting and puzzle logic should reinforce one idea. Give the user a satisfying sense of depth and discovery. Do not fill empty space with random primitives or decorative particles without purpose.

Provide clear controls, keyboard focus, readable text panels, reduced-motion support and touch-friendly controls. Do not claim a station is solved unless its spatial condition has actually been reached.

## Acceptance checklist

Before finishing, verify that:
- The scene contains actual 3D geometry and a functioning perspective camera.
- Orbit, zoom, reset, selection and responsive resizing work.
- All four stations have distinct, solvable spatial challenges.
- Puzzle state and completion progress update only after a valid alignment.
- Keyboard and touch alternatives are available.
- Renderer failure is handled visibly rather than leaving a blank page.
- The scene remains performant and usable on a typical desktop and phone.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**game-3d__MODEL_SLUG__RUN_DATE__vVERSION**

Put **index.html** and **meta.json** at the folder root. Add **assets/** only if an essential local runtime asset is needed; all scene geometry and materials should be generated in code. Do not create multiple worlds, three variants, extra pages, README/audit files, screenshots, dependency folders or build output. Do not paste source code into chat.

Use this valid UTF-8 metadata:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-3d",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "07",
  "prompt_label": "Parallax Archive — Interactive 3D World",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

Use the exact run parameters in both places. The organizer ZIPs this folder; the ZIP filename is ignored for routing. Test on GitHub Pages or a local HTTP server if available. If you cannot launch it, perform a code-level check and disclose the limitation. Report only folder path and honest test status.
