// Horizontal overflow with classic scroll bars (development): Chromium
// without Playwright's --hide-scrollbars, so a scroll bar takes 15-17 px;
// prints scrollWidth against clientWidth and any unclipped element wider
// than the page, at the top and at points of Boulogne's interlude.
//   node scripts/dev/hscroll.mjs   (BASE: http://127.0.0.1:3000)
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({
  channel: "chromium",
  ignoreDefaultArgs: ["--hide-scrollbars"],
});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1.5,
});
const tab = await ctx.newPage();
await tab.addInitScript(() => {
  const s = document.createElement("style");
  s.textContent =
    "::-webkit-scrollbar{width:17px;height:17px;background:#ccc}::-webkit-scrollbar-thumb{background:#888}";
  document.documentElement.appendChild(s);
});
await tab.goto(base + "/");
await tab.waitForFunction(() => window.__road?.ready === true, null, {
  timeout: 60000,
});
const report = async (label) => {
  const r = await tab.evaluate(() => {
    const de = document.documentElement;
    const out = {
      scrollW: de.scrollWidth,
      clientW: de.clientWidth,
      innerW: window.innerWidth,
    };
    const wide = [];
    for (const el of document.querySelectorAll("body *")) {
      const b = el.getBoundingClientRect();
      if (b.right > de.clientWidth + 0.5) {
        let a = el.parentElement,
          clipped = false;
        while (a && a !== document.documentElement) {
          const s = getComputedStyle(a);
          if (s.overflowX !== "visible") {
            clipped = true;
            break;
          }
          a = a.parentElement;
        }
        if (!clipped)
          wide.push(
            `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${(el.className?.baseVal ?? el.className ?? "").toString().slice(0, 70)} [${b.left.toFixed(1)},${b.right.toFixed(1)}] pos=${getComputedStyle(el).position} w=${getComputedStyle(el).width}`,
          );
      }
    }
    out.wide = wide.slice(0, 15);
    return out;
  });
  console.log(label, JSON.stringify(r, null, 1));
  await tab.screenshot({
    path: `.claude/hscroll-${label.replace(/[:.]/g, "_")}.png`,
  });
};
await report("top");
for (const [phase, t] of [
  ["dive", 0.0],
  ["hold", 0.5],
]) {
  const y = await tab.evaluate(
    ([ph, tt]) => window.__road.scrollForInterlude("boulogne", ph, tt),
    [phase, t],
  );
  await tab.evaluate((yy) => window.scrollTo(0, yy), y);
  await tab.waitForTimeout(1800);
  await report(`${phase}:${t}`);
}
await browser.close();
