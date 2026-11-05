import { expect, test } from "@playwright/test";
import {
  collectErrors,
  HANDOFF_LENGTH,
  open,
  PIN_LENGTH,
  readLongTasks,
  recordLongTasks,
  wheelBy,
} from "./helpers";

/**
 * One scripted scroll-through with real wheel input: down through the pinned
 * scene and the handoff into scene 2, then back to the top. Scene 2's chart
 * loads in idle time while scene 1 plays, so this is where its setup would
 * show as long tasks. Records a video
 * (test-results/) and the long tasks seen during the scroll. Headless video
 * looks choppier than the real thing; the numbers are indicative. Anything
 * over 50 ms is reported here and investigated, not failed on.
 */
test("scripted scroll-through", async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await recordLongTasks(page);
  await open(page, "/");
  await page.waitForTimeout(1200);
  const loadTasks = await readLongTasks(page);

  await page.mouse.move(640, 360);
  const vh = page.viewportSize()?.height ?? 720;
  const distance = (PIN_LENGTH + HANDOFF_LENGTH) * vh + vh * 0.8;
  const scrollStart = await page.evaluate(() => performance.now());
  await wheelBy(page, distance, 90, 60);
  await page.waitForTimeout(1600);
  await expect(
    page.getByRole("heading", { name: "II. The road to Trafalgar" }),
  ).toBeInViewport();
  expect((await page.locator("#road").boundingBox())?.y).toBeCloseTo(0, 0);

  await wheelBy(page, -distance, 120, 50);
  // Lenis eases to rest a frame at a time: wait for it to reach the top.
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 8000 })
    .toBeLessThan(5);

  const { longTasks, loafs } = await readLongTasks(page);
  const duringScroll = longTasks.filter((t) => t.start >= scrollStart);
  const loafsDuringScroll = loafs.filter((t) => t.start >= scrollStart);
  const report = {
    renderer: await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl");
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      return info ? gl?.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown";
    }),
    loadLongTasks: loadTasks.longTasks.map((t) => Math.round(t.duration)),
    scrollLongTasks: duringScroll.map((t) => Math.round(t.duration)),
    scrollLongTasksOver50ms: duringScroll.filter((t) => t.duration > 50).length,
    longestScrollTask: Math.round(
      Math.max(0, ...duringScroll.map((t) => t.duration)),
    ),
    longAnimationFrames: loafsDuringScroll.length,
    worstFrameBlocking: Math.round(
      Math.max(0, ...loafsDuringScroll.map((t) => t.blocking ?? 0)),
    ),
  };
  await testInfo.attach("long-tasks.json", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });
  console.log(`perf ${JSON.stringify(report)}`);
  expect(errors).toEqual([]);
});
