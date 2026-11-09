# 05 · Project Workspace

## Run parameters

Replace these placeholders with the exact values supplied for this run. They must match the output folder and metadata exactly.

- MODEL_SLUG: MODEL_SLUG
- RUN_DATE: RUN_DATE
- VERSION: VERSION

Do not guess missing run parameters. If any value has not been supplied, ask the organiser before creating files.

## The challenge

Invent and build a focused workspace that helps people organise and move meaningful work forward. Choose the workflow, intended user, information model, visual identity and interface structure. The product should feel like one coherent tool, not a generic dashboard with disconnected sample widgets.

## What the build must deliver

1. Seed at least three projects or work areas and fifteen meaningful work items. Choose the fields that fit your workflow, such as status, priority, owner, dates, tags or dependencies.
2. Provide at least three genuinely useful views of the same underlying data, including a board-style view, a structured table and a calendar or timeline. Changes in one view must appear in the others.
3. Implement create, view, edit and delete actions for core records. Support status changes by drag-and-drop and provide an accessible keyboard alternative.
4. Add composable search and filters, clear empty states, sensible sorting and useful detail views.
5. Record an activity history for important changes. Make it clear what changed and when within the local session or persisted history.
6. Persist workspace data locally and support validated JSON export and import. Invalid imports must be rejected without destroying the current workspace.

## Quality bar

Make the result feel like a finished, intentionally designed product. Make strong creative and technical decisions independently; do not ask the organiser to choose the concept, visual direction, content, mechanics or implementation. Use a distinctive identity and a consistent visual language. Prioritise clarity, responsiveness, satisfying interaction and meaningful detail over decorative complexity.

Every visible control must work. Every important interaction must create a real state change and give appropriate feedback. Avoid placeholder sections, dead buttons, fake charts, non-functional menus, empty world geometry and features that only look interactive. A smaller coherent experience is better than a large collection of unfinished systems.

## Acceptance checklist

- [ ] The seeded workspace contains at least three projects or work areas and fifteen work items.
- [ ] Core records can be created, edited, viewed and deleted.
- [ ] Board, table and calendar/timeline views stay synchronized.
- [ ] Drag actions have an accessible keyboard alternative.
- [ ] Search, filters, sorting and activity history operate on real workspace data.
- [ ] JSON export/import round-trips correctly and invalid imports preserve existing data.

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

**workspace__MODEL_SLUG__RUN_DATE__vVERSION**

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact values for this run:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "workspace",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "05",
  "prompt_label": "Project Workspace",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder and metadata must use the exact run parameters. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in meta.json.

When finished, report only the project folder path and an honest test status.
