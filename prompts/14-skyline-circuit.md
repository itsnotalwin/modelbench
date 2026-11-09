# 14 · Skyline Circuit — 3D Arcade Racer

## Run parameters
- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

Set these before starting. If any remain bracketed, stop and ask the organizer. Do not invent identifiers.

## The brief
Build **Skyline Circuit**, one complete original 3D arcade racing game. Drive a tuned street car through a luminous coastal city circuit, racing three rivals over three laps. Combine intuitive controls, satisfying momentum and a memorable track. This must be a genuinely 3D driving game with real vehicle state and a navigable camera, not a car illustration above a progress bar.

## Racing requirements
1. Use Three.js **0.160.0** from its pinned jsDelivr ES module URL as the only external library. Generate car, track, scenery, barriers, rivals and effects procedurally. No downloaded models, textures, images, fonts or sound.
2. Create one closed, continuous 3D circuit with at least three visual sectors, varied curves, elevation changes, barriers, road edges, trackside scenery, starting grid and finish line.
3. Implement a drivable vehicle with acceleration, braking, steering, friction, speed-sensitive handling and controlled drift/handbrake. Use a fixed simulation step independent of render FPS.
4. Keep the car grounded and constrain it with track-boundary/collision logic. Wall impacts reduce speed and create feedback. Provide a recovery action that cannot skip lap checkpoints.
5. Add **three rival cars** with waypoint/path-following AI. They start on the grid, follow the track, complete laps and can overtake or be overtaken. They must not drive in place or cut across the circuit.
6. Implement ordered checkpoints and lap validation. A lap counts only after the correct sequence. Race three laps with countdown, position, lap, time, finish and restart.
7. Provide a smoothed chase camera with look-ahead and reset. It must remain comfortable and not obscure the road.
8. Include speed, gear/rev indicator, lap, position, timer, minimap/track outline and control hints. The minimap must reflect the real track and car positions.
9. Support keyboard and touch controls. Touch users need throttle, brake, steering and handbrake buttons. Include pause and restart.
10. Save best lap/race results locally. Include a self-test for acceleration, steering, checkpoint ordering, lap count and finish logic. Handle resize and visible WebGL failure.

## Quality bar
The circuit should feel authored, not like a featureless loop: strong skyline, lighting, road markings, sector identities and landmarks help orientation. Vehicle feedback communicates grip, speed, drift and collisions. Prioritize responsive handling over realism. Avoid unstable physics, unfair rival collisions and camera motion that fights the player.

## Acceptance checklist
- Real 3D circuit and drivable car.
- Acceleration, braking, steering, friction and drift affect motion.
- Three AI rivals follow the track and race three laps.
- Checkpoints prevent lap skipping.
- Camera, HUD, minimap, pause and restart work.
- Keyboard/touch work; best times persist.
- Self-test reports actual physics/race logic results.
- WebGL failure is explained rather than leaving a blank page.

## Submission contract
Create exactly one folder named **skyline-circuit__MODEL_SLUG__RUN_DATE__vVERSION** with **index.html**, **meta.json** and only essential files in **assets/**. Generate track and vehicle geometry in code. No variants, extra pages, README/audit files, screenshots, dependencies or build output. Do not paste code into chat.

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "skyline-circuit",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "14",
  "prompt_label": "Skyline Circuit — 3D Arcade Racer",
  "notes": "One or two honest sentences describing the game and any known limitations."
}
~~~

Use exact run parameters in folder and metadata. The organizer ZIPs this folder; ZIP filename is ignored for routing. Test on GitHub Pages or a local HTTP server if possible. If you cannot launch it, perform a code-level check and disclose the limitation. Report only folder path and honest test status.
