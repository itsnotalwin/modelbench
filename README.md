# ModelBench

Ten open-ended tests for AI models: websites, a useful app, algorithms, engineering simulation, three.js scenes, an arcade pack, procedural images, a short animated film, a tool-calling playground, and an academic explainer. The model chooses the concept in every test. Each output is a single HTML file.

**Dashboard:** https://itsnotalwin.github.io/modelbench/

## Repo layout

```
index.html               dashboard (GitHub Pages entry, reads manifest.json)
manifest.json            generated: runs + the test catalog
prompts/catalog.json     the ten tests (slug, title, bar, colour): single source of truth
prompts/NN-<slug>.md     one file per prompt; uploader header + model prompt
inbox/                   upload here (see inbox/README.md)
runs/<date>_<model>_<slug>_v<n>/   sorted runs, index.html + meta.json
tools/sort_inbox.py      inbox -> runs/, writes meta.json, rebuilds manifest
tools/build_manifest.py  runs/*/meta.json -> manifest.json
tools/new_run.py         prints the exact upload filename for a model + test
.github/workflows/auto-sort.yml   runs sort_inbox.py on push
```

## Local checks

```
python tools/sort_inbox.py     # sort anything in inbox/ and rebuild manifest.json
python tools/build_manifest.py # rebuild manifest.json only
python tools/new_run.py --model glm-5.3-flash --category threejs
python -m http.server 8000     # then open http://localhost:8000 (manifest.json won't load from file://)
```

## Adding or changing a test

Edit `prompts/catalog.json` and add the matching `prompts/NN-<slug>.md`. The sorter, manifest and dashboard read the catalog, so no other file lists the slugs.
