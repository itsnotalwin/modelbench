# ClearOps — customs clearance workflow SaaS for clearing agents

## What it is

ClearOps is a working, local-first SaaS product for customs clearing agents
(freight forwarders / customs house agents) that runs the import clearance
workflow end to end: from shipment intake and party management, through duty &
tax calculation and status progression, to document generation (commercial
invoice, packing list, bill of entry) and delivery closure.

It is intentionally domain-specific — not generic CRUD with a new theme. The
core clearance lifecycle (draft → docs received → filed → examined → assessed →
duty paid → out for delivery → delivered → closed) is enforced, duty/cess/IGST
are calculated per HS-code-based rates, demurrage is tracked against free days,
and real PDFs can be generated and downloaded for every shipment.

## Who it serves

- **Clearing agents / customs house agents** managing import clearance files
- **Freight forwarders** coordinating documents and carrier handoffs
- **Import operations desks** tracking duty payable, demurrage exposure and
  milestone status per shipment

## Problems it solves

1. **No single source of truth** — shipments, parties, documents and status
   history live in one SQLite database instead of spreadsheets and email.
2. **Duty/tax math done by hand** — CIF, customs duty, cess and IGST/VAT are
   calculated automatically and stored per shipment.
3. **Demurrage blind spots** — billable days beyond free days are surfaced as
   alerts on the dashboard.
4. **Document chaos** — commercial invoice, packing list and bill of entry PDFs
   are generated from the shipment record and attached to the file.
5. **Status regression** — the clearance lifecycle only moves forward, preventing
   invalid back-dating of milestones.

## Domain logic implemented

- Shipment CRUD with full input validation (reference format, HS code pattern,
  non-negative money/quantity, date ordering, unique reference).
- Status lifecycle with forward-only transitions enforced on every change, plus
  an immutable status history audit trail.
- Duty & tax calculation: assessable value = unit price × qty + freight +
  insurance; customs duty = CIF × rate%; cess = (CIF + duty) × rate%;
  IGST/VAT = (CIF + duty + cess) × rate%; total payable = sum of the three.
- Demurrage calculation against a configurable free-days allowance and per-day
  rate, with dashboard alerts.
- PDF generation: commercial invoice, packing list and bill of entry
  (import declaration) — real PDFs via ReportLab, no external service.
- Party registry (importer/exporter/consignee/agent/carrier) linked to
  shipments; deletion blocked when a party is in use.
- Search and filtering of shipments by reference, BL number, description,
  importer and status.
- Authentication: sign up / sign in / sign out with hashed passwords and
  session-based access control. All mutation routes require login.

## Architecture

- **Stack:** Python 3 + Flask (server-rendered Jinja2 HTML), SQLite database
  (single `.db` file in `instance/`, persists between sessions), ReportLab for
  PDF generation. No external services, no API keys, no paid accounts.
- **Modules:**
  - `app.py` — Flask app, all routes, auth, validation, domain orchestration
  - `db.py` — SQLite connection, schema, query helpers
  - `calc.py` — pure duty/demurrage/status-transition logic (unit-tested)
  - `documents.py` — PDF generation (invoice, packing list, bill of entry)
  - `seeds.py` — loads realistic demo data on first launch
  - `static/css/style.css` — strict monochrome design system
  - `static/js/app.js` — progressive enhancements only
  - `templates/` — Jinja2 HTML templates
  - `tests/test_calculations.py` — unittest suite for core logic
- **Security basics:** hashed passwords (werkzeug), session-based auth, CSRF
  aware via POST forms, input validation on every write, parameterised SQL
  queries (no injection), file-upload allow-list, unique reference constraint.

## How to run

One install command, one start command:

```
# 1. Install dependencies (one command)
uv pip install -r requirements.txt

# 2. Load seed data so the product is usable on first launch (optional but recommended)
uv run python seeds.py

# 3. Start the app (one command)
uv run python app.py
```

Then open **http://127.0.0.1:5000**. Sign up for an account, or use the
seeded data which ships with six shipments across different clearance stages.

Run the tests:

```
uv run python -m unittest tests.test_calculations -v
```

### Fresh-machine notes

- On Windows, if `uv` is not on PATH, install it from https://github.com/astral-sh/uv
  then run the commands above from the project folder.
- The database (`instance/clearance.db`), uploads (`uploads/`) and generated
  PDFs (`generated_pdfs/`) are created automatically on first run.
- `SECRET_KEY` can be set as an environment variable for production; a dev
  fallback is used otherwise.

## What is implemented

| Area | Implemented |
|------|-------------|
| Auth (signup/login/logout) | Yes |
| Shipment CRUD | Yes |
| Search & filter | Yes |
| Status changes (forward-only) | Yes + audit history |
| Duty / tax calculation | Yes |
| Demurrage tracking & alerts | Yes |
| Document upload | Yes |
| PDF generation (invoice, packing list, bill of entry) | Yes |
| Party registry with referential guard | Yes |
| Input validation + empty states | Yes |
| Unit tests for core logic | Yes |
| Monochrome SaaS-grade UI | Yes |

## Known limitations

- Single-user-ish model: roles exist (`user`) but there is no granular
  permission system beyond login-required.
- File uploads are stored on local disk; no virus scanning or size quotas
  beyond a 12 MB request cap.
- PDFs are generated on demand and stored; no e-signature or customs portal
  integration (would require external credentials, which are out of scope).
- Concurrency: SQLite handles the expected local-team load; not designed for
  high-write multi-region SaaS scale.
- No "forgot password" flow — password reset would require an email provider,
  which is out of scope for the no-external-services constraint.
