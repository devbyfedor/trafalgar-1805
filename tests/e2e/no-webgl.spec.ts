import { expect, type Page, test } from "@playwright/test";
import { open, scrollToY } from "./helpers";

/**
 * Scene 2 where WebGL is unavailable (docs/scene-02-brief.md, "Fallbacks
 * and accessibility"): the pinned stage shows the scene's stills, each
 * crossfading with the scroll under the scene's own captions, date line
 * and chapter marker; through Boulogne's interlude its view from the sea
 * (docs/scene-02-boulogne-brief.md, stage B) comes in over the chart's
 * still on the dive while the text steps aside, holds with the text back
 * over it and the chapter marker's scrim hidden, and goes on the rise.
 * The browser runs without its 3D APIs, so the chart fails to start.
 */
test.use({ launchOptions: { args: ["--disable-3d-apis"] } });

type Point =
  | { p: number }
  | { phase: "dive" | "hold" | "rise"; t: number; p?: undefined };

/** Scrolls to a point by the scene's own map and lets the scrub settle. */
async function scrollTo(page: Page, point: Point): Promise<void> {
  const y = await page.evaluate((pt) => {
    const map = window.__roadScroll;
    if (!map) return Number.NaN;
    return pt.p !== undefined
      ? map.scrollFor(pt.p)
      : map.scrollForInterlude("boulogne", pt.phase, pt.t);
  }, point);
  expect(Number.isFinite(y)).toBe(true);
  await scrollToY(page, y);
  // The scrub takes 0.6 s.
  await page.waitForTimeout(1400);
}

/** The opacities and states the stills and the text show now. */
function readout(page: Page) {
  return page.evaluate(() => {
    const op = (sel: string) => {
      const el = document.querySelector<HTMLElement>(sel);
      return el ? Number(getComputedStyle(el).opacity) : Number.NaN;
    };
    const scrim = document.querySelector<HTMLElement>(
      "#road [data-el=scrim-chapter]",
    );
    return {
      chart: op("#road [data-still=boulogne]"),
      chase: op("#road [data-still=chase]"),
      sea: op("#road [data-still-sea=boulogne]"),
      text: op("#road [data-layer=text]"),
      scrimHidden: scrim
        ? getComputedStyle(scrim).visibility === "hidden"
        : null,
      date: document.querySelector("#road [data-el=dateline]")?.textContent,
    };
  });
}

test("without WebGL the scene is its stills, with Boulogne's view from the sea through the interlude", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page, "/");
  // The chart starts in idle time and fails: the stills take its place.
  await expect(page.locator("#road [data-still=boulogne]")).toBeAttached({
    timeout: 30_000,
  });

  // On the chart at Boulogne, before the dive: the chart's still.
  await scrollTo(page, { p: 0.2 });
  let r = await readout(page);
  expect(r.chart).toBe(1);
  expect(r.sea).toBe(0);
  expect(r.text).toBe(1);
  expect(r.date).toBe("August 1805");

  // Late in the dive the text is out and the view from the sea is coming in.
  await scrollTo(page, { phase: "dive", t: 0.7 });
  r = await readout(page);
  expect(r.text).toBeLessThan(0.05);
  expect(r.sea).toBeGreaterThan(0.2);
  expect(r.sea).toBeLessThan(1);

  // The hold: the view from the sea whole, loaded, under the text, which
  // is back, the chapter marker without its scrim.
  await scrollTo(page, { phase: "hold", t: 0.5 });
  r = await readout(page);
  expect(r.sea).toBe(1);
  expect(r.text).toBe(1);
  expect(r.scrimHidden).toBe(true);
  expect(r.date).toBe("August 1805");
  const sea = page.locator("#road [data-still-sea=boulogne] img");
  await expect
    .poll(() => sea.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  expect(
    await sea.evaluate((el) => (el as HTMLImageElement).currentSrc),
  ).toContain("/stills/scene-02/boulogne-sea");

  // The rise's end: the chart's still again, the scrim back.
  await scrollTo(page, { phase: "rise", t: 1 });
  r = await readout(page);
  expect(r.sea).toBe(0);
  expect(r.chart).toBe(1);
  expect(r.text).toBe(1);
  expect(r.scrimHidden).toBe(false);

  // The story goes on: the chase's still, its date.
  await scrollTo(page, { p: 0.3 });
  r = await readout(page);
  expect(r.chase).toBe(1);
  expect(r.sea).toBe(0);
  expect(r.date).toMatch(/1805/);
  expect(r.date).not.toBe("August 1805");

  expect(errors).toEqual([]);
});

test.describe("on a wide screen", () => {
  test.use({ viewport: { width: 1720, height: 720 }, deviceScaleFactor: 2 });

  test("the view from the sea is the wide still", async ({ page }) => {
    test.setTimeout(120_000);
    await open(page, "/");
    await expect(page.locator("#road [data-still=boulogne]")).toBeAttached({
      timeout: 30_000,
    });
    await scrollTo(page, { phase: "hold", t: 0.5 });
    const sea = page.locator("#road [data-still-sea=boulogne] img");
    await expect
      .poll(() => sea.evaluate((el) => (el as HTMLImageElement).currentSrc))
      .toContain("/stills/scene-02/boulogne-sea-wide.webp");
  });
});
