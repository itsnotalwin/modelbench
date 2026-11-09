# 05 · Project Operations Workspace

## Run parameters
Set these three values before starting the run. They must be the same values written into the output folder and metadata.

- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

If a value is still bracketed, stop and ask the organizer to fill it in. Do not invent the model identifier or date.

## The brief

Build **Tandem**, a local-first project workspace for a small creative studio managing several client projects at once. A project lead needs to plan work, assign ownership, spot overloaded people, and understand what is at risk without opening five different tools.

This is a complete, single-user working application with realistic seeded data. It must not pretend to be a connected team service.

## Starting workspace

Seed three projects:
- **Northstar identity refresh** — brand strategy and website handoff.
- **Field Kit launch** — campaign assets and product launch preparation.
- **Customer onboarding rebuild** — improve the first-use experience.

Seed at least 15 distinct tasks across those projects. Every task needs a title, project, status, priority, assignee, due date and estimate in hours. Include a mix of completed, active, blocked and unstarted work. Use a few overdue tasks so the risk and workload views have something real to show. Use fictional team members with clear names.

## Product requirements

1. Build a coherent application shell with project navigation, a global search, clear workspace identity and a useful summary/home view.
2. Provide at least three genuinely useful ways to inspect work: a Kanban board, a sortable/filterable task table, and a calendar or timeline view. They must all read from and update the same task records.
3. Support create, edit, delete, duplicate and status-change actions for projects and tasks. Include confirmation before destructive deletion and a way to undo the most recent destructive action.
4. Kanban cards must be draggable between columns with a keyboard-accessible alternative. A task's status must stay in sync with every other view.
5. Provide filters for project, status, priority, assignee and due-date state. Include a search that matches task title and relevant task details. Filters must compose and have a clear reset.
6. The overview must calculate workload by person, completion by project and overdue/blocked work from the task data. Provide a useful detail view for any selected task with an activity history.
7. Persist projects, tasks, preferences and activity history across reloads using localStorage or IndexedDB. Include export to JSON and validated import from JSON so users can back up or restore their workspace.
8. Add thoughtful empty states, form validation, success feedback, keyboard shortcuts for common actions and a responsive mobile layout. No control may be decorative-only.

## Quality bar

The result should feel like a focused product with a recognisable visual system, not a Trello clone or generic admin template. Make dense information scannable without making it tiny. Keep navigation, view switching, edit forms and detail panels consistent. Provide sensible defaults and guard against accidental data loss.

Use a self-contained HTML page with inline CSS and JavaScript. No backend, authentication service, remote API, external framework, remote font or stock-image dependency. Use semantic controls, accessible labels, visible focus, sufficient contrast and reduced-motion support.

## Acceptance checklist

Before finishing, verify that:
- Three projects and at least 15 complete task records are present on first launch.
- A task created or edited in one view is correct in the other two views.
- Dragging and keyboard status changes both update shared task state.
- Search and all filters work together.
- Workload, completion and overdue metrics recalculate after edits.
- Delete confirmation and undo behave correctly.
- Reload restores the workspace; JSON export and valid import round-trip the data.
- Invalid imported data is rejected without destroying the current workspace.
- The application remains usable at desktop and phone widths.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**workspace__MODEL_SLUG__RUN_DATE__vVERSION**

Place **index.html** and **meta.json** at its root. Add an **assets/** folder only for essential runtime assets. Do not create multiple applications or versions, extra HTML pages, README/audit documents, screenshots, package files, dependencies or build output. Create the files in the workspace and do not paste source code into chat.

The valid UTF-8 metadata must contain:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "workspace",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "05",
  "prompt_label": "Project Operations Workspace",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder and metadata must use the exact run parameters. The organizer ZIPs the folder; do not rely on the ZIP filename. Test in a browser if available, otherwise perform and disclose a code-level smoke check. Report only the folder path and honest test status.
