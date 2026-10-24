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
