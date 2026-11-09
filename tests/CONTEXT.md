# Test suite context

## Purpose
Hold regression tests for ModelBench import behavior and dashboard state utilities.

## Key files
- test_sort_inbox.py — ZIP metadata routing, validation, collision safety, legacy HTML parsing, catalogue-driven prompt integrity, automatic run identity and partial-success/rejection behavior.
- dashboard-ratings.test.js and test_dashboard_ui.py — existing dashboard rating and UI checks.

## Connections
Importer tests load tools/sort_inbox.py and replace its filesystem paths/catalog with isolated temporary fixtures. They must not touch the real inbox or runs directory.

## Change and verify
Run python -m unittest discover -s tests -v and node tests/dashboard-ratings.test.js where Node is available. Add regression tests for every intake or metadata bug, including preservation of rejected ZIPs when other uploads succeed, prompt auto-identification and fixed version 1.
