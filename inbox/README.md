# ModelBench submission inbox

Upload one ZIP package per model run here using GitHub's web interface: open this folder, choose **Add file → Upload files**, select the ZIP, then commit the upload to main.

## One ZIP = one challenge = one run

The suite contains six mega-prompts: three web-development challenges and three game-development challenges. Select one prompt, produce one finished project folder and ZIP only that folder. Do not bundle multiple challenges, concepts or versions.

The ZIP filename is not used for routing. The importer reads `meta.json` inside the archive and uses its model, category, date and version. The model resolves its own model identity and current date; version is always integer `1`. The organiser must never be asked for these values.

## Current catalogue

The six categories are `site-brand`, `site-editorial`, `web-app`, `game-2d`, `game-3d` and `game-masterpiece`. See [the prompt index](../prompts/README.md) for the six standalone briefs.

## Required ZIP structure

```text
site-brand__gpt-6__2026-11-09__v1/
├── index.html
├── meta.json
└── assets/                 (optional, only essential local assets)
```

A ZIP may also contain those project files directly at its root. It must contain one unambiguous project root.

## Required meta.json

```json
{
  "schema_version": 1,
  "model": "gpt-6",
  "category": "site-brand",
  "date": "2026-11-09",
  "version": 1,
  "entry": "index.html",
  "prompt": "01",
  "prompt_label": "Brand & Business Website",
  "notes": "A concise, honest description of the build and known limitations."
}
```

The importer treats metadata as authoritative and ignores the ZIP filename and folder name for routing. Categories must match the six catalogue slugs. Invalid uploads stay in the inbox with actionable errors; existing runs are never overwritten.

## What happens after upload

1. A push to `inbox/` starts the Auto-sort workflow.
2. The importer validates ZIP structure and metadata, then safely extracts the project.
3. It creates `runs/{date}_{model}_{category}_v{n}/`.
4. It adds canonical metadata, generates install assets and rebuilds `manifest.json`.
5. A successful ZIP is removed from inbox. Invalid or duplicate ZIPs remain for correction.

## Safety

- Include only files required to run the project.
- Never include credentials, API keys, private user data, `node_modules`, build output or dependency caches.
- The importer rejects path traversal, symbolic links, encrypted archives, duplicate paths and oversized archives.
- Do not include model-authored scores or claim tests passed unless they were run.
