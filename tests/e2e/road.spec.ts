import { expect, type Page, test } from "@playwright/test";
import sharp from "sharp";
import {
  collectErrors,
  collectRequests,
  open,
  ROAD_PIN_LENGTH,
  scrollToRoad,
  settleFrames,
} from "./helpers";

/**
 * Scene 2 on the home page (docs/scene-02-brief.md, stage B, item 7): no
 * console errors over a full scroll and back, same-origin requests only
 * (troika's glyph worker runs from a blob: URL, the page's own), the canvas
 * renders at its beats, and the pin releases into the scene 3 placeholder.
 * The reduced-motion stills and the phone's empty-handed fallback are in
 * reduced-motion.spec.ts and fallback.spec.ts.
 *
 * Runs on the machine's GPU (Chromium's new headless mode, project
 * "road"): scene 2's frames in software take seconds each. Frame rates
 * mean nothing here.
 */

/** Long enough for the 0.6 s scrub to settle. */
const SCRUB_SETTLE_MS = 1600;

async function openRoad(page: Page): Promise<void> {
  await open(page, "/?quality=0");
  await page.waitForFunction(() => window.__road?.ready === true, null, {
    timeout: 120_000,
  });
  await settleFrames(page, 3);
}

function stats(page: Page) {
  return page.evaluate(() => {
    const s = window.__road?.stats;
    return { calls: s?.calls ?? 0, triangles: s?.triangles ?? 0 };
  });
}

/** How varied the frame is, and how much of it is sea and paper by colour. */
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
    if (b > r + 6 && g > r && y < 140) sea++;
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

test.describe("scene 2", () => {
  test("scrolls the whole scene and back with no errors, same-origin only", async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(300_000);
    const errors = collectErrors(page);
    const requests = collectRequests(page);
    await openRoad(page);

    // Every twentieth of the scene on the way down, every tenth back.
    for (let i = 0; i <= 20; i++) {
      await scrollToRoad(page, i / 20);
      await settleFrames(page, 3);
    }
    const s = await stats(page);
    expect(s.calls, "draw calls").toBeGreaterThan(0);
    expect(s.calls, "draw calls").toBeLessThanOrEqual(150);
    expect(s.triangles, "triangles").toBeGreaterThan(0);
    for (let i = 10; i >= 0; i--) {
      await scrollToRoad(page, i / 10);
      await settleFrames(page, 3);
    }

    const origin = new URL(baseURL ?? "").origin;
    const foreign = requests.filter((url) => {
      if (url.startsWith("data:") || url.startsWith("blob:")) return false;
      return new URL(url).origin !== origin;
    });
    expect(foreign, "requests to other hosts").toEqual([]);
    // The chart's data, the soundings and the lettering's fonts came from
    // this site.
    for (const asset of [
      "/chart/manifest.json",
      "/chart/soundings.json",
      "/fonts/3d/",
    ])
      expect(
        requests.some((u) => u.includes(asset)),
        asset,
      ).toBe(true);
    expect(errors).toEqual([]);
  });

  test("renders the chart at its beats, not a blank canvas", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const errors = collectErrors(page);
    await openRoad(page);
    const road = page.locator("#road");

    // The Channel from high up, the whole Atlantic, the harbour of Cadiz
    // close up, and the last frame at dawn.
    const beats = [
      { p: 0.165, sea: 0.06, paper: 0.25 },
      { p: 0.35, sea: 0.3, paper: 0.05 },
      { p: 0.735, sea: 0.4, paper: 0.02 },
      { p: 1, sea: 0.3, paper: 0 },
    ];
    for (const beat of beats) {
      await scrollToRoad(page, beat.p);
      await page.waitForTimeout(SCRUB_SETTLE_MS);
      await settleFrames(page, 3);
      const shot = await sample(await road.screenshot());
      const at = `p = ${beat.p}`;
      expect(shot.spread, `${at}: luminance spread`).toBeGreaterThan(12);
      expect(shot.colours, `${at}: distinct colours`).toBeGreaterThan(60);
      expect(shot.sea, `${at}: sea`).toBeGreaterThan(beat.sea);
      expect(shot.paper, `${at}: land`).toBeGreaterThanOrEqual(beat.paper);
      expect((await stats(page)).calls, `${at}: draw calls`).toBeGreaterThan(3);
    }
    expect(errors).toEqual([]);
  });

  test("holds its pin to the end and releases into the scene 3 placeholder", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors = collectErrors(page);
    await openRoad(page);
    const road = page.locator("#road");
    const next = page.getByText("Chapter III follows");

    await scrollToRoad(page, 0.5);
    await settleFrames(page, 4);
    expect((await road.boundingBox())?.y).toBeCloseTo(0, 0);
    await scrollToRoad(page, 1);
    await settleFrames(page, 4);
    expect((await road.boundingBox())?.y).toBeCloseTo(0, 0);
    await expect(next).not.toBeInViewport();

    // A viewport height past the pin's end: scene 2 scrolls away and the
    // placeholder comes up.
    await scrollToRoad(page, 1 + 1.2 / ROAD_PIN_LENGTH);
    await settleFrames(page, 4);
    expect((await road.boundingBox())?.y ?? 0).toBeLessThan(-10);
    await expect(next).toBeInViewport();

    // And back into the pin.
    await scrollToRoad(page, 0.9);
    await settleFrames(page, 4);
    expect((await road.boundingBox())?.y).toBeCloseTo(0, 0);
    expect(errors).toEqual([]);
  });
});
