# Clearline Ops

A customs clearing & freight-forwarding command centre for clearing agents — the people who
lodge entries, pay duties, chase documents and get cargo released at ports and border posts.

**Sharp angle:** not generic shipment tracking. Clearline Ops is built around the three things
that actually block a release: **(1) cost accuracy** (CIF → duty → VAT → total payable, with FX),
**(2) document completeness** (BL, invoice, packing list, origin, permits), and **(3) status
discipline** (a shipment can only move through a legal customs pipeline, and anything sitting
in Arrived/Lodged/Assessed/Query for >7 days is flagged overdue). One screen answers:
*what do we owe customs, what documents are missing, and what is stuck?*

Strictly monochrome (black / white / greys only), dense but legible, keyboard-friendly (`/` focuses search).

## Run it (one install, one start — actually zero installs)

Requires **Python 3.10+** only. No dependencies, no API keys, no external accounts.

```sh
# install: none needed (standard library only)
python app.py          # http://127.0.0.1:8000
```

Windows: double-click `run.bat`. macOS/Linux: `./run.sh` (or `python3 app.py`).
Environment: `PORT=8000` (default), `HOST=127.0.0.1` (default).

On first launch the SQLite database is created at `data/clearline.db` and seeded.

**Demo logins**

| Email | Password | Role |
|---|---|---|
| `demo@clearline.local` | `Demo1234!` | admin |
| `agent@clearline.local` | `Agent1234!` | agent |

You can also sign up at `/signup`.

## What is implemented

- **Auth** — sign up / sign in / sign out, PBKDF2 password hashing, hashed session tokens (7 days, HttpOnly cookie). All pages except login/signup require auth.
- **Dashboard** — pipeline counts by status, overdue (>7 days in active statuses), documents-pending queue, total payable on active shipments (local currency).
- **Shipments (full CRUD)** — reference (unique), client, direction (Import/Export/Transit), mode (Sea/Air/Road/Rail), route, port/border post, HS code, goods, weight, value/freight/insurance, duty rate, currency + FX, agent fees, arrival date, priority, document checklist, notes. Search (reference/goods/client), filter by status/client/mode/direction, overdue-only toggle, empty states.
- **Domain logic** — `CIF = Value+Freight+Insurance`, `Duty = CIF × duty%`, `VAT = (CIF+Duty+Port) × VAT%` (VAT from the HS tariff table), total payable, agent fees, total-to-client, local-currency conversion. Input validation (numeric, non-negative, rates 0–100, dates, required fields) with inline errors.
- **Status workflow** — enforced transitions: `PRE_ARRIVAL → ARRIVED → LODGED → ASSESSED → RELEASED → DELIVERED`, with `QUERY` hold from Arrived/Lodged/Assessed and `CANCELLED` from any active state. Illegal moves return 400. Every create/update/status/delete is written to an **audit trail** shown on the shipment page.
- **Clients** — create + list with shipment counts.
- **Duty & VAT calculator** — standalone estimator using the same engine; HS tariff table (`/hs`).
- **Documents** — printable **Cost Estimate** and **Clearing Instruction** per shipment (browser Print → Save as PDF), plus **CSV export** of all shipments.
- **Seed data** — 4 clients, 8 HS codes, 8 shipments across the pipeline (including a disputed-classification query and an overdue arrival).
- **UX** — responsive, labelled forms, visible focus, `/` search shortcut, print styles.

## Architecture

```
clearline-ops/
  app.py                  entry point (PORT/HOST env)
  run.bat / run.sh        launchers
  requirements.txt        empty by design (stdlib only)
  clearline/
    domain.py             pure domain logic: costing, validation, transitions, overdue, docs
    db.py                 SQLite schema, PBKDF2 auth, sessions, seed data, audit
    web.py                ThreadingHTTPServer handler, routing, rendering, monochrome CSS
  tests/
    test_domain.py        costing maths, transitions, validation, overdue/docs
    test_db.py            seed, auth/session, unique reference, password hashing
    test_web.py           in-process HTTP smoke test (login → dashboard → list/detail/HS/CSV)
  data/                   created on first run (clearline.db)
```

Stack: Python standard library only (`http.server`, `sqlite3`, `hashlib`). No framework, no
JavaScript build, no CDN. Data persists in SQLite (WAL mode); delete `data/clearline.db` to reset to seed data.

## Tests

```sh
python -m unittest discover -s tests -v
```

Verified: 11 domain/DB tests + in-process HTTP smoke test (login, dashboard, shipment list/detail,
HS table, CSV export, create → illegal transition blocked → legal transition → delete, signup).

## Known limitations

- Single-process server with one shared SQLite connection (fine for a small agency/demo; not for high concurrency).
- No CSRF tokens (same-site cookie + POST forms; add tokens before internet-facing deployment).
- VAT/duty rates are illustrative seed values in the HS table, not a live SARS/HMRC tariff feed — edit `db.py` seed or the table to match your jurisdiction.
- No file uploads (document checklist is boolean per document; store files in your DMS and reference them in notes).
- Currency is manual FX to local per shipment (no live rates).
- No multi-tenant organisations, roles are `admin`/`agent` labels only, and no email/password reset.
