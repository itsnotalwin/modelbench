# 11 · Mosslight Isles — 3D Colony Builder

## Run parameters
- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

Set these before starting. If any remain bracketed, stop and ask the organizer. Do not invent identifiers.

## The brief
Build **Mosslight Isles**, one complete original 3D settlement-building game. Lead a small group of settlers onto a fog-covered island, grow a functioning village and restore an ancient beacon. The pleasure comes from watching a miniature world work: people walk to jobs, collect visible goods, carry materials along paths and gradually transform the island. This must be a playable simulation, not a static city-builder mockup.

## World and simulation requirements
1. Use Three.js **0.160.0** from its pinned jsDelivr ES module URL as the only external library. Generate terrain, buildings, props, people and effects procedurally. No downloaded models, textures, images, fonts or audio.
2. Generate one deterministic island with a varied 3D surface, shoreline, hills, trees, rocks, buildable ground and distant fog-covered landforms. Provide camera pan, rotate, zoom and reset.
3. Simulate at least **12 visible settlers** with names or roles, homes, work assignments and current tasks. They must walk between destinations rather than teleport.
4. Implement grid-based building placement and navigable roads. Use pathfinding around impassable terrain and structures. Show valid/invalid placement previews, rotation where relevant, cancel, selection and demolition.
5. Provide at least **8 functional building types**: camp/town centre, housing, forester, lumber mill, quarry, farm, mill/bakery and beacon. Each needs a distinct silhouette and meaningful purpose.
6. Implement at least **4 actual production chains**: trees → logs → planks; quarry → stone; grain → flour → bread; planks + stone → tools. Buildings consume and create stored resources on the simulation clock.
7. Show goods moving through the settlement. Settlers pick up and deliver loads; stockpiles reconcile with production and consumption. Blocked routes and missing inputs must surface as useful messages.
8. Start with documented fixed resources and population. Include a three-stage objective ending when the player supplies the materials to restore the beacon. The objective must be achievable without random luck.
9. Provide a compact HUD for resources, population, alerts, selected building, build palette and objective progress. Keep the settlement visible.
10. Save seed, buildings, roads, resources, progress and settings locally. Continue, New Game and confirmed Reset must work after reload.
11. Use a stable simulation tick independent of rendering FPS. Include pause and speed controls. Avoid duplicate workers, production loops or unbounded entities.
12. Support resize, keyboard alternatives for camera/build actions, touch-friendly placement and a visible WebGL failure state.

## Quality bar
Create a coherent miniature world with distinctive building silhouettes, readable paths, varied vegetation, lighting, atmospheric depth and purposeful animation. Default cubes plus a resource counter are not sufficient. Keep workers, labels and buildings legible when the world gets busy. Never report a delivery unless both carried goods and destination stock update.

## Acceptance checklist
- Real 3D island and working camera controls.
- 12+ visible settlers travel between jobs and destinations.
- Eight buildings can be placed and perform their roles.
- Four production chains consume inputs and create stored outputs.
- Roads/pathfinding affect movement and blocked routes are visible.
- Resource totals remain consistent and the beacon objective is completable.
- Save/load/reset survive a page reload.
- Pause and speed controls preserve simulation correctness.
- Keyboard/touch and WebGL failure paths are handled.

## Submission contract
Create exactly one folder named **mosslight-isles__MODEL_SLUG__RUN_DATE__vVERSION**. Put only **index.html**, **meta.json**, and essential local runtime files in **assets/** at its root. No alternate concepts, multiple versions, extra pages, README/audit files, screenshots, dependencies or build output. Do not paste source code into chat.

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "mosslight-isles",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "11",
  "prompt_label": "Mosslight Isles — 3D Colony Builder",
  "notes": "One or two honest sentences describing the game and any known limitations."
}
~~~

Use the exact run parameters in folder and metadata. The organizer ZIPs this folder; ZIP filename is ignored for routing. Test on GitHub Pages or a local HTTP server if possible. If you cannot launch it, perform a code-level check and disclose that. Report only folder path and honest test status.
