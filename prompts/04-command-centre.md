# 04 · Operations Command Centre

## Run parameters
Set these three values before starting the run. They must be the same values written into the output folder and metadata.

- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

If a value is still bracketed, stop and ask the organizer to fill it in. Do not invent the model identifier or date.

## The brief

Build **Switchyard**, an operations command centre for a fictional regional delivery company. A shift manager uses it to answer four questions quickly: what is moving, what is late, where are problems clustering, and what should the team investigate next?

This is an operational tool, not a decorative dashboard. Supply a believable synthetic dataset in the application itself. Do not call external APIs or claim to show live real-world data.

## Product requirements

1. Create a clear desktop-first command-centre layout that still works on a 390px phone. Establish hierarchy between urgent exceptions, current operating metrics and supporting analysis. Avoid a wall of identical KPI cards.
2. Seed at least 24 distinct shipment records across at least four named regions and five status values. Each record must contain a stable ID, destination/region, created time or date, promised delivery time, current status, and a numeric service or order value. Use a single source of truth for all summaries and charts.
3. Show meaningful headline metrics: active shipments, delivered today, late shipments, on-time rate and total value in motion. Calculate them from the records. Include a clear “as of” timestamp that identifies the data as simulated.
4. Build at least three different visualisations, such as throughput over time, regional performance and status composition. All chart values must be calculated from the data, with labels, legends, tooltips or an accessible equivalent.
5. Add working filters for date window, region and status. Filters must compose. Selecting a chart segment or region should apply a matching filter and update the rest of the dashboard.
6. Selecting a shipment opens a useful detail panel with its timeline, current state, service target and available manager actions. Provide safe demo actions to advance an eligible shipment status, add an internal note and acknowledge an alert.
7. Create an exceptions panel with prioritised alerts and clear reasons. Alert counts and severity must follow the dataset and state; no hard-coded warning badges that contradict the records.
8. Add a “Simulate next hour” control that advances a deterministic, clearly labelled demo feed. New events must update KPIs, charts, alerts and shipment details from the same state. Include pause/reset controls.
9. Provide CSV export of the currently filtered records. Persist manager changes and simulation state locally across reloads. Include a reset-to-seed-data action.

## Quality bar

A real shift manager should understand the current situation in seconds and be able to investigate a specific problem without hunting through the page. Use disciplined information design, legible density, clear status language and restrained live-update motion. Design empty, loading, selected and alert states. Include a small explanation of how the synthetic metrics are calculated.

Use semantic HTML, accessible chart labels or tables, keyboard-accessible controls, visible focus, high contrast and reduced-motion support. Do not use external charts, remote fonts, fake network traffic or meaningless random numbers that change on every render.

## Acceptance checklist

Before finishing, verify that:
- All seeded shipments have valid, unique IDs and appear consistently across views.
- KPI totals reconcile with the underlying shipment records.
- Date, region and status filters compose and update all charts and lists.
- Chart selection drills into the corresponding records.
- Shipment detail actions update the same underlying state and produce a timestamped activity record.
- Simulation advances data coherently and can be paused/reset.
- CSV export contains the active filtered dataset and correct headers.
- Reload preserves local state; reset restores the original seed.
- The layout remains usable on desktop and phone with no page-level horizontal overflow.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**dashboard__MODEL_SLUG__RUN_DATE__vVERSION**

The folder contains **index.html**, **meta.json**, and only essential runtime files in **assets/** if required. Keep the app self-contained in one HTML file with inline CSS/JS. Do not generate multiple dashboards, three variants, extra pages, README/audit files, screenshots, dependency folders or build output. Do not paste source code into chat.

The valid UTF-8 metadata must contain:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "dashboard",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "04",
  "prompt_label": "Operations Command Centre",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

Use the exact run parameters above. The organizer ZIPs this folder; ZIP filename is ignored for routing. Test in a browser if possible; otherwise state that only a code-level smoke check was performed. Report only the folder path and honest test status.
