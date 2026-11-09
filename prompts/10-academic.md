# 10 · Academic explainer — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> Save the model's reply as `academic__<model-slug>__<YYYY-MM-DD>__v1.html` (use the exact name the model put on its first line; rename it if it did not). Upload the **.html** to `inbox/`. Never upload a .rar.
> The sorter files it as `runs/<date>_<model>_academic_v1/index.html`.

---

## Model prompt (send everything below this line)

Build an interactive explainer as a single HTML file on **one topic you choose** at graduate or advanced undergraduate level. Examples of the kind of topic: a proof technique, a stochastic process, an information-theory result, a control-theory idea, an epidemiology model, a statistics concept that people misuse, a quantum or optics phenomenon, an economics or biology mechanism. Pick one that you understand well enough to teach accurately.

**Ground rules**
- You choose the topic, title and look. Do not ask questions and do not hedge. Decide and build in one pass.
- One self-contained HTML file. You may load MathJax or KaTeX from a CDN at an exact pinned version, or typeset the maths by hand.
- Must run opened directly from disk (`file://`) and when hosted on GitHub Pages from a subfolder.
- No placeholder text, TODOs or dead controls.
- **Accuracy is part of the test.** A wrong equation, a wrong claim or an invented citation is a failed run.

**What the explainer must contain**
- A plain-language layer and a rigorous layer that the reader can switch between.
- The core mathematics, written correctly, with the assumptions stated.
- **At least 3 interactive visualisations** in which sliders or inputs change the result. An animation that only plays is not enough.
- A **worked example** with every step shown and explained.
- A **5-question quiz**, with answers hidden until submitted. Each wrong option gets an explanation of why it is wrong.
- A **common mistakes** section with at least 3 items.
- A **references** section. List only sources you are highly confident exist, with author, year and title. Mark any source you are unsure about as `unverified`. Do not invent DOIs or page numbers.
- A **What is still uncertain or contested** section. Be honest about open questions and about the limits of the model.

**Deliverable — naming is mandatory**
- Your file must be named exactly: `academic__{model-slug}__{YYYY-MM-DD}__v1.html`
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file name, no uppercase letters, no spaces.
- Your first line is that exact file name. Then the complete file in one code block. After the block, five bullets on your key creative choices and one known limitation. Nothing else.
