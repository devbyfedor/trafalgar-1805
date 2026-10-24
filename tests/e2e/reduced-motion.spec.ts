import { expect, test } from "@playwright/test";
import { collectErrors } from "./helpers";

test.use({ reducedMotion: "reduce" });

test("reduced motion shows the static hero frame without a pin", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Trafalgar",
  );
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  expect(await page.evaluate(() => window.__trafalgar?.scrollTriggers())).toBe(
    0,
  );
  await expect(page.locator(".pin-spacer")).toHaveCount(0);

  // No pin: the placeholder follows the scene directly.
  const sceneBox = await page.locator("#dawn").boundingBox();
  const placeholderBox = await page.locator("#chapter-2").boundingBox();
  expect(placeholderBox?.y).toBeCloseTo(
    (sceneBox?.y ?? 0) + (sceneBox?.height ?? 0),
    0,
  );

  expect(errors).toEqual([]);
});
