# ModelBench

ModelBench is an open-ended AI build benchmark. It compares model-created websites, games, visual experiments and creative tools in one installable dashboard. Each challenge is judged on six separate axes: completeness, robustness, craft, depth, originality and performance.

**Live dashboard:** https://itsnotalwin.github.io/modelbench/

## How submissions work

Each uploaded artifact is a ZIP package. The ZIP is the transport container; its `meta.json` is the source of truth for the submission's descriptive metadata.

1. Choose one of the 15 challenges in [Prompts](prompts/README.md).
2. Prepare one build package for each version you are submitting. A ZIP represents **one** challenge, one model and one version. Upload additional versions as separate ZIPs.
3. Name the ZIP using the intake key:
   ```
   {category}__{model}__{YYYY-MM-DD}__v{n}.zip
   ```
   The category must match a slug in `prompts/catalog.json`; the model slug uses lowercase letters, digits, hyphens and dots.
4. Put the project files in one folder inside the ZIP. That folder should contain `index.html`, `meta.json`, and any assets the page needs. The sorter also accepts these files at the ZIP root.
5. Upload the ZIP to [inbox/](inbox/README.md). GitHub Actions automatically sorts accepted uploads into `runs/` and rebuilds the dashboard manifest.

The ZIP filename is used as the intake/routing key so the workflow knows which challenge, model, date and version folder to create. **Descriptive submission information belongs in `meta.json`**, not in the filename or a README.

### `meta.json` contract

Include valid UTF-8 JSON with these fields:

```json
{
  "model": "gpt-6",
  "category": "site-editorial",
  "date": "2026-11-09",
  "version": 1,
  "entry": "index.html",
  "prompt": "02",
  "prompt_label": "Editorial feature",
  "notes": "A short description of the build and any known limitations."
}
```

- `model`, `category`, `date`, `version` and `entry` identify the submission in the dashboard and install flow.
- `prompt` and `prompt_label` identify the challenge.
- `notes` is the visible human-readable summary. Put the useful description here.
- The category, model, date and version in metadata must agree with the ZIP's intake key. The intake key determines the destination folder; metadata supplies the descriptive record.
- The dashboard pipeline fills derived fields such as the run slug, public path, score slots and file inventory when building `manifest.json`.

Do not put scores in model-authored metadata. Scores and evaluation logs are organizer-owned fields.

## Dashboard ratings

Open a run, score the six axes from 0 to 5, and select **Save rating**. Ratings are stored in the current browser on this device, not committed to GitHub or synced to other devices. Use **Export ratings** to back up your ratings as JSON and **Import ratings** to restore or merge them in another browser. Importing ratings does not modify model artifacts or `meta.json`.

## Repository map

```
index.html                    dashboard and page metadata
manifest.json                 generated dashboard data
manifest.webmanifest          install metadata for the dashboard
sw.js                         dashboard service worker
icons/                        dashboard install icons
prompts/catalog.json          canonical challenge catalog and slugs
prompts/                      challenge prompt files and prompt guide
inbox/README.md               ZIP upload instructions
inbox/                        incoming ZIP packages
runs/<run-slug>/              accepted build, meta.json and generated PWA assets
tools/sort_inbox.py           validates intake naming, unpacks ZIPs and creates run records
tools/build_manifest.py       builds manifest.json from runs/*/meta.json
tools/pwa.py                  generates run and dashboard PWA assets
tools/new_run.py              prints an intake filename
.github/workflows/auto-sort.yml
                               sorts inbox uploads and commits generated run data
```

## Local maintenance

```bash
python tools/sort_inbox.py
python tools/build_manifest.py
python tools/pwa.py
python tools/new_run.py --model gpt-6 --category site-editorial --version 1
python -m http.server 8000
```

Open http://localhost:8000 for a local dashboard preview. Use the workflow for the normal GitHub upload path.
