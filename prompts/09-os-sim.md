# Desktop OS simulation — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model must deliver one `.html` file and state its name at the top of the reply.
> Save it as exactly:
>
> `os__{model}__{YYYY-MM-DD}__v1.html`
>
> Example: `os__claude-sonnet-4-5__2026-11-06__v1.html`
> Upload that **.html** (never .rar) to `inbox/`. The Action files it as `runs/{date}_{model}_os_v1/`, previewable on the dashboard.

---

## Model prompt (send everything below this line)

You are a senior frontend systems engineer.

Build a complete browser-based desktop operating system simulation in a single HTML file using HTML5, CSS3, and vanilla JavaScript. No frameworks. No external dependencies except Font Awesome via CDN for icons.

**Primary Goal:** A functional, visually polished fake OS that runs entirely in the browser with real working apps, a desktop, taskbar, and window management.

**Visual Direction:**
- Dark OS theme: #1A1A2E desktop background (deep navy), #16213E taskbar, #0F3460 window titlebars
- Font: system-ui
- Desktop wallpaper: a CSS gradient that shifts between navy and dark purple
- Window drop shadow: 0 8px 32px rgba(0,0,0,0.5)
- Active window: slightly lighter titlebar vs. inactive windows

**Required Desktop Features:**
1. **Taskbar** (bottom) — Clock (live, updates every second), Start button (opens app launcher grid), minimize/restore buttons for open windows, system tray with volume icon placeholder
2. **Desktop icons** — Double-click to open apps. Right-click desktop → context menu with "Refresh", "New File" (creates an untitled icon)
3. **Window management** — Draggable by titlebar, resizable from all edges, minimize to taskbar, maximize (fills viewport), close. Z-index management (clicked window comes to front)
4. **App launcher** — Grid of app icons with labels. Search bar filters apps in real time

**Required Built-in Apps (all must be functional):**

**Calculator**
- Standard calculator with keyboard support
- Operations: +, -, ×, ÷, %, √, +/-, clear, backspace
- Display shows current input and running expression

**Terminal**
- Accepts commands: `help`, `ls`, `pwd`, `echo [text]`, `date`, `clear`, `whoami` (returns "kgpuser"), `calc [expression]` (evaluates math), `cowsay [text]` (renders ASCII cow)
- Scrollable output area, command history with Up/Down arrow keys
- Blinking cursor

**Text Editor (Notepad)**
- Basic textarea with a dark theme
- File menu: New, Save (downloads as .txt), Open (file picker)
- Character/word count in status bar

**Snake Game**
- Arrow key controls, growing snake, apple spawning, score counter
- Game Over overlay with restart button

**GTA5 City Clone**
- Top-down 2D city driving game using Canvas
- Simple grid-based city map (roads, blocks, intersections)
- WASD driving controls: car model (rectangle with direction indicator), traffic rules ignored
- Collision detection against building blocks
- Minimap in corner showing player position
- Wanted level system: drive into "police zone" → stars appear, police car chases you (simple pathfinding)

**Flight Simulator**
- Top-down or side-view 2D flight using Canvas
- Aircraft rendered as a simple SVG-style plane shape
- WASD or arrow keys: W = throttle up, S = brake, A/D = bank left/right
- Altitude indicator, speed indicator, fuel gauge (depletes slowly)
- Clouds as moving background elements
- "Landing pad" — bring aircraft over it at low speed to land and score

**Hard Technical Constraints:**
- Windows must maintain correct Z-index stacking — clicking any window must bring it to the front
- Resize handles must work from all 4 corners and all 4 edges (8 resize zones)
- The terminal `calc` command must safely evaluate expressions (use Function constructor carefully — no `eval` with user strings directly)

**Fallback Instruction:**
If GTA or Flight Simulator are too complex to complete fully, implement them as functional but simplified versions (GTA = just driving on a grid; Flight = just 2D movement). Do not skip them entirely — a placeholder that launches but shows "coming soon" will fail this benchmark.

**Difficulty Extension:**
Add a File System simulation: Terminal `ls` and `pwd` reflect a virtual file tree. Text Editor `Save` writes to this virtual FS. A `Files` app (like Windows Explorer) shows the virtual file tree and allows double-clicking .txt files to open them in the Text Editor.

**NAMING (mandatory):** State the file name as the first line of your reply, named EXACTLY with the benchmark prefix: `os__{model-slug}__{YYYY-MM-DD}__v1.html` — for example `os__claude-sonnet-4-5__2026-11-06__v1.html`. Use today's date and your own model name, lowercased, spaces replaced with hyphens. Do not use a creative file name, uppercase or spaces. The file must run by opening it directly — no server, no build step — and work from a static host such as GitHub Pages.
