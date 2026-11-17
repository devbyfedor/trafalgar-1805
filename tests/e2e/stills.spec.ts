import path from "node:path";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { open, scrollToRoad } from "./helpers";

/**
 * Renders scene 2's stills (`npm run stills`): one frame of the chart per
 * beat, from the scene itself on the home page, at 1920×1080, written as
 * WebP to public/stills/scene-02/. They stand in for the chart under
 * reduced motion and where WebGL fails (docs/scene-02-brief.md, "Fallbacks
 * and accessibility"), so the scene's own text is hidden: the captions and
 * the date line are HTML over them in every mode. Boulogne's painting is
 * hidden too: near its interlude's p it is drawn faintly ahead of the dive,
 * which is no part of the chart's frame (its own still, the view from the
 * sea, is the second test's). Each p is scrolled to by the scene's own map
 * (window.__road.scrollFor), which counts the interlude's screens. Not part
 * of `npm run check`; re-run whenever the chart's look changes (one test:
 * `npx playwright test --project=stills -g "one still per beat"`).
 */

const OUT = path.join(process.cwd(), "public", "stills", "scene-02");

/**
 * Each beat's frame: its camera settled, its caption showing. A still is
 * for readers who cannot see the motion, so it shows its beat's substance
 * (the owner's rule, session 31; the moments chosen in session 39,
 * docs/decisions.md, "Scene 2's stills by the beat's substance").
 */
const FRAMES: readonly [beat: string, p: number][] = [
  ["transition", 0.085],
  ["boulogne", 0.215],
  ["chase", 0.41],
  // Inside the firing: the two lines in their smoke, both squadrons named.
  ["finisterre", 0.54],
  // The relay: the whole chain from the frigates off Cádiz, their hoists
  // and guns, out to the ships of the line taking the signal seaward.
  ["cadiz", 0.783],
  // The night: the fleets closing off Cape Trafalgar, their lanterns lit.
  ["night", 0.945],
];

/**
 * Each frame is come to as a reader comes to it, scrolling forward: the
 * scroll stops this much of p short first. A fleet's label takes a place
 * only with ample room and keeps it with less (HeadLabels.ts), so a frame
 * jumped to from far off can lack a label a reader sees there ("Villeneuve,
 * 33 sail" at the relay's 0.783, even after 6 s). Boulogne's interlude (at
 * 0.21) lies outside every run-up.
 */
const RUN_UP = 0.003;

test("renders one still per beat", async ({ page }) => {
  test.setTimeout(300_000);
  await open(page, "/");
  // The glyph layout's tables baked for this viewport, as the frames read them.
  await page.waitForFunction(
    () => window.__road?.ready && window.__road.baked,
    null,
    { timeout: 180_000 },
  );
  await page.addStyleTag({
    content:
      "#road [data-layer=text], #road [data-layer=sea] { visibility: hidden !important; }",
  });
  for (const [beat, p] of FRAMES) {
    await scrollToRoad(page, p - RUN_UP);
    // Long enough for a label to take its place and hold it (1 s).
    await page.waitForTimeout(1500);
    await scrollToRoad(page, p);
    // The scrub settles over 0.6 s; then a few frames of the chart.
    await page.waitForTimeout(1800);
    const png = await page.locator("#road").screenshot({ type: "png" });
    await sharp(png)
      .webp({ quality: 80, effort: 6, smartSubsample: true })
      .toFile(path.join(OUT, `${beat}.webp`));
  }
});

/**
 * Boulogne's view from the sea (RoadStills.tsx, SEA_STILL): the painting
 * of "Boulogne from the sea" alone on its lab page (/lab/sea/), the camera
 * where the interlude's hold has it at SEA_T and the idle motion (the
 * swell, the craft's roll, the smoke) frozen at SEA_TIME seconds, so the
 * still is the same frame whenever it is rendered. The moment (session 30,
 * docs/decisions.md): the sun's last light at 0.38 of the hold, when the
 * craft and the shore still read in the warm light and the moon has risen
 * over Mont Lambert, clear of the chaloupe's rigging (through the hold the
 * main topmast's stay crosses its disc from about 0.40 to 0.58). Shot
 * at 16:9 with 2560×1440 device px (1920×1080 CSS px at 4/3), written
 * also at 1920×1080 (downsampled, so finer than the painting at that
 * size), and as a 21:9 screen shows it, 3440×1440, for wide screens. Only
 * when the painting's look changes:
 * `npx playwright test --project=stills -g "view from the sea"` (the
 * painting has no chart under it, so no WebGL is needed).
 */
const SEA_T = 0.38;
const SEA_TIME = 15;
const SEA_SHOTS: readonly {
  file: string;
  width: number;
  height: number;
  scale: number;
  /** Also written downsampled to this width, as this file. */
  small?: { width: number; file: string };
}[] = [
  {
    file: "boulogne-sea.webp",
    width: 1920,
    height: 1080,
    scale: 4 / 3,
    small: { width: 1920, file: "boulogne-sea-1920.webp" },
  },
  { file: "boulogne-sea-wide.webp", width: 3440, height: 1440, scale: 1 },
];

test("renders Boulogne's view from the sea", async ({ browser, baseURL }) => {
  test.setTimeout(300_000);
  for (const shot of SEA_SHOTS) {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: shot.width, height: shot.height },
      deviceScaleFactor: shot.scale,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/lab/sea/?phase=hold&t=${SEA_T}&time=${SEA_TIME}`);
    await page.addStyleTag({
      content: "[data-el=sea-lab-info] { visibility: hidden !important; }",
    });
    // Shown once every plate's rasters are painted (BoulogneSea.tsx).
    await page.waitForFunction(
      () => {
        const sea = document.querySelector("[data-layer=sea]");
        return sea !== null && getComputedStyle(sea).visibility === "visible";
      },
      null,
      { timeout: 180_000 },
    );
    await page.waitForTimeout(1500);
    const png = await page.screenshot({ type: "png" });
    expect(errors).toEqual([]);
    const webp = { quality: 86, effort: 6, smartSubsample: true } as const;
    await sharp(png).webp(webp).toFile(path.join(OUT, shot.file));
    if (shot.small)
      await sharp(png)
        .resize({ width: shot.small.width, kernel: "lanczos3" })
        .webp(webp)
        .toFile(path.join(OUT, shot.small.file));
    await context.close();
  }
});
