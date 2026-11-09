# Prompt suite context

## Purpose
Own the canonical one-shot challenge briefs and the catalog that drives dashboard challenge labels and ZIP intake category validation.

## Key files
- catalog.json — fifteen category slugs, titles, summaries, acceptance summaries and output count.
- Numbered Markdown files — standalone prompts with run parameters, a broad task/genre, a clear quality bar and metadata contract. Creative decisions should remain open to each model.
- README.md — suite index, evaluation philosophy, sources and submission process.

## Connections
The dashboard and tools/sort_inbox.py read catalog.json. Prompt category, prompt number, prompt label and required metadata must agree with it. Each prompt must specify exactly one output folder and one index.html.

## Change and verify
Update catalog and prompt together. Keep outputs_per_prompt and min_outputs at 1. Avoid prescribing creative names, lore, characters, art direction or exact mechanics unless necessary to define the benchmark category. Validate every prompt has one category slug and matching metadata.
