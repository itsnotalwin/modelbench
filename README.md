# ModelBench

Fifteen open-ended tests for AI models: three websites, three games (an original 2D game, an original 3D game, a two-player duel), three visual pieces (a procedural image, an animated film, a shader piece), and six creative pieces (a branching story, a music machine, a toy, an explainer, a simulation, and one pure idea). The model chooses the concept in every test, and the game prompts forbid copying a known genre. Each test asks for three separate outputs (`v1` to `v3`), each a single HTML file that works on a phone and installs as an app.

**Dashboard:** https://itsnotalwin.github.io/modelbench/ (installable as an app too)

## Rating runs

Open a run, choose scores from 0 to 5 for the six axes, and select **Save rating**. The dashboard uses your ratings in its cards, comparison and leaderboard. Incomplete ratings remain unscored for the average. Ratings are saved in your current browser on this device, not to GitHub or other devices. Clearing browser site data will remove them.

Use **Export ratings** to download a JSON backup and **Import ratings** to restore or move it to another browser. Import merges ratings, replacing matching run ratings; it does not alter uploaded model files or repository metadata.

## Repo layout

```
index.html                dashboard (GitHub Pages entry, reads manifest.json)
manifest.json             generated: runs + the test catalog
manifest.webmanifest      dashboard install metadata
sw.js                     dashboard service worker (network-first)
icons/                    dashboard install icons
prompts/catalog.json      the fifteen tests (slug, title, bar, colour): single source of truth
prompts/NN-<slug>.md      one file per prompt; uploader header + model prompt
inbox/                    upload here (see inbox/README.md)
runs/<date>_<model>_<slug>_v<n>/   sorted runs: index.html (model's, untouched),
                          meta.json, manifest.webmanifest, sw.js, icons/
tools/sort_inbox.py       inbox -> runs/, writes meta.json, PWA assets, rebuilds manifest
tools/build_manifest.py   runs/*/meta.json -> manifest.json
tools/pwa.py              generates manifest, service worker and PNG icons (stdlib only)
tools/new_run.py          prints the exact upload filename for a model + test
.github/workflows/auto-sort.yml   runs sort_inbox.py on push
```

## Local checks

```
python tools/sort_inbox.py     # sort inbox/, add PWA assets, rebuild manifest.json
python tools/build_manifest.py # rebuild manifest.json only
python tools/pwa.py            # (re)create the dashboard's install assets
python tools/new_run.py --model glm-5.3-flash --category game-2d --version 2
python -m http.server 8000     # then open http://localhost:8000 (manifest.json and installs need http or https)
```

## Adding or changing a test

Add the test to `prompts/catalog.json` and write its `prompts/NN-<slug>.md`. The sorter, manifest and dashboard read the catalog, so no other file lists the slugs.
