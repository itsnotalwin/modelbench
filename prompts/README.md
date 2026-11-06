# Prompts

All prompts enforce two hard rules so runs can be compared online:

1. **Naming** (mandatory, in the model prompt itself):
   - Folder-based (`01`, `02`): `{YYYY-MM-DD}_{model-slug}_{category}_v1/` containing `index.html` at its root
   - Single-file (`03`–`12`): `{category}__{model-slug}__{YYYY-MM-DD}__v1.html`
   - `model-slug` = the model's name, lowercased, spaces → hyphens (dots allowed, e.g. `glm-5.3-flash`)
2. **Entry point**: everything runs with no server, no build step and no install, from `file://` or a static host. All paths relative.

Send the model everything below the `## Model prompt` line. Do not send the uploader header.

| # | File | Category | Output type |
|---|---|---|---|
| 01 | `01-website.md` | `website` | folder + `index.html` |
| 02 | `02-saas.md` | `saas` | folder + server-free `index.html` |
| 03 | `03-2d-game.md` | `game2d` | single `.html` |
| 04 | `04-3d-game.md` | `game3d` | single `.html` |
| 05 | `05-cafe-website.md` | `website` | single `.html` |
| 06 | `06-engine-sim.md` | `website` | single `.html` |
| 07 | `07-fps.md` | `game3d` | single `.html` |
| 08 | `08-runner.md` | `game2d` | single `.html` |
| 09 | `09-os-sim.md` | `website` | single `.html` |
| 10 | `10-rubiks-cube.md` | `game3d` | single `.html` |
| 11 | `11-platformer.md` | `game2d` | single `.html` |
| 12 | `12-cyberpunk-os.md` | `game3d` | single `.html` |

Upload to `inbox/` with the matching inbox filename — see [`../inbox/README.md`](../inbox/README.md).
