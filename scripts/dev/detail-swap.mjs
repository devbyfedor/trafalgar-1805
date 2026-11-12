// Development only, not part of the site or the tests: proves that the chart's
// detail layer changes tile without its showing (terrain/field.ts, slot.ts).
//   node scripts/dev/detail-swap.mjs [out-dir]
// Needs a server (BASE, http://127.0.0.1:3000 by default). Two checks:
// 1. The layer's plan along scene 2's flight and the lab's (what each frame
//    draws, a step every 0.0005 of p): wherever the bound tile is in sight at
//    either of two neighbouring steps, its weight changes between them by at
//    most a sixteenth; at every change of tile, the tile leaving is out of
//    sight at both steps or at nothing at the last before, and the tile coming
//    is out of sight at both or at nothing at its first. Prints the plan's
//    stretches, and each fade with the most its tile claims.
// 2. At every change of tile on scene 2's flight, the frames at both steps
//    drawn three ways (the tile leaving held at its weight, the tile coming
//    held at its weight, layer B empty) must match pixel for pixel. Then, at
//    the middle of each fade, the frame with the tile in full against the
//    overview alone: how much a fade has to hide. With an out-dir, the frames
//    are saved there as PNGs.
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const outDir = process.argv[2];
/** Must match terrain/slot.ts (SLOT_RATE). */
const RATE = 1 / 16;

const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(e.message));

/** The demo flying all of scene 2's flight, so the lab's p is the scene's. */
async function open(p) {
  await page.goto(
    `${base}/lab/chart/?demo=detail&from=0&to=1&quality=0&p=${p}`,
  );
  await page.waitForFunction(
    () => window.__chart?.ready && window.__detail,
    null,
    { timeout: 120_000 },
  );
  await settle();
}

/** A few animation frames: the lab draws the current state. */
const settle = () =>
  page.evaluate(
    () =>
      new Promise((r) => {
        let n = 4;
        const tick = () => (--n > 0 ? requestAnimationFrame(tick) : r());
        requestAnimationFrame(tick);
      }),
  );

const pixels = async (file) => {
  const png = await page.screenshot(file ? { path: file } : {});
  return sharp(png).raw().toBuffer();
};

/** Pixels differing at all, and by more than 8 levels in any channel. */
function compare(a, b) {
  let any = 0;
  let visible = 0;
  let most = 0;
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.max(
      Math.abs(a[i] - b[i]),
      Math.abs(a[i + 1] - b[i + 1]),
      Math.abs(a[i + 2] - b[i + 2]),
    );
    if (d > 0) any++;
    if (d > 8) visible++;
    most = Math.max(most, d);
  }
  return { any, visible, most, total: a.length / 4 };
}

await open(0);
let failures = 0;
const swaps = [];
const fades = [];
for (const flight of ["scene", "lab"]) {
  const d = await page.evaluate((f) => window.__detail.plan(f), flight);
  const last = d.index.length - 1;
  const name = (k) => (k >= 0 ? d.tiles[k] : "none");
  const sight = (k, i) => k >= 0 && d.seen[k][i] === 1;
  console.log(`\n${flight}:`);
  let fade = null;
  for (let i = 1; i <= last; i++) {
    const a = d.index[i - 1];
    const b = d.index[i];
    const p = i / last;
    if (a === b) {
      const inSight = sight(b, i) || sight(b, i - 1);
      const step = Math.abs(d.weight[i] - d.weight[i - 1]);
      if (inSight && step > RATE + 1e-6) {
        failures++;
        console.log(
          `  p ${p.toFixed(4)}: ${name(b)} in sight changes by ${step.toFixed(4)}  <-- FAILED`,
        );
      }
    } else {
      const out =
        a < 0 || (!sight(a, i - 1) && !sight(a, i)) || d.weight[i - 1] === 0;
      const into = (!sight(b, i - 1) && !sight(b, i)) || d.weight[i] === 0;
      if (!out || !into) failures++;
      console.log(
        `  p ${p.toFixed(4)}: ${name(a)} (${sight(a, i - 1) || sight(a, i) ? "in sight" : "out of sight"}, ${d.weight[i - 1].toFixed(3)}) -> ${name(b)} (${sight(b, i - 1) || sight(b, i) ? "in sight" : "out of sight"}, ${d.weight[i].toFixed(3)})${out && into ? "" : "  <-- FAILED"}`,
      );
      if (flight === "scene") swaps.push({ i, last, a, b, d });
    }
    // Fades: stretches where the bound tile is in sight below full weight.
    const fading =
      b >= 0 && d.weight[i] < 1 && (sight(b, i) || sight(b, i - 1));
    if (fading) {
      if (!fade) fade = { tile: b, from: i, to: i, claim: 0 };
      fade.to = i;
      fade.claim = Math.max(fade.claim, d.claims[b][i]);
    } else if (fade) {
      console.log(
        `  fade of ${name(fade.tile)} in sight, p ${(fade.from / last).toFixed(4)}-${(fade.to / last).toFixed(4)}: its claim at most ${fade.claim.toFixed(4)}`,
      );
      if (flight === "scene") fades.push({ ...fade, last });
      fade = null;
    }
  }
  // The stretches of the plan.
  let run = null;
  const runs = [];
  for (let i = 0; i <= last; i++) {
    const key = `${name(d.index[i])}${d.weight[i] < 1 ? " fading" : ""}`;
    if (!run || run.key !== key) {
      if (run) runs.push(run);
      run = { key, from: i, to: i };
    } else run.to = i;
  }
  runs.push(run);
  console.log(
    `  ${runs.map((r) => `${(r.from / last).toFixed(4)}-${(r.to / last).toFixed(4)} ${r.key}`).join("; ")}`,
  );
}

console.log("\nFrames at each change of tile on scene 2's flight:");
for (const { i, last, a, b, d } of swaps) {
  for (const k of [i - 1, i]) {
    const p = k / last;
    await open(p);
    const shots = [];
    const ways = [
      [d.tiles[a] ?? null, d.weight[i - 1], "leaving"],
      [d.tiles[b], d.weight[i], "coming"],
      [null, 0, "empty"],
    ];
    for (const [id, weight, label] of ways) {
      if (id === null && label !== "empty") continue;
      await page.evaluate(([t, w]) => window.__detail.hold(t, w), [id, weight]);
      await settle();
      const file = outDir
        ? path.join(outDir, `swap-${p.toFixed(4)}-${label}.png`)
        : undefined;
      shots.push([label, await pixels(file)]);
    }
    for (let s = 1; s < shots.length; s++) {
      const c = compare(shots[0][1], shots[s][1]);
      if (c.any > 0) failures++;
      console.log(
        `  p ${p.toFixed(4)}: ${shots[0][0]} vs ${shots[s][0]}: ${c.any} of ${c.total} pixels differ${c.any ? "  <-- FAILED" : ""}`,
      );
    }
  }
}

console.log(
  "\nWhat each fade on scene 2's flight hides (tile in full vs overview alone, mid-fade):",
);
for (const fade of fades) {
  const p = (fade.from + fade.to) / 2 / fade.last;
  await open(p);
  const tile = (await page.evaluate(() => window.__detail.plan("scene"))).tiles[
    fade.tile
  ];
  const shots = [];
  for (const [id, label] of [
    [tile, "full"],
    [null, "overview"],
  ]) {
    await page.evaluate((t) => window.__detail.hold(t, 1), id);
    await settle();
    const file = outDir
      ? path.join(outDir, `fade-${p.toFixed(4)}-${label}.png`)
      : undefined;
    shots.push(await pixels(file));
  }
  const c = compare(shots[0], shots[1]);
  console.log(
    `  p ${p.toFixed(4)} (${tile}): ${c.any} pixels differ at all, ${c.visible} by more than 8 levels, at most ${c.most}`,
  );
}

if (errors.length) {
  failures++;
  console.log(`\nconsole errors:\n${errors.join("\n")}`);
}
console.log(
  failures ? `\n${failures} FAILED` : "\nevery change of tile is invisible",
);
await browser.close();
process.exitCode = failures ? 1 : 0;
