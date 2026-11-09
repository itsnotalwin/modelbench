# 06 · Echo Courier — Original 2D Puzzle Game

## Run parameters
Set these three values before starting the run. They must be the same values written into the output folder and metadata.

- MODEL_SLUG: [model-slug]
- RUN_DATE: [YYYY-MM-DD]
- VERSION: 1

If a value is still bracketed, stop and ask the organizer to fill it in. Do not invent the model identifier or date.

## The brief

Build **Echo Courier**, one complete, original 2D puzzle game. The player is a courier crossing a sealed clockwork archive. Every move is recorded. Four turns later, an echo repeats that same sequence of moves, one move at a time. The player must coordinate with the echo to hold switches, open gates and reach the exit.

This delayed echo is the central mechanic, not a visual effect. The game should teach it clearly, then use it to create increasingly interesting puzzles. Do not turn the concept into a generic platformer, shooter, endless runner or match-three game.

## Core rules

- The board is a tile-based room. The courier moves one tile per valid turn using arrow keys or WASD.
- The game records the last four valid movement inputs. Once four moves have been made, an echo begins replaying that exact sequence with a four-turn delay.
- The echo is a real entity on the board. It can activate echo-sensitive floor switches and must obey walls and room rules.
- The exit opens only when the required switch condition is satisfied. The courier must reach the exit after or while the echo holds the correct switch.
- Invalid moves do not advance the turn. The player can undo at least the last four turns and restart the current room.
- Every room must communicate the echo's current/next action and the recorded sequence without hiding the game board.

You may add one or two supporting mechanics, such as doors, one-way tiles, moving hazards or movable crates, but they must deepen the echo mechanic rather than overwhelm it.

## Product requirements

1. Create a polished title screen, concise playable tutorial, pause state, level selection/unlock progression, win state and restart flow.
2. Include at least five handcrafted rooms with increasing difficulty. Each room must have a clear solution, a readable objective and a meaningful reason to use the delayed echo.
3. Make the game turn-based and deterministic. There must be no timing requirement that depends on frame rate.
4. Show the recorded input queue and echo location/action clearly. The player must be able to predict what the echo will do next.
5. Provide clear feedback for movement, switch activation, gate changes, blocked actions, success and failure. Use restrained animation and optional sound.
6. Support keyboard and touch input. Touch controls must be large enough for a phone and must not cover important board content.
7. Save unlocked rooms and settings locally. A reset-progress action must be available and require confirmation.
8. Include a built-in self-test that checks a valid movement sequence, echo replay timing, switch activation, gate state and undo/restart consistency. Expose its pass/fail result from a clearly labelled test option or debug panel.

## Quality bar

Give the game its own visual identity, readable board language, delightful feedback and well-paced difficulty. Use original vector/canvas artwork generated in code. Do not use external images, external libraries, remote fonts or a backend. Avoid placeholder levels, impossible rooms and solutions that require random guessing.

Use semantic controls around the game, visible focus, sufficient contrast, reduced-motion support and no console errors. The game must remain legible at desktop and phone sizes.

## Acceptance checklist

Before finishing, verify that:
- The four-turn echo delay is implemented exactly and can be understood before the first puzzle.
- Echo movement is deterministic and uses the recorded valid inputs.
- Echo-sensitive switches and gates respond to the correct entity/state.
- All five rooms are solvable and introduce mechanics progressively.
- Undo and restart restore the complete game state, including the echo queue.
- Keyboard and touch controls both work.
- Progress persists across reloads and can be reset.
- The built-in self-test reports real checks, not a hard-coded success message.

## Submission contract — mandatory

Create exactly one folder at the workspace root named:

**game-2d__MODEL_SLUG__RUN_DATE__vVERSION**

It must contain **index.html**, **meta.json**, and only essential runtime files in **assets/** if required. Keep the full game in one HTML page with inline CSS/JS. Do not create several games, three variants, extra HTML pages, README/audit files, screenshots, package files, dependencies or build output. Create files in the workspace; do not paste source code into chat.

Use this valid UTF-8 metadata:

~~~json
{
  "schema_version": 1,
  "model": "MODEL_SLUG",
  "category": "game-2d",
  "date": "RUN_DATE",
  "version": VERSION,
  "entry": "index.html",
  "prompt": "06",
  "prompt_label": "Echo Courier — Original 2D Puzzle Game",
  "notes": "One or two honest sentences describing the completed build and any known limitations."
}
~~~

Use the exact run parameters in the folder and metadata. The organizer ZIPs the folder; the ZIP filename is not used for routing. Test in a browser if possible. If not, perform a code-level smoke check and disclose that. Report only the folder path and honest test status.
