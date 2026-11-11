import { expect, type Page, test } from "@playwright/test";
import sharp from "sharp";
import { collectErrors, collectRequests, settleFrames } from "./helpers";
import { compareImages } from "./imageDiff";

/**
 * The chart engine on /lab/chart (docs/scene-02-brief.md, stage A, item 6):
 * the page loads with no console errors, the canvas renders (pixels
 * sampled, not blank), and every request is same-origin. troika's glyph
 * worker runs from a blob: URL, which is the page's own; nothing may go to
 * a CDN (troika falls back to jsDelivr for a character no font covers).
 * A WebGL context the browser takes away and gives back is restored
 * (the brief's "performance" rules).
 *
 * Runs twice: in the default headless shell, which renders WebGL in
 * software (SwiftShader), and in Chromium's new headless mode, which
 * renders on the machine's GPU. Frame rates mean nothing here.
 */

/** Must match FLIGHT_LENGTH in src/app/lab/chart/flight.ts. */
const FLIGHT_LENGTH = 8;

/** Long enough for the 0.6 s scrub to settle. */
const SCRUB_SETTLE_MS = 1600;

interface Stats {
  calls: number;
  triangles: number;
  textures: number;
}

async function openLab(page: Page, query = ""): Promise<void> {
  await page.goto(`/lab/chart/${query}`);
  await page.waitForFunction(() => window.__chart?.ready === true, null, {
    timeout: 90_000,
  });
  await settleFrames(page, 3);
}

/** Scrolls to flight progress p through Lenis, as a reader would land there. */
async function scrollFlight(page: Page, p: number): Promise<void> {
  await page.evaluate(
    ({ p, length }) => {
      const y = Math.round(p * length * window.innerHeight);
      if (window.__lenis)
        window.__lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    },
    { p, length: FLIGHT_LENGTH },
  );
  await settleFrames(page, 2);
}

function stats(page: Page): Promise<Stats> {
  return page.evaluate(() => {
    const s = window.__chart?.stats;
    return {
      calls: s?.calls ?? 0,
      triangles: s?.triangles ?? 0,
      textures: s?.textures ?? 0,
    };
  });
}

/**
 * What the screen shows: how varied it is (the spread of luminance and the
 * number of distinct colours at 4 bits a channel) and how much of it is
 * sea, paper and sky by colour.
 */
async function sample(png: Buffer) {
  const { data, info } = await sharp(png)
    .resize(480, 270, { kernel: "nearest" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  const buckets = new Set<number>();
  let sum = 0;
  let sum2 = 0;
  let sea = 0;
  let paper = 0;
  for (let i = 0; i < n; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    buckets.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4));
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += y;
    sum2 += y * y;
    // Slate sea: blue-green over red, mid-dark.
    if (b > r + 6 && g > r && y < 140) sea++;
    // Bone and ochre paper: warm and light.
    if (r > b + 18 && y > 170) paper++;
  }
  const mean = sum / n;
  return {
    spread: Math.sqrt(Math.max(0, sum2 / n - mean * mean)),
    colours: buckets.size,
    sea: sea / n,
    paper: paper / n,
  };
}

test.describe("the chart lab", () => {
  test("flies the whole flight and back with no errors, same-origin only", async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(480_000);
    const errors = collectErrors(page);
    const requests = collectRequests(page);
    await openLab(page);

    // Every tenth of the flight on the way down, every fifth on the way
    // back: SwiftShader takes a second or two a frame.
    for (let i = 0; i <= 10; i++) await scrollFlight(page, i / 10);
    for (let i = 5; i >= 0; i--) await scrollFlight(page, i / 5);

    const s = await stats(page);
    expect(s.calls, "draw calls").toBeGreaterThan(0);
    expect(s.calls, "draw calls").toBeLessThanOrEqual(150);
    expect(s.triangles, "triangles").toBeGreaterThan(0);

    const origin = new URL(baseURL ?? "").origin;
    const foreign = requests.filter((url) => {
      if (url.startsWith("data:") || url.startsWith("blob:")) return false;
      return new URL(url).origin !== origin;
    });
    expect(foreign, "requests to other hosts").toEqual([]);
    // The chart's own assets and the lettering's fonts came from this site.
    expect(requests.some((u) => u.includes("/chart/manifest.json"))).toBe(true);
    expect(requests.some((u) => u.includes("/fonts/3d/"))).toBe(true);
    expect(errors).toEqual([]);
  });

  test("renders the chart: sea, land, sky and lettering, not a blank canvas", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const errors = collectErrors(page);

    // Dawn over the sea: sky above, sea below, no land.
    await openLab(page, "?p=0");
    await page.waitForTimeout(SCRUB_SETTLE_MS);
    const dawn = await sample(await page.screenshot());
    expect(dawn.spread, "dawn: luminance spread").toBeGreaterThan(12);
    expect(dawn.colours, "dawn: distinct colours").toBeGreaterThan(40);
    expect(dawn.sea, "dawn: sea").toBeGreaterThan(0.15);

    // The Gulf of Cadiz: sea and land both in view.
    await openLab(page, "?p=0.24");
    await page.waitForTimeout(SCRUB_SETTLE_MS);
    const gulf = await sample(await page.screenshot());
    expect(gulf.spread, "gulf: luminance spread").toBeGreaterThan(20);
    // The smoothed chart (the field read through a B-spline, the far
    // shadows without speckle) shows 74-78 colours here, all of it right
    // (session 18, looked at); a blank or failed canvas shows a handful.
    expect(gulf.colours, "gulf: distinct colours").toBeGreaterThan(60);
    expect(gulf.sea, "gulf: sea").toBeGreaterThan(0.2);
    expect(gulf.paper, "gulf: land").toBeGreaterThan(0.1);
    expect((await stats(page)).calls).toBeGreaterThan(3);

    // The whole Atlantic.
    await openLab(page, "?p=0.62");
    await page.waitForTimeout(SCRUB_SETTLE_MS);
    const atlantic = await sample(await page.screenshot());
    expect(atlantic.sea, "atlantic: sea").toBeGreaterThan(0.3);
    expect(atlantic.paper, "atlantic: land").toBeGreaterThan(0.08);
    expect(errors).toEqual([]);
  });

  test("comes back as it was after the browser takes its WebGL context away", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const errors = collectErrors(page);
    // The quality level is pinned, so the frames compare at one resolution.
    await openLab(page, "?p=0.24&quality=0");
    await page.waitForTimeout(SCRUB_SETTLE_MS);
    const before = await page.screenshot();

    // Lost, then given back: everything on the GPU is rebuilt, the decoded
    // fields, the land masks and the horizon maps from the kept bitmaps.
    await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        "[data-chart-stage] canvas",
      );
      const lose = canvas
        ?.getContext("webgl2")
        ?.getExtension("WEBGL_lose_context");
      if (!lose) throw new Error("no WEBGL_lose_context");
      lose.loseContext();
      window.setTimeout(() => lose.restoreContext(), 300);
    });
    await page.waitForTimeout(1200);
    await settleFrames(page, 3);
    const diff = await compareImages(await page.screenshot(), before);
    console.log(`chart context restore ${JSON.stringify(diff)}`);
    expect(diff.moved, "pixels with no match nearby, %").toBeLessThan(0.3);
    expect(diff.blockMedian, "median block difference").toBeLessThan(0.5);
    expect(diff.blockP99, "99th percentile block").toBeLessThan(4);
    expect(errors).toEqual([]);
  });
});
