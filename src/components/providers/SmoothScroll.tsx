"use client";

import Lenis from "lenis";
import { type ReactNode, useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { DESKTOP_QUERY, REDUCED_MOTION_QUERY } from "@/lib/media";

/**
 * Lenis smooth scrolling, driven by the GSAP ticker so the whole page runs on
 * one clock: in every tick Lenis moves the scroll, ScrollTrigger updates,
 * GSAP renders, and the scenes' canvas draws run last.
 *
 * Only on desktop with motion allowed. The fallback (small or touch screens)
 * and reduced motion get native scrolling and no `lenis` class on <html>.
 * gsap.matchMedia tears Lenis down and rebuilds it when the window crosses
 * the breakpoint or the motion preference changes, and the effect cleanup
 * makes React StrictMode's double mount leave nothing behind.
 */

const SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      { desktop: DESKTOP_QUERY, reduceMotion: REDUCED_MOTION_QUERY },
      (context) => {
        const { desktop, reduceMotion } = context.conditions ?? {};
        if (!desktop || reduceMotion) return;

        const lenis = new Lenis({ autoRaf: false });
        lenis.on("scroll", ScrollTrigger.update);
        const step = (time: number) => lenis.raf(time * 1000);
        // Prioritised, so ScrollTrigger and the canvas draws later in the same
        // tick see this frame's scroll position, not the previous one.
        gsap.ticker.add(step, false, true);
        // Lenis is time-based: GSAP's lag smoothing would make the scroll
        // fall behind after a long frame, so it is off while Lenis runs.
        gsap.ticker.lagSmoothing(0);

        // Lenis re-measures on a debounced ResizeObserver; after a refresh
        // (pin spacing, fonts) it should re-measure at once.
        const onRefresh = () => lenis.resize();
        ScrollTrigger.addEventListener("refresh", onRefresh);

        // Keys scroll natively. A key pressed while Lenis is still easing a
        // wheel scroll would be overridden, so drop that inertia first.
        const onKeyDown = (event: KeyboardEvent) => {
          if (SCROLL_KEYS.has(event.key) && lenis.isScrolling === "smooth") {
            lenis.stop();
            lenis.start();
          }
        };
        window.addEventListener("keydown", onKeyDown, { capture: true });
        window.__lenis = lenis;

        return () => {
          // Remove the driver before destroying: raf() on a destroyed
          // instance mid-animation keeps scrolling and re-adds the class.
          gsap.ticker.remove(step);
          window.removeEventListener("keydown", onKeyDown, { capture: true });
          ScrollTrigger.removeEventListener("refresh", onRefresh);
          gsap.ticker.lagSmoothing(500, 33);
          lenis.destroy();
          if (window.__lenis === lenis) window.__lenis = undefined;
        };
      },
    );
    // revert(), not kill(): kill() would skip the cleanup above.
    return () => mm.revert();
  }, []);

  return children;
}

declare global {
  interface Window {
    /** The active Lenis instance, for debugging and end-to-end tests. */
    __lenis?: Lenis;
  }
}
