# ModelBench

ModelBench is an open-ended one-shot AI build benchmark. It compares model-created websites, data products, applications, games, simulations and creative tools in one installable dashboard. The fifteen challenges test different product-building skills, and each model run is a single finished artifact.

**Live dashboard:** https://itsnotalwin.github.io/modelbench/

## How submissions work

Each challenge is one prompt and each model run is **one project folder inside one ZIP**. Do not generate three versions or multiple concepts from one prompt.

1. Choose one of the 15 challenges in [Prompts](prompts/README.md).
2. The prompt automatically identifies the executing model, uses the current system date and sets version to `1`. You do not need to supply or confirm these values.
3. The model creates one folder named CATEGORY__MODEL__YYYY-MM-DD__v1 containing index.html, meta.json and only essential runtime assets.
4. ZIP that folder.
5. Upload the ZIP to [inbox/](inbox/README.md). The ZIP filename may be anything ending in .zip; the importer reads meta.json inside the archive to determine the destination.

### meta.json contract

Every ZIP must contain a valid UTF-8 meta.json at the project root:

~~~json
{
  "schema_version": 1,
  "model": "gpt-6",
  "category": "site-brand",
  "date": "2026-11-09",
  "version": 1,
  "entry": "index.html",
  "prompt": "01",
  "prompt_label": "Original Brand Website",
  "notes": "A concise description of the build and any known limitations."
}
~~~

- model is the lowercase model slug using letters, digits, hyphens and dots.
- category must match one of the fifteen slugs in prompts/catalog.json.
- date must be a real ISO date in YYYY-MM-DD format.
- version is always the integer `1` for prompt-generated runs. Do not ask for or increment the version.
- entry must be index.html at the project root.
- prompt and prompt_label identify the selected challenge.
- notes is a short, honest description. Scores and evaluation logs are organizer-owned and must not be supplied by the model.

**Metadata is authoritative.** The ZIP filename and internal folder name do not determine routing. The sorter validates the metadata, derives runs/{date}_{model}_{category}_v{n}/, and preserves the project files. If metadata is missing or invalid, the ZIP remains in inbox/ with an actionable error. A destination that already exists is never overwritten. Since prompt-generated runs always use version 1, submit a given model/category/date combination only once; a duplicate is safely rejected rather than replacing the first result.

## Dashboard ratings

Open a run, score the six axes from 0 to 5, and select **Save rating**. Ratings are stored in the current browser on this device, not committed to GitHub or synced to other devices. Use **Export ratings** to back up your ratings as JSON and **Import ratings** to restore or merge them in another browser. Importing ratings does not modify model artifacts or meta.json.

## Repository map

~~~text
index.html                    dashboard UI (unchanged by prompt updates)
manifest.json                 generated dashboard data and challenge catalog
prompts/catalog.json          canonical fifteen-challenge catalog
prompts/*.md                  standalone one-shot build prompts
prompts/README.md             suite guide and research basis
inbox/README.md               ZIP upload instructions
inbox/                        incoming ZIP packages
runs/<run-slug>/              accepted build, metadata and generated PWA assets
tools/sort_inbox.py           validates ZIP metadata, safely unpacks and routes runs
tools/build_manifest.py       builds manifest.json from runs/*/meta.json
tools/pwa.py                  generates run and dashboard PWA assets
tools/new_run.py              prints the output-folder and metadata contract
tests/                         importer and dashboard tests
.github/workflows/auto-sort.yml
                               sorts inbox uploads and commits generated run data
~~~

## Local maintenance

~~~bash
python -m unittest discover -s tests -v
python tools/sort_inbox.py
python tools/build_manifest.py
python tools/pwa.py
python tools/new_run.py --category site-brand
python -m http.server 8000
~~~

Open http://localhost:8000 for a local dashboard preview. The dashboard visual implementation is deliberately kept separate from challenge prompt/catalog data.
