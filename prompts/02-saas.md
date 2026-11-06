# SaaS — clearing agents — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model must put everything in a folder named `{YYYY-MM-DD}_{model-slug}_saas_v1` with a runnable `index.html` at its root.
> If it used a different folder name, rename the folder to that prefix, then zip the folder and name the zip:
>
> `saas__{model}__{YYYY-MM-DD}__v1.zip`
>
> Example: `saas__claude-sonnet-4-5__2026-11-06__v1.zip` (containing `2026-11-06_claude-sonnet-4-5_saas_v1/index.html`)
> Upload the **.zip** (never .rar) to `inbox/`. The Action unpacks it to `runs/{date}_{model}_saas_v1/` and the dashboard previews `index.html`.
> **A run with no root `index.html` cannot be previewed or compared online** — reject the output and re-ask if the model returns only a Python/Node app.

---

## Model prompt (send everything below this line)

Build a working SaaS product for clearing agents (the customs clearing and freight forwarding side of international trade). What the product is, who it serves within that world, which problems it solves and how it is structured is up to you. Pick a sharp, genuinely useful angle and commit to it.

"Working" means real, not a mockup:
- A user can sign up or sign in (or otherwise enter the product), and real data flows end to end: create, read, update, delete, search, filter, status changes, and documents or outputs they can actually use.
- Data persists between sessions.
- Core workflows are fully implemented, validate input, and handle errors and empty states. It ships with realistic seed/demo data so it is usable on first launch.
- It includes the domain-specific logic (calculations, validations, document generation, statuses, etc.) that someone working in this industry would expect. It must not be generic CRUD with a relabelled theme.

Design:
- Strictly monochrome: only black, white and shades of grey, everywhere. No accent colour, ever.
- SaaS-grade UX: dense but legible, keyboard friendly, responsive, accessible, with considered typography, motion and states. Make it feel like a product people would pay for.

Engineering:
- The product must run on a fresh machine with at most one install command and one start command, documented in the README.
- No paid services, API keys or external accounts required. No hardcoded secrets.
- Sensible project structure, security basics (input validation, auth where appropriate), and tests for the core logic.

Deliverable — **naming and entry point are mandatory, read them twice:**
- Everything lives inside ONE folder named exactly: `{YYYY-MM-DD}_{model-slug}_saas_v1`
  Example: `2026-11-06_claude-sonnet-4-5_saas_v1`
  Use today's date (YYYY-MM-DD) and your own model name, lowercased, spaces replaced with hyphens. No creative folder name, no uppercase, no spaces.
- **`index.html` at the root of that folder is required and must be a fully working version of the product that runs with NO server, NO build step and NO install** — opened directly (`file://`) or served from a static host such as GitHub Pages. It must contain the real product: sign in/up, seeded demo data, full CRUD, search, filters, status transitions and document/CSV output, with state persisted in `localStorage` (every storage access wrapped in `try/catch`). All CSS and JS referenced with relative paths from inside the folder.
- If you also want to ship a server-backed implementation (Python/Node/etc.), put it alongside as extra credit in a clearly named subfolder, documented in the README. The `index.html` build is the primary deliverable and must not depend on it.
- Include a `README.md` covering what it is, how to run it, the architecture, what is implemented, the demo credentials, and known limitations.

Process:
- Do not ask me questions. Make every decision yourself and deliver the finished work in one go.
- State the exact folder name at the top of your reply, then the full folder tree, then every file in full in its own code block.
- Before finishing, review and run/test your work if you have the tools to, and fix any problems you find. Confirm `index.html` works with no server before you finish.
