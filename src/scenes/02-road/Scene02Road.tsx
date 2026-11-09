"use client";

import { useRef, useState } from "react";
import { registerChartReadout, reportProgress } from "@/lib/debug";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { DESKTOP_QUERY, isDebug, REDUCED_MOTION_QUERY } from "@/lib/media";
import { HANDOFF_LENGTH } from "../handoff";
import { dateLineAt, PIN_LENGTH } from "./beats";
import { buildRoadChoreography, collect, dawnElements } from "./choreography";
import { RoadStills } from "./layers/RoadStills";
import { RoadText } from "./layers/RoadText";
import type { RoadStage } from "./stage";

/**
 * Scene 2, "The road to Trafalgar": the sea chart, pinned and scrubbed by
 * scroll (docs/scene-02-brief.md; docs/decisions.md, "Scene 2, Stage B").
 *
 * On desktop with motion, its pin starts where scene 1's p reaches 1 (the
 * wrapper is pulled up over scene 1's extended pin), so both stages are
 * pinned through the handoff, scene 1 on top. The chart loads as its own
 * chunk while scene 1 plays, in idle time, compiles and draws one hidden
 * frame, and renders from gsap.ticker only while scene 2 is on screen and
 * the tab is visible. With reduced motion, or where WebGL fails, the scene
 * is a sequence of stills with their captions. In the fallback (small or
 * touch screens) it creates nothing and loads nothing.
 */

type Mode = "chart" | "stills" | "stacked" | "none";

/** Waits for the browser to be idle, or `timeout` ms at most. */
function idle(timeout: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => resolve(), { timeout });
      signal.addEventListener("abort", () => {
        window.cancelIdleCallback(id);
        resolve();
      });
    } else setTimeout(resolve, Math.min(timeout, 300));
  });
}

export function Scene02Road() {
  const wrapper = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("none");
  // The scene's progress, for the stills when the chart can't run.
  const progress = useRef(0);
  const readProgress = useRef(() => progress.current).current;

  useGSAP(
    () => {
      const el = root.current;
      const outer = wrapper.current;
      const canvasHost = host.current;
      if (!el || !outer || !canvasHost) return;
      const mm = gsap.matchMedia();
      mm.add(
        { desktop: DESKTOP_QUERY, reduceMotion: REDUCED_MOTION_QUERY },
        (context) => {
          const { desktop, reduceMotion } = context.conditions ?? {};
          if (!desktop) return;
          if (reduceMotion) {
            // Stills, stacked with their captions: no pin, no chart.
            setMode("stacked");
            return () => setMode("none");
          }
          setMode("chart");

          // Pinned from where scene 1's choreography ends: the wrapper
          // overlaps scene 1's extended pin by its handoff and its own
          // viewport height.
          outer.style.marginTop = `calc(${-(1 + HANDOFF_LENGTH) * 100}vh)`;
          const els = collect(el);
          const dawn = dawnElements();
          const state = {
            get p() {
              return progress.current;
            },
            set p(value: number) {
              progress.current = value;
            },
          };
          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              id: "road",
              trigger: el,
              start: "top top",
              end: () => `+=${window.innerHeight * PIN_LENGTH}`,
              pin: true,
              pinSpacing: true,
              anticipatePin: 1,
              scrub: 0.6,
              invalidateOnRefresh: true,
              refreshPriority: -1,
              markers: isDebug(),
              onUpdate: (self) => reportProgress("road", self.progress),
            },
          });
          tl.fromTo(state, { p: 0 }, { p: 1, duration: 1 }, 0);
          buildRoadChoreography(tl, els, dawn);

          // The date line's text runs with the story.
          const dateline = els.one("[data-el=dateline]");
          let shownDate = "";
          const writeDate = () => {
            const text = dateLineAt(state.p) || " ";
            if (text !== shownDate && dateline) {
              dateline.textContent = text;
              shownDate = text;
            }
          };

          // Draw from just before the pin until the wrapper leaves the screen,
          // and while the scrub is still settling after it.
          let near = false;
          ScrollTrigger.create({
            trigger: outer,
            start: "top 12%",
            end: "bottom top",
            onToggle: (self) => {
              near = self.isActive;
            },
            onRefresh: (self) => {
              near = self.isActive;
            },
          });

          const controller = new AbortController();
          let stage: RoadStage | null = null;
          let render: ((time: number) => void) | null = null;
          let unregister = () => {};
          let drawn = -1;
          const observer = new ResizeObserver(() => {
            stage?.resize(canvasHost.clientWidth, canvasHost.clientHeight);
            drawn = -1;
          });
          const canvas = document.createElement("canvas");
          canvas.className = "absolute inset-0 block h-full w-full";
          canvasHost.append(canvas);

          const start = async () => {
            // Scene 1 first: the chart loads once the page is idle.
            await idle(2500, controller.signal);
            if (controller.signal.aborted) return;
            const { createRoadStage } = await import("./stage");
            if (controller.signal.aborted) return;
            const query = new URLSearchParams(window.location.search);
            const quality = query.get("quality");
            stage = await createRoadStage({
              canvas,
              signal: controller.signal,
              quality: quality === null ? undefined : Number(quality),
              onFatal: () => setMode("stills"),
            });
            if (controller.signal.aborted) {
              stage.dispose();
              stage = null;
              return;
            }
            stage.director.setPainted(dawn.victory);
            observer.observe(canvasHost);
            stage.resize(canvasHost.clientWidth, canvasHost.clientHeight);
            stage.director.apply(state.p);
            await stage.chart.warm();
            if (controller.signal.aborted) return;
            const s = stage;
            let drawing = false;
            // Held while a bench draws its own frames (development).
            let held = false;
            render = (time: number) => {
              if (held) return;
              writeDate();
              // Draw while on screen, and off screen only while the scrub is
              // still settling (scrolled back past the start, scene 1's
              // Victory is handed back whole; past the end, the last frame
              // holds and nothing more is drawn).
              drawing = (near || state.p !== drawn) && !document.hidden;
              if (!drawing) return;
              s.draw(state.p, time);
              drawn = state.p;
            };
            gsap.ticker.add(render);
            // Readouts while scene 2 is on screen (or about to be).
            unregister = registerChartReadout(() =>
              near && drawing ? s.chart.stats : null,
            );
            window.__road = {
              ready: true,
              stats: s.chart.stats,
              sample: (p: number, mode?: number) => s.sample(p, mode),
              siteView: (p: number, lon: number, lat: number) =>
                s.siteView(p, lon, lat),
              waterLift: (p: number) => {
                drawn = -1;
                return s.waterLift(p);
              },
              clash: (p: number, ink?: number) => {
                drawn = -1;
                return s.clash(p, ink);
              },
              glyphNames: () => s.glyphNames(),
              layoutDebug: (p: number) => {
                drawn = -1;
                return s.layoutDebug(p);
              },
              bench: async (frames: number, p: number, alternate?: string) => {
                held = true;
                try {
                  return await s.bench(frames, p, alternate);
                } finally {
                  held = false;
                  drawn = -1;
                }
              },
            };
          };
          start().catch((error: unknown) => {
            if (controller.signal.aborted) return;
            console.error("scene 2:", error);
            setMode("stills");
          });
          const onVisibility = () => stage?.chart.pause();
          document.addEventListener("visibilitychange", onVisibility);

          return () => {
            controller.abort();
            if (render) gsap.ticker.remove(render);
            document.removeEventListener("visibilitychange", onVisibility);
            observer.disconnect();
            unregister();
            stage?.dispose();
            stage = null;
            canvas.remove();
            outer.style.marginTop = "";
            window.__road = undefined;
            setMode("none");
          };
        },
      );
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={wrapper} data-scene-wrapper="road" className="relative z-[1]">
      <section
        ref={root}
        id="road"
        data-scene="road"
        aria-labelledby="road-title"
        className="relative h-screen w-full overflow-hidden bg-deep-sea motion-reduce:hidden"
      >
        <div
          ref={host}
          aria-hidden="true"
          data-layer="chart"
          className="absolute inset-0 fallback:hidden"
        />
        {mode === "stills" ? (
          <RoadStills variant="crossfade" showImages progress={readProgress} />
        ) : null}
        <RoadText />
      </section>
      <RoadStills variant="stacked" showImages={mode === "stacked"} />
    </div>
  );
}

declare global {
  interface Window {
    /** Scene 2's chart, for the end-to-end tests. */
    __road?: {
      ready: boolean;
      stats: import("@/components/chart").ChartStats;
      /** Draws the scene at p and reads back its glyphs (RoadStage.sample). */
      sample: (
        p: number,
        mode?: number,
      ) => { fleets: Float32Array; squadrons: Float32Array };
      /** Development: a site's place in the frame at p (RoadStage.siteView). */
      siteView: (
        p: number,
        lon: number,
        lat: number,
      ) => {
        x: number;
        y: number;
        dist: number;
        sinElev: number;
        pxPerRad: number;
      };
      /** Development: every water pixel's height above the sea at p (RoadStage.waterLift). */
      waterLift: (
        p: number,
      ) => import("@/components/chart/terrain/liftProbe").WaterLift;
      /**
       * Development and tests: every glyph's ink on land or on another
       * glyph's at p (RoadStage.clash).
       */
      clash: (
        p: number,
        ink?: number,
      ) => import("@/components/chart/glyphs/clash").ClashResult;
      /** Development: each glyph layer's ships by name, in mark order. */
      glyphNames: () => string[][];
      /** Development: each squadron's layout at p (RoadStage.layoutDebug). */
      layoutDebug: (p: number) => Record<string, unknown>[];
      /**
       * Development: frames at p timed on the GPU and the CPU; with
       * `alternate`, the chart's objects of that name drawn on even frames
       * only (RoadStage.bench).
       */
      bench: (
        frames: number,
        p: number,
        alternate?: string,
      ) => Promise<import("@/components/chart/engine/bench").BenchResult>;
    };
  }
}
