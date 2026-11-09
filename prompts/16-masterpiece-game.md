# 16 · Masterpiece Game

## Automatic run identity — Never ask the organiser for these values

Resolve these three values yourself before creating the project. Never ask the organiser or user for MODEL_SLUG, RUN_DATE or VERSION. They are run metadata, not questions or creative choices.

1. **MODEL_SLUG:** Identify the model that is actually executing this prompt from the active system/runtime model identifier. Prefer the exact model identifier, including its variant, when exposed; otherwise use the public model name supplied by the environment. If it is provider-qualified (for example, `provider/model-name`), keep the model portion. Convert it to lowercase and replace spaces, underscores and other characters with hyphens; retain only letters, digits, dots and hyphens, collapse repeated hyphens and remove leading/trailing punctuation. Do not use the benchmark category, prompt title, organiser's name or an assumed model. If the runtime exposes no model identity at all, use `unknown-model` and disclose that limitation briefly in `meta.json` notes rather than inventing an identity.
2. **RUN_DATE:** Use the current calendar date supplied by your system/runtime context, formatted as `YYYY-MM-DD`. If that context does not provide a date, use the current UTC calendar date from the runtime. Do not use the prompt's edit date or a file timestamp.
3. **VERSION:** Always use the integer `1`. This is fixed. Never ask, infer, increment or substitute another version.

Use the resolved values consistently in the output folder and `meta.json`. Do not pause for confirmation and do not leave literal placeholders in the finished files.

## The challenge

Create one extraordinary, original, browser-playable game that feels like a complete, polished release rather than a prototype. This is the highest-difficulty game challenge in ModelBench.

**You choose everything that defines the game:** genre and subgenre, 2D/3D/isometric or other presentation, premise, world, player role, tone, art direction, characters, core loop, mechanics, controls, content structure, progression and ending. Any genre is valid. Do not assume a puzzle game, platformer, shooter, action game, strategy game, simulation or any other familiar format. Do not reuse a concept from another prompt. Choose the strongest idea you can execute to a high standard, commit to it and build one cohesive game. Do not ask the organiser to choose, and do not present several concepts instead of building one.

The challenge is intentionally open in creative direction and extremely demanding in execution. Your task is not to cram in the most features. It is to make a distinctive game whose systems, content, visuals, sound and progression reinforce one another.

## The masterpiece bar

### 1. A complete game, not a showcase

- Establish a strong identity, a clear player fantasy and an understandable objective.
- Teach the controls and essential rules through a concise, well-designed onboarding experience. Do not make the player guess how to begin.
- Build a satisfying central gameplay loop with meaningful decisions, understandable stakes and a clear outcome.
- Deliver a complete playable arc: an opening, a developed middle and a satisfying climax, ending or completed run appropriate to the chosen genre.
- Include enough designed content to demonstrate the game's depth. Provide at least three meaningfully different playable situations, such as areas, encounters, missions, events, rounds, challenges or equivalent structures that suit your design.
- Give failure, recovery, restart and replay a deliberate role. Do not trap the player in a broken or irreversible state.

### 2. Four or more interconnected gameplay systems

Implement at least **four substantial gameplay systems** that genuinely affect one another. They must create emergent decisions or consequences, not exist as disconnected menu options.

Choose systems that naturally belong in your chosen game. Possible directions include movement and traversal, combat and opponent behaviour, physics, environmental simulation, crafting, resource economies, construction, logistics, character abilities, equipment, progression, factions, relationships, quests, exploration, weather, ecology, tactics, rhythm, vehicles, procedural encounters or world events. These are examples, not a required list.

Show the connections in actual play. A decision in one system should have a meaningful effect on another. The player should be able to understand those effects through the game itself. Prefer a smaller number of deeply integrated systems over a pile of shallow features.

### 3. Meaningful content and progression

- Give the player reasons to continue beyond the first interaction: new situations, escalating challenges, discoveries, goals, choices or changing conditions.
- Include at least three meaningful progression milestones, unlocks, upgrades, discoveries, results or equivalent developments suited to the chosen genre.
- Make important rewards and choices change what the player can do, how the world responds or what becomes available.
- Avoid padding through repetitive content, arbitrary grind or meaningless collectibles.
- Ensure the game has a clear sense of direction without removing the player's agency.

### 4. Exceptional visual craft

Create a distinctive, coherent visual identity that looks deliberately art-directed. The world and interface should feel as though they belong to the same game.

- Build depth, composition and atmosphere appropriate to the chosen perspective and genre.
- Use detailed environments, deliberate colour and lighting, readable silhouettes, carefully composed interfaces and a strong visual hierarchy.
- Animate important characters, objects, enemies or environmental elements. Use transitions, camera movement, particles, lighting effects or other visual feedback where they genuinely improve the experience.
- Make player actions feel responsive and satisfying through animation and immediate visual feedback.
- Treat menus, HUD, maps, inventories, dialogue, settings and result screens as part of the same design system.
- Do not substitute gradients, emoji, generic cards or decorative shapes for a real game world. Do not leave the world empty to make a small mechanic appear finished.

A beautiful game is not merely a screenshot. Its visual quality must survive movement, interaction, different states and different screen sizes.

### 5. Sound and feedback

Include a deliberate audio layer appropriate to the game: music or atmosphere, useful sound effects and clear feedback for important actions or events. Original synthesized audio through Web Audio is acceptable. Provide sensible volume and mute controls. Audio must not autoplay in a way that ignores browser interaction policies, and the game must remain playable when sound is muted.

### 6. Interaction, usability and accessibility

- Choose controls that suit the genre and communicate them clearly.
- Support desktop and mobile interaction with an intentional control layout. Do not force an unsuitable control scheme simply to claim touch support.
- Make menus, gameplay, pause/settings and completion states easy to navigate.
- Use readable contrast, visible focus, semantic labels for interface controls and reduced-motion support where relevant.
- Keep important information legible without covering the action or world.
- Make the game respond cleanly to resizing, orientation changes and interrupted sessions.

### 7. Persistence and technical reliability

- Save meaningful game state locally, including relevant progress, unlocks, settings or results. Restore it after reload.
- Validate and version saved data; handle missing, malformed or older saves without crashing. Provide a deliberate way to reset progress.
- Keep the core experience self-contained and suitable for static hosting. Do not require a backend, private API, secret key, account or manual build step.
- Use local assets and dependable dependencies. Do not make essential gameplay depend on fragile remote images, fonts, scripts or services.
- Structure the implementation so the game state, rules, rendering and input remain understandable and reliable.
- Watch for performance problems, runaway timers, duplicate event handlers, broken collision logic, input conflicts and inconsistent state after restart or reload.

## Independent acceptance checklist

A submission should be judged against the following evidence, not against how ambitious its description sounds:

- [ ] One original game with a genre and creative direction chosen independently by the model.
- [ ] A complete, understandable and satisfying playable arc.
- [ ] At least three genuinely different playable situations or equivalent content beats.
- [ ] At least four substantial gameplay systems, with meaningful interactions between them.
- [ ] At least three meaningful progression milestones or equivalent developments.
- [ ] Distinctive, coherent visual art direction that works during actual play.
- [ ] Responsive animation and clear feedback for important actions and events.
- [ ] An intentional audio layer with working mute/volume controls.
- [ ] Clear, genre-appropriate controls and usable desktop/mobile layouts.
- [ ] Reliable save/load, recovery, restart and reset behaviour.
- [ ] No dead controls, placeholder screens, fake systems or critical runtime errors.

## Final quality rule

Do not interpret this brief as permission to build an enormous but unfinished game. Choose a concept whose ambition you can realise. Make every included system work, make the systems affect one another, and make the whole experience feel intentional. A compact masterpiece with genuine depth is better than a sprawling collection of disconnected features.

## Technical expectations

- Deliver a browser-first project that runs from its `index.html` entry point on a static host. Use an appropriate client-side implementation and include only dependencies that are genuinely needed.
- You may organise the project into multiple local files, but every required file must live inside the single submission folder.
- Do not require a backend, private API, secret key, account, build service or manual setup to demonstrate the core experience.
- Handle browser storage, invalid input, empty states, errors and reloads deliberately wherever relevant.
- Use semantic structure, accessible labels, visible keyboard focus, sensible contrast and reduced-motion preferences.
- Make the experience responsive. Do not sacrifice core usability on smaller screens.
- Test the actual experience in a browser when possible. If browser testing is unavailable, perform a careful code-level smoke check and report that limitation honestly.
- Do not claim that something was tested unless it was actually tested.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**game-masterpiece__MODEL_SLUG__RUN_DATE__v1**

Before creating it, replace `MODEL_SLUG` and `RUN_DATE` using the automatic run-identity rules above. The suffix must always be `v1`.

At the folder root include **index.html** and **meta.json**. Include an **assets/** folder and other local source files only when they are required by this one finished game. Keep all files for this project inside this folder.

Do not create multiple concepts, alternate versions, separate projects, extra HTML entry pages, README or audit files, screenshots, dependency folders, package files or build output. Do not create files outside the required project folder. Do not paste source code into chat.

The metadata file must contain this structure with the exact automatically resolved model slug and date. Keep `version` as the JSON number `1`:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-masterpiece",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "16",
  "prompt_label": "Masterpiece Game",
  "notes": "One or two honest sentences describing the completed game, its strongest systems and any known limitations."
}
~~~

Replace the two metadata tokens with the values you resolved yourself. Do not ask the organiser for them and do not submit unresolved placeholder text. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. The ZIP filename is not a routing key. Do not include scores or self-awarded evaluations in `meta.json`.

When finished, report only the project folder path and an honest test status.
