# ModelBench — Open Benchmark Lab

A responsive, full-stack explorer for the [ModelBench](https://github.com/itsnotalwin/modelbench) one-shot build benchmark, built with Next.js App Router, React, PostgreSQL and Drizzle ORM.

## Workspace

- **Explore:** search actual artifact notes and titles, filter models and challenges, sort, bookmark, and switch gallery layouts.
- **Challenges:** browse all 13 web-development briefs by family. Read, copy, or download the unmodified prompt.
- **Inspect:** review original run notes, launch an upstream artifact, or open an isolated, on-demand preview in desktop, tablet, or phone dimensions.
- **Compare:** compare up to three runs, their six-axis scorecards, and opt-in live previews.
- **Leaderboard:** organizer-owned evaluations on the original 0–5 scale, in half-point steps. A run only ranks after all six axes are filled. Import and export the original ModelBench v1 ratings JSON format.

Bookmarks and scores persist in PostgreSQL. A random, HTTP-only cookie identifies each private browser workspace. HTTPS embeds use secure, partitioned cookies; local HTTP uses same-site cookies. The comparison selection and layout preference are stored locally. There is no sign-in or public/community score aggregation. Clearing cookies creates a new workspace; export ratings to move them between browsers.

## Hosting

GitHub Pages serves a static export of this app at <https://itsnotalwin.github.io/modelbench/>. `.github/workflows/deploy-pages.yml` runs `python tools/build_static.py /modelbench`, which copies the project to a scratch directory without `src/app/api` (route handlers cannot be exported), builds with `output: "export"` and `basePath: "/modelbench"`, and publishes `out/`. The workflow then uploads `out/` with `actions/upload-pages-artifact`.

Static hosting has no database: on Pages the workspace (bookmarks and scorecards) persists in each browser's `localStorage` instead of PostgreSQL. Running the app on a Node host keeps the `DATABASE_URL` path.

## Performance decisions

The public explorer pages are statically prerendered; no database or upstream GitHub request blocks the initial document. The compact catalog lives in `src/data/catalog.json`. Only six run cards are initially rendered, with responsive local WebP artwork and deferred loading below the first row. Fonts are self-hosted. No charting, icon, or component library is required. Inspector and guide components are code-split. Artifact iframes are never created until a live preview is explicitly requested, and are removed when closed.

The thumbnails are original editorial covers, not screenshots of the runs. The live builds and original source files remain hosted by the upstream project. All counts, submissions, model identifiers and challenge briefs derive from the source manifest; no synthetic performance scores are provided.

## Local setup

1. Install dependencies: `npm install`.
2. Set `DATABASE_URL` in `.env` to the local PostgreSQL instance.
3. Apply the schema with `npx drizzle-kit push`.
4. Run `npm run dev`, or `npm run build` for a production build.

`/api/health` verifies database connectivity. `/api/workspace` loads and updates the current browser's bookmarks and validated scores. Imports are validated before a single atomic database upsert.

## Refresh the catalog

`python tools/sync_catalog.py` rebuilds `src/data/catalog.json` and `public/briefs/` from this repo's own `manifest.json`, `runs/` and `prompts/` (no network). Add `--remote` to bootstrap from the published GitHub files. `tools/sort_inbox.py` runs both `build_manifest.py` and `sync_catalog.py`, so a new inbox upload lands in the explorer after the next auto-sort commit. The collector never executes submitted artifacts.

## Data pipeline in this repo

| Path | Role |
| --- | --- |
| `inbox/` | Drop uploads here: a ZIP with `meta.json` + `index.html` at its root, or a legacy `category__model__YYYY-MM-DD__vN.html`. |
| `runs/` | One folder per graded run, written by `tools/sort_inbox.py`. Artifacts stay byte-identical to the upload. |
| `prompts/` | Source briefs (`01-website.md` … `13-data-story.md`) and `catalog.json` (v16, 13 challenges). |
| `manifest.json` | Machine index built by `tools/build_manifest.py`. |
| `src/data/catalog.json` | Compact snapshot the explorer imports at build time. |
| `legacy/static-dashboard/` | The retired single-file `index.html` dashboard and its PWA generator, kept for reference. |

Pure-Python checks: `python -m unittest discover -s tests -p "test_sort_inbox.py" -v`, then `python tools/build_manifest.py && python tools/sync_catalog.py`.

## Validation

Run `npx next typegen`, `npm exec tsc -- --noEmit --pretty false`, then `npm run build`.

Browser regression tests: install Chromium with `npx playwright install --with-deps chromium`, start the production preview, then run `npx playwright test tests --workers=2`. Set `TEST_BASE_URL` to test another deployment.
