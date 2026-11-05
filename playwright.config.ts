import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the static export in `out/`, served on
 * 127.0.0.1 (no firewall prompts on Windows) on a port of their own, so a
 * running `npm run preview` does not get in the way. `npm run test:e2e`
 * builds first, so the export is never stale.
 *
 * Projects:
 * - laptop: the owner's machine, 1280×720 CSS px at device scale 1.5
 * - desktop-1080: a 1920×1080 monitor
 * - phone: a 390×844 touch screen, for the fallback
 * - perf: one scripted scroll-through with video and long-task recording,
 *   on Chromium's new headless mode, which renders on the GPU
 * - chart, chart-gpu: the chart lab (/lab/chart), in the default headless
 *   shell, which renders WebGL in software (SwiftShader, 2.4 to 5 s a frame
 *   at the laptop's 1920×1080 device pixels, so it gets a quarter of them),
 *   and in the new headless mode on the GPU at the owner's viewport
 * - chart-frames: the chart's frames timed on the GPU and long tasks while
 *   the flight is scrolled, after every other project, so nothing else
 *   uses the GPU meanwhile
 * - regression: scene 1's frames against its approved screenshots, rendered
 *   as they were (the new headless mode, on the GPU)
 * - docs: scene 1's screenshots, docs/screenshots/scene-01 (`npm run
 *   screenshots`), which the regression project uses as the approved frames
 * - docs-chart: the chart lab's, docs/screenshots/scene-02 (`npm run
 *   screenshots:chart`)
 * - stills: scene 2's stills for reduced motion and WebGL failures,
 *   public/stills/scene-02 (`npm run stills`)
 */

const PORT = 4174;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const desktop = { ...devices["Desktop Chrome"], screen: undefined };

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 2,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npx serve out --listen tcp://127.0.0.1:${PORT} --no-clipboard --no-port-switching -L`,
    url: `${BASE_URL}/`,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "pipe",
  },
  projects: [
    {
      name: "laptop",
      testMatch: [
        /scene\.spec\.ts/,
        /fonts\.spec\.ts/,
        /reduced-motion\.spec\.ts/,
      ],
      use: {
        ...desktop,
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1.5,
      },
    },
    {
      name: "desktop-1080",
      testMatch: [
        /scene\.spec\.ts/,
        /fonts\.spec\.ts/,
        /reduced-motion\.spec\.ts/,
      ],
      use: {
        ...desktop,
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "phone",
      testMatch: /fallback\.spec\.ts/,
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "perf",
      testMatch: /perf\.spec\.ts/,
      use: {
        ...desktop,
        channel: "chromium",
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1.5,
        video: { mode: "on", size: { width: 1920, height: 1080 }, fps: 60 },
      },
    },
    {
      name: "chart",
      testMatch: /[\\/]chart\.spec\.ts$/,
      use: {
        ...desktop,
        viewport: { width: 960, height: 540 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "chart-gpu",
      testMatch: /[\\/]chart\.spec\.ts$/,
      use: {
        ...desktop,
        channel: "chromium",
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1.5,
      },
    },
    {
      name: "regression",
      testMatch: /[\\/]regression\.spec\.ts$/,
      use: {
        ...desktop,
        channel: "chromium",
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1.5,
      },
    },
    {
      // Last and alone: the GPU must be the chart's only work while its
      // frames are timed. Run it by itself with --no-deps.
      name: "chart-frames",
      testMatch: /[\\/]chart-frames\.spec\.ts$/,
      dependencies: [
        "laptop",
        "desktop-1080",
        "phone",
        "perf",
        "chart",
        "chart-gpu",
        "regression",
      ],
      use: {
        ...desktop,
        channel: "chromium",
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1.5,
      },
    },
    {
      name: "docs-chart",
      testMatch: /[\\/]screenshots-chart\.spec\.ts$/,
      use: {
        ...desktop,
        channel: "chromium",
        trace: "off",
      },
    },
    {
      // npm run stills: scene 2's stills, public/stills/scene-02.
      name: "stills",
      testMatch: /[\\/]stills\.spec\.ts$/,
      use: {
        ...desktop,
        channel: "chromium",
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        trace: "off",
      },
    },
    {
      name: "docs",
      testMatch: /[\\/]screenshots\.spec\.ts$/,
      use: {
        ...desktop,
        channel: "chromium",
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1.5,
      },
    },
  ],
});
