import { expect, test } from "@playwright/test";
import { collectErrors, open } from "./helpers";

test.use({ reducedMotion: "reduce" });

test("reduced motion shows the static hero frame without a pin", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await open(page, "/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    "Trafalgar",
  );
  await expect(page.locator("html")).not.toHaveClass(/lenis/);
  expect(await page.evaluate(() => window.__trafalgar?.scrollTriggers())).toBe(
    0,
  );
  await expect(page.locator(".pin-spacer")).toHaveCount(0);

  // No pin: scene 2, as stills with their captions, follows directly.
  const sceneBox = await page.locator("#dawn").boundingBox();
  const roadBox = await page.locator("[data-scene-wrapper=road]").boundingBox();
  expect(roadBox?.y).toBeCloseTo(
    (sceneBox?.y ?? 0) + (sceneBox?.height ?? 0),
    0,
  );
  await expect(page.locator("[data-stills=stacked]")).toBeVisible();
  await expect(page.locator("#road")).toBeHidden();

  // One still per beat, each loaded from this site, with the captions as
  // real text (docs/scene-02-brief.md, "Fallbacks and accessibility").
  const stills = page.locator("[data-stills=stacked] img");
  expect(await stills.count()).toBeGreaterThanOrEqual(7);
  // Boulogne's view from the sea follows its chart's still, under the
  // beat's caption (docs/scene-02-boulogne-brief.md, stage B).
  await expect(
    page.locator("[data-stills=stacked] figure img[data-still-sea=boulogne]"),
  ).toHaveCount(1);
  for (const img of await stills.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  }
  await expect(page.locator("[data-stills=stacked] figcaption")).toHaveCount(5);

  // The closing card after the last still, whole and still: no letters split.
  const card = page.getByRole("heading", { name: "To be continued" });
  await card.scrollIntoViewIfNeeded();
  await expect(card).toBeInViewport();
  await expect(page.locator("#continued .title-char")).toHaveCount(0);
  for (const el of await page.locator("#continued [data-el=line]").all())
    expect(await el.evaluate((e) => getComputedStyle(e).opacity)).toBe("1");

  expect(errors).toEqual([]);
});
