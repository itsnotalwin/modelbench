import { expect, test } from "@playwright/test";
import catalog from "../src/data/catalog.json";

const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
test.use({ baseURL, viewport: { width: 1280, height: 900 } });

test("an artifact starts only on demand and stops on close", async ({ page }) => {
  let loads = 0;
  // Isolate iframe lifecycle testing from the remote host's uptime. Upstream URLs
  // are independently checked; this fixture does not ship with the application.
  await page.route("https://itsnotalwin.github.io/modelbench/runs/**", (route) => { loads++; return route.fulfill({ contentType: "text/html", body: "<title>Test build</title><main>Artifact ready</main>" }); });
  await page.goto("/"); await page.getByRole("button", { name: "Inspect Gravity", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible(); expect(loads).toBe(0);
  await page.getByRole("button", { name: "Live preview", exact: true }).click();
  await expect(page.frameLocator(".live-frame").getByText("Artifact ready")).toBeVisible(); expect(loads).toBe(1);
  await page.getByRole("button", { name: "phone viewport", exact: true }).click(); await expect.poll(async () => (await page.locator(".live-frame").boundingBox())?.width).toBe(390);
  await page.getByRole("button", { name: "Overview", exact: true }).click(); await expect(page.locator("iframe")).toHaveCount(0);
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("valid upstream backups import atomically, invalid ones do not", async ({ page }) => {
  await page.goto("/leaderboard"); const slug = catalog.runs[0].slug;
  const scores = Object.fromEntries(["completeness", "robustness", "craft", "depth", "originality", "performance"].map((a) => [a, 4]));
  const backup = (s: Record<string, number>) => ({ name: "modelbench-ratings.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ version: 1, ratings: [{ slug, scores: s }] })) });
  await page.getByLabel("Import ratings file").setInputFiles(backup({ ...scores, craft: 8 })); await expect(page.locator(".toast")).toContainText("Nothing was changed"); await expect(page.locator(".rated-badge")).toHaveCount(0);
  await page.getByLabel("Import ratings file").setInputFiles(backup(scores)); await expect(page.getByRole("dialog")).toContainText("1 valid scorecards"); await page.getByRole("button", { name: "Import ratings", exact: true }).click();
  await expect(page.locator(".rated-badge")).toHaveText("4.00 / 5"); await page.reload(); await expect(page.locator(".rated-badge")).toHaveText("4.00 / 5");
});
