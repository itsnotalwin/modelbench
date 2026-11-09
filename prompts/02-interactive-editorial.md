# 02 · Interactive Editorial Feature

## Run parameters

Replace these placeholders with the exact values supplied for this run. They must match the output folder and metadata exactly.

- MODEL_SLUG: MODEL_SLUG
- RUN_DATE: RUN_DATE
- VERSION: VERSION

Do not guess missing run parameters. If any value has not been supplied, ask the organiser before creating files.

## The challenge

Create one polished, interactive editorial feature about a subject you choose. You decide the subject, angle, central question, thesis, structure, voice, visual language and supporting data. The result should feel like a serious digital publication feature: worth reading as an article, rewarding to explore, and transparent about what its evidence can and cannot establish.

## What the build must deliver

1. Write approximately 800–1,100 words of original, edited feature content with a clear argument or narrative arc. Use strong headings, captions, pull-outs and pacing where they improve comprehension.
2. Build at least three data visualisations that genuinely support the story. Choose suitable chart forms and make them readable, labelled and responsive. Visualisations must represent the underlying data accurately.
3. Make at least two meaningful interactions connect to the article or visualisations. These may include filtering, highlighting, comparing, stepping through a narrative or inspecting a data point. Choose the approach yourself.
4. Provide an accessible tabular or equivalent text view of the important data. Explain the dataset, units, definitions, limitations and methodology in concise editorial notes.
5. Be honest about evidence. Cite verifiable sources when using external factual claims. Never invent publications, links, quotations or source attributions. When using constructed or illustrative data, label it clearly and do not present it as observed fact.
6. Create a distinctive editorial art direction with deliberate type hierarchy, image treatment, chart styling, spacing and responsive reading widths. Use original or locally included visual assets; do not leave empty image boxes.

## Quality bar

Make the result feel like a finished, intentionally designed product. Make strong creative and technical decisions independently; do not ask the organiser to choose the concept, visual direction, content, mechanics or implementation. Use a distinctive identity and a consistent visual language. Prioritise clarity, responsiveness, satisfying interaction and meaningful detail over decorative complexity.

Every visible control must work. Every important interaction must create a real state change and give appropriate feedback. Avoid placeholder sections, dead buttons, fake charts, non-functional menus, empty world geometry and features that only look interactive. A smaller coherent experience is better than a large collection of unfinished systems.

## Acceptance checklist

- [ ] The article is substantial, coherent and within the requested approximate word range.
- [ ] All visualisations render from the stated data and use appropriate scales, labels and units.
- [ ] Interactions change or reveal meaningful information rather than acting as decoration.
- [ ] The data can also be understood without relying on colour or pointer hover alone.
- [ ] Sources, constructed data and methodological limits are represented honestly.
- [ ] The feature remains readable and usable on narrow screens and with keyboard navigation.

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

**site-editorial__MODEL_SLUG__RUN_DATE__vVERSION**

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder only for essential local runtime assets. Keep all files for this one finished project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, additional HTML pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact values for this run:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "site-editorial",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "02",
  "prompt_label": "Interactive Editorial Feature",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder and metadata must use the exact run parameters. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in meta.json.

When finished, report only the project folder path and an honest test status.
