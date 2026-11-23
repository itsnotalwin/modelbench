# ModelBench · Thirteen web-development challenges

ModelBench currently contains **thirteen one-shot web-development challenges**. They are grouped by the primary technology or capability being tested, progressing from complete websites through HTML/CSS, JavaScript, Three.js, SVG and broader browser applications. Each prompt produces exactly one finished project folder and one ZIP. The model resolves its own model identity and current date; version is always 1.

## The challenges

| # | Challenge | Category slug | Group |
|---:|---|---|---|
| 01 | Website | website | Websites |
| 02 | Production Site Refresh | site-refresh | Websites |
| 03 | Restaurant Website | restaurant | Websites |
| 04 | Editorial Website | editorial-website | HTML/CSS |
| 05 | CSS Interactive Experience | css-experience | HTML/CSS |
| 06 | Design System | design-system | HTML/CSS |
| 07 | JavaScript Application | javascript-app | JavaScript |
| 08 | Three.js 3D Experience | threejs-experience | Three.js |
| 09 | SVG Drawing Studio | svg-studio | Visual |
| 10 | Creative Tool | creative-tool | Visual |
| 11 | Generative Art | generative-art | Visual |
| 12 | Browser Operating System | os-sim | Applications |
| 13 | Data Story | data-story | Data |

## Technology progression

- **Websites (01–03):** open-ended website creation, a demanding production-site rebuild and a complete hospitality website.
- **HTML/CSS (04–06):** editorial publishing, CSS-only interaction and reusable design-system engineering.
- **JavaScript (07):** a functional application built without a frontend framework.
- **Three.js (08):** a real interactive 3D browser experience.
- **Visual (09–11):** SVG vector editing, a professional creative tool and seeded generative artwork.
- **Applications (12):** a browser operating system with shared state and a virtual filesystem.
- **Data (13):** an interactive data story with linked visualisations.

## Creative freedom and fairness

Prompts define the capability, constraints and quality bar, not a preselected fictional brand or visual theme. Models choose the subject, identity, content and creative direction wherever the technology does not require a specific choice. Run each model from a clean, isolated workspace with equivalent tool access. Review the rendered artifact and exercise the acceptance criteria independently; self-reported test status is not proof.

The shared six-axis scorecard is completeness, robustness, craft, depth, originality and performance. Existing submissions and their organizer-owned evaluations remain immutable when the prompt catalogue is reordered or expanded.

## Run a challenge

1. Choose one numbered prompt and give it to the model in a clean workspace.
2. The model identifies its runtime model slug, uses the current system date and fixes version to `1`.
3. It creates one folder named `CATEGORY__MODEL_SLUG__YYYY-MM-DD__v1` with `index.html`, `meta.json` and only essential local assets.
4. ZIP that one folder and upload it to [inbox/](../inbox/README.md).
5. The importer routes the package using `meta.json`, not the ZIP filename or folder name.

## Required metadata

```json
{
  "schema_version": 1,
  "model": "gpt-6",
  "category": "website",
  "date": "2026-11-23",
  "version": 1,
  "entry": "index.html",
  "prompt": "01",
  "prompt_label": "Website",
  "notes": "A concise, honest description of the build and known limitations."
}
```

The category, prompt number and label must identify the same challenge. The version is always integer `1`. The importer rejects invalid or duplicate submissions without overwriting existing runs. Ratings and evaluation logs remain organizer-owned.

## Repository map

- `prompts/01-*.md` through `prompts/13-*.md` — standalone challenge briefs.
- `prompts/catalog.json` — canonical thirteen-challenge catalogue.
- `manifest.json` — generated dashboard data.
- `inbox/` — incoming ZIP submissions.
- `runs/` — accepted immutable submissions.
- `tools/` — importer, manifest and PWA utilities.
- `tests/` — importer, prompt and dashboard regression tests.

Validation: `python -m unittest discover -s tests -p "test_sort_inbox.py" -v`, then `python tools/build_manifest.py && python tools/sync_catalog.py`.
