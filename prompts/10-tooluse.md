# 10 · Tool-calling playground — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `tooluse__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate tool-calling playgrounds**, each as its own single HTML file, in three different domains (for example travel, home inventory, a science or maths workbench, personal finance, a library). Each has **no network access** and **no real AI model**. In each one you design the agent: its tools, its planner and its executor. The point is to show, step by step, how a request turns into correct tool calls.

**Ground rules (apply to all three)**
- You choose the names, domains and look. Do not ask questions and do not hedge. Decide and build.
- Each file is one self-contained HTML file. No libraries, no external data. Any dataset you need is embedded in the file.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder.
- No placeholder text, TODOs or dead controls.

**What each playground must build**
1. **Tools.** At least **6 tools**, each with a name, a description, and a JSON-schema-style argument spec with types and required fields. Include a mix such as: a calculator, a unit or currency converter with embedded rates, date arithmetic, a searchable embedded dataset, a notes or task store with create, read, update and delete, and a mock API that can fail and return an error.
2. **Planner.** A deterministic planner you write (rules, a parser, or a small grammar). It turns natural-language requests into ordered tool calls. Include **at least 6 requests**, and at least two must need **3 or more chained calls**, where a later call uses the result of an earlier one.
3. **Executor.** Validates each call's arguments against its schema, rejects bad arguments with a clear message, retries a transient failure once, handles unknown tools, and never throws an uncaught error.
4. **Honest refusals.** A request the tools cannot answer gets an explicit refusal that names what is missing. The app never invents an answer.
5. **Trace panel.** For every step, show the request, the planned call, the validated arguments, the result or error, and the final answer, with a status for each step.
6. **Test suite.** At least **12 checks**, shown in a panel with pass or fail. Include valid calls, invalid arguments, a chained result, a failure with retry, an unknown tool, and an honest refusal.
7. **Extras.** A **Replay** button that re-runs the trace with a step delay. An **Export trace** button that downloads the trace as JSON.

**Quality bar**
- Layout, status indicators and keyboard use should feel like a real product.
- Correctness first: every answer shown must be right.

**Delivery — naming is mandatory**
- File names are `tooluse__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per playground: its domain, the key creative choice, and one known limitation. Nothing else.

---
