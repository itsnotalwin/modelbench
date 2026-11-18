# 22 · Production Site Refresh

## Automatic run identity — never ask the organiser or user

Resolve the run metadata yourself before creating files. Do not ask the user or organiser for model, date, version, category, project title or creative direction.

1. **MODEL_SLUG:** Identify the model actually executing this prompt from the active system/runtime model identifier. Prefer the exact identifier including its variant; otherwise use the public model name exposed by the environment. If provider-qualified, keep the model portion after the final slash. Lowercase it, replace spaces, underscores and other non-alphanumeric characters with hyphens, retain letters, digits, dots and hyphens, collapse repeated hyphens and trim punctuation. Never invent a model identity. If no identity is exposed, use `unknown-model` and disclose that in metadata notes.
2. **RUN_DATE:** Use the current calendar date supplied by system/runtime context in `YYYY-MM-DD` format. If unavailable, use the current UTC date from the runtime. Never use the prompt edit date or a file timestamp.
3. **VERSION:** Always use the integer `1`. Never ask, infer, increment or substitute another value.

Use the resolved values in both the output folder and `meta.json`. Do not pause for confirmation and do not leave placeholders in the finished files.

## The brief

You are given a real, live production website: **Shutterhaus Visuals**, the photography portfolio of Alwin Newman, based in Kempton Park, Gauteng.

- Repository: `https://github.com/itsnotalwin/shutterhaus-site` (branch `main`)
- Live site: `https://shutterhausvisuals.co.za/`

Deliver **a new version of that site** in a single folder in your workspace. You are not patching the repository and you are not editing it in place. You are the studio's entire web department for this pass, producing a complete, self-contained front end a photographer could publish tomorrow.

That new version can be either of two things — **you choose, and you commit fully to your choice**:

- **A refresh.** The brand survives, the execution jumps a generation. Same identity, same voice, same interaction language, rebuilt to a standard the current build does not reach.
- **A rebrand.** The business survives and the identity is reinvented — new name or new mark, new typography, palette, art direction and content model — argued as a decision the studio would accept, not a template with a logo swapped.

A half-refresh is the failure case. A timid reskin that keeps the same five colours and grid but changes the font is neither a refresh nor a rebrand. Decide which job you are doing in your first minutes, and make it unmistakably one of the two.

### Ground yourself in the source first

1. Read the repository before you design anything: `README.md`, `AGENTS.md`, `DESIGN.md`, `PROJECT.md`, `docs/`, the page sources and the image tooling. Read the deployed pages themselves, and `release.json` to see which commit is actually serving.
2. Record the commit you studied in `meta.json` notes. Never rely on a memory of what a photography site usually looks like.
3. If the repository is unreachable from your environment, work from the deployed site and say so; if neither is reachable, work from this brief alone and say so. Never invent a verified fact, a client, an award or a test result.
4. Do not open, copy from or reason about other models' attempts at this challenge.

### What must be true of either answer

- **The business stays real:** the studio's own portraiture practice in Kempton Park, Gauteng — a photographer someone can actually hire. Do not turn it into a fictional agency, a design concept for nobody, or a product landing page.
- **Five public pages, each with a job:** home (`index.html`), portfolio (`portfolio.html`), about (`about.html`), contact (`contact.html`) and a real `404.html`. No admin area, no sixth page, no single-scroll substitute for a whole site.
- **A gallery that behaves like the studio's best work:** a keyboard-navigable lightbox (arrows, Escape, Home/End, focus trapped and returned) and scroll-driven photograph frames as a distinct second browsing mode. Both modes, both excellent.
- **One photograph, no caption, on the about page** — a deliberate silence. Keep it deliberate.
- **Copy you would put your name to:** series titles, statements, print and licensing detail, a contact route that works. Real sentences. No "Lorem ipsum", no "coming soon", no placeholder ladders, nothing that reads as machine-generated filler.
- **Honesty about the client's assets:** use the repository's own photographs when you can obtain them (copy, convert and size them locally); otherwise generate a coherent monochrome substitute procedurally — SVG, canvas, pattern studies — that reads as the studio's own artwork. Never hotlink, never use external stock, never ship grey boxes with a camera icon. Never invent client names, awards, press mentions, publication credits, testimonials or logos. Fictional series titles and invented plates are allowed; name them as fiction in `meta.json`.
- **Design for the phone as carefully as the desktop:** 320 px through 1920 px, no horizontal scroll, touch targets at least 44 px, galleries swiped as naturally as they are clicked.

### If you refresh

Bodoni Moda display type, Inter for text, a white editorial ground, monochrome photography, geometric arc artwork and **"Portraits worth keeping."** are yours to keep — and to sharpen. The arc motif becomes structure (section rules, index markers, framing devices, transitions) instead of decoration. The typographic system earns a modular scale, baseline rhythm and a column grid every page obeys. Image sequencing becomes deliberate: full-bleed, paired and single plates in a rhythm that flatters the photographs, with plate numbers and captions carrying title, series, year, medium and dimensions. Navigation and wayfinding get current-page state, visible focus, and a footer that earns its space with studio, print, licensing and contact facts.

### If you rebrand

Same business, new identity, good enough to defend to the person whose name is on it. Build the identity system explicitly: a wordmark, a type pairing, a two- or three-value palette, an image treatment, and a rule for how photographs are cropped, sequenced and captioned. Apply it consistently across all five pages, the navigation, the footer, the 404 and the print stylesheet. A rebrand that abandons the studio's actual work, or that would look identical for a coffee roaster, has failed.

### Engineering requirements

- **Static and self-contained.** `index.html` at the folder root opens from disk and works. No build step, no package install, no bundler output, no framework runtime, no module imports that need a server, no CDN link, no external font, no analytics, no tracker, no Supabase, no service that requires a key.
- **Local everything.** Fonts, styles, scripts and images live in the folder. Zero requests to any third-party origin. `file://` must not throw errors, and internal links must work from disk as well as from a static host.
- **Content in the markup.** Every headline, caption and paragraph must exist in the HTML. If JavaScript is disabled, the site still shows the work, the words and the way to get in touch.
- **No layout shift.** Reserve space for every photograph with intrinsic dimensions or aspect-ratio boxes. Images lazy-load below the fold. Nothing scroll-linked that fights the browser's own scrolling.
- **No console noise.** No errors, no warnings, no unhandled rejections, no 404s for assets, no double-fetches.

### Accessibility requirements — WCAG 2.2 AA, verified not assumed

- Complete keyboard operation for the whole site, including the lightbox.
- Correct landmarks, one `h1` per page, heading order that never skips, a skip link visible on focus.
- Alt text that describes the photograph — subject, light, framing — never a filename, never "image".
- Contrast checked against the real palette, especially grey captions on white and white text on photography; a scrim or a caption plate where the design needs one.
- `prefers-reduced-motion` honoured; reveals and smooth scrolling become instant.
- 200 % zoom without loss, reflow at 320 px, and `forced-colors` mode not broken by the design.

### Performance budget

Total transfer without photographs at or under 250 KB. All photography local and responsibly sized. LCP under 1.5 s on a simulated 4G desktop and under 2.5 s on a mid-tier phone. 60 fps during scroll and gallery transitions. No jank from blur or `backdrop-filter` on the critical path.

### Definition of failure — any one of these caps the score

- The result reads as a generic photography template, or splits the difference between refresh and rebrand.
- A required page, the gallery keyboard model or the scroll frames are missing or half-working.
- Any third-party request, CDN font, tracker, or a required build step.
- Content injected by JavaScript only; a crawler with no JavaScript sees an empty site.
- Measurable layout shift, console errors, stuck scroll states or a lightbox that traps the page.
- Invented clients, awards, press quotes or testimonials.
- Placeholder copy, "coming soon" panels, dead links, or a contact page with no working way to make contact.

### How this is judged

Six axes, 0–5, harshly: **completeness** (five pages, both browsing modes, nothing stubbed), **robustness** (delivery from disk, keyboard, deep links, no errors), **craft** (typography, grid, image sequencing, motion restraint — weighted double), **depth** (editorial content, print and licensing detail, a portfolio system that could carry a real body of work), **originality** (a refresh with a point of view, or a rebrand that genuinely holds together — weighted double), **performance** (weight, LCP, frame time, zero third-party cost). The reviewer compares your pages against the live site page by page, checks every claim, and asks one question first: *did this model know which of the two jobs it was doing?*

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**site-refresh__MODEL_SLUG__RUN_DATE__v1**

Replace the model and date tokens using the rules above. The suffix is always `v1`.

At the folder root include **index.html** and **meta.json**. Include local source files and an `assets/` directory only when required by the finished project. Keep everything for this single project inside that folder.

Do not create alternate concepts, multiple versions, additional HTML entry points, README/audit files, screenshots, dependency folders, package files or build output. Do not create files outside the project folder. Do not paste source code into chat.

The metadata file must contain this structure, with your resolved model slug and date and the fixed integer version 1:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "site-refresh",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "22",
  "prompt_label": "Production Site Refresh",
  "notes": "The commit studied, refresh or rebrand and why, what changed, which series are fiction, what could not be verified, and any known limitations — under 1200 characters."
}
~~~

Replace both tokens. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. ZIP filenames are not routing keys. Do not include scores or self-awarded evaluations in metadata.

When finished, report only the project folder path and an honest test status.
