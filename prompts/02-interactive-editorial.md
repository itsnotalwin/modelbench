# 02 · Interactive Editorial Investigation

## Run parameters
Set these three values before starting the run. They must be the same values written into the output folder and metadata.

- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

If a value is still bracketed, stop and ask the organizer to fill it in. Do not invent the model identifier or date.

## The brief

Create a long-form interactive editorial feature for a fictional publication called **The Common Current**. The feature is titled **“The Hidden Shape of a City's Water”**. It investigates how household water use differs across six fictional districts and how leaks complicate the picture.

This is a designed reading experience, not a dashboard with an article attached. The story should guide a reader from a compelling opening question through evidence, interpretation and a thoughtful conclusion. You control the editorial voice, visual language and layout, but the supplied data is fixed. Do not invent real-world claims or imply that this synthetic dataset describes an actual city.

## The fixed dataset

All values below are synthetic. Water use is litres per person per day. Leak rate is a percentage estimate for the fictional district.

| District | Summer use | Winter use | Leak rate |
|---|---:|---:|---:|
| North Quay | 192 | 148 | 9.2% |
| Old Town | 236 | 171 | 14.8% |
| Glassworks | 178 | 139 | 6.1% |
| South Gardens | 214 | 163 | 11.3% |
| Hillline | 163 | 132 | 4.7% |
| East Market | 228 | 180 | 12.6% |

The dataset contains six districts only. All charts, tables, callouts and comparisons must be calculated from these exact values. Clearly label the data as fictional/synthetic.

## Editorial and interaction requirements

1. Write a coherent feature of approximately 800–1,100 words. Give it a real thesis, a beginning, a middle and an ending. Distinguish what the data shows from what it cannot establish. Do not assert that leak rate causes higher use or invent explanations unsupported by the dataset.
2. Design a distinctive publication identity: masthead, issue/date treatment, typographic hierarchy, colour logic, captions, pull quotes and a strong reading rhythm. Avoid a generic centered-column blog template.
3. Build at least three meaningful data visualisations using SVG or canvas: a district comparison, a summer-versus-winter comparison, and a leak-rate view. Axes, units, legends and labels must be readable. Values must be derived from the supplied dataset, not manually contradicted in markup.
4. Make the visualisations interactive. A reader can select a district, compare seasons, sort districts by a selected measure, and inspect exact values. The article's related callouts should update coherently when the selection changes.
5. Add a scrollytelling or chapter-navigation structure with a visible reading-progress indicator. It must work without scroll-jacking. Include an accessible data table as an alternative to charts.
6. Add expandable methodology and evidence notes that explain the synthetic dataset, units and limits. The reading experience must remain understandable if the reader never touches an interactive control.
7. Make the layout responsive and deliberate at desktop and phone widths. Charts must reflow or scroll accessibly without clipping labels. Respect reduced-motion preferences.

## Quality bar

The piece should feel commissioned by an excellent independent magazine: a confident art direction, original graphic language, typographic craft, carefully paced sections and copy that rewards attention. Use original inline SVG/CSS/canvas artwork rather than remote images. Every control must have a meaningful result. A chart that is decorative or disconnected from the supplied numbers fails the brief.

Use semantic structure, keyboard-accessible controls, visible focus, sufficient contrast and no console errors. Do not add external APIs, analytics, backend services or remote fonts.

## Acceptance checklist

Before finishing, verify that:
- The exact six districts and all 18 supplied values are represented correctly.
- The three visualisations are calculated from the same underlying dataset.
- Selecting a district and changing sort/season controls updates the intended views.
- Exact values can be inspected and an equivalent accessible data table is available.
- Reading progress/navigation works without blocking normal scrolling.
- The methodology clearly labels the dataset as synthetic and avoids unsupported causal claims.
- The long-form narrative is complete, not placeholder copy.
- Desktop and phone layouts remain readable with no horizontal page overflow.

## Submission contract — mandatory

Create exactly one output folder at the workspace root named:

**site-editorial__MODEL_SLUG__RUN_DATE__vVERSION**

Inside it, put **index.html** (the complete experience, with inline CSS/JS), **meta.json**, and an **assets/** folder only when an essential runtime asset cannot be embedded. Do not create multiple stories, three variants, extra HTML pages, README/audit files, screenshots, dependency folders or build output. Do not paste code into chat; create the files in the workspace.

The valid UTF-8 metadata file must contain:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "site-editorial",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "02",
  "prompt_label": "Interactive Editorial Investigation",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

Use the exact run parameters in both the folder name and metadata. The organizer ZIPs the folder; the ZIP filename itself is not used for routing.

Open the page in a browser and test it if possible. Otherwise perform a code-level smoke check and disclose that. Report only the folder path and honest test status. Do not claim checks you did not run.
