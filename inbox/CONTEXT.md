# Inbox context

The root of this directory is the upload queue. The importer scans only direct child files and ignores directories. Prior unprocessed ZIPs are retained under `archive/` so they cannot be automatically imported when the catalogue changes. New submissions should be uploaded directly into this directory root.
