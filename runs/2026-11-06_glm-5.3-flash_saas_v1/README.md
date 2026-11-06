# ClearLink — Clearing & Freight Operations Desk

A working single-product SaaS for **customs clearing agents and freight forwarders** on the import side:
capture consignments, compute the landed cost (duty, excise, import VAT per HS-coded line, port storage/demurrage,
agent fees), drive each shipment through a **guarded clearance workflow**, and issue the documents a clearing desk
actually produces — bill of entry, tax invoice, quotation — plus CSV exports for the ledger.

Everything runs in the browser with **no server, no build step, no install**.

## Run it

**Primary (zero-install):** open `index.html` directly in any modern browser (double-click it, or
`file:///…/2026-11-06_glm-5.3-flash_saas_v1/index.html`). It also works served from any static host
(GitHub Pages, `python -m http.server`, …). All asset references are relative.

**Tests (optional):**

```
node tests/run-tests.js        # 58 assertions over the core domain logic, no install needed
```

or open `tests/tests.html` in the browser for the same suite as a page.

## Demo credentials

| Email | Password |
|---|---|
| `demo@clearlink.co.za` | `demo1234` |

…or click **Use demo account** on the sign-in screen. Sign-up is fully functional too (new accounts share the
single demo workspace).

## Who it serves and the angle

Small clearing agencies live or die on three numbers: the **landed cost they quote**, the **charges they can
recharge**, and the **demurrage they fail to notice**. ClearLink is scoped tightly to that desk:

- **Consignments** — one record per import shipment (sea/air/LCL), with cargo lines coded against an editable
  **HS tariff schedule** and the **exchange rate captured on the arrival date** (auto-filled from a rate table you maintain).
- **Landed cost engine** — CIF = FOB + freight + insurance + other; per line: duty, then excise on (value + duty),
  then VAT on (value + duty + excise); zero-rated/exempt codes supported per tariff line. Demurrage accrues by
  tiered per-container-day rates (sea) or per-kg/day (air and LCL) after the free period, and keeps accruing
  until release. Agent fees from an editable schedule (per entry, per line, disbursement).
- **Guarded workflow** — `Draft → Docs pending → Lodged → Assessed → Duty paid → Released → Delivered → Closed`,
  plus **Customs query** (remembers where it came from) and **Cancelled**. The engine refuses invalid moves:
  nothing lodges without invoice/packing list/BL, nothing is marked duty-paid until recorded payments cover the
  assessment, nothing closes before the client invoice exists. Blocked buttons explain themselves.
- **Documents** — print-ready **bill of entry**, **tax invoice** (duty/VAT/demurrage recharged at cost + fees) and
  **quotation** with a validity date; all rendered as standalone printable HTML.
- **Quotations** — build a landed-cost estimate before the goods ship (live preview while editing), send →
  accept/decline, and **convert an accepted quote into a consignment** in one click.
- **Money trail** — duty/VAT payments with references and a coverage bar; client invoices; open-invoice totals per
  client; CSV exports: consignment list (filtered view), all invoices, per-client statement, full JSON backup.
- **Dashboard** — KPIs (duty & VAT outstanding, demurrage accruing, open invoices…), pipeline by status,
  demurrage exposure aging, recent activity.

## Architecture

```
2026-11-06_glm-5.3-flash_saas_v1/
├── index.html          # entry point — loads the three scripts + stylesheet, no build
├── styles.css          # strict monochrome design system (black/white/greys only)
├── js/
│   ├── core.js         # pure domain logic: landed cost, demurrage tiers, status guard
│   │                   #   engine, validation, document HTML, CSV, sha256 — no DOM.
│   │                   #   Also loadable in Node (module.exports) for the tests.
│   ├── seed.js         # deterministic demo data: 6 clients, 26 HS lines, 9 FX rates,
│   │                   #   14 consignments across every status, 3 quotations
│   └── app.js          # vanilla-JS SPA: hash router, delegated events, localStorage
│                       #   persistence, auth, views, modals, print & download
├── tests/
│   ├── suite.js        # shared assertion suite (browser + Node)
│   ├── run-tests.js    # Node runner: node tests/run-tests.js
│   └── tests.html      # browser runner
└── README.md
```

- **State**: `localStorage` keys `clearlink.users.v1`, `clearlink.data.v1`, `clearlink.session.v1`. Every access is
  wrapped in try/catch; if storage is blocked the app degrades to in-memory mode with a visible banner.
- **Auth**: email + password accounts; passwords are salted and SHA-256 hashed before storage (client-side only —
  see limitations). Session survives reloads.
- **Rendering**: string templates + full re-render per navigation; list views re-render only their result region
  so search focus is never lost. Event handling is fully delegated (click/change/input/submit/keydown).

## Keyboard

- `/` focus global search · `Enter` in search jumps to the filtered consignment list
- `N` new consignment / client / tariff line / quotation (context-dependent)
- `Esc` closes any dialog

## Known limitations

- **Single-tenant demo workspace**: all accounts share one dataset (fine for a desk tool demo; multi-tenancy
  needs a server).
- **Client-side auth only**: hashing prevents casual shoulder-surfing of the stored password but is not real
  security; a production build needs a server-backed identity provider.
- **Tariff & rates are illustrative**, realistic in shape but not an official tariff — the schedule is fully
  editable per installation. Exchange-rate table is manual (no live FX feed by design: no API keys).
- **Demurrage model** is tiered per terminal-day as configured; racking/equipment surcharges and free-day
  exceptions per shipping line are not modelled.
- Documents are generated as printable HTML (browser print-to-PDF) rather than filled official SAD/CUSDEC
  forms; verify against source documents before submission.
- `localStorage` holds all data in the one browser profile; use **Settings → Download backup** for a JSON copy.
