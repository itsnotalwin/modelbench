# SaaS — clearing agents — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> **The model names its folder** (as the prompt below requires — e.g. `clearline-ops/`).
> **You name the zip.** Zip that model-named folder as-is (don't rename the folder inside),
> name the zip exactly:
>
> `saas__{model}__{YYYY-MM-DD}__v1.zip`
>
> Example: `saas__claude-sonnet-4-5__2026-11-06__v1.zip`
> The GitHub Action (`auto-sort`) then moves it to `runs/{date}_{model}_saas_v1/{model-folder}/` automatically — the model's folder name is preserved.
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
- Everything inside a single self-contained folder with its own creative, memorable name (lowercase-kebab-case).
- Include a README.md covering what it is, how to run it, the architecture, what is implemented, and known limitations.

Process:
- Do not ask me questions. Make every decision yourself and deliver the finished work in one go.
- If you cannot create files directly, output the folder tree followed by every file in full, each in its own code block.
- Before finishing, review and run/test your work if you have the tools to, and fix any problems you find.
