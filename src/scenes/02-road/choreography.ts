import { DAWN_HANDOFF } from "../handoff";
import { BEATS, CAPTIONS } from "./beats";
import type { RoadCaption } from "./content";
import { CHAPTER_SCRIM, DEEP_SCRIM, type ScrimRun } from "./ink";

/**
 * Scene 2's HTML through the scroll: the handoff from scene 1's frame, the
 * chapter marker, the captions and the date line. The timeline lasts
 * exactly 1, so a tween's position is the scene's progress p (the beat
 * table is in beats.ts). The chart itself is not tweened here: the director
 * turns p into its state every frame.
 *
 * Rules as scene 1's: absolute positions only, nothing ends after 1; text
 * moves by opacity only, never autoAlpha, so it stays in the accessibility
 * tree; one owner per property per element (scene 2 owns the scene 1
 * wrappers listed in DAWN_HANDOFF, which scene 1's own timeline never
 * touches).
 */

export interface RoadElements {
  root: HTMLElement;
  one: (selector: string) => HTMLElement | null;
  q: (selector: string) => HTMLElement[];
}

export function collect(root: HTMLElement): RoadElements {
  return {
    root,
    one: (s) => root.querySelector<HTMLElement>(s),
    q: (s) => Array.from(root.querySelectorAll<HTMLElement>(s)),
  };
}

/** Scene 1's elements for the handoff, or empty lists when it is absent. */
export function dawnElements(): {
  section: HTMLElement | null;
  layers: HTMLElement[];
  text: HTMLElement[];
  victory: HTMLElement | null;
} {
  const section = document.querySelector<HTMLElement>(DAWN_HANDOFF.section);
  const inSection = (s: string) =>
    section ? Array.from(section.querySelectorAll<HTMLElement>(s)) : [];
  return {
    section,
    layers: DAWN_HANDOFF.layers.flatMap(inSection),
    text: DAWN_HANDOFF.text.flatMap(inSection),
    victory: inSection(DAWN_HANDOFF.victory)[0] ?? null,
  };
}

/** Every scroll-driven beat of the HTML, at absolute positions. */
export function buildRoadChoreography(
  tl: gsap.core.Timeline,
  el: RoadElements,
  dawn: ReturnType<typeof dawnElements>,
): void {
  const { one } = el;

  // Beat 0. Scene 1's painted layers fade over the chart, which shows the
  // same horizon, sky and sun, while the camera holds still; its own
  // Victory stays (the director moves her onto her glyph). Scene 1's text
  // gives way to scene 2's chapter marker in the same place.
  if (dawn.layers.length) {
    tl.fromTo(
      dawn.layers,
      { opacity: 1 },
      { opacity: 0, ease: "sine.inOut", duration: 0.021 },
      0.002,
    );
  }
  if (dawn.section) {
    tl.fromTo(
      dawn.section,
      { backgroundColor: "rgba(30, 42, 58, 1)" },
      { backgroundColor: "rgba(30, 42, 58, 0)", duration: 0.021 },
      0.002,
    );
  }
  if (dawn.text.length) {
    tl.fromTo(
      dawn.text,
      { opacity: 1 },
      { opacity: 0, ease: "sine.in", duration: 0.012 },
      0,
    );
  }
  tl.fromTo(
    one("[data-el=chapter]"),
    { opacity: 0 },
    { opacity: 1, ease: "sine.out", duration: 0.012 },
    0.008,
  );

  // Soft scrims where the text would stand on bright ground (ink.ts): the
  // card's deeper one and the chapter marker's.
  const scrimRuns = (el: HTMLElement | null, runs: readonly ScrimRun[]) => {
    if (!el) return;
    for (const [a, b, c, d, strength = 1] of runs) {
      tl.fromTo(
        el,
        { opacity: 0 },
        {
          opacity: strength,
          ease: "sine.inOut",
          duration: b - a,
          immediateRender: false,
        },
        a,
      );
      // A run that lasts to the end stays.
      if (c < 1)
        tl.to(el, { opacity: 0, ease: "sine.inOut", duration: d - c }, c);
    }
  };
  scrimRuns(one("[data-el=scrim-deep]"), DEEP_SCRIM);
  // The chapter marker's scrim follows its curve, key to key.
  const chapterScrim = one("[data-el=scrim-chapter]");
  if (chapterScrim)
    for (let i = 0; i + 1 < CHAPTER_SCRIM.length; i++) {
      const [p0, o0] = CHAPTER_SCRIM[i];
      const [p1, o1] = CHAPTER_SCRIM[i + 1];
      if (p1 <= p0) continue;
      tl.fromTo(
        chapterScrim,
        { opacity: o0 },
        {
          opacity: o1,
          ease: "none",
          duration: p1 - p0,
          immediateRender: false,
        },
        p0,
      );
    }

  // The date line holds its place from Boulogne on; its text runs with the
  // story (the scene writes it each frame).
  tl.fromTo(
    one("[data-el=dateline]"),
    { opacity: 0 },
    { opacity: 1, ease: "sine.out", duration: 0.012 },
    BEATS.boulogne[0] + 0.07,
  );

  // Captions: in once the beat's camera has settled, out before the next.
  for (const [id, [a, b, c, d]] of Object.entries(CAPTIONS) as [
    RoadCaption,
    readonly [number, number, number, number],
  ][]) {
    const caption = one(`[data-caption=${id}]`);
    if (!caption) continue;
    tl.fromTo(
      caption,
      { opacity: 0 },
      { opacity: 1, ease: "sine.out", duration: b - a },
      a,
    );
    tl.to(caption, { opacity: 0, ease: "sine.in", duration: d - c }, c);
  }

  // Pin the duration to exactly 1, so every position reads as p.
  tl.set({}, {}, 1);
}
