# 03 · Commerce and Booking Marketplace

## Run parameters
Set these three values before starting the run. They must be the same values written into the output folder and metadata.

- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

If a value is still bracketed, stop and ask the organizer to fill it in. Do not invent the model identifier or date.

## The brief

Build **KitLoop**, a polished peer-to-peer equipment rental marketplace for people who need useful gear for a day or a weekend without buying it. The product should feel trustworthy, practical and easy to scan. It is a complete front-end booking demo with realistic local state, not a static product grid.

Use this fixed inventory. Prices are per day in ZAR. All availability is fictional demo data.

| Item | Category | Price/day | Available units |
|---|---|---:|---:|
| Mirrorless camera body | Camera | R550 | 2 |
| Portrait lens, 50mm | Camera | R240 | 3 |
| Travel tripod | Camera | R90 | 4 |
| Portable LED light kit | Camera | R180 | 2 |
| Field audio recorder | Audio | R210 | 2 |
| Wireless lavalier pair | Audio | R160 | 3 |
| Compact projector | Event | R300 | 1 |
| Portable PA speaker | Event | R280 | 2 |
| Two-person hiking tent | Outdoor | R190 | 3 |
| Compact camp stove | Outdoor | R80 | 4 |
| Inflatable SUP board | Outdoor | R350 | 2 |
| Waterproof dry bag | Outdoor | R45 | 5 |

## Product requirements

1. Create a complete marketplace shell with clear navigation, useful trust/help information, a strong search surface, category navigation and a consistent visual identity.
2. Render all 12 inventory items from one structured data source. Each item needs a clear name, category, price, availability and a meaningful visual treatment. Generate product illustrations or icons with inline SVG/CSS; do not rely on remote product photography.
3. Implement working search, category filters, availability filtering, price sorting and a useful empty state. Filters must compose rather than overwrite one another.
4. Each item opens a detail view with description, rental conditions, quantity selection and a date range. Calculate rental duration and line totals correctly, including validation of end date after start date and quantity not exceeding stock.
5. Build a cart that supports quantity changes and removal, calculates subtotals and a transparent demo service fee, and preserves its contents after reload. Changing dates must recalculate the total.
6. Implement a multi-step demo booking flow: renter details, booking review and confirmation. Validate fields inline. No real payments, identity checks, email or third-party booking calls. The confirmation must clearly state that this is a local demo and no real reservation was made.
7. On confirmed demo bookings, update local demo availability consistently. Provide an organizer-friendly way to reset the seeded demo state.
8. Make the experience responsive, keyboard-accessible and touch-friendly. Dialogs must close with Escape and return focus to the invoking control.

## Quality bar

This should feel like a credible product that could be handed to a small business, not a generic e-commerce template. Make browsing, comparison, booking and recovery states intentional. Use meaningful copy and consistent product data. Avoid fake reviews, fake partner logos, fake payment success and controls that do nothing.

Keep the implementation self-contained in one HTML file with inline CSS/JS. Use no external APIs, remote images, fonts, payment services, build tools or third-party dependencies. Persist only non-sensitive demo data locally. Use semantic HTML, good contrast, visible focus and reduced-motion support.

## Acceptance checklist

Before finishing, verify that:
- Exactly the 12 specified inventory items appear, with correct category, daily price and starting stock.
- Search, category, availability and price sorting work together.
- Rental dates and quantity produce correct line totals and reject invalid ranges/stock.
- Cart edits, removal, subtotal and fee calculations update correctly.
- Reloading preserves the cart and draft booking.
- A complete demo booking produces a clear confirmation and updates local availability.
- A reset returns the demo to its original inventory.
- No real-payment or external-service claim is made; mobile and desktop layouts work.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**site-store__MODEL_SLUG__RUN_DATE__vVERSION**

It must contain **index.html**, **meta.json**, and only essential runtime files in **assets/** if needed. The application belongs in one runnable HTML page with inline CSS/JS. Do not produce three storefronts, several HTML files, a README, audit report, screenshot, package manifest, dependencies or build output. Create files in the workspace; do not paste the source into chat.

Use this valid UTF-8 metadata:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "site-store",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "03",
  "prompt_label": "Commerce and Booking Marketplace",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

Use the exact run parameters above. The organizer ZIPs the folder. The ZIP filename is not used to determine the run.

Test the actual page in a browser when available; otherwise perform a code-level smoke check and say so. Report only the folder path and honest test status.
