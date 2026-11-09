# ModelBench submission inbox

Upload one ZIP package per model run here using GitHub's web interface: open this folder, choose **Add file → Upload files**, select the ZIP, then commit the upload to main.

## One ZIP = one prompt = one run

A ZIP contains exactly one completed project. Do not put multiple prompts, multiple model outputs or v1/v2/v3 variants into one archive.

The ZIP filename is not used for routing. Name it anything convenient, as long as it ends in .zip. The importer reads the JSON inside the archive. Category can be the canonical slug, exact challenge title or prompt number; conflicts are rejected. ZIP entry paths created on Windows are normalised safely, so ordinary backslash folder separators are supported. Display-style model names are converted into stable lowercase slugs and the original label is retained as model_label. The auto-sort workflow runs the dedicated ZIP-import regression suite before processing uploads.

## Required ZIP structure

Preferred structure:

~~~text
site-brand__gpt-6__2026-11-09__v1/
├── index.html
├── meta.json
└── assets/                 (optional, only essential runtime assets)
~~~

The archive may also contain index.html, meta.json and assets/ directly at its root. It must contain one unambiguous project root. Do not include a second submission folder or unrelated files.

## Required meta.json

~~~json
{
  "schema_version": 1,
  "model": "gpt-6",
  "category": "site-brand",
  "date": "2026-11-09",
  "version": 1,
  "entry": "index.html",
  "prompt": "01",
  "prompt_label": "Flagship Brand Experience",
  "notes": "One or two honest sentences describing the build and any known limitations."
}
~~~

The fields have these rules:
- model: model slug, lowercase letters, digits, hyphens and dots only.
- category: exact slug from prompts/catalog.json.
- date: valid ISO date (YYYY-MM-DD).
- version: positive integer, starting at 1.
- entry: must be index.html at the project root.
- prompt: prompt number, such as "01".
- prompt_label: challenge title.
- notes: short description and known limitations.

The importer reads and validates meta.json and uses its model, category, date and version as the only routing source. It ignores the ZIP filename and internal folder name for routing. It overwrites organizer-owned fields such as run slug, public path, scores and evaluation log with canonical values.

## What happens after upload

1. A push to inbox/ starts Auto-sort inbox uploads.
2. The sorter validates the ZIP structure and meta.json, then safely extracts the package.
3. It creates runs/{date}_{model}_{category}_v{n}/ using metadata values.
4. It adds canonical run metadata, generates missing install assets, rebuilds manifest.json and commits the processed run.
5. A successful ZIP is removed from inbox/. A ZIP with missing/invalid metadata, unsafe contents or a destination collision remains in inbox/ with a clear workflow error. Existing runs are never overwritten.

## Safety and upload hygiene

- Keep the archive to one project and only the files needed to run it.
- Do not include credentials, API keys, private user data, node_modules, build output or dependency caches.
- The importer rejects path traversal, symbolic links, encrypted archives, duplicate paths, oversized archives and suspicious compression ratios.
- Do not include model-authored scores or claim a test passed unless it was actually run.
- For a retest, increment the positive version in meta.json and the output-folder name. Never overwrite a previous run.
