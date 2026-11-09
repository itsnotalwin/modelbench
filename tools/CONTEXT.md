# Tooling context

## Purpose
Own the repository's standard-library Python maintenance and inbox import tools.

## Key files
- sort_inbox.py — validates and safely imports ZIP metadata; legacy standalone HTML intake remains filename-routed.
- build_manifest.py — derives dashboard data from runs/*/meta.json and prompts/catalog.json.
- pwa.py — creates install assets for accepted runs and the dashboard.
- new_run.py — prints the output-folder and metadata contract; model detection is environment-assisted, date defaults to today and version is fixed at 1.

## Connections
The GitHub Actions workflow runs sort_inbox.py after inbox uploads. The sorter routes ZIPs from meta.json and must preserve failed uploads and existing runs.

## Change and verify
Prefer standard-library implementations. Test metadata validation, ZIP traversal protection, collisions and legacy behavior with tests. Run python -m unittest discover -s tests -v before commit.
