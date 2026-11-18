"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import { DESKTOP_QUERY, REDUCED_MOTION_QUERY } from "@/lib/media";
import { restoreKerning } from "./01-dawn/choreography";

/**
 * The card's copy. The published story is scenes 1 and 2, "part one"
 * (the owner, session 43); the scenes' own markers are I and II, so the
 * card says "part", never "chapter".
 */
export const continuedContent = {
  end: "The end of part one",
  title: "To be continued",
  /** Two sentences, a line each. */
  next: [
    "The fleets are in sight of each other off Cape Trafalgar.",
    "The battle itself comes next.",
  ],
} as const;

/**
 * The close of the published story, after scene 2's last frame (the dawn
 * of 21 October, the fleets in sight of each other): a title card in the
 * place and the type of scene 1's opening one (a small line, the title in
 * Bodoni Moda, a caption in Baskervville, lower left), so the story ends
 * as it began. The chart's sea runs into the page's deep sea above it.
 *
 * With motion, as the card comes up, the title's letters draw together from
 * loose and faint, as scene 1's title does, scrubbed by the scroll and fully
 * reversible, and the lines above and below it come in with them; they are
 * whole by the page's end, so the reader always stops on the finished card.
 * With reduced motion, or on the fallback (where the story is hidden and
 * only read aloud), it is simply there: nothing is hidden by CSS, so the
 * card shows even if the script never runs.
 */
export function ToBeContinued() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current;
      const title = section?.querySelector<HTMLElement>("[data-el=title]");
      const lines = section?.querySelectorAll<HTMLElement>("[data-el=line]");
      if (!section || !title || !lines) return;
      const mm = gsap.matchMedia();
      mm.add(
        { desktop: DESKTOP_QUERY, reduceMotion: REDUCED_MOTION_QUERY },
        (context) => {
          const { desktop, reduceMotion } = context.conditions ?? {};
          if (!desktop || reduceMotion) return;
          let split: SplitText | null = null;
          let cancelled = false;
          let resizeTimer = 0;
          // From the card's top entering the window to the page's end: the
          // last screen of scroll, so the card is whole where the reader stops.
          const scrollTrigger = (): ScrollTrigger.Vars => ({
            trigger: title,
            start: "top bottom",
            end: () => ScrollTrigger.maxScroll(window),
            scrub: 0.6,
            invalidateOnRefresh: true,
            // After scene 2's pin (refreshPriority -1), whose spacer moves
            // this card down the page.
            refreshPriority: -2,
          });
          // Words, then letters: the words keep the spaces between them as
          // text (an inline-block letter that is a space has no width), and
          // each word gets its kerning back on its own.
          const splitVars: SplitText.Vars = {
            type: "words,chars",
            tag: "span",
            charsClass: "title-char",
            aria: "auto",
            onSplit: (self) => {
              for (const word of self.words as HTMLElement[])
                restoreKerning(
                  title,
                  Array.from(word.querySelectorAll<HTMLElement>(".title-char")),
                );
              const chars = self.chars as HTMLElement[];
              const mid = (chars.length - 1) / 2;
              // The first frame set on every letter and line now: a
              // staggered tween in a timeline renders only its first
              // target's start before the playhead reaches the others.
              gsap.set(chars, {
                opacity: 0,
                xPercent: (i: number) => (i - mid) * 26,
              });
              gsap.set(lines, { opacity: 0 });
              const tl = gsap.timeline({ scrollTrigger: scrollTrigger() });
              tl.to(
                chars,
                {
                  opacity: 1,
                  xPercent: 0,
                  ease: "power2.out",
                  duration: 0.4,
                  stagger: { amount: 0.16 },
                },
                0,
              );
              tl.to(
                lines,
                {
                  opacity: 1,
                  ease: "sine.inOut",
                  duration: 0.3,
                  stagger: 0.24,
                },
                0.22,
              );
              // Whole for the last fifth of the scroll, before the page ends.
              tl.set({}, {}, 1);
              return tl;
            },
          };
          const resplit = () => split?.split(splitVars);
          const onResize = () => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(resplit, 200);
          };
          document.fonts.ready.then(() => {
            if (cancelled) return;
            context.add(() => {
              split = SplitText.create(title, splitVars);
            });
            document.fonts.addEventListener("loadingdone", resplit);
            window.addEventListener("resize", onResize);
          });
          return () => {
            cancelled = true;
            document.fonts.removeEventListener("loadingdone", resplit);
            window.removeEventListener("resize", onResize);
            window.clearTimeout(resizeTimer);
            split?.revert();
          };
        },
      );
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="continued"
      data-scene="continued"
      aria-labelledby="continued-title"
      className="relative flex flex-1 flex-col justify-end px-[4.6vw] pt-[52vh] pb-[9vh] motion-safe:bg-[linear-gradient(to_bottom,rgba(36,54,61,0)_0,#24363d_10vh,var(--color-deep-sea)_40vh)] motion-reduce:bg-deep-sea motion-reduce:pt-[42vh]"
    >
      <div className="relative max-w-[92vw]">
        <p
          data-el="line"
          className="mb-[1vh] text-[clamp(14px,2vh,21px)] leading-snug text-ink"
        >
          {continuedContent.end}
        </p>
        <h2
          id="continued-title"
          data-el="title"
          className="font-display whitespace-nowrap text-[clamp(44px,8.4vh,134px)] leading-[0.95] font-normal tracking-[-0.01em] text-ink [font-optical-sizing:auto]"
        >
          {continuedContent.title}
        </h2>
        <p
          data-el="line"
          className="mt-[2.8vh] text-[clamp(16px,2.35vh,27px)] leading-[1.45] text-ink"
        >
          {continuedContent.next.map((sentence) => (
            <span key={sentence} className="block text-balance">
              {sentence}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
