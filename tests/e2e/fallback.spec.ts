import { expect, test } from "@playwright/test";
import { collectErrors, open, settleFrames } from "./helpers";

test("a phone gets the fallback screen and no scroll machinery", async ({
  page,
}) => {
  const errors = collectErrors(page);
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
  expect(errors).toEqual([]);
});
