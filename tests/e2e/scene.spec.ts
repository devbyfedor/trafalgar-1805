import { expect, test } from "@playwright/test";
import {
  collectErrors,
  collectRequests,
  scrollToProgress,
  settleFrames,
} from "./helpers";

test.describe("scene 1 on desktop", () => {
  test("loads with one h1, same-origin requests and no errors", async ({
    page,
    baseURL,
  }) => {
    const errors = collectErrors(page);
    const requests = collectRequests(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveAccessibleName("Trafalgar");
    await expect(page.locator("html")).toHaveClass(/lenis/);

    const origin = new URL(baseURL ?? "").origin;
    const foreign = requests.filter((url) => {
      if (url.startsWith("data:") || url.startsWith("blob:")) return false;
      return new URL(url).origin !== origin;
    });
    expect(foreign, "requests to other hosts").toEqual([]);
    expect(errors).toEqual([]);
  });

  test("keeps the SVG element count under budget", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const counts = await page.evaluate(() => {
      const svgElements = (root: Element | null) =>
        root ? root.querySelectorAll("svg, svg *").length : 0;
      return {
        scene: svgElements(document.querySelector("#dawn")),
        hero: svgElements(
          document.querySelector(
            '[data-el=victory] [data-ship="victory-1805"][data-detail="hero"]',
          ),
        ),
      };
    });
    expect(counts.hero, "hero ship").toBeGreaterThan(0);
    expect(counts.hero, "hero ship").toBeLessThan(1200);
    expect(counts.scene, "scene").toBeLessThan(2500);
  });

  test("the ?debug overlay shows fps and the scene's progress, and no chart readouts", async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto("/?debug");
    await page.waitForLoadState("networkidle");
    const overlay = page.locator("[data-debug-overlay]");
    await expect(overlay).toBeVisible();
    await scrollToProgress(page, 0.5);
    // The readouts refresh twice a second.
    await page.waitForTimeout(1200);

    const lines = (await overlay.innerText())
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^fps \d+$/);
    expect(lines[1]).toMatch(/^dawn p \d\.\d{3}$/);
    expect(Number(lines[1].split(" ").pop())).toBeCloseTo(0.5, 1);
    // The chart's block exists for scene 2 and stays empty here, taking
    // no room, so scene 1's overlay looks as it did before the chart.
    const chart = overlay.locator("[data-debug-chart]");
    await expect(chart).toHaveText("");
    expect((await chart.boundingBox())?.height).toBe(0);
    expect(errors).toEqual([]);
  });

  test("pins for the scene and releases into the scene 2 placeholder", async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const scene = page.locator("#dawn");

    await scrollToProgress(page, 0.5);
    expect((await scene.boundingBox())?.y).toBeCloseTo(0, 0);

    // Past the pin: the scene scrolls away and the placeholder comes in.
    await scrollToProgress(page, 1.3);
    await settleFrames(page, 4);
    expect((await scene.boundingBox())?.y ?? 0).toBeLessThan(-10);
    await expect(page.getByText("Chapter II follows")).toBeInViewport();

    await scrollToProgress(page, 0);
    expect((await scene.boundingBox())?.y).toBeCloseTo(0, 0);
    expect(errors).toEqual([]);
  });
});
