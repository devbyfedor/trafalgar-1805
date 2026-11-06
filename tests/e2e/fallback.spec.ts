import { expect, test } from "@playwright/test";
import { collectErrors, collectRequests, open, settleFrames } from "./helpers";

test("a phone gets the fallback screen and no scroll machinery", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const requests = collectRequests(page);
  await open(page, "/");
  await settleFrames(page, 3);

  await expect(page.locator("[data-fallback]")).toBeVisible();
  await expect(page.getByText("designed for a desktop browser")).toBeVisible();
  await expect(page.locator('#dawn [data-layer="art"]')).toBeHidden();

  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  expect(await page.evaluate(() => window.__trafalgar?.scrollTriggers())).toBe(
    0,
  );
  await expect(page.locator(".pin-spacer")).toHaveCount(0);

  // Still exactly one h1, kept for assistive technology.
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

  // Scene 2 is not mounted and loads nothing: no chart data, no stills, no
  // 3D fonts, no chart (docs/scene-02-brief.md, "Fallbacks").
  const scene2 = requests.filter((u) =>
    ["/chart/", "/stills/", "/fonts/3d/"].some((part) => u.includes(part)),
  );
  expect(scene2, "scene 2's assets").toEqual([]);
  expect(await page.evaluate(() => window.__road === undefined)).toBe(true);
  await expect(page.locator("#road canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});
