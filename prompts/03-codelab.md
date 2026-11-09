# 03 · Algorithms lab — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> Save the model's reply as `codelab__<model-slug>__<YYYY-MM-DD>__v1.html` (use the exact name the model put on its first line; rename it if it did not). Upload the **.html** to `inbox/`. Never upload a .rar.
> The sorter files it as `runs/<date>_<model>_codelab_v1/index.html`.

---

## Model prompt (send everything below this line)

Build an interactive algorithms lab as a single HTML file. You choose the family of algorithms to teach: sorting, graph search, dynamic programming, string matching, computational geometry, scheduling, compression, probability, numerical methods, or a mix. Choose at least six algorithms and implement every one of them yourself, from scratch, in plain JavaScript inside the file. Do not call a built-in that does the work for you (for example `Array.prototype.sort` for a sorting lab).

**Ground rules**
- You choose the theme, name and look. Do not ask questions and do not hedge. Decide and build in one pass.
- One self-contained HTML file with no external files and no libraries.
- Must run opened directly from disk (`file://`) and when hosted on GitHub Pages from a subfolder.
- No placeholder text, TODOs or dead buttons.

**What the lab must do**
- For each algorithm: a visual, step-by-step animation driven by a step generator, with play, pause, step, speed and reset.
- Each algorithm has a live input editor: the user can type in their own data and see it run.
- A complexity note for each algorithm. It must be correct for the implementation shown.
- A test panel with **at least 30 assertions** against your implementations. Include edge cases: empty input, one element, duplicates, negative numbers, disconnected graphs, unreachable targets. Show pass/fail for each, and for failures show expected versus actual.
- An editor pane (a textarea is fine) where the user can rewrite the body of one algorithm and re-run the tests against it. Run the edited code in a sandbox (`new Function` or a Web Worker) so a syntax error or infinite loop does not freeze or crash the page. Show the error, and stop a runaway loop with a time limit.
- A benchmark panel that times each algorithm on inputs of size 1,000, 10,000 and 100,000 and shows the measured milliseconds, labelled honestly as measured on this machine.
- A short "limitations" list naming what your implementations do not handle.

**Deliverable — naming is mandatory**
- Your file must be named exactly: `codelab__{model-slug}__{YYYY-MM-DD}__v1.html`
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file name, no uppercase letters, no spaces.
- Your first line is that exact file name. Then the complete file in one code block. After the block, five bullets on your key creative choices and one known limitation. Nothing else.

---
