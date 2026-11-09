# 12 · Voxel Wilds — Block Survival Sandbox

## Run parameters
- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

Set these before starting. If any remain bracketed, stop and ask the organizer. Do not invent identifiers.

## The brief
Build **Voxel Wilds**, one complete original first-person voxel survival game. Wake in a block-built wilderness, gather materials, reshape the terrain, craft tools and construct a beacon before the first dangerous night overwhelms camp. The core loop is explore → mine → collect → craft → build → survive. The world must be genuinely 3D and editable, not a 2D tile map dressed to look blocky.

## Gameplay requirements
1. Use Three.js **0.160.0** from its pinned jsDelivr ES module URL as the only external library. Generate blocks, terrain, trees, props and creatures in code. No downloaded models, textures, images, fonts or sound.
2. Generate a deterministic voxel landscape at least **32 × 32 blocks** across with varied height and bounded vertical range. Include distinct terrain zones, exposed rock, trees and a rare resource.
3. Use InstancedMesh, chunked geometry or equally credible batching. Do not create one draw call per visible block. Editing must update affected render data without rebuilding the whole world each frame.
4. Implement first-person movement, collision and gravity. Desktop: pointer-look, WASD, jump and sprint. Mobile: visible touch controls or another usable scheme, not pointer-lock only.
5. Implement precise block targeting. Mining removes the targeted block and grants its correct drop. Placement targets the adjacent valid cell and rejects occupied cells, player overlap and out-of-bounds positions.
6. Include at least **8 material types** such as grass, dirt, stone, sand, log, leaves, ore and crafted brick, with meaningful drops/uses.
7. Implement inventory slots, numbered hotbar, selection feedback and at least **5 working crafting recipes**, including logs → planks, planks → workbench, stone → tool and materials → beacon components. Deduct quantities correctly.
8. Add a survival loop: food/energy decreases over time, food restores it, and one hostile night creature pursues and attacks using real state and collision. Include fair damage, respawn and telegraphs.
9. Implement a visible day/night cycle that affects gameplay. Shelter or placed light must improve safety.
10. Make the win condition craft and place a beacon at a valid location using gathered resources. Show objective progress and a satisfying completion state.
11. Save world seed, edited blocks, inventory, player state and progress locally. Reloading restores mined/placed terrain and inventory. Include confirmed New World/Reset.
12. Add pause, sensitivity/movement settings, resize handling, performance-conscious updates and a visible WebGL fallback.

## Quality bar
Make a world worth exploring: strong block silhouettes, purposeful terrain, readable resources, atmospheric distance and a restrained palette. Mining, crafting and building must feel predictable. Never fake collection, crafting, enemy damage or completion. Avoid runaway entities and render loops.

## Acceptance checklist
- Real 3D voxel world with camera movement and deterministic terrain.
- Mining removes the targeted block and adds the correct item.
- Placement updates terrain and rejects invalid positions.
- Inventory, hotbar and all five recipes work with correct quantities.
- Survival, food, hostile creature and day/night affect play.
- Beacon objective is completable.
- World edits and player progress persist after reload.
- Desktop and touch control paths are usable.
- Block rendering is batched and WebGL failure is visible.

## Submission contract
Create exactly one folder named **voxel-wilds__MODEL_SLUG__RUN_DATE__vVERSION** with **index.html**, **meta.json** and only essential files in **assets/**. No multiple worlds, variants, extra pages, README/audit files, screenshots, dependencies or build output. Do not paste code into chat.

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "voxel-wilds",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "12",
  "prompt_label": "Voxel Wilds — Block Survival Sandbox",
  "notes": "One or two honest sentences describing the game and any known limitations."
}
~~~

Use the exact run parameters in folder and metadata. The organizer ZIPs this folder; ZIP filename is ignored for routing. Test in a browser or local HTTP server if possible. If you cannot launch it, perform a code-level check and disclose the limitation. Report only folder path and honest test status.
