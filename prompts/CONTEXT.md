# Prompt suite context

## Purpose
Own the fifteen canonical one-shot challenge briefs and the catalog that drives dashboard labels and ZIP intake validation.

## Suite structure
Fifteen prompts across four families: Web (brand, editorial, application, machine explainer, browser OS), Games (2D, 3D, masterpiece, first-person, living world, strategy, physics), Visual (generative art, creative tool) and Worlds (floating pagoda island, the single fixed-brief challenge).

## Key files
- `catalog.json` — fifteen category slugs, titles, summaries, acceptance summaries and output count.
- `01-*.md` through `15-*.md` — standalone prompts with automatic run identity, fixed version 1 and one-folder metadata contract.
- `README.md` — suite index, evaluation philosophy and submission process.

## Change and verify
Update catalog and prompt together. Keep outputs_per_prompt and min_outputs at 1. Avoid prescribing creative names, lore or art direction except where challenge 06 explicitly requires a complete original narrative and cast. Validate that there are exactly three Web and three Games challenges, all with matching metadata.
