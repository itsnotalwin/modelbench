# 01 · Original Brand Website

## Automatic run identity — never ask the organiser

Resolve these three values yourself before creating the project. They are run metadata, not questions for the user.

1. **MODEL_SLUG:** Identify the model that is actually executing this prompt from the active system/runtime model identifier. Prefer the exact model identifier, including its variant, when exposed; otherwise use the public model name supplied by the environment. If it is provider-qualified (for example, `provider/model-name`), keep the model portion. Convert it to lowercase and replace spaces, underscores and other characters with hyphens; retain only letters, digits, dots and hyphens, collapse repeated hyphens and remove leading/trailing punctuation. Do not use the benchmark category, prompt title, organiser's name or an assumed model. Never ask the user. If the runtime exposes no model identity at all, use `unknown-model` and disclose that limitation briefly in `meta.json` notes rather than inventing an identity.
2. **RUN_DATE:** Use the current calendar date supplied by your system/runtime context, formatted as `YYYY-MM-DD`. If that context does not provide a date, use the current UTC calendar date from the runtime. Do not use the prompt's edit date or a file timestamp. Never ask the user.
3. **VERSION:** Always use the integer `1`. This is fixed. Do not ask, infer, increment or substitute another version.

Use the resolved values consistently in the output folder and `meta.json`. Do not pause for confirmation and do not leave literal placeholders in the finished files.## The challenge

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

**site-brand__MODEL_SLUG__RUN_DATE__v1**

Before creating it, replace `MODEL_SLUG` and `RUN_DATE` using the automatic run-identity rules above. The suffix must always be `v1`.

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact automatically resolved model slug and date. Keep `version` as the JSON number `1`:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "site-brand",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "01",
  "prompt_label": "Original Brand Website",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

Replace the two metadata tokens with the values you resolved yourself. Do not ask the organiser for them and do not submit unresolved placeholder text. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in `meta.json`.

When finished, report only the project folder path and an honest test status.
