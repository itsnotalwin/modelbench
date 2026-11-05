# SaaS — clearing agents — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> **The model creates a folder, but it must be renamed to the benchmark prefix.**
> Rename the model's folder to `{date}_{model}_{category}_v1`, then zip it and name the zip:
>
> `saas__{model}__{YYYY-MM-DD}__v1.zip`
>
> Example: rename `clearline-ops/` → `2026-11-06_claude-sonnet-4-5_saas_v1/`, zip it as `saas__claude-sonnet-4-5__2026-11-06__v1.zip`
> The GitHub Action (`auto-sort`) also renames it automatically on upload to `runs/{date}_{model}_saas_v1/` — so the repo folder always uses the prefix, never the model's creative name. Contents are untouched.
> (If the model gave a single `.html` file instead of a folder, upload that as `saas__{model}__{YYYY-MM-DD}__v1.html`.)

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
- Choose whatever stack you judge best, but it must run on a fresh machine with at most one install command and one start command, documented in the README.
- No paid services, API keys or external accounts required. No hardcoded secrets.
- Sensible project structure, security basics (input validation, auth where appropriate), and tests for the core logic.

Deliverable:
- **NAMING (mandatory):** Everything inside a single self-contained folder named EXACTLY with the benchmark prefix: `{YYYY-MM-DD}_{model-slug}_saas_v1` — for example `2026-11-06_claude-sonnet-4-5_saas_v1`. Use today's date and your own model name in lowercase hyphens. Do NOT use a creative folder name (no `clearline-ops`, no `my-app`).
- Include a README.md covering what it is, how to run it, the architecture, what is implemented, and known limitations.

Process:
- Do not ask me questions. Make every decision yourself and deliver the finished work in one go.
- If you cannot create files directly, output the folder tree followed by every file in full, each in its own code block.
- Before finishing, review and run/test your work if you have the tools to, and fix any problems you find.
