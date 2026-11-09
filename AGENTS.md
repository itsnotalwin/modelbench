# ModelBench Agent Rules

- Read PROJECT.md and the nearest CONTEXT.md before editing.
- Preserve existing submissions and run history. Never overwrite or delete an existing run.
- Prompt files, prompts/catalog.json, prompt-suite documentation and importer metadata validation must stay aligned.
- Every prompt is one challenge and one finished artifact. Do not reintroduce multiple outputs per prompt.
- For ZIP submissions, meta.json is the sole routing source for model, category, date and version. The archive filename and folder name are not routing inputs.
- Validate model slugs, categories, ISO dates, positive integer versions, ZIP entry paths and index.html before creating a run.
- Rejected archives must remain in inbox with actionable errors. Do not silently discard uploads.
- Keep organizer-owned scores and evaluation logs out of model-authored metadata.
- Do not change the dashboard's visual implementation unless the task explicitly asks for UI changes.
- Run the test suite before committing importer changes. Verify the commit and any triggered GitHub Actions run.
- Never commit secrets, credentials, user data or dependency/build output.
