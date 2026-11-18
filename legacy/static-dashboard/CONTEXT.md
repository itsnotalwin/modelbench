# Test suite context

## Purpose
Hold regression tests for importer behavior, the twenty-two-prompt catalogue and dashboard interactions.

## Key files
- `test_sort_inbox.py` — ZIP metadata routing, validation, collision safety, legacy HTML parsing, catalog integrity across all twenty-two challenges, automatic run identity and fixed version 1.
- `dashboard-ratings.test.js` and `test_dashboard_ui.py` — rating and dashboard UI checks, including the empty state after a reset.

## Change and verify
Run `python -m unittest discover -s tests -v` and `node --test tests/dashboard-ratings.test.js`. Add regression tests for intake and metadata changes. The post-reset baseline is deliberately empty: manifest count is zero, and the catalog contains exactly three Web and three Games challenges. Do not treat the empty run set as a failure.
