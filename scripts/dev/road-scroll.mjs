// Where scene 2 shows a given point, for the dev tools (development only).
// Since Boulogne's interlude (docs/scene-02-boulogne-brief.md) the pin is
// longer than its 30 screens of p: the page maps p to a scroll position
// itself (window.__road.scrollFor; scenes/alive/interlude.ts), so every
// tool reaches the same frame of the story on any build. A build from
// before the interlude has no such hook; there p sat at (3 + 30p) screens.
//
// Points, the syntax every road tool shares (parsePoints), one per
// argument or several in one, separated by commas:
//   0.21               the story's p (at an interlude's own p, where the
//                      interlude begins: its dive's first frame)
//   0.1..0.3:0.005     p from 0.1 to 0.3 by 0.005, both ends included
//                      (0.1..0.3: by the tool's own step)
//   p:0.21, p:0..1:0.1 the same, said explicitly (for the tools whose bare
//                      numbers keep their old meaning, pointsFromArgs)
//   dive:0.5           a point of an interlude: its dive, hold or rise, t
//   hold:0..1:0.05     from 0 to 1 through that part (a range as above);
//   rise:0.25          Boulogne's unless named: boulogne/hold:0.5
//   hold               the whole part, by the tool's step of t
// An interlude's point needs a build with the hook; a p works on any.

/** Scene 1's pin before scene 2's starts, and scene 2's old pin, screens. */
export const SCENE1 = 3;
export const SCENE2 = 30;
/** The interlude a point names when it names none. */
export const INTERLUDE = "boulogne";
export const PHASES = ["dive", "hold", "rise"];

/**
 * The page's scroll position (CSS px) that shows scene 2 at p. Call once
 * the scene is ready (window.__road.ready); a page without the hook gets
 * the old linear pin.
 */
export function roadScrollFor(tab, p) {
  return tab.evaluate(
    ([at, scene1, scene2]) =>
      window.__road?.scrollFor
        ? window.__road.scrollFor(at)
        : (scene1 + scene2 * at) * window.innerHeight,
    [p, SCENE1, SCENE2],
  );
}

/** Scrolls the page to `y` at once, through Lenis where it runs. */
export function scrollPageTo(tab, y) {
  return tab.evaluate((top) => {
    if (window.__lenis)
      window.__lenis.scrollTo(top, { immediate: true, force: true });
    else window.scrollTo(0, top);
  }, y);
}

/** Scrolls the page to scene 2 at p (roadScrollFor), returning the position. */
export async function scrollRoadTo(tab, p) {
  const y = await roadScrollFor(tab, p);
  await scrollPageTo(tab, y);
  return y;
}

// ------------------------------------------------------------------ points

const round6 = (v) => Math.round(v * 1e6) / 1e6;

function number(text, token) {
  const v = Number(text);
  if (text === undefined || text.trim() === "" || !Number.isFinite(v))
    throw new Error(`point "${token}": "${text ?? ""}" is not a number`);
  return v;
}

/** `from`, `from + step` ... `to`, both ends included, rounded to 1e-6. */
export function range(from, to, step) {
  if (!(step > 0)) throw new Error(`a range needs a step above 0 (${step})`);
  if (to < from) throw new Error(`a range runs upward (${from} to ${to})`);
  const count = Math.round((to - from) / step);
  const out = [];
  for (let i = 0; i <= count; i++)
    out.push(round6(Math.min(to, from + i * step)));
  if (out[out.length - 1] < to - 1e-9) out.push(round6(to));
  return [...new Set(out)];
}

/** "0.2", "0.1..0.3" or "0.1..0.3:0.01" as numbers. */
function values(spec, step, token) {
  const [span, stepText, extra] = spec.split(":");
  if (extra !== undefined) throw new Error(`point "${token}": too many ":"`);
  const [fromText, toText, more] = span.split("..");
  if (more !== undefined) throw new Error(`point "${token}": too many ".."`);
  const from = number(fromText, token);
  if (toText === undefined) {
    if (stepText !== undefined)
      throw new Error(`point "${token}": a step needs a range (a..b:step)`);
    return [round6(from)];
  }
  const to = number(toText, token);
  return range(
    from,
    to,
    stepText === undefined ? step : number(stepText, token),
  );
}

/**
 * Points from the shared syntax (above): a string or a list of them.
 * Each point is { kind: "p", p } or { kind: "interlude", id, phase, t }.
 * `pStep` and `tStep` are the steps of ranges that give none.
 */
export function parsePoints(input, { pStep = 0.01, tStep = 0.1 } = {}) {
  const tokens = (Array.isArray(input) ? input : [input])
    .flatMap((a) => String(a).split(/[\s,]+/))
    .filter(Boolean);
  const out = [];
  for (const token of tokens) {
    const m = /^(?:([A-Za-z][\w-]*)\/)?(dive|hold|rise)(?::(.*))?$/.exec(token);
    if (m) {
      const [, id = INTERLUDE, phase, spec = "0..1"] = m;
      for (const t of values(spec, tStep, token)) {
        if (t < 0 || t > 1)
          throw new Error(`point "${token}": t runs from 0 to 1 (${t})`);
        out.push({ kind: "interlude", id, phase, t });
      }
      continue;
    }
    if (token.includes("/"))
      throw new Error(
        `point "${token}": an interlude's point is <id>/<dive|hold|rise>:t`,
      );
    const spec = token.startsWith("p:") ? token.slice(2) : token;
    for (const p of values(spec, pStep, token)) out.push({ kind: "p", p });
  }
  return out;
}

/**
 * A tool's arguments as points, keeping its old usage: with no arguments,
 * `fallback` (the point syntax); bare numbers alone mean what they always
 * did, `order` naming them (e.g. ["from", "to", "step"], with `defaults`
 * for those left out), a range of p; anything else is the point syntax.
 */
export function pointsFromArgs(args, { order, defaults, fallback, ...steps }) {
  if (!args.length && fallback) return parsePoints(fallback, steps);
  const bare = args.every((a) => /^[-+]?(\d+\.?\d*|\.\d+)$/.test(a));
  if (!bare) return parsePoints(args, steps);
  const v = { ...defaults };
  order.forEach((key, i) => {
    if (args[i] !== undefined) v[key] = Number(args[i]);
  });
  return range(v.from, v.to, v.step).map((p) => ({ kind: "p", p }));
}

/** Whether a point lies inside an interlude (it needs the page's hook). */
export const inInterlude = (point) => point.kind === "interlude";

/** p as a file name has it: 0.21 "0210", 0.2125 "02125", 1 "1000". */
function digits(v) {
  let s = Math.abs(v).toFixed(6).replace(/0+$/, "");
  const [whole, frac = ""] = s.split(".");
  s = `${whole}${frac.padEnd(3, "0")}`;
  return v < 0 ? `m${s}` : s;
}

/** A point as rows print it: "0.2100", "dive:0.500" (another interlude's "x/dive:0.500"). */
export function pointName(point) {
  if (point.kind === "p") return point.p.toFixed(4);
  const id = point.id === INTERLUDE ? "" : `${point.id}/`;
  return `${id}${point.phase}:${point.t.toFixed(3)}`;
}

/** A point in a file's name: "p0210", "boulogne-dive-0500". */
export function pointFile(point) {
  if (point.kind === "p") return `p${digits(point.p)}`;
  return `${point.id}-${point.phase}-${digits(point.t)}`;
}

// ------------------------------------------------------- the page's map

/**
 * Waits for scene 2's chart (window.__road.ready), its baked layout unless
 * `baked` is false, and with `sea` Boulogne's painting too, where the
 * build has one (window.__road.seaReady): an interlude's points without it
 * show the chart's own dive.
 */
export async function waitForRoad(
  tab,
  { baked = true, sea = false, timeout = 240_000 } = {},
) {
  await tab.waitForFunction(
    ([b, s]) => {
      const r = window.__road;
      if (!r?.ready) return false;
      if (b && !r.baked) return false;
      if (s && "seaReady" in r && !r.seaReady) return false;
      return true;
    },
    [baked, sea],
    { timeout },
  );
}

/**
 * The page's pin (window.__road.pin: `base` screens for p, its whole
 * `length`, each interlude's place in screens from the pin's start), or
 * the old one on a build from before the interludes.
 */
export async function roadPin(tab) {
  const pin = await tab.evaluate(() => window.__road?.pin ?? null);
  return pin ?? { base: SCENE2, length: SCENE2, interludes: [] };
}

/** The interlude a point names, from the page's pin. */
export function interludeOf(pin, point) {
  const span = pin.interludes.find((i) => i.id === point.id);
  if (!span)
    throw new Error(
      `point ${pointName(point)}: no interlude "${point.id}" on this page (it has ${pin.interludes.map((i) => i.id).join(", ") || "none"})`,
    );
  return span;
}

/** The story's p at a point: an interlude holds the story at its own p. */
export function pointP(pin, point) {
  return point.kind === "p" ? point.p : interludeOf(pin, point).at;
}

/** Screens from the pin's start to a point, as the page's map counts them (InterludeScroll). */
export function pointScreens(pin, point) {
  const k = (v) => Math.min(1, Math.max(0, v));
  if (point.kind === "interlude") {
    const s = interludeOf(pin, point);
    const t = k(point.t);
    const offset =
      point.phase === "dive"
        ? t * s.dive
        : point.phase === "hold"
          ? s.dive + t * s.hold
          : s.dive + s.hold + t * s.rise;
    return s.from + offset;
  }
  const q = k(point.p);
  let added = 0;
  for (const s of pin.interludes) {
    if (q <= s.at) break;
    added += s.to - s.from;
  }
  return q * pin.base + added;
}

/** Whether the page leaves the chart undrawn at a point (its interlude's painting covers it). */
export function isCovered(pin, point) {
  if (point.kind !== "interlude") return false;
  const s = interludeOf(pin, point);
  const at = pointScreens(pin, point);
  return at > s.covered[0] && at < s.covered[1];
}

/** Where a scroll of `screens` from the pin's start lies: an interlude's part, or the chart's own scroll. */
export function phaseAt(pin, screens) {
  for (const s of pin.interludes) {
    if (screens < s.from || screens >= s.to) continue;
    const at = screens - s.from;
    const phase = at < s.dive ? "dive" : at < s.dive + s.hold ? "hold" : "rise";
    return { id: s.id, phase };
  }
  return null;
}

/** The page's scroll position (CSS px) of a point, through the page's own map. */
export function scrollForPoint(tab, point) {
  return tab.evaluate(
    ([pt, scene1, scene2]) => {
      const road = window.__road;
      if (pt.kind === "interlude") {
        if (!road?.scrollForInterlude)
          throw new Error(
            "this build has no interludes (window.__road.scrollForInterlude)",
          );
        const y = road.scrollForInterlude(pt.id, pt.phase, pt.t);
        if (!Number.isFinite(y))
          throw new Error(`no interlude "${pt.id}" on this page`);
        return y;
      }
      return road?.scrollFor
        ? road.scrollFor(pt.p)
        : (scene1 + scene2 * pt.p) * window.innerHeight;
    },
    [point, SCENE1, SCENE2],
  );
}

/** Scrolls the page to a point (scrollForPoint), returning the position. */
export async function scrollToPoint(tab, point) {
  const y = await scrollForPoint(tab, point);
  await scrollPageTo(tab, y);
  return y;
}
