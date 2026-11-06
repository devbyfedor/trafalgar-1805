// The lab's frame time on two builds at once, alternated point by point in
// one browser (development only, not part of the site or the tests).
//   node scripts/dev/ab-builds.mjs
// Throttling (on battery the CPU and GPU share one power limit, and a
// sustained load lowers the clocks within a minute) and other work on the
// machine move absolute GPU times by a factor of two or three; alternating
// the builds at each point, in both orders, puts any drift on both alike,
// so the ratio holds where the absolute numbers don't.
// BASE_A and BASE_B are the two servers (the older build first, e.g. a
// worktree's export served on 4174, and `npm run preview` on 4173).
// Variants: "A" (BASE_A), "B" (BASE_B) and, unless NODEPTH=0, "B-nd"
// (BASE_B with the terrain's sea-depth write off, for the builds of
// sessions 12 and 13 that had it and its switch).
// Environment: P=0.1,0.2 the lab's points, ROUNDS (4), FRAMES (30), PAGE
// (/lab/chart/), W, H and S as in bench.mjs (1280, 720, 1.5), QUALITY (0).
// Between turns each page is held hidden (document.hidden overridden), so
// only the page being timed draws.
import { chromium } from "@playwright/test";

const baseA = process.env.BASE_A ?? "http://127.0.0.1:4174";
const baseB = process.env.BASE_B ?? "http://127.0.0.1:4173";
const path = process.env.PAGE ?? "/lab/chart/";
const rounds = Number(process.env.ROUNDS ?? 4);
const frames = Number(process.env.FRAMES ?? 30);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const quality = Number(process.env.QUALITY ?? 0);
const noDepth = process.env.NODEPTH !== "0";
const SKIP = 5;
const points = (
  process.env.P ??
  "0,0.04,0.08,0.12,0.16,0.2,0.24,0.3,0.4,0.5,0.62,0.72,0.82,0.9,1"
)
  .split(",")
  .map(Number);

const median = (v) => {
  if (!v.length) return Number.NaN;
  const s = [...v].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const ms = (v) => (Number.isFinite(v) ? v.toFixed(2).padStart(6) : "     -");

const browser = await chromium.launch({ channel: "chromium" });
const open = async (base) => {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
  });
  await context.addInitScript(() => {
    window.__benchHidden = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => window.__benchHidden === true,
    });
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`${base}: ${e.message}`));
  await page.goto(`${base}${path}?quality=${quality}`);
  await page.waitForFunction(() => window.__chart?.ready, null, {
    timeout: 120_000,
  });
  await page.evaluate(() => {
    window.__benchHidden = true;
  });
  return page;
};
const pageA = await open(baseA);
const pageB = await open(baseB);
const hasDepth = await pageB.evaluate(
  () => typeof window.__chart.seaDepth === "function",
);
const variants = [
  { name: "A", page: pageA },
  { name: "B", page: pageB, depth: hasDepth ? true : undefined },
];
if (noDepth && hasDepth)
  variants.push({ name: "B-nd", page: pageB, depth: false });

const bench = async (v, p, n) => {
  if (v.depth !== undefined)
    await v.page.evaluate((on) => window.__chart.seaDepth(on), v.depth);
  const r = await v.page.evaluate(
    ([f, at]) => window.__chart.bench(f, at),
    [n + SKIP, p],
  );
  return r.gpu.slice(SKIP);
};

console.log(
  `${baseA} (A) against ${baseB} (B${variants.length > 2 ? ", B-nd: B without the sea-depth write" : ""}), ${rounds} rounds of ${frames} frames, median GPU ms per round`,
);
console.log(
  `    p | ${variants.map((v) => `${v.name.padEnd(4)} min   med`).join(" | ")} | ${variants
    .slice(1)
    .map((v) => `${v.name}/A`)
    .join("  ")}`,
);
const totals = Object.fromEntries(variants.map((v) => [v.name, []]));
for (const p of points) {
  const per = Object.fromEntries(variants.map((v) => [v.name, []]));
  for (let round = 0; round < rounds; round++) {
    const order = round % 2 === 0 ? variants : [...variants].reverse();
    for (const v of order) {
      await bench(v, p, 6);
      per[v.name].push(median(await bench(v, p, frames)));
    }
  }
  if (hasDepth) await pageB.evaluate(() => window.__chart.seaDepth(true));
  const stat = (name) => ({
    min: Math.min(...per[name]),
    med: median(per[name]),
  });
  const a = stat("A");
  for (const v of variants) totals[v.name].push(stat(v.name).min);
  console.log(
    `${p.toFixed(3).padStart(5)} | ${variants
      .map((v) => {
        const s = stat(v.name);
        return `${ms(s.min)} ${ms(s.med)}`;
      })
      .join(" | ")} | ${variants
      .slice(1)
      .map((v) => (stat(v.name).min / a.min).toFixed(2).padStart(4))
      .join("  ")}`,
  );
}
const sum = (v) => v.reduce((x, y) => x + y, 0);
console.log(
  `sum of minima: ${variants.map((v) => `${v.name} ${sum(totals[v.name]).toFixed(1)}`).join(", ")}`,
);
await browser.close();
