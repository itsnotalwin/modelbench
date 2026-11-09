# 03 · Commerce Marketplace

## Run parameters

Replace these placeholders with the exact values supplied for this run. They must match the output folder and metadata exactly.

- MODEL_SLUG: MODEL_SLUG
- RUN_DATE: RUN_DATE
- VERSION: VERSION

Do not guess missing run parameters. If any value has not been supplied, ask the organiser before creating files.

## The challenge

Invent a commerce concept and build a complete browser-based marketplace around it. Choose what is being offered, who it serves, the catalogue, pricing model, brand identity, tone and shopping experience. The concept should be coherent enough to feel like a product someone could genuinely use, while all inventory and transactions remain clearly simulated.

## What the build must deliver

1. Create at least ten coherent catalogue entries with useful titles, descriptions, categories, imagery or visual treatments, and consistent prices or other relevant purchase terms. You decide the product domain and the content.
2. Implement search and composable filters or sorting that operate on the actual catalogue. Include useful empty states and a way to reset filters.
3. Provide a meaningful item detail view with the information needed to make a choice. Navigation between catalogue and detail views must preserve context.
4. Implement a working cart, basket, quote list or equivalent transaction state. Quantities, subtotals, discounts or fees, and totals must recalculate correctly whenever relevant values change.
5. Create a complete simulated checkout or request flow with input validation, review, clear confirmation and safe handling of invalid or unavailable items. Do not collect real payment information or imply that a real order has been placed.
6. Persist useful catalogue preferences and cart state locally. Include clear feedback for add, remove, quantity changes, empty cart and successful demo completion.

## Quality bar

Make the result feel like a finished, intentionally designed product. Make strong creative and technical decisions independently; do not ask the organiser to choose the concept, visual direction, content, mechanics or implementation. Use a distinctive identity and a consistent visual language. Prioritise clarity, responsiveness, satisfying interaction and meaningful detail over decorative complexity.

Every visible control must work. Every important interaction must create a real state change and give appropriate feedback. Avoid placeholder sections, dead buttons, fake charts, non-functional menus, empty world geometry and features that only look interactive. A smaller coherent experience is better than a large collection of unfinished systems.

## Acceptance checklist

- [ ] The catalogue is coherent and contains at least ten usable entries.
- [ ] Search, filters and sorting operate correctly together and can be cleared.
- [ ] Detail views show useful item information and return to the catalogue cleanly.
- [ ] Cart calculations are accurate after adding, removing and changing quantities.
- [ ] The simulated transaction validates input and reaches an explicit demo confirmation.
- [ ] State survives reload where expected, and the experience works on desktop and mobile.

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

**site-store__MODEL_SLUG__RUN_DATE__vVERSION**

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact values for this run:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "site-store",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "03",
  "prompt_label": "Commerce Marketplace",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder and metadata must use the exact run parameters. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in meta.json.

When finished, report only the project folder path and an honest test status.
