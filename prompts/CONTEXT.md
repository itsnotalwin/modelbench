# Prompt suite context

## Purpose
Own the six canonical one-shot challenge briefs and the catalog that drives dashboard labels and ZIP intake validation.

## Suite structure
Three web-development prompts (brand/business website, interactive content website, complete web application) followed by three game-development prompts (open-ended 2D, open-ended 3D, end-to-end story-driven game masterpiece).

## Key files
- `catalog.json` — six category slugs, titles, summaries, acceptance summaries and output count.
- `01-*.md` through `06-*.md` — standalone prompts with automatic run identity, fixed version 1 and one-folder metadata contract.
- `README.md` — suite index, evaluation philosophy and submission process.

## Change and verify
Update catalog and prompt together. Keep outputs_per_prompt and min_outputs at 1. Avoid prescribing creative names, lore or art direction except where challenge 06 explicitly requires a complete original narrative and cast. Validate that there are exactly three Web and three Games challenges, all with matching metadata.
