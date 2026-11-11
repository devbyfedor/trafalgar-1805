// A fleet ship's baked tables over a range of scene 2's p: the raw size
// ratio the bake laid out at each step and the eased ratio the frames read
// (window.__road.bakedSizes, layer 0). Development only.
//   node scripts/dev/glyph-baked.mjs <ship,ship,...> [from] [to] [every]
// p from 0.94 to 1 by default, every third step (0.001) printed.
// Environment: BASE (default http://127.0.0.1:3000), W, H, S, EASE (a trial
// table of the dawn fleets' shifts, as glyph-clash.mjs takes it).
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const [list, from = "0.94", to = "1", every = "3"] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: {
    width: Number(process.env.W ?? 1280),
    height: Number(process.env.H ?? 720),
  },
  deviceScaleFactor: Number(process.env.S ?? 1.5),
});
if (process.env.EASE) {
  const ease =
    process.env.EASE === "{}" ? "{}" : readFileSync(process.env.EASE, "utf8");
  await page.addInitScript((json) => {
    try {
      window.localStorage.setItem("road.dawnEase", json);
    } catch {}
  }, ease);
}
await page.goto(`${base}/?quality=0`);
await page.waitForFunction(
  () => window.__road?.ready && window.__road.baked,
  null,
  { timeout: 180_000 },
);
const names = (await page.evaluate(() => window.__road.glyphNames()))[0];
const k0 = Math.round(Number(from) * 1000);
const k1 = Math.round(Number(to) * 1000);
for (const name of list.split(",")) {
  for (let i = names.indexOf(name); i >= 0; i = names.indexOf(name, i + 1)) {
    const rows = await page.evaluate(
      ([i, k0, k1]) => window.__road.bakedSizes(0, i, k0, k1),
      [i, k0, k1],
    );
    console.log(
      `${name} (${i}): ${rows
        .filter((_, k) => k % Number(every) === 0)
        .map(
          ([p, raw, r]) => `${p.toFixed(3)} ${raw.toFixed(2)}/${r.toFixed(2)}`,
        )
        .join("  ")}`,
    );
  }
}
await browser.close();
