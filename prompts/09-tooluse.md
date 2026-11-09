# 09 · Tool-calling playground — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> Save the model's reply as `tooluse__<model-slug>__<YYYY-MM-DD>__v1.html` (use the exact name the model put on its first line; rename it if it did not). Upload the **.html** to `inbox/`. Never upload a .rar.
> The sorter files it as `runs/<date>_<model>_tooluse_v1/index.html`.

---

## Model prompt (send everything below this line)

Build a tool-calling playground as a single HTML file. It has **no network access** and **no real AI model**. You design the agent: its tools, its planner and its executor. The point is to show, step by step, how a request turns into correct tool calls.

**Ground rules**
- You choose the theme, name and look. Do not ask questions and do not hedge. Decide and build in one pass.
- One self-contained HTML file. No libraries, no external data. Any dataset you need is embedded in the file.
- Must run opened directly from disk (`file://`) and when hosted on GitHub Pages from a subfolder.
- No placeholder text, TODOs or dead controls.

**What you must build**
1. **Tools.** At least **6 tools**, each with a name, a description, and a JSON-schema-style argument spec with types and required fields. Include a mix such as: a calculator, a unit or currency converter with embedded rates, date arithmetic, a searchable embedded dataset, a notes or task store with create, read, update and delete, and a mock API that can fail and return an error.
2. **Planner.** A deterministic planner you write (rules, a parser, or a small grammar). It turns natural-language requests into ordered tool calls. Include **at least 6 requests**, and at least two of them must need **3 or more chained calls**, where a later call uses the result of an earlier one.
3. **Executor.** Validates each call's arguments against its schema, rejects bad arguments with a clear message, retries a transient failure once, handles unknown tools, and never throws an uncaught error.
4. **Honest refusals.** A request the tools cannot answer must get an explicit refusal naming what is missing. The app must never invent an answer.
5. **Trace panel.** For every step show: the request, the planned call, the validated arguments, the result or error, and the final answer. Give each step a status.
6. **Test suite.** At least **12 checks**, shown in a panel with pass or fail. Include valid calls, invalid arguments, a chained result, a failure with retry, an unknown tool, and an honest refusal.
7. **Extras.** A **Replay** button that re-runs the trace with a step delay. An **Export trace** button that downloads the whole trace as JSON.

**Quality bar**
- Layout, status indicators and keyboard use should feel like a real product.
- Judge it on correctness first: every answer shown must be right.

**Deliverable — naming is mandatory**
- Your file must be named exactly: `tooluse__{model-slug}__{YYYY-MM-DD}__v1.html`
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file name, no uppercase letters, no spaces.
- Your first line is that exact file name. Then the complete file in one code block. After the block, five bullets on your key creative choices and one known limitation. Nothing else.

---
