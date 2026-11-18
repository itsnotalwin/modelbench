import { test, expect } from "@playwright/test";
import catalog from "../src/data/catalog.json";

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
test.use({ baseURL: base, viewport: { width: 1440, height: 960 } });

test("explorer renders real runs without loading any artifacts", async ({ page }) => {
  const external: string[] = []; page.on("request", (r) => { if (!r.url().startsWith(base)) external.push(r.url()); });
  await page.goto("/"); await expect(page.getByRole("heading", { name: "Run explorer" })).toBeVisible();
  await expect(page.locator(".run-card")).toHaveCount(6); await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search runs" }).fill("gravity"); await expect(page.locator(".run-card")).not.toHaveCount(6);
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.getByRole("combobox", { name: "Filter by challenge" }).selectOption("restaurant"); await expect(page.locator(".run-card")).toHaveCount(2);
  await page.getByRole("button", { name: "List view", exact: true }).click(); await expect(page.locator(".run-grid")).toHaveClass(/list-view/);
  await page.getByRole("button", { name: "Clear filters", exact: true }).click(); await page.getByRole("button", { name: "Load more runs" }).click(); await expect(page.locator(".run-card")).toHaveCount(12);
  expect(external).toEqual([]);
});

test("bookmarks, scorecards, exports, and comparison persist", async ({ page }) => {
  const loaded = page.waitForResponse((r) => r.url().endsWith("/api/workspace") && r.request().method() === "GET"); await page.goto("/"); await loaded;
  await page.getByRole("button", { name: "Save Gravity", exact: true }).click(); await expect(page.getByRole("button", { name: "Unsave Gravity", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload(); await expect(page.getByRole("button", { name: "Unsave Gravity", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add Gravity to comparison", exact: true }).click(); await page.getByRole("button", { name: "Add Lumenfall to comparison", exact: true }).click();
  await page.getByRole("button", { name: "Inspect Gravity", exact: true }).click(); const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible(); await expect(page.locator("iframe")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Scorecard", exact: true }).click();
  for (const a of ["completeness", "robustness", "craft", "depth", "originality", "performance"]) await dialog.getByRole("combobox", { name: `Rate ${a}`, exact: true }).selectOption("4.5");
  await dialog.getByRole("button", { name: "Save scorecard", exact: true }).click(); await expect(dialog.getByRole("status")).toHaveText("Scorecard saved.");
  await page.keyboard.press("Escape"); await page.getByRole("link", { name: /^Compare/ }).click(); await expect(page.locator(".compare-card")).toHaveCount(2); await expect(page.locator(".average-row")).toContainText("4.50");
  await page.getByRole("link", { name: "Leaderboard", exact: true }).click(); await expect(page.locator(".rated-badge").first()).toContainText("4.50");
  const downloading = page.waitForEvent("download"); await page.getByRole("button", { name: "Export", exact: true }).click(); expect((await downloading).suggestedFilename()).toBe("modelbench-ratings.json");
});

test("challenge prompts are local, complete, and filter the explorer", async ({ page }) => {
  await page.goto("/challenges"); await expect(page.locator(".challenge-card")).toHaveCount(22);
  await page.getByRole("textbox", { name: "Search challenges" }).fill("Restaurant Website"); await page.locator(".challenge-card").click();
  await page.getByRole("button", { name: "Full prompt", exact: true }).click(); await expect(page.locator(".prompt-text")).toContainText("## The brief");
  await page.getByRole("link", { name: "Explore 2 runs" }).click(); await expect(page.locator(".run-card")).toHaveCount(2); await expect(page.getByRole("combobox", { name: "Filter by challenge" })).toHaveValue("restaurant");
});

test("private workspaces are isolated and reject invalid scores", async ({ request, playwright }) => {
  const first = await request.get("/api/workspace"); expect(first.ok()).toBeTruthy(); const slug = catalog.runs[0].slug;
  expect((await request.post("/api/workspace", { data: { action: "bookmark", slug, saved: true } })).ok()).toBeTruthy();
  const bad = await request.post("/api/workspace", { data: { action: "rate", slug, scores: { performance: 9 } } }); expect(bad.status()).toBe(400);
  const other = await playwright.request.newContext({ baseURL: base }); const fresh = await (await other.get("/api/workspace")).json(); expect(fresh.preferences).toEqual({}); await other.dispose();
  expect((await (await request.get("/api/workspace")).json()).preferences[slug].saved).toBe(true);
});

test("mobile viewport fits, navigates, and opens a run", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/"); await expect(page.locator(".hero-art")).toBeVisible();
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  }
  await page.getByRole("button", { name: "Inspect Gravity", exact: true }).click(); await expect(page.getByRole("dialog")).toBeVisible(); await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("link", { name: "Challenges", exact: true }).click(); await expect(page.getByRole("heading", { name: "Challenge library" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.setViewportSize({ width: 320, height: 844 });
  for (const route of ["/challenges", "/compare", "/leaderboard"]) {
    await page.goto(route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  }
});
