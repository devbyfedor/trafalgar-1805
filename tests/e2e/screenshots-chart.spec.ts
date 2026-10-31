import path from "node:path";
import {
  type Browser,
  type BrowserContextOptions,
  type Page,
  test,
} from "@playwright/test";
import { settleFrames } from "./helpers";

/**
 * Screenshots of the chart lab's flight for docs/screenshots/scene-02 (run
 * with `npm run screenshots:chart`). Not assertions: these are for looking
 * at. The keys of the flight at the owner's laptop size and at 1920×1080,
 * and close views of what the flight passes quickly, each in a fresh
 * context. The quality level is pinned to the top, as on the owner's
 * laptop; a headless frame can be slow enough to make the ladder step down.
 */

const DIR = path.join("docs", "screenshots", "scene-02");
const desktop: BrowserContextOptions = { isMobile: false, hasTouch: false };
const LAPTOP: BrowserContextOptions = {
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
};

/** The flight's keys (src/app/lab/chart/flight.ts) and the frames between. */
const LAPTOP_POINTS = [0, 0.09, 0.16, 0.24, 0.33, 0.42, 0.52, 0.62, 0.82, 1];
const LARGE_POINTS = [0, 0.24, 0.42, 0.62, 1];

/** Close views: the camera held on one place (lon, lat, km; lon, lat). */
const CLOSE: readonly (readonly [name: string, query: string])[] = [
  ["close-cadiz-anchorage", "eye=-6.38,36.42,10&look=-6.28,36.56"],
  ["close-trafalgar-dawn", "eye=-6.95,35.85,22&look=-6.3,36.14&light=dawn"],
  ["close-strait", "eye=-5.75,35.45,70&look=-5.45,36.0"],
  ["close-azores", "eye=-30,33,1500&look=-27,39"],
  ["close-west-indies", "eye=-62,10,600&look=-61,14.5"],
];

/** Long enough for the 0.6 s scrub to settle after a jump. */
const SCRUB_SETTLE_MS = 1600;

async function open(
  browser: Browser,
  options: BrowserContextOptions,
  query: string,
): Promise<Page> {
  const context = await browser.newContext({ ...desktop, ...options });
  const page = await context.newPage();
  await page.goto(`/lab/chart/?quality=0&${query}`);
  await page.waitForFunction(() => window.__chart?.ready === true, null, {
    timeout: 90_000,
  });
  await page.waitForTimeout(SCRUB_SETTLE_MS);
  await settleFrames(page, 4);
  return page;
}

const shot = (page: Page, name: string) =>
  page.screenshot({ path: path.join(DIR, `${name}.png`) });

const pName = (p: number) => `p${String(Math.round(p * 100)).padStart(3, "0")}`;

test("the flight at the owner's laptop size", async ({ browser }) => {
  test.setTimeout(300_000);
  for (const p of LAPTOP_POINTS) {
    const page = await open(browser, LAPTOP, `p=${p}`);
    await shot(page, `laptop-${pName(p)}`);
    await page.context().close();
  }
});

test("the flight's keys at 1920×1080", async ({ browser }) => {
  test.setTimeout(300_000);
  for (const p of LARGE_POINTS) {
    const page = await open(
      browser,
      { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
      `p=${p}`,
    );
    await shot(page, `${pName(p)}-1920x1080`);
    await page.context().close();
  }
});

test("close views", async ({ browser }) => {
  test.setTimeout(300_000);
  for (const [name, query] of CLOSE) {
    const page = await open(browser, LAPTOP, query);
    await shot(page, name);
    await page.context().close();
  }
});
