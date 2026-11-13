import { expect, type Page, test } from "@playwright/test";
import {
  collectErrors,
  type InterludePoint,
  open,
  scrollToInterlude,
  scrollToRoad,
  scrollToY,
  waitForRoad,
} from "./helpers";

/**
 * The page never scrolls sideways (the owner's bug 1, session 25: a
 * horizontal scroll bar over Boulogne's painting, on Windows, where scroll
 * bars are classic ones that take room from the window). Playwright starts
 * headless Chromium with --hide-scrollbars, which leaves no scroll bar at
 * all; this file starts it without that switch (a worker of its own;
 * another --disable-features would replace Playwright's own list) and
 * styles the page's scroll bar from before any of its scripts measures the
 * page, so it is a classic one 17 px wide from the first layout (styled
 * later, ScrollTrigger's pin spacers would keep the width they measured
 * without it, which no reader's page has). Then,
 * at the top and at points through Boulogne's interlude, the document must
 * be exactly as wide as the window inside its scroll bar (scrollWidth
 * equals clientWidth: nothing laid out past it, whatever html's
 * overflow-x: clip would hide) and not scrolled sideways. One case plants
 * an element 100vw wide, the mistake that counts the scroll bar's width
 * (bug 1's likely cause), and expects the same check to catch it, so a
 * pass here means something.
 *
 * Runs in project "road" (Chromium's new headless mode, on the GPU).
 */
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

/** Long enough for the 0.6 s scrub to settle. */
const SCRUB_SETTLE_MS = 1600;
/** A classic scroll bar, as Windows draws one: it takes room from the window. */
const CLASSIC_SCROLLBAR =
  "::-webkit-scrollbar { width: 17px; height: 17px; background: #ccc; } ::-webkit-scrollbar-thumb { background: #888; }";

/** Scene 2's p just before Boulogne's interlude, points through it, and p just after. */
const POINTS: (number | InterludePoint)[] = [
  0.2,
  { phase: "dive", t: 0 },
  { phase: "dive", t: 0.5 },
  { phase: "dive", t: 0.75 },
  { phase: "dive", t: 1 },
  { phase: "hold", t: 0 },
  { phase: "hold", t: 0.5 },
  { phase: "hold", t: 1 },
  { phase: "rise", t: 0.25 },
  { phase: "rise", t: 0.5 },
  { phase: "rise", t: 1 },
  0.22,
];

interface Width {
  scrollWidth: number;
  clientWidth: number;
  innerWidth: number;
  scrollX: number;
  /** Elements reaching past the window's inner right edge, clipped by nothing below the root. */
  wide: string[];
}

/** The document's width against the window's, and what reaches past it. */
function measure(page: Page): Promise<Width> {
  return page.evaluate(() => {
    const root = document.documentElement;
    const wide: string[] = [];
    for (const el of document.querySelectorAll("body *")) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.right <= root.clientWidth + 0.5) continue;
      let clipped = false;
      for (let a = el.parentElement; a && a !== root; a = a.parentElement)
        if (getComputedStyle(a).overflowX !== "visible") {
          clipped = true;
          break;
        }
      if (clipped) continue;
      const data = [...el.attributes]
        .filter((a) => a.name.startsWith("data-"))
        .map((a) => `[${a.name}=${a.value}]`)
        .join("");
      wide.push(
        `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${data} to ${box.right.toFixed(1)} (${getComputedStyle(el).position})`,
      );
    }
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      innerWidth: window.innerWidth,
      scrollX: window.scrollX,
      wide,
    };
  });
}

/** What reaches past the window, for a failure's message. */
const named = (m: Width) =>
  m.wide.slice(0, 12).join("; ") || "nothing reaches past the window";

async function openRoad(page: Page): Promise<void> {
  // The scroll bar's style goes into <head> as soon as the parser makes it,
  // before any script runs (React leaves a <style> it didn't render in
  // <head> alone while it hydrates).
  await page.addInitScript((css) => {
    const add = () => {
      if (!document.head) return false;
      const style = document.createElement("style");
      style.dataset.test = "classic-scrollbar";
      style.textContent = css;
      document.head.append(style);
      return true;
    };
    if (add()) return;
    const observer = new MutationObserver(() => {
      if (add()) observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  }, CLASSIC_SCROLLBAR);
  await open(page, "/?quality=0");
  await waitForRoad(page, { baked: false, sea: true });
}

const name = (point: number | InterludePoint) =>
  typeof point === "number" ? `p ${point}` : `${point.phase}:${point.t}`;

test.describe("the page's width with classic scroll bars", () => {
  test("never scrolls sideways through Boulogne's interlude", async ({
    page,
  }) => {
    test.setTimeout(360_000);
    const errors = collectErrors(page);
    await openRoad(page);

    // The scroll bar is a classic one: it takes room from the window.
    await scrollToY(page, 0);
    await page.waitForTimeout(SCRUB_SETTLE_MS);
    const top = await measure(page);
    expect(
      top.innerWidth - top.clientWidth,
      "the scroll bar's width, CSS px",
    ).toBeGreaterThanOrEqual(10);
    expect(
      top.scrollWidth,
      `the top: the document's width (${named(top)})`,
    ).toBe(top.clientWidth);

    for (const point of POINTS) {
      if (typeof point === "number") await scrollToRoad(page, point);
      else await scrollToInterlude(page, point);
      await page.waitForTimeout(SCRUB_SETTLE_MS);
      const at = await measure(page);
      expect(
        at.scrollWidth,
        `${name(point)}: the document's width (${named(at)})`,
      ).toBe(at.clientWidth);
      expect(at.scrollX, `${name(point)}: scrolled sideways, px`).toBe(0);
    }
    expect(errors).toEqual([]);
  });

  test("catches an element as wide as the window with its scroll bar", async ({
    page,
  }) => {
    test.setTimeout(360_000);
    await openRoad(page);
    await scrollToInterlude(page, { phase: "hold", t: 0.5 });
    await page.waitForTimeout(SCRUB_SETTLE_MS);
    const clean = await measure(page);
    expect(clean.scrollWidth, `before the plant (${named(clean)})`).toBe(
      clean.clientWidth,
    );

    // 100vw counts the scroll bar's width (and a pixel more, should a
    // browser one day leave the scroll bar out of vw): wider than the
    // window inside its scroll bar.
    await page.evaluate(() => {
      const el = document.createElement("div");
      el.id = "overflow-plant";
      el.style.cssText = `position: absolute; left: 0; top: ${window.scrollY}px; width: calc(100vw + 1px); height: 4px;`;
      document.body.append(el);
    });
    const planted = await measure(page);
    // The check the walk makes (scrollWidth equals clientWidth) fails on it.
    expect(
      planted.scrollWidth,
      "the document's width with the plant",
    ).toBeGreaterThan(planted.clientWidth);
    expect(
      planted.wide.some((w) => w.startsWith("div#overflow-plant")),
      "the plant among what reaches past the window",
    ).toBe(true);

    await page.evaluate(() =>
      document.getElementById("overflow-plant")?.remove(),
    );
    const after = await measure(page);
    expect(after.scrollWidth, "with the plant gone").toBe(after.clientWidth);
  });
});
