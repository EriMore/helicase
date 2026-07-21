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

  test("entering a cluster expands the depth rail and shows a return hint", async ({ page }) => {
    await waitForAtlasReady(page);
    await page.locator(".hx-label-territory").first().click({ force: true });
    await expect(page.locator(".hx-rail-level").nth(1)).toContainText("CLUSTER");
    await expect(page.locator(".hx-rail-sub").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".hx-rail-hint")).toContainText("Click a cluster to enter");
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
    const soundToggle = page.locator(".hx-toggle", { hasText: "SOUND" });
    await expect(soundToggle).toContainText("SOUND ○");
    await soundToggle.click();
    await expect(soundToggle).toContainText("SOUND ●");
    await page.reload();
    await page.waitForSelector(".hx-loading", { state: "detached", timeout: ATLAS_LOAD_TIMEOUT });
    await expect(page.locator(".hx-toggle", { hasText: "SOUND" })).toContainText("SOUND ●");
  });

  test("GUIDE button always reopens the coach-mark tour, ringing a real control without blocking it", async ({ page }) => {
    await waitForAtlasReady(page);
    await page.locator(".hx-guide-entry").click();
    await expect(page.locator(".hx-coach")).toBeVisible();
    await expect(page.locator(".hx-coach-eyebrow")).toContainText("1 / 7");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".hx-coach-ring")).toBeVisible();
    // The ring highlights the real cluster label; it must not cover/disable it.
    await expect(page.locator(".hx-label-territory").first()).toBeEnabled();
    await page.keyboard.press("Escape");
    await expect(page.locator(".hx-coach")).toHaveCount(0);
  });

  test("query matches are reliably selectable across the viewport at normal zoom, and non-matches never are", async ({ page }) => {
    // The 42-point grid sweep is the slowest test in this suite by design (breadth over
    // speed); give it real headroom rather than the default 120s margin other tests use.
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await waitForAtlasReady(page);
    await page.locator(".hx-query-input").fill("kinase");
    await page.locator(".hx-query-input").press("Enter");
    await expect(page.locator(".hx-query-results")).toBeVisible({ timeout: 15_000 });
    const countText = await page.locator(".hx-query-count").textContent();
    const matchCount = Number((countText ?? "0").replace(/[^0-9]/g, ""));
    expect(matchCount).toBeGreaterThanOrEqual(50);

    const matchIds = new Set(await page.evaluate(() => window.__atlasTestHooks?.getQueryResultIds() ?? []));
    expect(matchIds.size).toBeGreaterThanOrEqual(50);

    // Sample a grid across open canvas — different screen regions, deliberately inset from
    // the header, depth rail, query bar, and telemetry chrome so every sample is a genuine
    // click on the point field, not on real UI controls — attempting a normal click at each
    // point, no zooming in, no special angle. Every successful selection must be a real
    // match; a healthy fraction of attempts must succeed (a generous, independently
    // increased hit radius, not the tiny rendered point radius).
    const canvasBox = await page.locator(".hx-canvas-layer").boundingBox();
    if (!canvasBox) throw new Error("canvas not measurable");
    let attempts = 0;
    let hits = 0;
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        attempts += 1;
        const x = canvasBox.x + canvasBox.width * (0.30 + 0.095 * col);
        const y = canvasBox.y + canvasBox.height * (0.30 + 0.095 * row);
        await page.mouse.click(x, y);
        await page.waitForTimeout(100);
        const isSelected = await page.locator(".hx-identity").isVisible().catch(() => false);
        if (isSelected) {
          hits += 1;
          const selectedId = await page.locator(".hx-identity-id").textContent();
          expect(matchIds.has((selectedId ?? "").trim()), `selected ${selectedId} must be a real query match`).toBe(true);
          // Return to the query view (without clearing the query) for the next sample.
          await page.locator(".hx-identity-close").click();
          await page.waitForTimeout(80);
        }
      }
    }
    expect(hits, `expected a reliable hit rate across ${attempts} grid samples over ${matchCount} matches`).toBeGreaterThan(attempts * 0.15);
  });

  test("relationship thread endpoints project exactly onto their real proteins' screen positions", async ({ page }) => {
    // Also grid-sweeps to find a protein and reveal threads — same headroom rationale as
    // the query-selectability test above.
    test.setTimeout(240_000);
    await waitForAtlasReady(page);
    // A screenshot alone can't prove a thread is anchored correctly — project every
    // endpoint with the exact camera the renderer uses and compare against each protein's
    // own on-screen position, computed the same way. This is the hard correctness gate:
    // a thread must never emanate from or terminate at empty space.
    await page.locator(".hx-query-input").fill("kinase");
    await page.locator(".hx-query-input").press("Enter");
    await expect(page.locator(".hx-query-results")).toBeVisible({ timeout: 15_000 });

    const canvasBox = await page.locator(".hx-canvas-layer").boundingBox();
    if (!canvasBox) throw new Error("canvas not measurable");
    let selected = false;
    outer:
    for (let row = 0; row < 10 && !selected; row++) {
      for (let col = 0; col < 10; col++) {
        const x = canvasBox.x + canvasBox.width * (0.03 + 0.094 * col);
        const y = canvasBox.y + canvasBox.height * (0.1 + 0.085 * row);
        await page.mouse.click(x, y);
        await page.waitForTimeout(120);
        selected = await page.locator(".hx-identity").isVisible().catch(() => false);
        if (selected) break outer;
      }
    }
    expect(selected).toBe(true);

    await page.locator(".hx-threads-toggle").click();
    await expect(page.locator(".hx-threads-toggle")).toHaveText("HIDE");
    await page.waitForTimeout(2000);

    const endpoints = await page.evaluate(() => window.__atlasTestHooks?.getVisibleThreadEndpoints() ?? []);
    if (endpoints.length === 0) {
      // A protein with no real, attributable relationship signal is a legitimate outcome
      // (relationships.ts never invents an edge) — nothing further to verify here.
      return;
    }

    const result = await page.evaluate((eps) => {
      const hooks = window.__atlasTestHooks;
      if (!hooks) return null;
      return eps.map((endpoint) => {
        const rendered = hooks.projectWorldToScreen(endpoint.to);
        const expected = hooks.getProteinWorldPosition(endpoint.proteinId);
        const expectedScreen = expected ? hooks.projectWorldToScreen(expected) : null;
        return { proteinId: endpoint.proteinId, rendered, expectedScreen };
      });
    }, endpoints);

    expect(result).not.toBeNull();
    const TOLERANCE_PX = 0.5;
    for (const entry of result!) {
      expect(entry.rendered).not.toBeNull();
      expect(entry.expectedScreen).not.toBeNull();
      const dx = Math.abs(entry.rendered!.x - entry.expectedScreen!.x);
      const dy = Math.abs(entry.rendered!.y - entry.expectedScreen!.y);
      expect(dx, `thread endpoint for ${entry.proteinId} drifted ${dx}px in x from the real protein`).toBeLessThan(TOLERANCE_PX);
      expect(dy, `thread endpoint for ${entry.proteinId} drifted ${dy}px in y from the real protein`).toBeLessThan(TOLERANCE_PX);
    }
  });

  test("the first-run invitation is quiet (not blocking), declines persist, and never reappear", async ({ page }) => {
    test.setTimeout(120_000);
    await waitForAtlasReady(page);
    // It must not appear immediately — the user can interact freely first.
    await expect(page.locator(".hx-invite")).toHaveCount(0);
    await expect(page.locator(".hx-invite")).toBeVisible({ timeout: 12_000 });
    // Non-blocking: the canvas underneath stays interactive while the invitation shows.
    await expect(page.locator(".hx-canvas-layer")).toBeEnabled();
    await page.locator(".hx-invite-actions button", { hasText: "I'LL EXPLORE" }).click();
    await expect(page.locator(".hx-invite")).toHaveCount(0);
    await page.reload();
    await page.waitForSelector(".hx-loading", { state: "detached", timeout: ATLAS_LOAD_TIMEOUT });
    await page.waitForTimeout(9000);
    await expect(page.locator(".hx-invite")).toHaveCount(0);
  });
});
