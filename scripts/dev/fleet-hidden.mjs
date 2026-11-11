// Which ships of both fleets are in the story but not drawn (the layout
// gives way where glyphs would touch), at given points of scene 2's p:
// each ship whose place is set (opacity > 0) but whose glyph is drawn under
// half opacity, with her drawn height (window.__road.motion, layer 0).
// Development only.
//   node scripts/dev/fleet-hidden.mjs 0.735 0.95 1
// Environment: BASE (default http://127.0.0.1:3000), W, H, S.
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const ps = process.argv.slice(2).map(Number);
const width = Number(process.env.W ?? 1280);
const height = Number(process.env.H ?? 720);
const scale = Number(process.env.S ?? 1.5);
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
});
// EASE=<file>: a trial table of the dawn fleets' shifts (fleets.ts,
// DAWN_EASE's form; scripts/dev/fleet-ease.mjs), "{}" for the sources' places.
if (process.env.EASE) {
  const { readFileSync } = await import("node:fs");
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
await page.evaluate(() => {
  const y = 3.3 * window.innerHeight;
  if (window.__lenis)
    window.__lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
});
await page.waitForTimeout(1000);
const names = (await page.evaluate(() => window.__road.glyphNames()))[0];
for (const p of ps) {
  const [fleet] = await page.evaluate((p) => window.__road.motion(p), p);
  // Which ships are in the story (older builds have no ashore: all of them).
  const ashore = await page.evaluate(
    (p) => window.__road.ashore?.(p) ?? null,
    p,
  );
  const hidden = [];
  let present = 0;
  let onScreen = 0;
  for (let i = 0; i < names.length; i++) {
    const [x, y, h, alpha] = fleet.slice(i * 6, i * 6 + 4);
    if (ashore && !(ashore[i * 3 + 2] > 0)) continue;
    present++;
    const inFrame = x > 0 && x < width * scale && y > 0 && y < height * scale;
    if (!inFrame) continue;
    onScreen++;
    if (alpha < 0.5)
      hidden.push(`${names[i]} (${h.toFixed(1)} px, ${alpha.toFixed(2)})`);
  }
  console.log(
    `p ${p}: ${present} in the story, ${onScreen} in the frame, ${onScreen - hidden.length} shown; hidden: ${hidden.join(", ") || "none"}`,
  );
}
await browser.close();
