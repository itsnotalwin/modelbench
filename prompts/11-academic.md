# 11 · Academic explainer — benchmark prompt

> **Uploader instruction (do NOT send this header to the model):**
> The model delivers three files. Upload each one as its own `.html` into `inbox/`, renamed to exactly:
> `academic__<model-slug>__<YYYY-MM-DD>__v1.html`, `…__v2.html`, `…__v3.html`
> Never upload a .rar. A retest of this prompt uses v4, v5, v6.

---

## Model prompt (send everything below this line)

Build **three separate interactive explainers**, each as its own single HTML file. Each explainer teaches **one topic you choose**, at graduate or advanced undergraduate level, and the three topics must come from different fields. Examples of the kind of topic: a proof technique, a stochastic process, an information-theory result, a control-theory idea, an epidemiology model, a statistics concept that people misuse, a quantum or optics phenomenon, an economics or biology mechanism. Pick topics you understand well enough to teach accurately.

**Ground rules (apply to all three)**
- You choose the topics, titles and look. Do not ask questions and do not hedge. Decide and build.
- Each file is one self-contained HTML file. You may load MathJax or KaTeX from a CDN at an exact pinned version, or typeset the maths by hand.
- Each must open directly from disk (`file://`) and work on GitHub Pages from a subfolder.
- No placeholder text, TODOs or dead controls.
- **Accuracy is part of the test.** A wrong equation, a wrong claim or an invented citation counts as a failed run.

**What each explainer must contain**
- A plain-language layer and a rigorous layer that the reader can switch between.
- The core mathematics, written correctly, with the assumptions stated.
- **At least 3 interactive visualisations** in which sliders or inputs change the result. An animation that only plays is not enough.
- A **worked example** with every step shown and explained.
- A **5-question quiz**, with answers hidden until submitted. Each wrong option gets an explanation of why it is wrong.
- A **common mistakes** section with at least 3 items.
- A **references** section. List only sources you are highly confident exist, with author, year and title. Mark any source you are unsure about as `unverified`. Do not invent DOIs or page numbers.
- A **What is still uncertain or contested** section. Be honest about open questions and the limits of the model.

**Delivery — naming is mandatory**
- File names are `academic__{model-slug}__{YYYY-MM-DD}__v1.html`, then `…__v2.html`, then `…__v3.html`.
  - `{model-slug}`: your model name in lowercase, hyphens for spaces, dots kept when they are part of the name (for example `glm-5.3-flash`).
  - `{YYYY-MM-DD}`: today's date.
  - No creative file names, no uppercase letters, no spaces.
- Deliver the three files in order. Before each one, write its exact file name on its own line. Then the complete file in one code block.
- After the third file, give one short bullet list per explainer: its topic, the key creative choice, and one known limitation. Nothing else.
