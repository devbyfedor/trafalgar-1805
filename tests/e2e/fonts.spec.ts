import { expect, type Page, test } from "@playwright/test";
import { collectErrors, open, scrollToProgress, settleFrames } from "./helpers";

/**
 * The real faces (src/fonts): Bodoni Moda for the title, Baskervville for
 * the rest. The title is split into letters, which loses kerning; the scene
 * restores it from the loaded face and re-splits when a face loads later.
 */

/** Long enough for the 0.6 s scrub to settle; at p = 0.6 the letters rest. */
const SCRUB_SETTLE_MS = 1600;

interface TitleReport {
  family: string;
  textFamily: string;
  loaded: boolean;
  opticalSizing: string;
  letters: number;
  lines: number;
  /** Largest distance between a letter and its kerned position, in CSS px. */
  kerningError: number;
  right: number;
}

/** Measures the split title against an unsplit, kerned copy of itself. */
function readTitle(page: Page): Promise<TitleReport> {
  return page.evaluate(() => {
    const h1 = document.querySelector("[data-el=title]") as HTMLElement;
    const style = getComputedStyle(h1);
    const first = (list: string) =>
      list.split(",")[0].trim().replace(/["']/g, "");
    const family = first(style.fontFamily);
    const textFamily = first(
      getComputedStyle(document.querySelector("[data-el=dateline]") as Element)
        .fontFamily,
    );
    const faces = [...document.fonts].filter((f) =>
      [family, textFamily].includes(f.family.replace(/["']/g, "")),
    );
    const chars = [...h1.querySelectorAll<HTMLElement>(".title-char")];
    const probe = document.createElement("span");
    probe.style.cssText =
      "position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap";
    probe.textContent = chars.map((c) => c.textContent).join("");
    h1.append(probe);
    const text = probe.firstChild as Text;
    const range = document.createRange();
    const kerned = chars.map((_, i) => {
      range.setStart(text, i);
      range.setEnd(text, i);
      return range.getBoundingClientRect().left;
    });
    probe.remove();
    const lefts = chars.map((c) => c.getBoundingClientRect().left);
    const kerningError = Math.max(
      ...lefts.map((l, i) => Math.abs(l - lefts[0] - (kerned[i] - kerned[0]))),
    );
    const last = chars[chars.length - 1]?.getBoundingClientRect();
    return {
      family,
      textFamily,
      loaded: faces.length >= 2 && faces.every((f) => f.status === "loaded"),
      opticalSizing: style.fontOpticalSizing,
      letters: chars.length,
      lines: new Set(chars.map((c) => Math.round(c.offsetTop))).size,
      kerningError,
      right: last ? last.right : 0,
    };
  });
}

async function openAtHero(page: Page): Promise<void> {
  await open(page, "/");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await settleFrames(page, 4);
  await scrollToProgress(page, 0.6);
  await page.waitForTimeout(SCRUB_SETTLE_MS);
}

function expectSetInTheRealFaces(report: TitleReport, viewportWidth: number) {
  expect(report.loaded, "both faces loaded").toBe(true);
  expect(report.family).not.toMatch(/Iowan|Palatino|Georgia|serif/);
  expect(report.textFamily).not.toMatch(/Iowan|Palatino|Georgia|serif/);
  expect(report.family).not.toBe(report.textFamily);
  expect(report.opticalSizing).toBe("auto");
  expect(report.letters).toBe(9);
  expect(report.lines, "the title on one line").toBe(1);
  expect(report.kerningError, "letters at their kerned positions").toBeLessThan(
    0.5,
  );
  expect(report.right).toBeLessThan(viewportWidth);
}

test.describe("fonts", () => {
  test("sets the title in the display face, kerned, on one line", async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await openAtHero(page);
    expectSetInTheRealFaces(
      await readTitle(page),
      page.viewportSize()?.width ?? 0,
    );
    expect(errors).toEqual([]);
  });

  test("re-splits the title when a face finishes loading later", async ({
    page,
  }) => {
    await openAtHero(page);
    await page.evaluate(() => {
      document
        .querySelector("#dawn-title .title-char")
        ?.setAttribute("data-old", "");
    });
    // Load one more face, so document.fonts fires loadingdone.
    await page.evaluate(async () => {
      const href = document
        .querySelector<HTMLLinkElement>("link[rel=preload][as=font]")
        ?.getAttribute("href");
      const face = new FontFace("Late Probe", `url(${href})`);
      document.fonts.add(face);
      await face.load();
    });
    await settleFrames(page, 4);
    await expect(page.locator("#dawn-title .title-char[data-old]")).toHaveCount(
      0,
    );
    await expect(page.locator("#dawn-title .title-char")).toHaveCount(9);
    await page.waitForTimeout(SCRUB_SETTLE_MS);
    const report = await readTitle(page);
    expect(report.kerningError).toBeLessThan(0.5);
    expect(report.lines).toBe(1);
  });

  test("splits with the loaded face when the fonts arrive late", async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.route("**/*.woff2", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await openAtHero(page);
    await expect
      .poll(async () => (await readTitle(page)).loaded, { timeout: 10_000 })
      .toBe(true);
    await settleFrames(page, 4);
    expectSetInTheRealFaces(
      await readTitle(page),
      page.viewportSize()?.width ?? 0,
    );
    expect(errors).toEqual([]);
  });
});
