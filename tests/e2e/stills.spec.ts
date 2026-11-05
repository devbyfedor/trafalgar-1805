import path from "node:path";
import { test } from "@playwright/test";
import sharp from "sharp";
import { open, scrollToRoad } from "./helpers";

/**
 * Renders scene 2's stills (`npm run stills`): one frame of the chart per
 * beat, from the scene itself on the home page, at 1920×1080, written as
 * WebP to public/stills/scene-02/. They stand in for the chart under
 * reduced motion and where WebGL fails (docs/scene-02-brief.md, "Fallbacks
 * and accessibility"), so the scene's own text is hidden: the captions and
 * the date line are HTML over them in every mode. Not part of
 * `npm run check`; re-run whenever the chart's look changes.
 */

const OUT = path.join(process.cwd(), "public", "stills", "scene-02");

/** Each beat's frame: its camera settled, its caption showing. */
const FRAMES: readonly [beat: string, p: number][] = [
  ["transition", 0.085],
  ["boulogne", 0.215],
  ["chase", 0.41],
  ["finisterre", 0.54],
  ["cadiz", 0.745],
  ["night", 1],
];

test("renders one still per beat", async ({ page }) => {
  test.setTimeout(300_000);
  await open(page, "/");
  await page.waitForFunction(() => window.__road?.ready, null, {
    timeout: 120_000,
  });
  await page.addStyleTag({
    content: "#road [data-layer=text] { visibility: hidden !important; }",
  });
  for (const [beat, p] of FRAMES) {
    await scrollToRoad(page, p);
    // The scrub settles over 0.6 s; then a few frames of the chart.
    await page.waitForTimeout(1800);
    const png = await page.locator("#road").screenshot({ type: "png" });
    await sharp(png)
      .webp({ quality: 80, effort: 6, smartSubsample: true })
      .toFile(path.join(OUT, `${beat}.webp`));
  }
});
