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
 * the date line are HTML over them in every mode. Boulogne's painting is
 * hidden too: near its interlude's p it is drawn faintly ahead of the dive,
 * which is no part of the chart's frame (its own still is stage B's). Each
 * p is scrolled to by the scene's own map (window.__road.scrollFor), which
 * counts the interlude's screens. Not part of `npm run check`; re-run
 * whenever the chart's look changes.
 */

const OUT = path.join(process.cwd(), "public", "stills", "scene-02");

/** Each beat's frame: its camera settled, its caption showing. */
const FRAMES: readonly [beat: string, p: number][] = [
  ["transition", 0.085],
  ["boulogne", 0.215],
  ["chase", 0.41],
  ["finisterre", 0.54],
  // The middle of the harbour's hold, every ship at anchor in.
  ["cadiz", 0.735],
  ["night", 1],
];

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
    await scrollToRoad(page, p);
    // The scrub settles over 0.6 s; then a few frames of the chart.
    await page.waitForTimeout(1800);
    const png = await page.locator("#road").screenshot({ type: "png" });
    await sharp(png)
      .webp({ quality: 80, effort: 6, smartSubsample: true })
      .toFile(path.join(OUT, `${beat}.webp`));
  }
});
