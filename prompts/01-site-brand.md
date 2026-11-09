# 01 · Original Brand Website

## Run parameters

Replace these placeholders with the exact values supplied for this run. They must match the output folder and metadata exactly.

- MODEL_SLUG: MODEL_SLUG
- RUN_DATE: RUN_DATE
- VERSION: VERSION

Do not guess missing run parameters. If any value has not been supplied, ask the organiser before creating files.

## The challenge

Invent an original business, product, service or organisation and build its complete public-facing website. You choose the field, audience, proposition, identity, voice, content, structure and visual direction. Nothing is supplied beyond the requirement to create a convincing website that explains its offer and moves a visitor towards a meaningful next step. Treat it as a real launch-quality experience, not a template or static mood board.

## What the build must deliver

1. Create a memorable visual identity with a considered wordmark or symbol, typography, colour system, spacing and reusable interface patterns. Develop original visual material with code, inline SVG, canvas or included local assets. Do not rely on empty image placeholders or remote stock imagery.
2. Build at least five genuinely useful sections. Explain the proposition quickly, establish relevance and trust, present the core offer clearly, answer practical questions and guide visitors towards an appropriate action. Choose the sections that make sense for your invented concept.
3. Show at least three coherent offerings, features, plans or service options. Give each useful detail and a clear relationship to the overall proposition. You decide their names, content and any fictional demo pricing.
4. Implement one complete enquiry, booking, quote or conversion flow appropriate to the concept. Include sensible fields, validation, clear errors, a success state and a way to review or retain the submitted demo request locally.
5. Avoid invented real-world endorsements, customer claims, certifications, partnerships or statistics. Clearly label any illustrative business information as demonstration content.

## Quality bar

Make the result feel like a finished, intentionally designed product. Make strong creative and technical decisions independently; do not ask the organiser to choose the concept, visual direction, content, mechanics or implementation. Use a distinctive identity and a consistent visual language. Prioritise clarity, responsiveness, satisfying interaction and meaningful detail over decorative complexity.

Every visible control must work. Every important interaction must create a real state change and give appropriate feedback. Avoid placeholder sections, dead buttons, fake charts, non-functional menus, empty world geometry and features that only look interactive. A smaller coherent experience is better than a large collection of unfinished systems.

## Acceptance checklist

- [ ] The website communicates a coherent original proposition within a few seconds.
- [ ] At least five useful sections are complete and meaningfully connected.
- [ ] Offerings have useful details and the visitor can navigate between them.
- [ ] The main conversion flow validates input and reaches a clear success state.
- [ ] The visual identity is coherent and the layout works at desktop and mobile widths.
- [ ] Keyboard navigation, focus visibility, contrast and reduced-motion preferences are considered.

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

**site-brand__MODEL_SLUG__RUN_DATE__vVERSION**

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact values for this run:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "site-brand",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "01",
  "prompt_label": "Original Brand Website",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder and metadata must use the exact run parameters. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in meta.json.

When finished, report only the project folder path and an honest test status.
