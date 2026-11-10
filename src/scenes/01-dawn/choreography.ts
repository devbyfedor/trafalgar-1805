import { asEase } from "@/lib/curve";
import { gsap } from "@/lib/gsap";
import { VICTORY_X } from "./composition";

/**
 * Scene 1 choreography. The master timeline lasts exactly 1, so a tween's
 * position on it is the scroll progress p at which it starts. The table this
 * implements is in docs/decisions.md.
 *
 * Rules (from the GSAP skills and the 3.15 source):
 * - absolute numeric positions only; nothing may end after 1;
 * - plain eases only (no easeReverse/yoyoEase: they break scrubbing back);
 * - staggers by `amount`, so the duration never depends on element counts;
 * - transform and opacity on wrappers only; text fades with opacity, never
 *   autoAlpha, so it stays in the accessibility tree;
 * - one owner per property per element: the scroll timeline owns the
 *   wrappers' x and opacity, the idle timeline owns heave, swell and drift.
 */

/** Scroll length of the pin, in viewport heights. */
export const PIN_LENGTH = 3;

/** The composition shown statically for reduced motion. */
export const HERO_P = 0.7;

/**
 * The warm light on Victory's canvas (docs/research/perf-start-of-scroll.md).
 * It is painted into her own compositor layer: given one of its own, the
 * rigging it repaints composites darker under her pitch. So every change of
 * its opacity repaints her whole layer, about 8 ms of the GPU's time, and
 * the first one compiles the programs that draw it. Hence:
 * - it changes in `steps` (a step moves the sails by at most about 1.3
 *   levels of 255), not on every frame;
 * - it stays between `floor` and `ceiling` and never reaches 0 or 1, where
 *   the browser would stop drawing it or draw it another way: drawn one way
 *   from the first paint on, nothing is compiled while scrolling. Neither
 *   bound moves a pixel by a whole level.
 */
export const WARM_LIGHT = {
  floor: 1 / 255,
  ceiling: 254 / 255,
  steps: 24,
} as const;

/** Beats, as p. */
export const P = {
  dawn: 0.05,
  titleIn: 0.06,
  sunrise: 0.45,
  lede: 0.5,
  hero: 0.62,
  handover: 0.76,
  closing: 0.84,
  enemy: 0.78,
} as const;

/** Values the canvas layers read every frame; tweened, never re-allocated. */
export interface DawnFx {
  haze: number;
  frontHaze: number;
  warmth: number;
  lift: number;
  glitter: number;
}

export const createFx = (): DawnFx => ({
  haze: 1,
  frontHaze: 1,
  warmth: 0,
  lift: 0,
  glitter: 0,
});

export interface DawnElements {
  root: HTMLElement;
  q: (selector: string) => HTMLElement[];
  one: (selector: string) => HTMLElement | null;
}

export function collect(root: HTMLElement): DawnElements {
  return {
    root,
    q: (s) => Array.from(root.querySelectorAll<HTMLElement>(s)),
    one: (s) => root.querySelector<HTMLElement>(s),
  };
}

/** Victory's travel, as a fraction of the viewport width (see composition). */
const victoryPath = [
  [0, VICTORY_X.start],
  [0.18, 0.1],
  [0.4, 0.34],
  [P.hero, VICTORY_X.hero],
  [1, VICTORY_X.end],
] as const;
const victoryEase = asEase(victoryPath);

/** The sun disc's centre, in % of its own diameter below (+) the horizon. */
const sunPath = [
  [0.3, 95],
  [P.sunrise, 50], // upper limb on the horizon
  [0.68, -50], // the whole disc clear
  [1, -160],
] as const;
const sunEase = asEase(sunPath);

/** Haze density through the scene. */
const hazePath = [
  [0, 1],
  [P.dawn, 1],
  [0.45, 0.48],
  [0.75, 0.22],
  [1, 0.16],
] as const;
const hazeEase = asEase(hazePath);
const frontHazePath = [
  [0, 1],
  [P.dawn, 0.95],
  [0.4, 0.4],
  [0.7, 0.12],
  [1, 0.08],
] as const;
const frontHazeEase = asEase(frontHazePath);

/**
 * Every scroll-driven beat, at absolute positions. Shared by the scrubbed
 * timeline (desktop) and the static hero frame (reduced motion).
 */
export function buildChoreography(
  tl: gsap.core.Timeline,
  el: DawnElements,
  fx: DawnFx,
): void {
  const { q, one } = el;

  // Scroll cue: gone as soon as scrolling begins.
  tl.fromTo(
    one("[data-el=cue]"),
    { opacity: 1 },
    { opacity: 0, duration: 0.03 },
    0,
  );

  // Sky: stars and moon fade; the dawn gradient fades in and rises.
  tl.fromTo(
    q("[data-el=stars]"),
    { opacity: 1 },
    { opacity: 0, duration: 0.27 },
    0.03,
  );
  tl.fromTo(
    one("[data-el=moon]"),
    { opacity: 0.9, yPercent: 0 },
    { opacity: 0, yPercent: -55, duration: 0.3 },
    0.02,
  );
  tl.fromTo(
    one("[data-el=sky-dawn]"),
    { opacity: 0, yPercent: 12 },
    { opacity: 1, yPercent: 0, ease: "sine.out", duration: 0.55 },
    P.dawn,
  );
  tl.fromTo(
    one("[data-el=clouds-dawn]"),
    { opacity: 0 },
    { opacity: 1, ease: "sine.inOut", duration: 0.48 },
    0.12,
  );

  // Sun: the glow grows first; the disc rises through the horizon.
  tl.fromTo(
    one("[data-el=sun-glow]"),
    { opacity: 0, scale: 0.82 },
    { opacity: 1, scale: 1, ease: "sine.out", duration: 0.45 },
    0.08,
  );
  tl.fromTo(
    one("[data-el=sun-disc]"),
    { yPercent: sunPath[0][1] },
    {
      yPercent: sunPath[sunPath.length - 1][1],
      ease: sunEase,
      duration: 1 - sunPath[0][0],
    },
    sunPath[0][0],
  );
  // Refraction flattens the disc on the horizon; it rounds as it climbs.
  tl.fromTo(
    one("[data-el=sun-low]"),
    { scaleY: 0.88 },
    { scaleY: 1, ease: "sine.out", duration: 0.18 },
    P.sunrise,
  );
  tl.fromTo(
    one("[data-el=sun-high]"),
    { opacity: 0 },
    { opacity: 1, duration: 0.25 },
    0.6,
  );
  tl.fromTo(
    one("[data-el=sun-low]"),
    { opacity: 1 },
    { opacity: 0, duration: 0.24 },
    0.66,
  );
  tl.fromTo(
    q("[data-el=sun-reflection]"),
    { opacity: 0 },
    { opacity: 1, ease: "sine.inOut", duration: 0.27 },
    P.sunrise,
  );

  // Sea: dawn colours, the far strips first (they mirror the sky).
  const strips = q("[data-el=strip-dawn]");
  strips.forEach((s, i) => {
    const start = 0.08 + (i / Math.max(1, strips.length - 1)) * 0.16;
    tl.fromTo(
      s,
      { opacity: 0 },
      { opacity: 1, ease: "sine.inOut", duration: 0.4 },
      start,
    );
  });

  // Haze: thins, warms and lifts.
  tl.fromTo(
    fx,
    { haze: 1 },
    { haze: hazePath[hazePath.length - 1][1], ease: hazeEase, duration: 1 },
    0,
  );
  tl.fromTo(
    fx,
    { frontHaze: 1 },
    {
      frontHaze: frontHazePath[frontHazePath.length - 1][1],
      ease: frontHazeEase,
      duration: 1,
    },
    0,
  );
  tl.fromTo(
    fx,
    { warmth: 0 },
    { warmth: 1, ease: "sine.inOut", duration: 0.55 },
    0.15,
  );
  tl.fromTo(
    fx,
    { lift: 0 },
    { lift: 1, ease: "sine.inOut", duration: 0.75 },
    0.1,
  );
  tl.fromTo(
    fx,
    { glitter: 0 },
    { glitter: 1, ease: "sine.inOut", duration: 0.24 },
    0.48,
  );

  // Victory sails in, out of the haze, into the light.
  const toPercent = (x: number) => (x - VICTORY_X.hero) * 100;
  tl.fromTo(
    one("[data-el=victory]"),
    { xPercent: toPercent(VICTORY_X.start) },
    { xPercent: toPercent(VICTORY_X.end), ease: victoryEase, duration: 1 },
    0,
  );
  tl.fromTo(
    one("[data-el=veil]"),
    { opacity: 0.9 },
    { opacity: 0, ease: "sine.inOut", duration: 0.57 },
    0.03,
  );
  tl.fromTo(
    q("[data-flag]"),
    { opacity: 0.12 },
    { opacity: 1, ease: "sine.inOut", duration: 0.52 },
    0.03,
  );
  const warmIn = gsap.parseEase("sine.inOut");
  tl.fromTo(
    one("[data-el=victory] [data-layer=warm-light]"),
    { opacity: WARM_LIGHT.floor },
    {
      opacity: WARM_LIGHT.ceiling,
      ease: (t: number) =>
        Math.round(warmIn(t) * WARM_LIGHT.steps) / WARM_LIGHT.steps,
      duration: 0.33,
    },
    P.sunrise,
  );

  // The British astern follow her, slower on screen because further off.
  for (const ship of q("[data-el=british]")) {
    const d = Number(ship.dataset.distance) || 2;
    tl.fromTo(
      ship,
      { xPercent: toPercent(VICTORY_X.start) / d },
      {
        xPercent: toPercent(VICTORY_X.end) / d,
        ease: victoryEase,
        duration: 1,
      },
      0,
    );
    tl.fromTo(
      ship,
      { opacity: 0 },
      { opacity: d < 4 ? 0.85 : 0.65, ease: "sine.inOut", duration: 0.3 },
      0.3,
    );
  }

  // The enemy: lights in the dark, then the line itself in four groups.
  tl.fromTo(
    one("[data-el=enemy-lights]"),
    { opacity: 1 },
    { opacity: 0, duration: 0.24 },
    0.04,
  );
  q("[data-el=enemy-group]").forEach((g, i) => {
    tl.fromTo(
      g,
      { opacity: 0 },
      { opacity: 1, ease: "sine.inOut", duration: 0.1 },
      P.enemy + i * 0.045,
    );
  });

  // Text. The h1 is faded with opacity only; its letters assemble separately
  // (see the SplitText tween in the scene).
  tl.fromTo(
    one("[data-el=lede]"),
    { opacity: 0 },
    { opacity: 1, ease: "sine.out", duration: 0.1 },
    P.lede,
  );
  // Not rendered immediately: before the letters are split, the h1 keeps
  // its pre-hydration gate (opacity 0 in motion mode); buildTitle lifts it.
  tl.fromTo(
    one("[data-el=title]"),
    { opacity: 1 },
    { opacity: 0, ease: "sine.in", duration: 0.08, immediateRender: false },
    P.handover + 0.01,
  );
  tl.to(
    one("[data-el=lede]"),
    { opacity: 0, ease: "sine.in", duration: 0.06 },
    P.handover,
  );
  tl.fromTo(
    one("[data-el=closing]"),
    { opacity: 0 },
    { opacity: 1, ease: "sine.out", duration: 0.08 },
    P.closing,
  );

  // Pin the duration to exactly 1, so every position reads as p.
  tl.set({}, {}, 1);
}

/**
 * Splitting wraps each letter in an inline block, which loses the face's
 * kerning ("fa", "ga" and "ar" open up in Bodoni Moda). This measures each
 * letter's kerned position in an unsplit copy of the title, set in the same
 * face, size and optical size, and gives the letters the difference back as
 * left margins, in em so they scale with the title. Call it on fresh letters,
 * before any transform: the measurement belongs to the face that is loaded,
 * which is why the title is re-split when a face finishes loading.
 */
export function restoreKerning(h1: HTMLElement, chars: HTMLElement[]): void {
  if (chars.length < 2) return;
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap";
  probe.textContent = chars.map((c) => c.textContent ?? "").join("");
  h1.append(probe);
  const text = probe.firstChild as Text;
  const range = document.createRange();
  const kerned: number[] = [];
  let index = 0;
  for (const c of chars) {
    range.setStart(text, index);
    range.setEnd(text, index);
    kerned.push(range.getBoundingClientRect().left);
    index += c.textContent?.length ?? 0;
  }
  probe.remove();
  const split = chars.map((c) => c.getBoundingClientRect().left);
  const em = Number.parseFloat(getComputedStyle(h1).fontSize) || 1;
  chars.forEach((c, i) => {
    if (i === 0) return;
    const gap = kerned[i] - kerned[i - 1] - (split[i] - split[i - 1]);
    c.style.marginLeft = `${(gap / em).toFixed(4)}em`;
  });
}

/**
 * The title's letters: they start loosely spaced and faint, as if seen
 * through the haze, and draw into the word from left to right; at the
 * handover they loosen and drift off to the right with the haze.
 */
export function buildTitle(
  tl: gsap.core.Timeline,
  h1: HTMLElement,
  chars: HTMLElement[],
): gsap.core.Timeline {
  const title = gsap.timeline();
  const mid = (chars.length - 1) / 2;
  // The letters carry the visibility from here on; the h1 itself is shown.
  gsap.set(h1, { opacity: 1 });
  title.fromTo(
    chars,
    {
      opacity: 0,
      xPercent: (i: number) => (i - mid) * 26,
    },
    {
      opacity: 1,
      xPercent: 0,
      ease: "power2.out",
      duration: 0.17,
      stagger: { amount: 0.19 },
    },
    0,
  );
  title.to(
    chars,
    {
      opacity: 0,
      xPercent: (i: number) => 14 + i * 7,
      ease: "power1.in",
      duration: 0.05,
      stagger: { amount: 0.03 },
    },
    P.handover - P.titleIn,
  );
  tl.add(title, P.titleIn);
  return title;
}

/**
 * Time-based loops, independent of scroll. Built paused; the scene plays
 * them only while it is on screen and the tab is visible.
 */
export function buildIdle(el: DawnElements): gsap.core.Timeline {
  const { q, one } = el;
  const idle = gsap.timeline({ paused: true });

  // Sea: crests drift left to right by exactly one period per loop.
  for (const loop of q("[data-el=strip-loop]")) {
    const tiles = Number(loop.dataset.tiles) || 1;
    const speed = Number(loop.dataset.speed) || 0.02;
    idle.fromTo(
      loop,
      { xPercent: -100 / tiles },
      { xPercent: 0, duration: 1 / speed, ease: "none", repeat: -1 },
      0,
    );
  }
  // Each strip breathes with the swell, a little out of step with the next.
  for (const swell of q("[data-el=strip-swell]")) {
    const amp = (Number(swell.dataset.swell) || 0.02) * 100;
    const period = Number(swell.dataset.period) || 10;
    const delay = Number(swell.dataset.delay) || 0;
    idle.fromTo(
      swell,
      { yPercent: -amp },
      {
        yPercent: amp,
        duration: period / 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      },
      delay,
    );
  }

  // Victory heaves and pitches with the swell. Crests overtake her from
  // astern, so the stern lifts first (bow down), then she rises, then the
  // bow lifts: pitch leads heave by a quarter period.
  const heave = one("[data-el=heave]");
  const T = 9;
  if (heave) {
    idle.fromTo(
      heave,
      { yPercent: 0.45 },
      {
        yPercent: -0.45,
        duration: T / 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      },
      3.1,
    );
    idle.fromTo(
      heave,
      { rotation: -0.32 },
      {
        rotation: 0.32,
        duration: T / 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      },
      3.1 - T / 4,
    );
  }
  const bow = one("[data-el=victory] [data-layer=bow-wave]");
  if (bow) {
    idle.fromTo(
      bow,
      { scaleX: 0.9, opacity: 0.7 },
      {
        scaleX: 1.06,
        opacity: 1,
        duration: T / 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      },
      3.1 - T / 4,
    );
  }

  // Flags: two wave frames crossfading, and a slow lift and fall of the fly
  // in the light air.
  q("[data-flag]").forEach((flag, i) => {
    const frames = flag.querySelectorAll<HTMLElement>("[data-flag-frame='1']");
    idle.fromTo(
      frames,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 1.7 + i * 0.3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      },
      i * 0.4,
    );
    idle.fromTo(
      flag,
      { skewY: -1.6, scaleX: 0.97 },
      {
        skewY: 2,
        scaleX: 1,
        duration: 2.6 + i * 0.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      },
      0.2 + i * 0.7,
    );
  });

  // The scroll cue's line.
  const cue = one("[data-el=cue-line]");
  if (cue) {
    idle.fromTo(
      cue,
      { yPercent: -110 },
      {
        yPercent: 310,
        duration: 2.2,
        ease: "power1.inOut",
        repeat: -1,
        repeatDelay: 0.5,
      },
      0,
    );
  }

  // Start every loop in its steady state.
  idle.time(60);
  return idle;
}
