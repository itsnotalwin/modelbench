# 13 · Neon Alley '94 — 16-bit Beat-'em-up

## Run parameters
- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

Set these before starting. If any remain bracketed, stop and ask the organizer. Do not invent identifiers.

## The brief
Build **Neon Alley '94**, one complete original side-scrolling arcade beat-'em-up. Two street fighters cross a rain-soaked neon district after a syndicate takes over the night market. Fight through three distinct stages and defeat the final boss. Capture the readability and chunky presentation of a 1990s 16-bit arcade game while creating original characters, silhouettes, animation, locations and sound. This must feel responsive in the hands, not like a slideshow.

## Combat requirements
1. Render with Canvas 2D and original pixel-inspired artwork generated in code. No external images, spritesheets, libraries, remote fonts or copyrighted characters. A low-resolution render buffer with crisp scaling is encouraged.
2. Provide **two selectable playable fighters** with different movement speed, reach and special attacks. Their stats must affect play.
3. Build **three connected scrolling stages** with distinct layouts, hazards and props. Include at least three enemy archetypes with different behaviors and one final boss with multiple attack patterns.
4. Implement movement on horizontal and lane-depth axes, jump, light attack, heavy attack, block or dodge, and a meter-powered special. Attacks require active hit windows, hitboxes, cooldowns, stun/knockback and temporary invulnerability.
5. Provide at least two meaningful combo routes. Repeatedly pressing one attack cannot be the only strategy. Communicate combo timing, recovery, hit confirmation and meter gain.
6. Enemy AI must use clear states: approach, reposition, telegraph, attack, recover, react to hit and retreat/defeat. The boss telegraphs dangerous moves and has punish windows.
7. Show player/enemy health, special meter, score, stage, lives and combo feedback without hiding active combat.
8. Include title, fighter select, tutorial, pause, stage transitions, win/lose and restart. Save high score/settings locally.
9. Support keyboard and on-screen touch controls with separate movement and attack actions. Touch controls must not cover fighters or browser navigation.
10. Include real self-tests for attack range, damage, invulnerability timing, combo meter, enemy state and boss phase transitions.

## Quality bar
Use confident silhouettes, deliberate hit flashes, readable poses, layered parallax scenery and a limited cohesive palette. Prioritize combat clarity over particle overload. Avoid animation lock, invisible enemy stacking, accidental repeated attacks or unavoidable boss damage.

## Acceptance checklist
- Both fighters are selectable and mechanically distinct.
- Three stages scroll and contain different content.
- Movement, jump, lane depth, attacks, dodge/block and special work.
- Hitboxes, damage, stun, knockback and invulnerability are real state changes.
- Three enemy archetypes and boss use distinct, fair AI patterns.
- Combos and special-meter gain work.
- Keyboard/touch, progression, high score, win/lose and restart work.
- Self-test exercises real combat calculations and state transitions.

## Submission contract
Create exactly one folder named **neon-alley__MODEL_SLUG__RUN_DATE__vVERSION** with **index.html**, **meta.json** and only essential files in **assets/**. No multiple games, variants, extra pages, README/audit files, screenshots, dependencies or build output. Do not paste source code into chat.

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "neon-alley",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "13",
  "prompt_label": "Neon Alley '94 — 16-bit Beat-'em-up",
  "notes": "One or two honest sentences describing the game and any known limitations."
}
~~~

Use exact run parameters in folder and metadata. The organizer ZIPs this folder; ZIP filename is ignored for routing. Test in a browser if possible. If you cannot launch it, perform a code-level check and disclose the limitation. Report only folder path and honest test status.
