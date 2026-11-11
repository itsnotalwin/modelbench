# Prompt suite context

## Purpose
Own the twenty-one canonical one-shot challenge briefs and the catalog that drives dashboard labels and ZIP intake validation.

## Suite structure
Twenty-one prompts across four families: Web (website, SaaS, restaurant, explainer, OS, creative tool, spreadsheet), Games (2D, 3D, FPS, arcade, Rubik's cube, platformer, strategy, physics), Visual (data story, generative art, synth) and Worlds (living world, emergent sim, pagoda island).

## Key files
- `catalog.json` — twenty-one category slugs, titles, summaries, acceptance summaries and output count.
- `01-*.md` through `21-*.md` — standalone prompts with automatic run identity, fixed version 1 and one-folder metadata contract.
- `README.md` — suite index, evaluation philosophy and submission process.

## Change and verify
Update catalog and prompt together. Keep outputs_per_prompt and min_outputs at 1. Avoid prescribing creative names, lore or art direction except where challenge 06 explicitly requires a complete original narrative and cast. Validate that there are exactly three Web and three Games challenges, all with matching metadata.
