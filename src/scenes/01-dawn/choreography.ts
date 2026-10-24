import { gsap } from "@/lib/gsap";

/**
 * Scene 1 choreography. The master timeline has a duration of exactly 1, so
 * a tween's position on it is the scroll progress p at which it starts.
 * See the choreography table in docs/decisions.md.
 */

/** Scroll length of the pin, in viewport heights. */
export const PIN_LENGTH = 3;

/** The composition shown statically for reduced motion. */
export const HERO_P = 0.7;

export interface DawnRefs {
  root: HTMLElement;
}

export function buildDawnTimeline(_refs: DawnRefs): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  // Pad to a duration of exactly 1 so positions read as p.
  tl.set({}, {}, 1);
  return tl;
}
