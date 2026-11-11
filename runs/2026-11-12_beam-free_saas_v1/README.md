# ClearDesk — SaaS for Clearing Agents

A working, single-page SaaS product for customs clearing and freight forwarding agents. Manages the full lifecycle of a clearing job: clients, shipments, customs entry lines with duty/VAT, demurrage, charges, invoicing and document generation.

## Run

No install, no build, no server. Open `index.html` in any modern browser (Chrome/Edge/Firefox/Safari), or serve the folder statically (e.g. GitHub Pages). State persists in `localStorage`.

Optional tests (Node 18+): `node --test tests/core.test.js`

## Demo credentials

- admin@cleardesk.demo / demo123
- agent@cleardesk.demo / demo123
- clerk@cleardesk.demo / demo123

You can also sign up a new account.

## Architecture

- `index.html` — entry point.
- `assets/core.js` — pure domain logic (calculations, validations, status transitions, document builders, CSV, safe storage helpers). No DOM.
- `assets/data.js` — storage layer + seed data.
- `assets/app.js` — UI, routing, modals, events.
- `assets/styles.css` — monochrome design system.
- `tests/core.test.js` — node tests for core logic.

## Implemented

- Auth: sign in / sign up, session persistence, roles.
- Dashboard KPIs, recent jobs, demurrage alerts.
- Jobs: CRUD, search, filter (status/mode/type/client), status transitions with validation.
- Clients: CRUD with referential integrity.
- Customs entries: HS lines, duty & VAT calculation, totals.
- Charges: multi-currency, FX conversion, totals.
- Demurrage calculator (free days, chargeable days, cost).
- Documents: commercial invoice, packing list, delivery order, charge sheet (printable).
- CSV export (jobs, clients, entries).
- Reports by status/mode.
- Settings: company profile, FX rates, defaults, data reset.
- Keyboard shortcuts (Ctrl/Cmd+K palette, / search, n new, Esc close).

## Known limitations

- Client-side only: passwords stored in plain text in localStorage (demo-grade; not production auth). No real backend, no multi-user sync.
- No real HS code database or live customs tariff lookup; duty rates entered manually.
- PDF export relies on browser print-to-PDF.
- Demurrage uses calendar days; no weekend/holiday exclusions.
