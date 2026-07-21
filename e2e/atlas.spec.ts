import { expect, test } from "@playwright/test";

const ATLAS_LOAD_TIMEOUT = 60_000;

async function waitForAtlasReady(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.waitForSelector(".hx-loading", { state: "detached", timeout: ATLAS_LOAD_TIMEOUT });
}

test.describe("Helicase Atlas — core shell", () => {
  test("loading resolves into the Universe with global chrome visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hx-loading")).toBeVisible();
    await expect(page.locator(".hx-loading-stage")).toBeVisible();
    await waitForAtlasReady(page);
    await expect(page.locator(".hx-header")).toBeVisible();
    await expect(page.locator(".hx-rail")).toHaveCSS("opacity", "1");
    await expect(page.locator(".hx-query")).toBeVisible();
    await expect(page.locator(".hx-ask-button")).toBeVisible();
    await expect(page.locator(".hx-rail-level").first()).toContainText("UNIVERSE");
  });

  test("console stays clean through arrival", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
    await waitForAtlasReady(page);
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });

  test("theme toggle swaps tokens and persists across reload", async ({ page }) => {
    test.setTimeout(120_000);
    await waitForAtlasReady(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.locator(".hx-toggle-theme").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await page.waitForSelector(".hx-loading", { state: "detached", timeout: ATLAS_LOAD_TIMEOUT });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("entering a territory expands the depth rail and shows a return hint", async ({ page }) => {
    await waitForAtlasReady(page);
    await page.locator(".hx-label-territory").first().click({ force: true });
    await expect(page.locator(".hx-rail-level").nth(1)).toContainText("TERRITORY");
    await expect(page.locator(".hx-rail-sub").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".hx-rail-hint")).toContainText("Click a territory to enter");
  });

  test("deterministic query shows a result count distinct from Ask Atlas", async ({ page }) => {
    await waitForAtlasReady(page);
    await page.locator(".hx-query-input").fill("membrane receptors");
    await page.locator(".hx-query-input").press("Enter");
    await expect(page.locator(".hx-query-results")).toBeVisible({ timeout: 15_000 });
    await page.locator(".hx-query-clear").click();
    await expect(page.locator(".hx-query-results")).toHaveCount(0);
  });

  test("Ask Atlas is summonable with Ctrl+K and dismissible, never a persistent sidebar", async ({ page }) => {
    await waitForAtlasReady(page);
    await expect(page.locator(".hx-command")).toHaveCount(0);
    await page.keyboard.press("Control+k");
    await expect(page.locator(".hx-command")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".hx-command")).toHaveCount(0);
  });

  test("sound toggle persists across reload, off by default", async ({ page }) => {
    test.setTimeout(120_000);
    await waitForAtlasReady(page);
    await expect(page.locator(".hx-toggle").first()).toContainText("SOUND ○");
    await page.locator(".hx-toggle").first().click();
    await expect(page.locator(".hx-toggle").first()).toContainText("SOUND ●");
    await page.reload();
    await page.waitForSelector(".hx-loading", { state: "detached", timeout: ATLAS_LOAD_TIMEOUT });
    await expect(page.locator(".hx-toggle").first()).toContainText("SOUND ●");
  });
});
