# 06 · End-to-End Game Masterpiece

## Automatic run identity — never ask the organiser or user

Resolve the run metadata yourself before creating files. Do not ask the user or organiser for model, date, version, category, project title or creative direction.

1. **MODEL_SLUG:** Identify the model actually executing this prompt from the active system/runtime model identifier. Prefer the exact identifier including its variant; otherwise use the public model name exposed by the environment. If provider-qualified, keep the model portion after the final slash. Lowercase it, replace spaces, underscores and other non-alphanumeric characters with hyphens, retain letters, digits, dots and hyphens, collapse repeated hyphens and trim punctuation. Never invent a model identity. If no identity is exposed, use `unknown-model` and disclose that in metadata notes.
2. **RUN_DATE:** Use the current calendar date supplied by system/runtime context in `YYYY-MM-DD` format. If unavailable, use the current UTC date from the runtime. Never use the prompt edit date or a file timestamp.
3. **VERSION:** Always the integer `1`. Never ask, infer, increment or substitute another value.

Use the resolved values in both the output folder and `meta.json`. Do not pause for confirmation and do not leave placeholders in the finished files.

## The challenge

Create one extraordinary, original, complete, browser-playable story-driven game. This is the highest-difficulty challenge in the suite. You are the creative director, writer, narrative designer, game designer, art director, sound designer and engineer. Choose the genre, perspective (2D, 3D, isometric or another suitable form), setting, tone, player fantasy, mechanics and presentation yourself. Do not assume a puzzle game or any other default genre. Invent a distinctive game that you can bring all the way from its opening scene to a satisfying ending.

**Use the full capability of your environment.** Proactively use every relevant tool and resource actually available to you: coding and execution, asset creation, image or illustration generation, audio or music generation, browser testing, and other supported creative or development tools. Create bespoke assets when those tools are available. If a capability is unavailable, do not pretend to have used it: produce a strong local alternative using code, SVG/canvas/geometry, procedural illustration or Web Audio. Do not ask the organiser to enable tools or approve ordinary creative decisions. Do not make the finished game depend on remote services or unavailable tools.

## Quality bar

Treat this as a complete game production, not a prototype or a collection of disconnected features.

**Narrative and characters**
- Write an original, coherent storyline with a strong opening, escalation, turning point, climax and satisfying ending. Structure it into at least three meaningful acts, chapters or equivalent story movements.
- Create a playable protagonist with a clear identity, motivation, conflict and character development.
- Create a memorable supporting cast. Give important characters distinct voices, motivations, relationships and arcs. Their actions should matter to the story or gameplay.
- Write actual dialogue and scenes. Use conversations, environmental storytelling, discoveries, journals, cinematic moments or other genre-appropriate methods. Avoid lorem ipsum and generic placeholder dialogue.
- Include meaningful player choices or decisions whose consequences affect relationships, events, available paths, resources or the ending. Do not fake branching with cosmetic dialogue buttons.
- Build a world with history, places, factions, culture or internal logic appropriate to the story. Reveal it through play rather than dumping an encyclopedia on the player.

**Gameplay and structure**
- Design a compelling core loop that supports the story and player fantasy.
- Implement at least four substantial gameplay systems that interact with one another. Choose systems appropriate to the genre: examples include traversal, combat, stealth, investigation, dialogue, relationships, crafting, resource management, tactics, abilities, exploration, environmental simulation, vehicles, rhythm or world events. These are examples, not a prescribed feature list.
- Include at least three authored missions, quests, chapters, major encounters or equivalent playable story beats.
- Make progression meaningful. Unlocks, abilities, discoveries and character/story developments should change what the player can do or how the world responds.
- Provide a complete arc from onboarding through the middle and climax to an actual ending. Deliver a complete ending that resolves the central story. Include failure/recovery, restart and replay handling appropriate to the design.

**Art, sound and presentation**
- Establish a distinctive visual identity and carry it consistently through characters, environments, animation, interface and narrative presentation.
- Use bespoke art assets where possible. Give characters readable silhouettes and expressive animation; make environments feel authored, varied and alive.
- Create atmosphere through lighting, composition, particles, camera work, transitions and effects where appropriate.
- Include intentional music, ambience and sound effects. Provide mute and volume controls; respect browser audio policies and remain playable without sound.
- Design menus, dialogue, journal/quest log, inventory, HUD, settings and ending screens as one coherent interface system, including only the components the game genuinely needs.

**Reliability and finish**
- Save meaningful progress, choices, settings and unlocks locally. Validate/version saved data and recover safely from missing or malformed saves.
- Make every control and interaction functional. Keep the game responsive and usable on desktop and mobile with genre-appropriate controls.
- Keep the experience self-contained for static hosting. Do not require a backend, private API, secret key, account or manual build step.
- Test the actual play experience, including a representative story path, meaningful choice, progression, save/reload and ending when browser tools are available. Report honestly what you did and did not test.

The final result should feel like a small but complete game release with a world worth inhabiting, characters worth remembering and a story that reaches its conclusion. Scope intelligently: a focused, beautifully realised experience beats an enormous unfinished promise.

## Technical and delivery expectations

- Build a browser-first project that runs from `index.html` on static hosting. Use local files and dependable dependencies.
- Do not require a backend, private API, secret key, account, build service or manual setup for the core experience.
- Include only files required by this one finished project. Keep assets local; do not make essential functionality depend on fragile remote services.
- Make the interface responsive, keyboard-usable, accessible and respectful of reduced-motion preferences.
- Every visible control must work. Avoid dead buttons, fake interactions, placeholder panels and unimplemented claims.
- Test the actual experience in a browser when available. Otherwise perform a careful code-level smoke check and disclose the limitation honestly. Never claim tests that were not run.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**game-masterpiece__MODEL_SLUG__RUN_DATE__v1**

Replace the model and date tokens using the rules above. The suffix is always `v1`.

At the folder root include **index.html** and **meta.json**. Include local source files and an `assets/` directory only when required by the finished project. Keep everything for this single project inside that folder.

Do not create alternate concepts, multiple versions, additional HTML entry points, README/audit files, screenshots, dependency folders, package files or build output. Do not create files outside the project folder. Do not paste source code into chat.

The metadata file must contain this structure, with your resolved model slug and date and the fixed integer version 1:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-masterpiece",
  "date": "RUN_DATE",
  "version": 1,
  "entry": "index.html",
  "prompt": "06",
  "prompt_label": "End-to-End Game Masterpiece",
  "notes": "A concise, honest description of the completed project and any known limitations."
}
~~~

Replace both tokens. The folder and metadata must agree exactly. The organiser will ZIP this one folder and upload it to ModelBench. ZIP filenames are not routing keys. Do not include scores or self-awarded evaluations in metadata.

When finished, report only the project folder path and an honest test status.
