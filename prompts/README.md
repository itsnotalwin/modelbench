# ModelBench prompt set v2

Prompts 01-04 are unchanged from the original set. Prompts 05-12 are rewritten (version v2) and 13-20 are new (version v1).
Every prompt uses the same structure: an open concept, "the bar" (quality), hard rules, what "real" means, craft, engineering, mandatory naming, and process.

| # | Prompt | Prefix | Version | Output |
|---|--------|--------|---------|--------|
| 01 | Website | website | v1 | folder zip |
| 02 | SaaS (clearing agents) | saas | v1 | folder zip |
| 03 | 2D game | game2d | v1 | html |
| 04 | 3D game | game3d | v1 | html |
| 05 | Restaurant website | cafe | v2 | html |
| 06 | Machine explainer | engine | v2 | html |
| 07 | First-person game | fps | v2 | html |
| 08 | Arcade game | runner | v2 | html |
| 09 | Browser OS | os | v2 | html |
| 10 | Rubik's Cube + solver | cube | v2 | html |
| 11 | Original platformer | platformer | v2 | html |
| 12 | Living 3D world | world | v2 | html |
| 13 | Data story | datastory | v1 | html |
| 14 | Generative art | generative | v1 | html |
| 15 | Music instrument | synth | v1 | html |
| 16 | Creative tool | tool | v1 | html |
| 17 | Emergent simulation | sim | v1 | html |
| 18 | Strategy game + AI | strategy | v1 | html |
| 19 | Spreadsheet | spreadsheet | v1 | html |
| 20 | Physics engine + playground | physics | v1 | html |

Note: new prefixes (world, datastory, generative, synth, tool, sim, strategy, spreadsheet, physics) must be registered in the upload Action and dashboard. Prompts 05-12 changed concept, so v2 results should not be compared with old v1 runs.

## Scoring (0-5 each)
- Completeness: every promised feature present and working
- Robustness: runs first try, no console errors, no soft-locks, handles edge cases
- Craft: how pretty and polished it is, art direction, motion, sound
- Depth: how much real engineering and design thinking is inside
- Originality: a point of view, not a template
- Performance: holds its framerate, loads fast

Also log: ran on first open (yes/no), console errors, FPS on a mid-range laptop, and file size.
