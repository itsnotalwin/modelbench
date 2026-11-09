# Prompt suite context

## Purpose
Own the canonical one-shot challenge briefs and the catalog that drives dashboard challenge labels and ZIP intake category validation.

## Key files
- catalog.json — ten category slugs, titles, summaries, acceptance summaries and output count.
- Numbered Markdown files — standalone model prompts with run parameters, requirements, acceptance checks and metadata contract.
- README.md — suite index, evaluation philosophy, sources and submission process.

## Connections
The dashboard and tools/sort_inbox.py read catalog.json. Prompt category, prompt number, prompt label and required metadata must agree with it. Each prompt must specify exactly one output folder and one index.html.

## Change and verify
Update catalog and prompt together. Keep outputs_per_prompt and min_outputs at 1. Search the suite for references to three outputs, then validate every prompt has one category slug and matching metadata.
