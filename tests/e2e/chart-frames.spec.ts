import { expect, test } from "@playwright/test";
import {
  collectErrors,
  readLongTasks,
  recordLongTasks,
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
// runs, and the other test here renders the chart too. Either made the
// frames measure two to three times as long. The project runs after all
// the others for the same reason (playwright.config.ts).
test.use({ trace: "off" });
test.describe.configure({ mode: "serial" });

function quantile(values: number[], q: number): number {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

test.describe("the chart's frame budget", () => {
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
