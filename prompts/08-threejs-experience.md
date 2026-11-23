# 08 · Three.js 3D Experience

## Automatic run identity — never ask the organiser or user

Resolve the run metadata yourself before creating files. Do not ask the user or organiser for model, date, version, category, project title or creative direction.

1. **MODEL_SLUG:** Identify the model actually executing this prompt from the active system/runtime model identifier. Prefer the exact identifier including its variant; otherwise use the public model name exposed by the environment. If provider-qualified, keep the model portion after the final slash. Lowercase it, replace spaces, underscores and other non-alphanumeric characters with hyphens, retain letters, digits, dots and hyphens, collapse repeated hyphens and trim punctuation. Never invent a model identity. If no identity is exposed, use `unknown-model` and disclose that in metadata notes.
2. **RUN_DATE:** Use the current calendar date supplied by system/runtime context in `YYYY-MM-DD` format. If unavailable, use the current UTC date from the runtime. Never use the prompt edit date or a file timestamp.
3. **VERSION:** Always use the integer `1`. Never ask, infer, increment or substitute another value.

Use the resolved values in both the output folder and `meta.json`. Do not pause for confirmation and do not leave placeholders in the finished files.

## The brief

Create an original interactive 3D experience that runs directly in a modern web browser. The subject and concept are entirely yours: an explorable environment, interactive installation, abstract world, visual experiment, product scene or something we have not seen before.

Requirements:
- Use Three.js as the primary 3D rendering technology. Load exactly pinned Three.js version 0.160.0 from a CDN; do not use an unpinned URL or additional libraries.
- Build a genuine 3D scene using geometry, materials, lighting, camera and spatial composition. Do not substitute a video, pre-rendered animation or static screenshot.
- Include meaningful interaction with the 3D scene and a clear way to understand and control it.
- Include animation or procedural behaviour that contributes to the experience.
- Implement responsive rendering, resize handling and sensible device-pixel-ratio limits.
- Provide usable desktop and mobile controls. Custom camera controls are acceptable; if you add controls, they must work reliably.
- Optimise draw calls, geometry, textures and animation work. Avoid unnecessary allocations in the render loop.
- Detect WebGL or WebGLRenderer failure and provide a deliberate fallback message or non-WebGL presentation.
- Keep all authored HTML, CSS, JavaScript and assets in the submission folder. No build step or package installation.
- Respect reduced-motion preferences and provide accessible labels and instructions for non-visual controls.

The concept, world, art direction, camera language, interactions and content are yours. Technical ambition is welcome, but a smaller coherent experience beats an impressive scene that cannot be explored.

## Completion standard

Deliver a complete, coherent, working experience. Every visible control must do what it says. Do not use placeholder copy, fake functionality, dead links or unfinished panels. Review the implementation for runtime errors, responsive problems, keyboard issues and edge cases before submission. Be honest in the metadata notes about anything that remains incomplete.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**threejs-experience__MODEL_SLUG__RUN_DATE__v1**

Replace the model and date tokens using the rules above. The suffix is always `v1`.

At the folder root include **index.html** and **meta.json**. Include local source files and an `assets/` directory only when required by the finished project. Keep everything for this single project inside that folder.

Do not create alternate concepts, multiple versions, additional HTML entry points, README/audit files, screenshots, dependency folders, package files or build output. Do not create files outside the project folder. Do not paste source code into chat.

The metadata file must contain this structure, with your resolved model slug and date and the fixed integer version 1:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "threejs-experience",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "08",
  "prompt_label": "Three.js 3D Experience",
  "notes": "A concise, honest description of the completed project and any known limitations."
}
~~~

Replace both tokens. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. ZIP filenames are not routing keys. Do not include scores or self-awarded evaluations in metadata.

When finished, report only the project folder path and an honest test status.
