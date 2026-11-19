# ModelBench submission inbox

Upload one ZIP package per model run here using GitHub's web interface: open this folder, choose **Add file → Upload files**, select the ZIP, then commit the upload to `main`.

## One ZIP = one challenge = one run

ModelBench has **22 challenges** across websites, applications, games, visual tools, simulations and worlds. Choose exactly one prompt, produce one finished project folder and ZIP only that folder. Do not bundle multiple challenges, concepts or versions.

The ZIP filename and internal folder name are not used for routing. The importer reads the root `meta.json` and uses its `model`, `category`, `date` and `version`. These values must identify the intended run. The model resolves its own identity and current date; version is integer `1` for the one-shot benchmark. If runtime identity is genuinely unavailable, `unknown-model` is permitted, but it cannot distinguish two different submissions for the same challenge and date. Do not use a filename as a substitute for missing metadata.

## Current challenge catalogue

The category must be one of these 22 slugs:

`website`, `saas`, `game-2d`, `game-3d`, `restaurant`, `explainer`, `game-fps`, `arcade`, `os-sim`, `rubiks-cube`, `platformer`, `world-3d`, `data-story`, `generative-art`, `synth-studio`, `creative-tool`, `emergent-sim`, `game-strategy`, `spreadsheet`, `physics`, `island-pagoda`, `site-refresh`.

See [the prompt index](../prompts/README.md) for all 22 standalone briefs.

## Required ZIP structure

```text
website__gpt-6__2026-11-19__v1/
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
  "category": "website",
  "date": "2026-11-19",
  "version": 1,
  "entry": "index.html",
  "prompt": "01",
  "prompt_label": "Website",
  "notes": "A concise, honest description of the build and known limitations."
}
```

The category must match the prompt number and label. The importer validates the model slug, real calendar date, positive integer version, project root and entry file. ZIP names are deliberately ignored. Existing run folders are immutable: duplicate submissions are rejected and remain in the inbox. The importer never guesses a new model or version and never overwrites a run.

## What happens after upload

1. A push to `inbox/` starts the Auto-sort workflow.
2. The importer validates each ZIP independently and safely extracts valid submissions.
3. Each accepted project is written to `runs/{date}_{model}_{category}_v{n}/`.
4. The importer rebuilds `manifest.json`, the explorer catalog and public prompt copies from the canonical source files.
5. Accepted ZIPs are removed from the inbox only after the run folder is created. Rejected or duplicate ZIPs remain available for correction.
6. Regression tests run against the refreshed manifest and explorer catalog. Accepted runs are committed even if another ZIP in the same batch is rejected.

A red Auto-sort run can therefore mean that one or more uploads were correctly rejected, not that accepted submissions were lost. Check the workflow's sort logs for the exact filename and reason.

## Safety

- Include only files required to run the project.
- Never include credentials, API keys, private user data, `node_modules`, build output or dependency caches.
- The importer rejects path traversal, symbolic links, encrypted archives, duplicate paths and oversized archives.
- Do not include model-authored scores or claim tests passed unless they were run.
- Previous uploads in `archive/` are retained and are not automatically imported.
