import path from "node:path";
import {
  type Browser,
  type BrowserContextOptions,
  type Page,
  test,
} from "@playwright/test";
import { open as openPage, scrollToProgress, settleFrames } from "./helpers";

/**
 * Screenshots for docs/screenshots/scene-01 (run with `npm run screenshots`).
 * Not assertions: these are for looking at. Each view gets a fresh context
 * with its own viewport, device scale and media emulation.
 */

const DIR = path.join("docs", "screenshots", "scene-01");
const desktop: BrowserContextOptions = { isMobile: false, hasTouch: false };

/** Long enough for the 0.6 s scrub to settle on the target progress. */
const SCRUB_SETTLE_MS = 1600;

async function open(
  browser: Browser,
  options: BrowserContextOptions,
  url: string,
): Promise<Page> {
  const context = await browser.newContext({ ...desktop, ...options });
  const page = await context.newPage();
  await openPage(page, url);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await settleFrames(page, 4);
  return page;
}

const shot = (page: Page, name: string) =>
  page.screenshot({ path: path.join(DIR, `${name}.png`) });

test("the owner's laptop through the scroll", async ({ browser }) => {
  const page = await open(
    browser,
    { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 },
    "/",
  );
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    await scrollToProgress(page, p);
    await page.waitForTimeout(SCRUB_SETTLE_MS);
    await shot(page, `laptop-p${String(Math.round(p * 100)).padStart(3, "0")}`);
  }
  await page.context().close();
});

test("large screens at p = 0.6", async ({ browser }) => {
  for (const [width, height] of [
    [1920, 1080],
    [2560, 1440],
    [3440, 1440],
  ]) {
    const page = await open(
      browser,
      { viewport: { width, height }, deviceScaleFactor: 1 },
      "/",
    );
    await scrollToProgress(page, 0.6);
    await page.waitForTimeout(SCRUB_SETTLE_MS);
    await shot(page, `p060-${width}x${height}`);
    await page.context().close();
  }
});

test("reduced motion and the fallback", async ({ browser }) => {
  const reduced = await open(
    browser,
    {
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1.5,
      reducedMotion: "reduce",
    },
    "/",
  );
  await shot(reduced, "reduced-motion");
  await reduced.context().close();

  const phone = await open(
    browser,
    {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
    "/",
  );
  await shot(phone, "fallback");
  await phone.context().close();
});

test("the ship lab and close-ups", async ({ browser }) => {
  const lab = await open(
    browser,
    { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 },
    "/lab/ship/",
  );
  await shot(lab, "lab-ship");
  await lab.context().close();

  for (const focus of [
    "bow",
    "stern",
    "main-top",
    "fore-top",
    "rigging",
    "flags",
  ]) {
    const page = await open(
      browser,
      { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 },
      `/lab/ship/?focus=${focus}&panel=off`,
    );
    await shot(page, `lab-${focus}`);
    await page.context().close();
  }
});
