import { expect, type Page, test } from "@playwright/test";
import {
  collectErrors,
  coveredAt,
  type FrameRecord,
  type FrameStats,
  frameStats,
  type InterludePoint,
  interludeOf,
  quantile,
  readLongTasks,
  recordFrames,
  recordLongTasks,
  roadPin,
  roadScrollFor,
  scrollToInterlude,
  scrollToRoad,
  scrollToY,
  startFrames,
  stopFrames,
  type TimingEntry,
  waitForFrames,
  waitForRoad,
  wheelBy,
} from "./helpers";

/**
 * How hard the chart works for each frame, on the machine's GPU (Chromium's
 * new headless mode; project chart-frames, which runs after all the others). The brief asks for a steady 60 fps
 * on the owner's laptop (Intel Arc graphics) with room to spare, so on that
 * GPU every point of the flight must draw in well under the 16.7 ms a frame
 * has: the 95th percentile of the GPU's time under FRAME_GPU_MS, measured
 * with EXT_disjoint_timer_query_webgl2 through the lab's bench
 * (src/app/lab/chart/bench.ts). On other GPUs the numbers are reported,
 * not judged. Only the owner's own look at `?debug` in a real browser
 * confirms 60 fps.
 *
 * Scene 2 on the home page is held to the same budgets through Boulogne's
 * interlude (docs/scene-02-boulogne-brief.md, "performance"): the chart's
 * own frames wherever the page draws it in the dive and the rise
 * (window.__road.bench at the interlude's points), the page's own frames
 * through the hold, where the painting covers the chart and the chart
 * isn't drawn (the main thread's time per frame, and the chart's GPU time,
 * which should be next to nothing there), and no long task while the
 * wheel scrolls through the interlude and back.
 */

/** Must match FLIGHT_LENGTH in src/app/lab/chart/flight.ts. */
const FLIGHT_LENGTH = 8;

/**
 * A third below a 60 fps frame. Measured on the owner's laptop on battery
 * (31 October 2026): 8.7 ms at the worst point of the flight, about half a
 * frame; CPU at most 2.5 ms. On mains power at the close of Stage A
 * (1 November 2026): 8.6 ms, CPU at most 1.5 ms.
 */
const FRAME_GPU_MS = 11;
const FRAME_CPU_MS = 5;

/** The owner's GPU family, where the budget is judged. */
const OWNER_GPU = /Intel.*Arc/i;

// Nothing else may draw meanwhile: a trace captures the screen as the test
// runs, and the other tests here render the chart too. Either made the
// frames measure two to three times as long. The tests here run one after
// another (fullyParallel is off), and the project runs after all the
// others for the same reason (playwright.config.ts).
test.use({ trace: "off" });

test.describe("the chart's frame budget", () => {
  test.describe.configure({ mode: "serial" });

  test("draws every point of the flight well inside a 60 fps frame", async ({
    page,
  }, testInfo) => {
    test.setTimeout(300_000);
    const errors = collectErrors(page);
    await page.goto("/lab/chart/?quality=0");
    await page.waitForFunction(() => window.__chart?.ready === true, null, {
      timeout: 90_000,
    });
    const renderer = await page.evaluate(() => {
      const gl = document
        .querySelector<HTMLCanvasElement>("[data-chart-stage] canvas")
        ?.getContext("webgl2");
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      return info && gl
        ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
        : "unknown";
    });

    // Every 4 % of the flight, 35 frames each after 5 to settle, in three
    // sweeps; each point keeps its best sweep. Other work on the machine
    // only ever adds time (on battery the CPU and the GPU share one power
    // limit), and it can't land on the same point in all three.
    const rows: {
      p: number;
      gpuMedian: number;
      gpuP95: number;
      cpuP95: number;
    }[] = [];
    for (let sweep = 0; sweep < 3; sweep++) {
      for (let i = 0; i <= 25; i++) {
        const p = i / 25;
        const result = await page.evaluate(
          ([frames, at]) => window.__chart?.bench?.(frames, at),
          [40, p] as const,
        );
        if (!result) throw new Error("the lab has no bench");
        const gpu = result.gpu.slice(5);
        const row = {
          p,
          gpuMedian: quantile(gpu, 0.5),
          gpuP95: quantile(gpu, 0.95),
          cpuP95: quantile(result.cpu.slice(5), 0.95),
        };
        const best = rows[i];
        if (!best) rows.push(row);
        else if (!(row.gpuP95 >= best.gpuP95)) rows[i] = row;
      }
    }
    const worstGpu = Math.max(...rows.map((r) => r.gpuP95));
    const worstCpu = Math.max(...rows.map((r) => r.cpuP95));
    const report = { renderer, worstGpuP95: worstGpu, worstCpuP95: worstCpu };
    await testInfo.attach("chart-frames.json", {
      body: JSON.stringify({ ...report, rows }, null, 2),
      contentType: "application/json",
    });
    console.log(`chart frames ${JSON.stringify(report)}`);
    for (const r of rows) {
      console.log(
        `  p ${r.p.toFixed(2)}: GPU ${r.gpuMedian.toFixed(2)} ms median, ${r.gpuP95.toFixed(2)} p95; CPU ${r.cpuP95.toFixed(2)} p95`,
      );
    }

    expect(errors).toEqual([]);
    expect(worstCpu, "CPU per frame, 95th percentile, ms").toBeLessThan(
      FRAME_CPU_MS,
    );
    if (!OWNER_GPU.test(renderer) || rows.some((r) => Number.isNaN(r.gpuP95)))
      return;
    expect(worstGpu, "GPU per frame, 95th percentile, ms").toBeLessThan(
      FRAME_GPU_MS,
    );
  });

  test("scrolls the whole flight and back with the wheel, no long tasks", async ({
    page,
  }, testInfo) => {
    test.setTimeout(240_000);
    const errors = collectErrors(page);
    await recordLongTasks(page);
    await page.goto("/lab/chart/");
    await page.waitForFunction(() => window.__chart?.ready === true, null, {
      timeout: 90_000,
    });
    await page.waitForTimeout(1000);

    await page.mouse.move(640, 360);
    const vh = page.viewportSize()?.height ?? 720;
    const distance = FLIGHT_LENGTH * vh + vh * 0.5;
    // Down the flight and back, twice if need be: a long task of the
    // chart's own comes back at the same place, while one the machine
    // causes (another program waking up) does not. On a quiet machine
    // there were none.
    const attempts: {
      longTasks: number[];
      longestTask: number;
      longAnimationFrames: number;
      worstFrameBlocking: number;
    }[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const scrollStart = await page.evaluate(() => performance.now());
      await wheelBy(page, distance, 120, 50);
      await page.waitForTimeout(1600);
      await wheelBy(page, -distance, 160, 40);
      await page.waitForTimeout(1600);
      expect(await page.evaluate(() => window.scrollY)).toBeLessThan(5);

      const { longTasks, loafs } = await readLongTasks(page);
      const during = longTasks.filter((t) => t.start >= scrollStart);
      const frames = loafs.filter((t) => t.start >= scrollStart);
      attempts.push({
        longTasks: during.map((t) => Math.round(t.duration)),
        longestTask: Math.round(Math.max(0, ...during.map((t) => t.duration))),
        longAnimationFrames: frames.length,
        worstFrameBlocking: Math.round(
          Math.max(0, ...frames.map((t) => t.blocking ?? 0)),
        ),
      });
      if (attempts[attempt].longestTask < 50) break;
    }
    await testInfo.attach("chart-long-tasks.json", {
      body: JSON.stringify(attempts, null, 2),
      contentType: "application/json",
    });
    console.log(`chart scroll ${JSON.stringify(attempts)}`);
    expect(errors).toEqual([]);
    expect(
      Math.min(...attempts.map((a) => a.longestTask)),
      "longest task while scrolling, ms",
    ).toBeLessThan(50);
  });
});

/** The scrub's 0.6 s, and a few frames after it. */
const SETTLE_MS = 1600;
const steps = (n: number) =>
  Array.from({ length: n + 1 }, (_, i) => Math.round((i / n) * 1000) / 1000);
/** Boulogne's interlude: its dive and its rise every tenth, its hold every quarter. */
const INTERLUDE_POINTS: InterludePoint[] = [
  ...steps(10).map((t) => ({ phase: "dive" as const, t })),
  ...steps(4).map((t) => ({ phase: "hold" as const, t })),
  ...steps(10).map((t) => ({ phase: "rise" as const, t })),
];
/** Where the page's own frames are timed at rest through the hold, and how many. */
const HOLD_REST = [0.25, 0.5, 0.75];
const REST_FRAMES = 90;

/** The renderer scene 2's chart draws with. */
function chartRenderer(page: Page): Promise<string> {
  return page.evaluate(() => {
    const gl = document
      .querySelector<HTMLCanvasElement>("[data-layer=chart] canvas")
      ?.getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return info && gl
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : "unknown";
  });
}

test.describe("scene 2's frame budget through Boulogne's interlude", () => {
  test("draws the dive, the hold and the rise well inside a 60 fps frame", async ({
    page,
  }, testInfo) => {
    test.setTimeout(600_000);
    const errors = collectErrors(page);
    await recordFrames(page);
    await page.goto("/?quality=0");
    await waitForRoad(page, { sea: true });
    const renderer = await chartRenderer(page);
    const lude = interludeOf(await roadPin(page));
    // Into scene 2 just before the interlude: scene 1's loops are paused,
    // the chart's detail is Boulogne's and the painting is away (it is
    // drawn faintly from 0.012 of p before the interlude).
    await scrollToRoad(page, lude.at - 0.02);
    await page.waitForTimeout(SETTLE_MS);

    // The chart's own frames wherever the page draws it (in the dive and
    // the rise, outside the stretch the painting covers), as the lab's
    // flight is timed: 35 frames a point after 5 to settle, three sweeps,
    // each point keeping its best.
    const drawn = INTERLUDE_POINTS.filter((point) => !coveredAt(lude, point));
    const rows: {
      point: string;
      gpuMedian: number;
      gpuP95: number;
      cpuP95: number;
    }[] = [];
    for (let sweep = 0; sweep < 3; sweep++) {
      for (const [i, point] of drawn.entries()) {
        const result = await page.evaluate(
          ([frames, p, phase, t]) =>
            window.__road?.bench(frames, p, undefined, { phase, t }),
          [40, lude.at, point.phase, point.t] as const,
        );
        if (!result) throw new Error("scene 2 has no bench");
        const gpu = result.gpu.slice(5);
        const row = {
          point: `${point.phase}:${point.t.toFixed(2)}`,
          gpuMedian: quantile(gpu, 0.5),
          gpuP95: quantile(gpu, 0.95),
          cpuP95: quantile(result.cpu.slice(5), 0.95),
        };
        const best = rows[i];
        if (!best) rows.push(row);
        else if (!(row.gpuP95 >= best.gpuP95)) rows[i] = row;
      }
    }

    // The painting alone through the hold, as the page draws it: its own
    // frames at rest (the swell, the craft and the smoke still move). Three
    // sweeps, each point keeping its best, as the chart's points do: other
    // work on the machine only ever adds time, and a few frames it holds up
    // decide a 95th percentile of 90 (session 28: 5.2 ms once at one point
    // whose median was 2.5, 3.9-4.3 elsewhere and in the runs before).
    const rest: (FrameStats & { t: number })[] = [];
    for (let sweep = 0; sweep < 3; sweep++) {
      for (const [i, t] of HOLD_REST.entries()) {
        await scrollToInterlude(page, { phase: "hold", t });
        await page.waitForTimeout(SETTLE_MS);
        await startFrames(page);
        await waitForFrames(page, REST_FRAMES);
        const row = { t, ...frameStats(await stopFrames(page)) };
        const best = rest[i];
        if (!best) rest.push(row);
        else if (!(row.mainP95 >= best.mainP95)) rest[i] = row;
      }
    }

    const worstGpu = Math.max(...rows.map((r) => r.gpuP95));
    const worstCpu = Math.max(...rows.map((r) => r.cpuP95));
    const holdMain = Math.max(...rest.map((r) => r.mainP95));
    const holdGpu = Math.max(...rest.map((r) => r.gpuP95));
    const report = {
      renderer,
      worstGpuP95: worstGpu,
      worstCpuP95: worstCpu,
      holdMainP95: holdMain,
      holdChartGpuP95: holdGpu,
    };
    await testInfo.attach("road-interlude-frames.json", {
      body: JSON.stringify({ ...report, rows, rest }, null, 2),
      contentType: "application/json",
    });
    console.log(`road interlude frames ${JSON.stringify(report)}`);
    for (const r of rows)
      console.log(
        `  ${r.point}: GPU ${r.gpuMedian.toFixed(2)} ms median, ${r.gpuP95.toFixed(2)} p95; CPU ${r.cpuP95.toFixed(2)} p95`,
      );
    for (const r of rest)
      console.log(
        `  hold:${r.t.toFixed(2)} at rest: main thread ${r.mainMedian.toFixed(2)} ms median, ${r.mainP95.toFixed(2)} p95; chart GPU ${r.gpuP95.toFixed(2)} p95; intervals ${r.intervalP95.toFixed(1)} p95, ${r.late} late of ${r.frames}`,
      );

    expect(errors).toEqual([]);
    expect(
      drawn.length,
      "points where the page draws the chart",
    ).toBeGreaterThan(0);
    expect(
      worstCpu,
      "the chart's CPU per frame in the dive and the rise, 95th percentile, ms",
    ).toBeLessThan(FRAME_CPU_MS);
    expect(
      holdMain,
      "the main thread per frame through the hold, 95th percentile, ms",
    ).toBeLessThan(FRAME_CPU_MS);
    if (!OWNER_GPU.test(renderer)) return;
    if (!rows.some((r) => Number.isNaN(r.gpuP95)))
      expect(
        worstGpu,
        "the chart's GPU per frame in the dive and the rise, 95th percentile, ms",
      ).toBeLessThan(FRAME_GPU_MS);
    if (rest.every((r) => r.gpuTimed > 0))
      expect(
        holdGpu,
        "the chart's GPU per frame through the hold, 95th percentile, ms",
      ).toBeLessThan(FRAME_GPU_MS);
  });

  test("scrolls through the interlude and back with the wheel, no long tasks", async ({
    page,
  }, testInfo) => {
    test.setTimeout(480_000);
    const errors = collectErrors(page);
    await recordFrames(page);
    await page.goto("/");
    await waitForRoad(page, { sea: true });
    const lude = interludeOf(await roadPin(page));
    // From a hundredth of p before the interlude to one after it: the
    // chart, the dive, the hold, the rise, the chart again.
    const from = await roadScrollFor(page, lude.at - 0.01);
    const to = await roadScrollFor(page, lude.at + 0.01);
    const pinStart = await roadScrollFor(page, 0);
    const vh = page.viewportSize()?.height ?? 720;
    await scrollToY(page, from);
    await page.waitForTimeout(SETTLE_MS);
    await page.mouse.move(640, 360);

    // Which part of the scroll a frame was drawn in, by its scroll position
    // (the story trails it by the scrub).
    const partOf = (y: number) => {
      const at = (y - pinStart) / vh - lude.from;
      if (at < 0 || at >= lude.to - lude.from) return "chart";
      if (at < lude.dive) return "dive";
      return at < lude.dive + lude.hold ? "hold" : "rise";
    };
    const frameAt = (frames: FrameRecord[], t: number) => {
      let found = frames[0];
      for (const f of frames) {
        if (f.start > t) break;
        found = f;
      }
      return found;
    };
    // Down and back, twice if need be: a long task of the page's own comes
    // back at the same place, one the machine causes does not.
    const attempts: {
      longTasks: number[];
      longestTask: number;
      longAnimationFrames: number;
      worstFrameBlocking: number;
      parts: Record<string, FrameStats>;
    }[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      await startFrames(page);
      await wheelBy(page, to - from, 120, 50);
      await page.waitForTimeout(1600);
      await wheelBy(page, from - to, 160, 40);
      await page.waitForTimeout(1600);
      const run = await stopFrames(page);
      expect(
        Math.abs((await page.evaluate(() => window.scrollY)) - from),
        "back where the scroll began, px",
      ).toBeLessThan(5);
      const inPart = (part: string) => (t: TimingEntry) =>
        partOf(frameAt(run.frames, t.start)?.y ?? from) === part;
      const parts: Record<string, FrameStats> = {};
      for (const part of ["chart", "dive", "hold", "rise"])
        parts[part] = frameStats({
          frames: run.frames.filter((f) => partOf(f.y) === part),
          longTasks: run.longTasks.filter(inPart(part)),
          loafs: run.loafs.filter(inPart(part)),
        });
      const longest = Math.max(0, ...run.longTasks.map((t) => t.duration));
      attempts.push({
        longTasks: run.longTasks.map((t) => Math.round(t.duration)),
        longestTask: Math.round(longest),
        longAnimationFrames: run.loafs.length,
        worstFrameBlocking: Math.round(
          Math.max(0, ...run.loafs.map((t) => t.blocking ?? 0)),
        ),
        parts,
      });
      if (longest < 50) break;
    }
    await testInfo.attach("road-interlude-long-tasks.json", {
      body: JSON.stringify(attempts, null, 2),
      contentType: "application/json",
    });
    console.log(
      `road interlude scroll ${JSON.stringify(attempts.map(({ parts, ...a }) => a))}`,
    );
    expect(errors).toEqual([]);
    expect(
      Math.min(...attempts.map((a) => a.longestTask)),
      "longest task while scrolling through the interlude, ms",
    ).toBeLessThan(50);
  });
});
