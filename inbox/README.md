# Inbox — upload here

Upload model outputs **here** (GitHub web: open this folder → "Add file" → "Upload files").

Rename each file **exactly** like this before uploading:

```
{category}__{model}__{YYYY-MM-DD}__v{n}.html
{category}__{model}__{YYYY-MM-DD}__v{n}.zip
```

- `category`: `website` | `saas` | `game2d` | `game3d`
- `model`: lowercase, hyphens only — e.g. `claude-sonnet-4-5`, `gpt-5`, `grok-4-1`
- `v{n}`: attempt number — `v1`, `v2`, …

Examples:

| File you upload | Action moves it to |
|---|---|
| `website__claude-sonnet-4-5__2026-11-06__v1.zip` (contains a folder with `index.html`) | `runs/2026-11-06_claude-sonnet-4-5_website_v1/` (folder renamed to the prefix) |
| `game2d__gpt-5__2026-11-06__v1.html` | `runs/2026-11-06_gpt-5_game2d_v1/` |
| `game3d__grok-4-1__2026-11-07__v2.html` | `runs/2026-11-07_grok-4-1_game3d_v2/` |

Rules:
- **The folder must be renamed to the benchmark prefix.** Rename the model's folder to `{date}_{model}_{category}_v{n}` before zipping (e.g. `the-grey-index/` → `2026-11-06_claude-sonnet-4-5_website_v1/`). The Action also renames it automatically on upload, so the repo folder always uses the prefix — never the model's creative name. Contents are untouched.
- **`.zip`** (website / SaaS folder outputs): zip contains a single folder with `index.html` at its root. The Action unpacks it to `runs/{date}_{model}_{category}_v{n}/`.
- **`.html`** (2D / 3D games, or single-file outputs): becomes `runs/.../index.html`.
- The Action also writes a `meta.json` (scores start empty) and rebuilds `manifest.json`, then commits itself. Takes ~30s.
- Files with a bad name are left in `inbox/` — rename and re-upload, or run the Action manually (Actions tab → "Auto-sort inbox uploads" → Run workflow).
- Already-sorted runs are never overwritten: use a new `v{n}` for a retest.

Scoring: open the run's `meta.json` on GitHub, edit `scores.visual` / `functionality` / `prompt_following` (0–10) and `notes`, commit. Editing any `meta.json` also triggers the Action, which rebuilds the dashboard manifest.
