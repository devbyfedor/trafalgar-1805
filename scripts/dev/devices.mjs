// The site on phones, tablets and small or touch screens: what each one
// gets (the fallback screen, the scene, or the scene's stills where WebGL
// fails) and that none ends on a black screen, a crash, a request to
// another host or a page that will not scroll to its end.
//
//   npm run build && npm run preview, then
//   node scripts/dev/devices.mjs [out-dir] [case-name ...]
//
// BASE (http://127.0.0.1:4173); ENGINE=webkit runs Safari's engine (after
// `npx playwright install webkit`), else Chromium. Each case prints one
// line: the mode, the frames' luminance (mean and spread, 0-255: a black
// screen has both near 0), whether the page reached its end, page errors
// and foreign requests; screenshots go to out-dir (.claude/devices).

import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium, webkit } from "@playwright/test";
import sharp from "sharp";

const base = process.env.BASE ?? "http://127.0.0.1:4173";
const engine = process.env.ENGINE === "webkit" ? webkit : chromium;
const [outArg, ...only] = process.argv.slice(2);
const outDir = path.resolve(outArg ?? ".claude/devices");
mkdirSync(outDir, { recursive: true });

const phone = { isMobile: true, hasTouch: true };
const CASES = [
  { name: "phone-390x844", viewport: [390, 844], scale: 3, ...phone },
  { name: "phone-landscape-844x390", viewport: [844, 390], scale: 3, ...phone },
  { name: "phone-360x640", viewport: [360, 640], scale: 2, ...phone },
  { name: "android-412x915", viewport: [412, 915], scale: 2.625, ...phone },
  { name: "tablet-820x1180", viewport: [820, 1180], scale: 2, ...phone },
  {
    name: "tablet-landscape-1180x820",
    viewport: [1180, 820],
    scale: 2,
    ...phone,
  },
  { name: "tablet-pro-1024x1366", viewport: [1024, 1366], scale: 2, ...phone },
  {
    name: "tablet-pro-landscape-1366x1024",
    viewport: [1366, 1024],
    scale: 2,
    ...phone,
  },
  // A touch screen that is not a phone's (a laptop's, a tablet asking for
  // the desktop site): what the pointer says decides.
  {
    name: "touch-laptop-1366x768",
    viewport: [1366, 768],
    scale: 1.5,
    hasTouch: true,
  },
  // Desktop windows the size of tablets, with a mouse: the scene itself.
  { name: "window-1024x768", viewport: [1024, 768], scale: 1 },
  { name: "window-portrait-1024x1366", viewport: [1024, 1366], scale: 1 },
  // A small window where WebGL fails: the scene's stills.
  {
    name: "window-1024x768-no-webgl",
    viewport: [1024, 768],
    scale: 1,
    noWebgl: true,
  },
].filter((c) => !only.length || only.includes(c.name));

async function frameStats(buffer) {
  const { channels } = await sharp(buffer).stats();
  const luma = (i) => channels[i];
  const mean =
    0.2126 * luma(0).mean + 0.7152 * luma(1).mean + 0.0722 * luma(2).mean;
  const spread = Math.max(luma(0).stdev, luma(1).stdev, luma(2).stdev);
  return { mean: Math.round(mean), spread: Math.round(spread) };
}

const origin = new URL(base).origin;
const rows = [];
for (const c of CASES) {
  const browser = await engine.launch(
    engine === chromium
      ? {
          channel: "chromium",
          args: c.noWebgl ? ["--disable-3d-apis"] : [],
        }
      : {},
  );
  const context = await browser.newContext({
    viewport: { width: c.viewport[0], height: c.viewport[1] },
    deviceScaleFactor: c.scale,
    isMobile: engine === chromium ? Boolean(c.isMobile) : c.isMobile,
    hasTouch: Boolean(c.hasTouch),
  });
  const page = await context.newPage();
  const errors = [];
  const foreign = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith(origin) && !/^(data|blob):/.test(u)) foreign.push(u);
  });
  const shots = [];
  const shoot = async (label) => {
    const buffer = await page.screenshot();
    await sharp(buffer).toFile(path.join(outDir, `${c.name}-${label}.png`));
    shots.push({ label, ...(await frameStats(buffer)) });
  };
  let mode = "?";
  let reachedEnd = false;
  try {
    await page.goto(`${base}/`, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    const state = await page.evaluate(() => ({
      fallback:
        getComputedStyle(document.querySelector("[data-fallback]")).display !==
        "none",
      coarse: matchMedia("(pointer: coarse)").matches,
      road: document.querySelector("#road")?.getAttribute("data-mode"),
    }));
    mode = state.fallback
      ? `fallback${state.coarse ? " (coarse pointer)" : ""}`
      : `scene (${state.road ?? "?"})`;
    await shoot("top");
    if (!state.fallback) {
      // Scene 2 ready, or its stills, then through the page to its end.
      await page
        .waitForFunction(
          () =>
            window.__road?.ready ||
            document.querySelector("#road")?.getAttribute("data-mode") ===
              "stills",
          null,
          { timeout: 180_000 },
        )
        .catch(() => {});
      mode = `scene (${await page.evaluate(() => document.querySelector("#road")?.getAttribute("data-mode"))})`;
      const max = await page.evaluate(
        () => document.documentElement.scrollHeight - innerHeight,
      );
      for (const f of [0.03, 0.2, 0.5, 0.8, 1]) {
        await page.evaluate((y) => {
          if (window.__lenis)
            window.__lenis.scrollTo(y, { immediate: true, force: true });
          else window.scrollTo(0, y);
        }, f * max);
        await page.waitForTimeout(2000);
        await shoot(`at-${Math.round(f * 100)}`);
      }
      reachedEnd = await page.evaluate(
        () =>
          Math.abs(
            scrollY - (document.documentElement.scrollHeight - innerHeight),
          ) < 4,
      );
    } else {
      // One screen: it must fit and stay put; a scroll changes nothing
      // (by script: mobile WebKit takes no wheel).
      await page.evaluate(() => window.scrollBy(0, 2000));
      await page.waitForTimeout(800);
      await shoot("after-scroll");
      reachedEnd = await page.evaluate(
        () => document.documentElement.scrollHeight - innerHeight < 4,
      );
    }
  } catch (e) {
    errors.push(`run: ${e.message.split("\n")[0]}`);
  }
  await browser.close();
  const dark = shots.filter((s) => s.mean < 12 && s.spread < 8);
  rows.push(
    `${c.name}: ${mode}; frames ${shots.map((s) => `${s.label} ${s.mean}/${s.spread}`).join(", ")}; ${dark.length ? `BLACK: ${dark.map((s) => s.label).join(", ")}` : "none black"}; ${reachedEnd ? "reaches its end" : "DOES NOT REACH ITS END"}; ${errors.length ? `ERRORS: ${errors.join(" | ")}` : "no errors"}; ${foreign.length ? `FOREIGN: ${foreign.join(" ")}` : "same origin only"}`,
  );
  console.log(rows.at(-1));
}
