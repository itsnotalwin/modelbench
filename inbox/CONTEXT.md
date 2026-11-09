# Inbox context

## Purpose
Document and hold incoming one-ZIP-per-run model submissions before automated import.

## Key files
- README.md — upload steps, required archive layout and metadata contract.
- ZIP files — unprocessed submissions; the importer reads meta.json inside each package.

## Connections
The auto-sort workflow runs on pushes under inbox/. tools/sort_inbox.py validates metadata and moves valid projects into runs/. A successful import removes the ZIP; a rejected ZIP remains available for correction.

## Change and verify
Never manually delete or rename a failed upload without investigating its error. ZIP filename is not a routing key. Retests require a new positive version in meta.json so existing run data stays immutable.
