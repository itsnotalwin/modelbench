# Inbox — upload here

Upload model outputs here through GitHub web: open this folder → **Add file** → **Upload files**.

Rename the file exactly like this before uploading:

```
{test}__{model}__{YYYY-MM-DD}__v{n}.html
```

- `test` comes first, then the model, date and version, separated by **double** underscores.
- `test` is one of the ten slugs in `prompts/catalog.json`: `website`, `webapp`, `codelab`, `engineer`, `threejs`, `arcade`, `image`, `motion`, `tooluse`, `academic`.
- `model`: lowercase, hyphens and dots, for example `claude-sonnet-4-5`, `glm-5.3-flash`, `gpt-5`.
- `v{n}`: attempt number. A retest is `v2`, never an overwrite.

Example: `threejs__glm-5.3-flash__2026-11-09__v1.html` → `runs/2026-11-09_glm-5.3-flash_threejs_v1/index.html`

> Do not use the run-folder name here. `2026-11-09_glm-5.3-flash_threejs_v1.html` is skipped.
> Only `.html` (or `.zip` with `index.html` at its root). Never `.rar`.

The Action moves each file into `runs/`, writes its `meta.json` (scores start empty), and rebuilds `manifest.json`. A file with a bad name stays here until you rename it.
