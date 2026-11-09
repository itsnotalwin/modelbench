# 15 · The Lantern Below — Action Roguelite

## Run parameters
- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

Set these before starting. If any remain bracketed, stop and ask the organizer. Do not invent identifiers.

## The brief
Build **The Lantern Below**, one complete original top-down action roguelite. Descend beneath a drowned city to relight an underground signal. Each run rearranges the route and rewards, while combat remains readable, responsive and fair. Deliver a complete run from title screen through a final boss and results screen; a room generator with no meaningful combat or progression is not enough.

## Game requirements
1. Render with Canvas 2D and original artwork generated in code. No external images, spritesheets, libraries, remote fonts or copyrighted characters.
2. Generate a deterministic seed-based route of **six connected rooms**: entrance, at least three combat rooms, one reward/rest room and a final boss room. Display the seed. Every room must be reachable and have safe spawn positions.
3. Implement top-down movement, collision, aim direction and a dodge with visible cooldown/invulnerability. Support keyboard/mouse and touch movement/attack controls.
4. Provide **three weapon styles** with different patterns, range, cooldown and damage. The player can switch/select a weapon during the run.
5. Implement **four enemy archetypes**: chaser, ranged attacker, guarding/bruiser and fast flanker. Use state-driven AI, collision and fair telegraphs. Enemies deal damage only during real attack windows.
6. Add at least **five relic upgrades** that alter gameplay values or abilities. Present meaningful choices after reward rooms; no cosmetic-only relics as functional upgrades.
7. Create a final boss with at least two phases, distinct attack patterns, telegraphed danger areas and recovery windows. Defeating it completes the run.
8. Add HUD for health, weapon, relics, room progress and objective. Include title, tutorial, pause, defeat, victory and restart. Save best completion time and discoveries locally.
9. Keep combat coherent: hit detection, knockback, stun, invulnerability, cooldowns, enemy death, room-clear and rewards all update game state.
10. Include self-tests for connectivity, collision, attack damage, dodge cooldown, relic application, room progression and boss completion. Expose actual pass/fail results.

## Quality bar
Create a distinct atmosphere with layered stonework, damp reflections, warm lantern pools, restrained particles and clear enemy silhouettes. Combat must remain readable. Give attacks weight through anticipation, impact feedback or hit-stop without obscuring enemy tells. Avoid spawning enemies on the player, trapping the player, awarding unreachable relics or dealing damage during advertised invulnerability.

## Acceptance checklist
- Seed creates six connected, traversable rooms.
- Movement, collision, aim and dodge work on desktop and touch.
- Three weapons and five relics change combat behavior.
- Four enemy archetypes show distinct AI.
- Telegraphs, hitboxes and invulnerability are consistent.
- Two-phase boss can be defeated and ends the run.
- Room transitions, rewards, defeat, victory and restart work.
- Best-time/discovery data persists after reload.
- Self-test exercises real systems and reports failures truthfully.

## Submission contract
Create exactly one folder named **lantern-below__MODEL_SLUG__RUN_DATE__vVERSION** with **index.html**, **meta.json** and only essential files in **assets/**. No multiple runs, variants, extra pages, README/audit files, screenshots, dependencies or build output. Do not paste code into chat.

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "lantern-below",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "15",
  "prompt_label": "The Lantern Below — Action Roguelite",
  "notes": "One or two honest sentences describing the game and any known limitations."
}
~~~

Use exact run parameters in folder and metadata. The organizer ZIPs this folder; ZIP filename is ignored for routing. Test in a browser if possible. If you cannot launch it, perform a code-level check and disclose the limitation. Report only folder path and honest test status.
