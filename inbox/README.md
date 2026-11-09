# Submission inbox

Upload ZIP packages here using GitHub's web interface: open this folder, choose **Add file → Upload files**, select the ZIP, then commit the upload to `main`.

## One ZIP = one run

Each ZIP represents one model, one challenge and one version. If you submit v1, v2 and v3, upload three separate ZIPs. Do not put multiple versions in one archive.

Use this filename pattern:

```
{category}__{model}__{YYYY-MM-DD}__v{n}.zip
```

Example:

```
site-editorial__gpt-6__2026-11-09__v1.zip
```

- `category` must be one of the 15 slugs in `prompts/catalog.json`, such as `site-brand`, `game-2d`, `vis-image` or `idea`.
- `model` uses lowercase letters, digits, hyphens and dots, for example `gpt-6` or `glm-5.3-flash`.
- `YYYY-MM-DD` is the submission date.
- `v{n}` is the version number. Never overwrite an existing run; use the next unused version.

## ZIP contents

Recommended structure:

```
site-editorial__gpt-6__2026-11-09__v1/
├── index.html
├── meta.json
├── assets/                 (optional, only if the build needs them)
└── ...                     (other project files required by index.html)
```

The folder name inside the ZIP may be the same as the ZIP basename. The sorter also accepts the files directly at the ZIP root. The site entry should be `index.html`; the current sorter can also fall back to a root HTML file or a root `README.md`, but `index.html` is the expected dashboard submission.

### Metadata is authoritative for descriptions

Include a valid `meta.json` in every ZIP. It carries the submission information shown and indexed by ModelBench. Example:

```json
{
  "model": "gpt-6",
  "category": "site-editorial",
  "date": "2026-11-09",
  "version": 1,
  "entry": "index.html",
  "prompt": "02",
  "prompt_label": "Editorial feature",
  "notes": "A long-form editorial experience with interactive reading tools. Known limitation: ..."
}
```

Keep `model`, `category`, `date` and `version` consistent with the ZIP filename. The filename is the intake key used to route the upload into `runs/`; `meta.json` is the authoritative source for the descriptive metadata. Write the build summary and known limitations in `notes`. Do not use the filename or README as a substitute for metadata.

Do not include scores or evaluation results in model-authored metadata. Those belong to the benchmark organizer.

## What happens after upload

1. A push to `inbox/` starts the **Auto-sort inbox uploads** GitHub Actions workflow.
2. The sorter reads the challenge/model/date/version from the ZIP filename, safely unpacks the package, and keeps the supplied `meta.json`.
3. The run is placed under `runs/{date}_{model}_{category}_v{n}/`. The submitted HTML is not rewritten.
4. The workflow generates missing install assets, rebuilds `manifest.json`, and commits the processed run.
5. The dashboard reads the generated manifest and displays the new run.

Accepted file types are `.zip`, `.html` and `.htm`. ZIP is the preferred package format because it keeps `index.html`, `meta.json` and supporting assets together. Unsupported files such as `.rar` are not accepted.

## If an upload does not appear

- Open the repository's **Actions** tab and inspect the latest **Auto-sort inbox uploads** run.
- A malformed filename, unknown category, or existing run slug will be skipped. Use the exact pattern above and the next unused version.
- If ZIP extraction fails, the upload remains in `inbox/` so it can be corrected and retried.
- A valid upload is removed from `inbox/` after it has been moved into `runs/`.
