# 04 · Interactive Data Dashboard

## Run parameters

Replace these placeholders with the exact values supplied for this run. They must match the output folder and metadata exactly.

- MODEL_SLUG: MODEL_SLUG
- RUN_DATE: RUN_DATE
- VERSION: VERSION

Do not guess missing run parameters. If any value has not been supplied, ask the organiser before creating files.

## The challenge

Choose a domain with meaningful operational or analytical questions and build a polished interactive dashboard for it. Invent a coherent sample dataset and decide what a user needs to monitor, investigate and act on. The topic, metrics, labels, visual language and operational scenario are entirely yours. Make the data feel like one connected system rather than a collection of unrelated charts.

## What the build must deliver

1. Seed at least 24 internally consistent records with enough fields to support useful comparisons and filtering. Clearly identify the records as sample or simulated data.
2. Show a well-chosen set of summary KPIs. Their values must reconcile with the underlying records and update when the active filters or data change.
3. Include at least three charts or other visual analyses. They must derive from the same data model and respond correctly to relevant filters or selections.
4. Provide composable filters, search and useful drill-down into an individual record or grouped detail. Include empty, loading or error states where appropriate.
5. Add a deterministic event stream, live-style simulation or controlled data update mechanism that changes real application state. Users must be able to understand, pause or reset it.
6. Support export of the current relevant data to a valid CSV file. Give clear feedback and preserve useful user settings locally.

## Quality bar

Make the result feel like a finished, intentionally designed product. Make strong creative and technical decisions independently; do not ask the organiser to choose the concept, visual direction, content, mechanics or implementation. Use a distinctive identity and a consistent visual language. Prioritise clarity, responsiveness, satisfying interaction and meaningful detail over decorative complexity.

Every visible control must work. Every important interaction must create a real state change and give appropriate feedback. Avoid placeholder sections, dead buttons, fake charts, non-functional menus, empty world geometry and features that only look interactive. A smaller coherent experience is better than a large collection of unfinished systems.

## Acceptance checklist

- [ ] At least 24 coherent sample records are present and the data model is understandable.
- [ ] KPIs reconcile with records and active filters.
- [ ] Charts derive from the same data source and respond to user selections.
- [ ] Filters can be combined, cleared and used to reach useful drill-down details.
- [ ] The event simulation changes application state predictably and can be controlled.
- [ ] CSV export is valid and the dashboard remains legible at desktop and mobile sizes.

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

**dashboard__MODEL_SLUG__RUN_DATE__vVERSION**

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact values for this run:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "dashboard",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "04",
  "prompt_label": "Interactive Data Dashboard",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder and metadata must use the exact run parameters. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in meta.json.

When finished, report only the project folder path and an honest test status.
