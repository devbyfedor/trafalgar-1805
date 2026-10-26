import path from "node:path";
import { expect, test } from "@playwright/test";
import { collectErrors, scrollToProgress, settleFrames } from "./helpers";
import { compareImages } from "./imageDiff";

/**
 * Scene 1 must not regress (docs/scene-02-brief.md, "integration"): its
 * frames at p = 0, 0.5 and 0.75 match the approved screenshots in
 * docs/screenshots/scene-01, within a tolerance for what its idle loops
 * move by themselves (tests/e2e/imageDiff.ts). Rendered as the approved
 * ones were: Chromium on the GPU, 1280×720 at device scale 1.5.
 */

const APPROVED = path.join("docs", "screenshots", "scene-01");

/** Long enough for the 0.6 s scrub to settle on the target progress. */
const SCRUB_SETTLE_MS = 1600;

/** About three times what the idle loops alone produce. */
const LIMITS = { moved: 0.6, blockMedian: 1.2, blockP99: 28 } as const;

test("scene 1 matches its approved frames at p = 0, 0.5 and 0.75", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const errors = collectErrors(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await settleFrames(page, 4);

  for (const p of [0, 0.5, 0.75]) {
    await scrollToProgress(page, p);
    await page.waitForTimeout(SCRUB_SETTLE_MS);
    const name = `laptop-p${String(Math.round(p * 100)).padStart(3, "0")}`;
    const shot = await page.screenshot();
    const diff = await compareImages(shot, path.join(APPROVED, `${name}.png`));
    await testInfo.attach(`${name}.png`, {
      body: shot,
      contentType: "image/png",
    });
    console.log(`regression ${name} ${JSON.stringify(diff)}`);
    expect(diff.moved, `${name}: pixels with no match nearby, %`).toBeLessThan(
      LIMITS.moved,
    );
    expect(diff.blockMedian, `${name}: median block difference`).toBeLessThan(
      LIMITS.blockMedian,
    );
    expect(diff.blockP99, `${name}: 99th percentile block`).toBeLessThan(
      LIMITS.blockP99,
    );
  }
  expect(errors).toEqual([]);
});
