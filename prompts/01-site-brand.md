# 01 · Flagship Brand Experience

## Run parameters
Set these three values before starting the run. They must be the same values written into the output folder and metadata.

- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

If a value is still bracketed, stop and ask the organizer to fill it in. Do not invent the model identifier or date.

## The brief

Build the complete flagship website for **Nearwild**, a premium small-group day-adventure company. Nearwild helps people trade a predictable weekend for a carefully hosted day outdoors. Its voice is observant, confident, warm and quietly adventurous. It is not an extreme-sports brand and must not look like a generic travel template.

The site must help a first-time visitor understand the offer, compare three trips, trust the operator and submit a realistic booking request. The brand, art direction, page composition and implementation are yours to decide. Make it feel like a real business ready to launch, not a mood board.

Use these fixed experiences and prices:
- **Saltline Walk** — 3 hours — easy coastal route — **R590 per person**.
- **Fynbos Table** — 4 hours — guided botanical walk with a hosted picnic — **R820 per person**.
- **First Light Ridge** — 5 hours — moderate sunrise hike — **R690 per person**.

These are fictional benchmark products. Do not claim real availability, customer reviews, certifications or partnerships.

## Product requirements

1. Create a distinct visual identity with a considered wordmark or symbol, a compact colour system, deliberate typography, and a consistent spacing and component system. Create the hero artwork and supporting illustrations with inline SVG, CSS or canvas. Do not use remote stock photos, externally hosted fonts or placeholder image boxes.
2. Build a persuasive page with at least six genuinely useful sections: a clear hero, the three experiences, a detailed itinerary or “what the day feels like” section, what is included, the hosting philosophy or safety approach, practical questions, and a strong final booking invitation. Sections may be combined only when the information hierarchy stays clear.
3. Each experience must open a meaningful detail view showing duration, difficulty, inclusions, price and a sample itinerary. The detail view must be closable with Escape and must work by keyboard and touch.
4. Add a working booking-request flow. Visitors choose an experience, a date, and a party size. The estimated total must update immediately and correctly. Validate required fields, reject past dates and unreasonable party sizes, show useful inline errors, and display a confirmation summary. This is a local demo, not a real reservation.
5. Persist the booking draft and selected experience across a reload. Provide a clear way to start a fresh request. Never imply that the request was sent to a real operator.
6. Include a useful mobile navigation pattern, visible focus states, reduced-motion support and a responsive layout that is intentionally designed for both a 1440px desktop and a 390px phone.
7. Write specific, believable copy. No lorem ipsum, fake testimonials, meaningless metrics, “coming soon” sections or dead buttons.

## Quality bar

The page should have a recognisable art direction and memorable composition. Establish a strong visual reading order, credible product presentation, comfortable text measure, balanced whitespace, precise details and restrained motion. Do not rely on a giant gradient, floating glass cards or a standard SaaS hero as a substitute for design. The booking flow must be obvious without making the whole site look like a form.

Use semantic HTML, labelled controls, appropriate heading order, sufficient contrast and touch targets. Avoid unnecessary JavaScript, console errors and layout shifts. Keep the page fast and self-contained.

## Acceptance checklist

Before finishing, verify that:
- All three experience cards show the correct fixed names, durations, difficulty and prices.
- A visitor can open and close each experience detail view.
- Changing experience, date or party size updates the booking total accurately.
- Invalid booking input is prevented and explained beside the relevant field.
- A valid request reaches a visible confirmation state and survives reload as a saved draft/record.
- Navigation, modal/dialog and form work with keyboard as well as pointer/touch.
- The desktop and phone layouts have no clipped content or horizontal overflow.
- There are no placeholder links, fake service calls or non-functional controls.

## Submission contract — mandatory

Create exactly one output folder at the workspace root named:

**site-brand__MODEL_SLUG__RUN_DATE__vVERSION**

Inside it, put:
- **index.html** — the complete runnable website. Keep CSS and JavaScript inline.
- **meta.json** — the metadata below.
- **assets/** only if an essential runtime asset cannot reasonably be embedded.

Do not create multiple concepts, three versions, extra HTML pages, a README, an audit report, screenshots, package files, node_modules or build output. Do not paste the source code into chat. Create the files in the workspace and verify that they exist.

The metadata file must be valid UTF-8 JSON and contain exactly these required fields (you may add a concise optional description field, but do not add scores):

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "site-brand",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "01",
  "prompt_label": "Flagship Brand Experience",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

The folder name and metadata values must use the exact run parameters above. The folder is what the organizer will ZIP. The ZIP filename is not used to identify the run.

Finally, open and test the page in a browser if one is available. Otherwise perform a code-level smoke check and say so in the final one-line status. Report only the created folder path and whether the acceptance checklist passed. Do not claim tests you did not run.
