"use client";

import { useRef } from "react";
import { GlitterRenderer } from "@/components/fx/glitter";
import { HazeRenderer } from "@/components/fx/haze";
import { reportProgress } from "@/lib/debug";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import { DESKTOP_QUERY, isDebug, REDUCED_MOTION_QUERY } from "@/lib/media";
import { HANDOFF_LENGTH } from "../handoff";
import {
  buildChoreography,
  buildIdle,
  buildTitle,
  collect,
  createFx,
  type DawnElements,
  type DawnFx,
  HERO_P,
  PIN_LENGTH,
  restoreKerning,
} from "./choreography";
import { BACK_STRIPS, FRONT_STRIPS, HORIZON, SUN_X } from "./composition";
import {
  asternWaterline,
  BRITISH_ASTERN,
  BritishShip,
  EnemyFleet,
} from "./layers/Fleets";
import { SeaBack, SeaFront } from "./layers/Sea";
import { Sky } from "./layers/Sky";
import { Sun } from "./layers/Sun";
import { TextOverlay } from "./layers/TextOverlay";
import { Victory } from "./layers/Victory";

/**
 * Scene 1, "Dawn". On desktop it is pinned for PIN_LENGTH viewport heights
 * and scrubbed by scroll; with reduced motion it shows the hero frame
 * (p = HERO_P) statically; in the fallback (small or touch screens) it
 * creates nothing, and its text stays available to assistive technology
 * while its art is not rendered.
 *
 * Its pin runs on for HANDOFF_LENGTH more viewport heights, holding its last
 * frame, while scene 2's pinned chart takes over underneath it (scenes/
 * handoff.ts): its wrapper stacks above scene 2's for that.
 */

/** The pin's whole scroll, the handoff included, in viewport heights. */
const PIN_SCROLL = PIN_LENGTH + HANDOFF_LENGTH;

interface FxRenderers {
  resize: () => void;
  draw: (time: number) => void;
  destroy: () => void;
}

function createRenderers(el: DawnElements, fx: DawnFx): FxRenderers | null {
  const back = el.one("[data-el=haze-back]") as HTMLCanvasElement | null;
  const front = el.one("[data-el=haze-front]") as HTMLCanvasElement | null;
  const glint = el.one("[data-el=glitter]") as HTMLCanvasElement | null;
  if (!back || !front || !glint) return null;
  const hazeBack = new HazeRenderer(back, {
    seed: 21,
    count: 26,
    band: { center: HORIZON - 0.01, spread: 0.07 },
    size: [0.3, 0.7],
    drift: [0.004, 0.011],
    alpha: 0.5,
    lift: 0.1,
    coolColor: "#8c98a4",
    warmColor: "#e9d6b8",
  });
  const hazeFront = new HazeRenderer(front, {
    seed: 22,
    count: 30,
    band: { center: 0.57, spread: 0.17 },
    size: [0.32, 0.8],
    drift: [0.006, 0.016],
    alpha: 0.5,
    lift: 0.16,
    leftBias: 0.9,
    coolColor: "#8c98a4",
    warmColor: "#e9d6b8",
  });
  const glitter = new GlitterRenderer(glint, {
    seed: 23,
    count: 320,
    color: "#ffe8c2",
    halfWidthTop: 0.03,
    halfWidthBottom: 0.42,
  });
  const resize = () => {
    hazeBack.resize(back.clientWidth, back.clientHeight);
    hazeFront.resize(front.clientWidth, front.clientHeight);
    glitter.resize(glint.clientWidth, glint.clientHeight);
  };
  const draw = (time: number) => {
    hazeBack.setDensity(fx.haze);
    hazeBack.setWarmth(fx.warmth);
    hazeBack.setLift(fx.lift);
    hazeFront.setDensity(fx.frontHaze);
    hazeFront.setWarmth(fx.warmth);
    hazeFront.setLift(fx.lift);
    glitter.setIntensity(fx.glitter);
    hazeBack.draw(time);
    hazeFront.draw(time);
    glitter.draw(time);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(el.root);
  resize();
  return {
    resize,
    draw,
    destroy: () => {
      observer.disconnect();
      hazeBack.clear();
      hazeFront.clear();
      glitter.clear();
    },
  };
}

export function Scene01Dawn() {
  const wrapper = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      const outer = wrapper.current;
      if (!el || !outer) return;
      const mm = gsap.matchMedia();
      mm.add(
        { desktop: DESKTOP_QUERY, reduceMotion: REDUCED_MOTION_QUERY },
        (context) => {
          const { desktop, reduceMotion } = context.conditions ?? {};
          if (!desktop) return;
          const els = collect(el);
          const fx = createFx();

          if (reduceMotion) {
            // The hero frame, statically: no pin, no scrub, no loops.
            const tl = gsap.timeline({
              paused: true,
              defaults: { ease: "none" },
            });
            buildChoreography(tl, els, fx);
            tl.progress(HERO_P);
            const renderers = createRenderers(els, fx);
            renderers?.draw(30);
            return () => renderers?.destroy();
          }

          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              id: "dawn",
              trigger: el,
              start: "top top",
              end: () => `+=${window.innerHeight * PIN_SCROLL}`,
              pin: true,
              pinSpacing: true,
              anticipatePin: 1,
              scrub: 0.6,
              invalidateOnRefresh: true,
              markers: isDebug(),
              // The scene's own p: it reaches 1 where the handoff begins.
              onUpdate: (self) =>
                reportProgress(
                  "dawn",
                  Math.min(1, (self.progress * PIN_SCROLL) / PIN_LENGTH),
                ),
            },
          });
          buildChoreography(tl, els, fx);
          // An empty tail through the handoff, so p still maps to the same
          // scroll as before: the scene holds its last frame.
          tl.set({}, {}, PIN_SCROLL / PIN_LENGTH);

          // The title's letters, split once fonts are ready and split again
          // whenever a face finishes loading later or the window is resized:
          // the letters carry kerning measured with the face and size in use
          // (restoreKerning). SplitText's autoSplit only watches fonts and
          // width for line splits, so these re-splits are wired here. A
          // re-split rebuilds the title tween at the same playhead.
          const title = els.one("[data-el=title]");
          let split: SplitText | null = null;
          let cancelled = false;
          let resizeTimer = 0;
          const splitVars: SplitText.Vars = {
            type: "chars",
            tag: "span",
            charsClass: "title-char",
            aria: "auto",
            onSplit: (self) => {
              if (!title) return;
              const chars = self.chars as HTMLElement[];
              restoreKerning(title, chars);
              return buildTitle(tl, title, chars);
            },
          };
          const resplit = () => split?.split(splitVars);
          const onResize = () => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(resplit, 200);
          };
          document.fonts.ready.then(() => {
            if (cancelled || !title) return;
            context.add(() => {
              split = SplitText.create(title, splitVars);
            });
            document.fonts.addEventListener("loadingdone", resplit);
            window.addEventListener("resize", onResize);
          });

          // Idle loops and canvas draws run only while the scene is on screen
          // and the tab is visible.
          const idle = buildIdle(els);
          const renderers = createRenderers(els, fx);
          let inView = false;
          let running = false;
          let pending: gsap.Callback | null = null;
          const apply = () => {
            pending = null;
            running = inView && !document.hidden;
            if (running) idle.play();
            else idle.pause();
          };
          ScrollTrigger.create({
            trigger: outer,
            start: "top bottom",
            end: "bottom top",
            onToggle: (self) => {
              inView = self.isActive;
              apply();
            },
            onRefresh: (self) => {
              inView = self.isActive;
              apply();
            },
          });
          // After a hidden tab the root clock jumps (lag smoothing is off for
          // Lenis); resuming from a one-shot ticker callback avoids the jump.
          const onVisibility = () => {
            if (document.hidden) apply();
            else if (!pending) pending = gsap.ticker.add(apply, true);
          };
          document.addEventListener("visibilitychange", onVisibility);
          const draw = (time: number) => {
            if (running) renderers?.draw(time);
          };
          gsap.ticker.add(draw);

          return () => {
            cancelled = true;
            document.fonts.removeEventListener("loadingdone", resplit);
            window.removeEventListener("resize", onResize);
            window.clearTimeout(resizeTimer);
            document.removeEventListener("visibilitychange", onVisibility);
            if (pending) gsap.ticker.remove(pending);
            gsap.ticker.remove(draw);
            renderers?.destroy();
          };
        },
      );
      return () => mm.revert();
    },
    { scope: root },
  );

  // Ships of the British column astern, slotted into the back sea at their
  // depth: in front of every strip whose surface is further away.
  const after: Record<string, React.ReactNode[]> = {};
  for (const ship of BRITISH_ASTERN) {
    const wl = asternWaterline(ship.distance);
    const host = [...BACK_STRIPS].reverse().find((s) => s.top < wl - 2);
    if (!host) continue;
    after[host.id] ??= [];
    after[host.id].push(<BritishShip key={ship.id} ship={ship} />);
  }

  return (
    <div ref={wrapper} data-scene-wrapper="dawn" className="relative z-[2]">
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
        >
          <Sky />
          <Sun />
          <EnemyFleet />
          <canvas
            data-el="haze-back"
            className="absolute inset-0 h-full w-full"
          />
          <SeaBack strips={BACK_STRIPS} after={after} />
          <Victory />
          <SeaFront strips={FRONT_STRIPS} />
          <canvas
            data-el="haze-front"
            className="absolute inset-0 h-full w-full"
          />
          <canvas
            data-el="glitter"
            className="absolute bottom-0"
            style={{
              left: `calc(${SUN_X * 100}% - 18vh)`,
              width: "36vh",
              top: `${HORIZON * 100}vh`,
            }}
          />
        </div>
        <TextOverlay />
      </section>
    </div>
  );
}
