"use client";

import { useRef } from "react";
import { reportProgress } from "@/lib/debug";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { DESKTOP_QUERY, isDebug, REDUCED_MOTION_QUERY } from "@/lib/media";
import { buildDawnTimeline, HERO_P, PIN_LENGTH } from "./choreography";
import { dawnContent } from "./content";

/**
 * Scene 1, "Dawn". Pinned for PIN_LENGTH viewport heights and scrubbed by
 * scroll on desktop; a static hero frame for reduced motion; nothing at all
 * in the fallback (small or touch screens), where the scene's text stays
 * available to assistive technology but its art is not rendered.
 */
export function Scene01Dawn() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(
        { desktop: DESKTOP_QUERY, reduceMotion: REDUCED_MOTION_QUERY },
        (context) => {
          const { desktop, reduceMotion } = context.conditions ?? {};
          if (!desktop) return;
          const tl = buildDawnTimeline({ root: el });
          if (reduceMotion) {
            tl.progress(HERO_P);
            return;
          }
          ScrollTrigger.create({
            id: "dawn",
            trigger: el,
            start: "top top",
            end: () => `+=${window.innerHeight * PIN_LENGTH}`,
            pin: true,
            anticipatePin: 1,
            scrub: true,
            invalidateOnRefresh: true,
            animation: tl,
            markers: isDebug(),
            onUpdate: (self) => reportProgress("dawn", self.progress),
          });
        },
      );
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="dawn"
      data-scene="dawn"
      aria-labelledby="dawn-title"
      className="relative h-screen w-full overflow-hidden bg-night"
    >
      <div
        aria-hidden="true"
        data-layer="art"
        className="absolute inset-0 fallback:hidden"
      />
      <div data-layer="text" className="absolute inset-0">
        <p className="absolute top-[4.5vh] left-[4.5vw] text-[clamp(13px,1.85vh,17px)]">
          {dawnContent.chapter}
        </p>
        <div className="absolute bottom-[6vh] left-[4.5vw] max-w-[min(34em,62vw)]">
          <p className="text-[clamp(13px,1.85vh,17px)]">
            {dawnContent.dateline}
          </p>
          <h1
            id="dawn-title"
            className="font-display text-[clamp(56px,10.5vh,168px)] leading-[0.95] tracking-[-0.01em]"
          >
            {dawnContent.title}
          </h1>
          <p className="text-[clamp(16px,2.35vh,23px)] leading-[1.45]">
            {dawnContent.lede}
          </p>
        </div>
        <p className="absolute bottom-[3.5vh] left-1/2 -translate-x-1/2 text-[clamp(12px,1.6vh,14px)]">
          {dawnContent.scrollCue}
        </p>
      </div>
    </section>
  );
}
