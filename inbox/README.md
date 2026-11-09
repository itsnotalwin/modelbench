# Inbox — upload here

Upload model outputs here through GitHub web: open this folder → **Add file** → **Upload files**.

Each test gives three files, `v1`, `v2` and `v3`. Upload each one separately, renamed exactly like this:

```
{test}__{model}__{YYYY-MM-DD}__v{n}.html
```

- `test` comes first, then the model, date and version, separated by **double** underscores.
- `test` is one of the twelve slugs in `prompts/catalog.json`: `website`, `webapp`, `codelab`, `engineer`, `threejs`, `game2d`, `game3d`, `image`, `motion`, `tooluse`, `academic`, `toy`.
- `model`: lowercase, hyphens and dots, for example `claude-sonnet-4-5`, `glm-5.3-flash`, `gpt-5`.
- `v{n}`: `v1`, `v2` and `v3` for the three outputs of one prompt. A retest of the same prompt starts at `v4`. Never overwrite a run.

Example: `game3d__glm-5.3-flash__2026-11-09__v2.html` → `runs/2026-11-09_glm-5.3-flash_game3d_v2/index.html`

> Do not use the run-folder name here. `2026-11-09_glm-5.3-flash_game3d_v2.html` is skipped.
> Only `.html` (or `.zip` with `index.html` at its root). Never `.rar`.

The Action moves each file into `runs/`, writes its `meta.json` (scores start empty), and rebuilds `manifest.json`. A file with a bad name stays here until you rename it.
