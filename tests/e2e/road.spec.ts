import { expect, type Page, test } from "@playwright/test";
import sharp from "sharp";
import {
  BOULOGNE,
  collectErrors,
  collectRequests,
  type InterludePoint,
  interludeOf,
  interludeScrollFor,
  open,
  roadPin,
  roadScrollFor,
  scrollToInterlude,
  scrollToRoad,
  scrollToY,
  settleFrames,
  waitForRoad,
} from "./helpers";

/**
 * Scene 2 on the home page (docs/scene-02-brief.md, stage B, item 7): no
 * console errors over a full scroll and back, same-origin requests only
 * (troika's glyph worker runs from a blob: URL, the page's own), the canvas
 * renders at its beats, and the pin releases into the scene 3 placeholder.
 * Boulogne's interlude (docs/scene-02-boulogne-brief.md): the pin's map
 * holds the story at its p for the dive, the hold and the rise; the
 * painting covers the chart through the hold with the text back over it;
 * the text steps aside while the chart turns into the painting and back;
 * the chart takes the story up again after it. The reduced-motion stills
 * and the phone's empty-handed fallback are in reduced-motion.spec.ts and
 * fallback.spec.ts; the page's width with classic scroll bars in
 * overflow.spec.ts.
 *
 * Runs on the machine's GPU (Chromium's new headless mode, project
 * "road"): scene 2's frames in software take seconds each. Frame rates
 * mean nothing here.
 */

/** Long enough for the 0.6 s scrub to settle. */
const SCRUB_SETTLE_MS = 1600;

/** Boulogne's interlude walked through: the dive, the hold and the rise. */
const INTERLUDE_WALK: InterludePoint[] = [
  { phase: "dive", t: 0.25 },
  { phase: "dive", t: 0.5 },
  { phase: "dive", t: 0.75 },
  { phase: "dive", t: 1 },
  { phase: "hold", t: 0.5 },
  { phase: "hold", t: 1 },
  { phase: "rise", t: 0.25 },
  { phase: "rise", t: 0.5 },
  { phase: "rise", t: 0.75 },
  { phase: "rise", t: 1 },
];

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
    // Boulogne's painting, painted ahead in idle slices, may keep the
    // interlude's walk waiting a while.
    test.setTimeout(420_000);
    const errors = collectErrors(page);
    const requests = collectRequests(page);
    await openRoad(page);

    // Every twentieth of the scene on the way down, through Boulogne's
    // interlude where the story stops for it, every tenth back.
    const lude = interludeOf(await roadPin(page));
    for (let i = 0; i <= 20; i++) {
      if (i > 0 && (i - 1) / 20 < lude.at && lude.at <= i / 20) {
        // With the painting ready, as a reader who comes there gets it.
        await waitForRoad(page, { baked: false, sea: true });
        for (const point of INTERLUDE_WALK) {
          await scrollToInterlude(page, point);
          await settleFrames(page, 3);
        }
      }
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
      { p: 0.151, sea: 0.06, paper: 0.25 },
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

    // A viewport height and a bit past the pin's end (p 1, where the
    // page's own map puts it, its interludes counted): scene 2 scrolls
    // away and the placeholder comes up.
    const vh = page.viewportSize()?.height ?? 720;
    await scrollToY(page, (await roadScrollFor(page, 1)) + 1.2 * vh);
    await settleFrames(page, 4);
    expect((await road.boundingBox())?.y ?? 0).toBeLessThan(-10);
    await expect(next).toBeInViewport();

    // And back into the pin.
    await scrollToRoad(page, 0.9);
    await settleFrames(page, 4);
    expect((await road.boundingBox())?.y).toBeCloseTo(0, 0);
    expect(errors).toEqual([]);
  });

  test("stops the story for Boulogne's interlude and takes it up again", async ({
    page,
  }) => {
    test.setTimeout(360_000);
    const errors = collectErrors(page);
    await openRoad(page);
    await waitForRoad(page, { baked: false, sea: true });
    const pin = await roadPin(page);
    const lude = interludeOf(pin, BOULOGNE);
    const vh = page.viewportSize()?.height ?? 720;

    // The map: p over the pin's base as before, the interlude's own
    // screens inserted at its p, the pin as long as both.
    expect(lude.from, "where the interlude begins, screens").toBeCloseTo(
      lude.at * pin.base,
      6,
    );
    expect(lude.to - lude.from, "its screens").toBeCloseTo(
      lude.dive + lude.hold + lude.rise,
      6,
    );
    expect(pin.length, "the pin's screens").toBeCloseTo(
      pin.base + pin.interludes.reduce((sum, i) => sum + i.to - i.from, 0),
      6,
    );
    const start = await roadScrollFor(page, 0);
    const begins = start + lude.from * vh;
    expect(await roadScrollFor(page, lude.at)).toBeCloseTo(begins, 1);
    expect(await interludeScrollFor(page, { phase: "dive", t: 0 })).toBeCloseTo(
      begins,
      1,
    );
    expect(await interludeScrollFor(page, { phase: "rise", t: 1 })).toBeCloseTo(
      start + lude.to * vh,
      1,
    );
    // A hundredth of p past it lies a hundredth of the base past its end.
    expect(await roadScrollFor(page, lude.at + 0.01)).toBeCloseTo(
      start + (lude.to + 0.01 * pin.base) * vh,
      1,
    );
    expect(await roadScrollFor(page, 1)).toBeCloseTo(
      start + pin.length * vh,
      1,
    );

    const road = page.locator("#road");
    const sea = page.locator("#road [data-layer=sea]");
    const text = page.locator("#road [data-layer=text]");
    const scrim = page.locator("#road [data-el=scrim-chapter]");
    const textShows = () =>
      text.evaluate((el) => Number(getComputedStyle(el).opacity));
    /** Scrolls to a point of the interlude, settles, and checks the pin holds. */
    const visit = async (point: InterludePoint) => {
      await scrollToInterlude(page, point);
      await page.waitForTimeout(SCRUB_SETTLE_MS);
      expect(
        (await road.boundingBox())?.y,
        `${point.phase}:${point.t}: pinned`,
      ).toBeCloseTo(0, 0);
    };

    // The dive: the text steps aside while the chart turns into the
    // painting (the engraving's paper is bright where both are dark).
    let least = 1;
    for (const t of [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
      await visit({ phase: "dive", t });
      least = Math.min(least, await textShows());
    }
    expect(least, "the text's least opacity through the dive").toBeLessThan(
      0.05,
    );

    // The hold: the painting covers the chart, the text is back over it,
    // the chapter marker without its scrim.
    for (const t of [0, 0.5, 1]) {
      await visit({ phase: "hold", t });
      const at = `hold:${t}`;
      await expect(sea, `${at}: the painting`).toHaveCSS(
        "visibility",
        "visible",
      );
      expect(await textShows(), `${at}: the text`).toBeGreaterThan(0.99);
      await expect(scrim, `${at}: the marker's scrim`).toHaveCSS(
        "visibility",
        "hidden",
      );
    }
    const held = await sample(await road.screenshot());
    expect(held.spread, "the hold: luminance spread").toBeGreaterThan(12);
    expect(held.colours, "the hold: distinct colours").toBeGreaterThan(60);

    // The rise: the text steps aside again while the painting turns back
    // into the chart.
    least = 1;
    for (const t of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]) {
      await visit({ phase: "rise", t });
      least = Math.min(least, await textShows());
    }
    expect(least, "the text's least opacity through the rise").toBeLessThan(
      0.05,
    );

    // Past it the chart takes the story up again: the painting away, the
    // text and the marker's scrim back, the chart drawn.
    await scrollToRoad(page, lude.at + 0.02);
    await page.waitForTimeout(SCRUB_SETTLE_MS);
    expect((await road.boundingBox())?.y, "after: pinned").toBeCloseTo(0, 0);
    await expect(sea, "after: the painting").toHaveCSS("visibility", "hidden");
    expect(await textShows(), "after: the text").toBeGreaterThan(0.99);
    await expect(scrim, "after: the marker's scrim").toHaveCSS(
      "visibility",
      "visible",
    );
    const after = await sample(await road.screenshot());
    expect(after.spread, "after: luminance spread").toBeGreaterThan(12);
    expect(after.colours, "after: distinct colours").toBeGreaterThan(60);
    expect((await stats(page)).calls, "after: draw calls").toBeGreaterThan(3);
    expect(errors).toEqual([]);
  });
});
