# Cafe menu website — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model must deliver one `.html` file and state its name at the top of the reply.
> Save it as exactly:
>
> `cafe__{model}__{YYYY-MM-DD}__v1.html`
>
> Example: `cafe__claude-sonnet-4-5__2026-11-06__v1.html`
> Upload that **.html** (never .rar) to `inbox/`. The Action files it as `runs/{date}_{model}_cafe_v1/`, previewable on the dashboard.

---

## Model prompt (send everything below this line)

You are a senior frontend engineer and UI/UX designer.

A menu PDF is attached. Parse all menu items, categories, prices, and descriptions from it.

Build a complete, single-file HTML website for **KGP Vibes Cafe** using HTML5, CSS3, and vanilla JavaScript. No frameworks. No external dependencies except Google Fonts and Font Awesome via CDN.

**Primary Goal:** A stunning, modern dark-theme cafe website that feels premium, loads instantly, and works on mobile and desktop.

**Design System (strictly follow):**
- Background: #0A0A0A (near-black)
- Surface: #141414
- Card: #1C1C1C
- Accent: #C9A84C (warm gold)
- Text Primary: #F5F5F5
- Text Secondary: #9E9E9E
- Font: 'Playfair Display' for headings, 'Inter' for body (Google Fonts)
- Border radius: 12px for cards, 4px for buttons
- Micro-animations: 200ms ease-in-out transitions on hover

**Required Sections:**
1. **Hero** — Full-viewport dark hero with cafe name in large serif, a tagline, and a "View Menu" CTA button (gold, smooth scroll)
2. **Menu** — Grid layout of menu categories parsed from the PDF. Each item card shows: name, description, price (gold color), and a vegetarian/non-veg badge. Include a sticky category filter bar at top
3. **About** — Two-column layout: left is a placeholder image area (dark gradient box with cafe logo text), right is a short about paragraph
4. **Gallery** — 6-cell masonry-style grid with placeholder dark gradient boxes (numbered 1–6), ready for real images
5. **Contact** — Address, phone, hours of operation, and an embedded Google Maps placeholder (iframe with a dummy URL)
6. **Footer** — Social links (Instagram, Facebook, YouTube icons), copyright

**Hard Technical Constraints:**
- The menu filter buttons must actually filter visible cards in real time without page reload
- Mobile navigation must collapse into a hamburger menu below 768px
- Smooth scroll must work for all anchor links
- All CSS must be in a `<style>` block inside the HTML file — no external CSS files

**Fallback Instruction:**
If any menu section cannot be parsed from the PDF (e.g., images are not extractable), use placeholder text "Item description coming soon" and preserve the card layout.

**Difficulty Extension:**
Add a "Today's Special" animated banner at the top of the menu section that rotates through 3 featured items every 4 seconds using a CSS keyframe fade transition.

**Deliver:** One complete `.html` file. No placeholder comments saying "add CSS here" — every section must be fully implemented.

**NAMING (mandatory):** State the file name as the first line of your reply, named EXACTLY with the benchmark prefix: `cafe__{model-slug}__{YYYY-MM-DD}__v1.html` — for example `cafe__claude-sonnet-4-5__2026-11-06__v1.html`. Use today's date and your own model name, lowercased, spaces replaced with hyphens. Do not use a creative file name, uppercase or spaces. The file must run by opening it directly — no server, no build step — and work from a static host such as GitHub Pages.
