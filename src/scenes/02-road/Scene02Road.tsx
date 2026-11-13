"use client";

import { type ComponentType, useRef, useState } from "react";
import { chartContext } from "@/components/chart/engine/context";
import { chartPixelRatio } from "@/components/chart/engine/quality";
import { registerChartReadout, reportProgress } from "@/lib/debug";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { DESKTOP_QUERY, isDebug, REDUCED_MOTION_QUERY } from "@/lib/media";
import {
  type InterludePhase,
  InterludeScroll,
  type InterludeState,
} from "../alive/interlude";
import { HANDOFF_LENGTH } from "../handoff";
import { dateLineAt, PIN_LENGTH } from "./beats";
import type { SeaViewHandle, SeaViewProps } from "./boulogne-sea/handle";
import { buildRoadChoreography, collect, dawnElements } from "./choreography";
import {
  BOULOGNE,
  CHART_BACK,
  coveredAt,
  coveredSpan,
  ROAD_INTERLUDES,
  SEA_EYE,
  SEA_HOLD,
  type SeaPose,
  SHORE_AHEAD,
  textAt,
} from "./interludes";
import { RoadStills } from "./layers/RoadStills";
import { RoadText } from "./layers/RoadText";
import type { RoadStage } from "./stage";

/**
 * The scene's scroll (scenes/alive/interlude.ts): p over PIN_LENGTH
 * screens as before, and Boulogne's interlude inserted at its p with its
 * own screens; every other moment lands on the same p as before.
 */
const SCROLL = new InterludeScroll(PIN_LENGTH, ROAD_INTERLUDES);
/** Where Boulogne's painting covers the chart, screens from the interlude's start. */
const COVERED = coveredSpan(BOULOGNE);

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
  // Boulogne's painting (boulogne-sea/), loaded once the chart is ready, in
  // chart mode only: phones and reduced motion never load it.
  const [Sea, setSea] = useState<ComponentType<SeaViewProps> | null>(null);
  const sea = useRef<SeaViewHandle | null>(null);
  const onSeaReady = useRef((handle: SeaViewHandle | null) => {
    sea.current = handle;
  }).current;

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
          // The story's timeline: p as its time (every tween at its p), not
          // scrolled itself but set to the p of each scroll position
          // (SCROLL.pAt), so every moment outside an interlude shows exactly
          // what it showed when the timeline was the scroll's own.
          const tl = gsap.timeline({
            paused: true,
            defaults: { ease: "none" },
          });
          tl.fromTo(state, { p: 0 }, { p: 1, duration: 1 }, 0);
          buildRoadChoreography(tl, els, dawn);
          // The scroll, scrubbed as before, drives a share of the pin; its
          // screen gives p and, inside an interlude, where that runs.
          const lude: InterludeState = {
            spec: BOULOGNE,
            phase: "dive",
            t: 0,
            u: 0,
            screens: 0,
          };
          let inLude: InterludeState | null = null;
          const drive = { q: 0 };
          // The share of the pin is the driver's own time, never drive.q:
          // GSAP rounds a plain tweened number to six decimals (gsap-core,
          // _renderPlain), and over the pin's 34.8 screens that moved p by
          // up to 6e-7, enough to tip the story's p (rounded to six
          // decimals by its own tween) onto the next step and shift the
          // flying camera by a fraction of a pixel (session 26, look-diff
          // against the build before the interlude).
          const follow = () => {
            const screens = driver.time() * SCROLL.length;
            inLude = SCROLL.interludeAt(screens, lude);
            tl.time(SCROLL.pAt(screens));
          };
          const driver = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              id: "road",
              trigger: el,
              start: "top top",
              end: () => `+=${window.innerHeight * SCROLL.length}`,
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
          driver.fromTo(
            drive,
            { q: 0 },
            { q: 1, duration: 1, onUpdate: follow },
            0,
          );
          follow();
          // The page's scroll position (CSS px) of a screen of the pin.
          const scrollAt = (screens: number) =>
            (driver.scrollTrigger?.start ?? 0) + screens * window.innerHeight;

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
          // A new viewport bakes the glyph layout's tables anew, once it
          // has settled (the observer's first call, on the same size, does
          // not).
          let rebake = 0;
          let size = "";
          const sizeKey = () =>
            `${canvasHost.clientWidth}x${canvasHost.clientHeight}@${window.devicePixelRatio}`;
          const observer = new ResizeObserver(() => {
            if (sizeKey() === size) return;
            size = sizeKey();
            stage?.resize(canvasHost.clientWidth, canvasHost.clientHeight);
            drawn = -1;
            window.clearTimeout(rebake);
            if (window.__road) window.__road.baked = false;
            rebake = window.setTimeout(
              () =>
                void stage?.bake().then((done) => {
                  if (done && window.__road) window.__road.baked = true;
                }),
              400,
            );
          });
          const canvas = document.createElement("canvas");
          canvas.className = "absolute inset-0 block h-full w-full";
          canvasHost.append(canvas);
          // The canvas at the size the chart will draw at, and its context
          // made now, while the page loads: making it waits on the GPU 15 to
          // 190 ms, which nothing can slice, and a context resized after it
          // was made reallocated its multisampled buffer in another long task
          // (docs/research/perf-start-of-scroll.md). The chart itself loads
          // later, in idle time.
          const query = new URLSearchParams(window.location.search);
          const quality = query.get("quality");
          const dpr = chartPixelRatio(quality === null ? 0 : Number(quality));
          canvas.width = Math.floor(canvasHost.clientWidth * dpr);
          canvas.height = Math.floor(canvasHost.clientHeight * dpr);
          const gl = chartContext(canvas) ?? undefined;

          const start = async () => {
            // Scene 1 first: the chart loads once the page is idle.
            await idle(2500, controller.signal);
            if (controller.signal.aborted) return;
            const { createRoadStage } = await import("./stage");
            // The chunk's evaluation and the stage's start in tasks of their
            // own (together, one of 47 to 128 ms).
            await idle(500, controller.signal);
            if (controller.signal.aborted) return;
            stage = await createRoadStage({
              canvas,
              context: gl,
              labels: canvasHost,
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
            size = sizeKey();
            stage.resize(canvasHost.clientWidth, canvasHost.clientHeight);
            const warmed = state.p;
            stage.director.apply(warmed);
            await stage.chart.warm(controller.signal);
            if (controller.signal.aborted) return;
            // Nothing to draw for this p while the chart is hidden: the first
            // frame is drawn once it comes near (the scroll may have moved on
            // while it warmed in idle slices).
            drawn = warmed;
            const s = stage;
            const baking = () =>
              s.bake().then((done) => {
                if (done && window.__road) window.__road.baked = true;
              });
            void baking();
            let drawing = false;
            // Held while a bench draws its own frames (development).
            let held = false;
            // The painting's pose, written by the interlude's camera.
            const pose: SeaPose = { ...SEA_HOLD };
            // Whether the painting covers the chart, so it isn't drawn.
            let covered = false;
            // The text steps aside while the chart turns into the painting
            // and back (interludes.ts, textAt); over the painting the
            // chapter marker reads without its scrim (the painting's sky is
            // dark enough there), so the scrim is hidden while it covers.
            const textLayer =
              el.querySelector<HTMLElement>("[data-layer=text]");
            const chapterScrim = el.querySelector<HTMLElement>(
              "[data-el=scrim-chapter]",
            );
            let textShown = 1;
            let scrimHidden = false;
            render = (time: number) => {
              if (held) return;
              writeDate();
              // Inside an interlude, its camera for the chart and the
              // painting alike (at its very first screen, the chart's own
              // frame at p).
              const at = inLude;
              const view =
                at && at.screens > 0
                  ? s.interlude(at.phase, at.t, pose)
                  : undefined;
              const painting = sea.current;
              painting?.frame(state.p, at, view ? view.u : 0, pose, time);
              const painted = view !== undefined && painting?.ready === true;
              const text = painted ? textAt(view.u) : 1;
              if (text !== textShown && textLayer) {
                textLayer.style.opacity = text === 1 ? "" : text.toFixed(4);
                textShown = text;
              }
              const hideScrim = painted && coveredAt(view.u);
              if (hideScrim !== scrimHidden && chapterScrim) {
                chapterScrim.style.visibility = hideScrim ? "hidden" : "";
                scrimHidden = hideScrim;
              }
              // While the painting covers it, the chart isn't drawn: from a
              // little after it covers it on the way down to a little
              // before it shows again (interludes.ts, coveredSpan).
              const cover =
                painting?.ready === true &&
                at !== null &&
                at.screens > COVERED[0] &&
                at.screens < COVERED[1];
              if (cover !== covered) {
                covered = cover;
                if (cover) s.chart.pause();
              }
              // Draw while on screen, and off screen only while the scrub is
              // still settling (scrolled back past the start, scene 1's
              // Victory is handed back whole; past the end, the last frame
              // holds and nothing more is drawn).
              drawing =
                (near || state.p !== drawn || view !== undefined) &&
                !document.hidden &&
                !covered;
              if (!drawing) return;
              s.draw(state.p, time, view);
              drawn = state.p;
            };
            gsap.ticker.add(render);
            // Boulogne's painting, once the chart is ready and the page idle:
            // its chunk, then its layers in idle slices of their own, well
            // before the reader comes down to Boulogne.
            void (async () => {
              await idle(1500, controller.signal);
              if (controller.signal.aborted) return;
              const view = await import("./boulogne-sea/BoulogneSea");
              if (controller.signal.aborted) return;
              setSea(() => view.BoulogneSea);
            })();
            // Readouts while scene 2 is on screen (or about to be).
            unregister = registerChartReadout(() =>
              near && drawing ? s.chart.stats : null,
            );
            window.__road = {
              ready: true,
              baked: false,
              stats: s.chart.stats,
              pin: {
                base: PIN_LENGTH,
                length: SCROLL.length,
                interludes: SCROLL.spans.map((span) => ({
                  id: span.spec.id,
                  at: span.spec.at,
                  from: span.from,
                  to: span.to,
                  dive: span.spec.dive,
                  hold: span.spec.hold,
                  rise: span.spec.rise,
                  covered: [span.from + COVERED[0], span.from + COVERED[1]],
                })),
              },
              scrollFor: (p: number) => scrollAt(SCROLL.screensFor(p)),
              scrollForInterlude: (
                id: string,
                phase: InterludePhase,
                t: number,
              ) => scrollAt(SCROLL.screensForInterlude(id, phase, t)),
              get seaReady() {
                return sea.current?.ready === true;
              },
              seaEye: {
                ...SEA_EYE,
                shoreAhead: SHORE_AHEAD,
                chartBack: CHART_BACK,
              },
              sample: (p: number, mode?: number) => s.sample(p, mode),
              bakedSizes: (layer: number, i: number, k0: number, k1: number) =>
                s.bakedSizes(layer, i, k0, k1),
              labelChanges: () => s.labelChanges(),
              gates: (p: number) => {
                drawn = -1;
                return s.gates(p);
              },
              bakeTrace: (k: number) => {
                drawn = -1;
                return s.bakeTrace(k);
              },
              siteView: (p: number, lon: number, lat: number) =>
                s.siteView(p, lon, lat),
              coastAlong: (
                lon: number,
                lat: number,
                heading: number,
                maxKm?: number,
              ) => s.coastAlong(lon, lat, heading, maxKm),
              waterLift: (p: number) => {
                drawn = -1;
                return s.waterLift(p);
              },
              clash: (p: number, ink?: number) => {
                drawn = -1;
                return s.clash(p, ink);
              },
              glyphNames: () => s.glyphNames(),
              motion: (p: number) => {
                drawn = -1;
                return s.motion(p);
              },
              pathParts: (p: number, step: number) => {
                drawn = -1;
                return s.pathParts(p, step);
              },
              ashore: (p: number) => {
                drawn = -1;
                return s.ashore(p);
              },
              spreadShift: () => s.spreadShift(),
              detail: (p: number) => s.detailAt(p),
              dawnFleet: () => s.dawnFleet(),
              labels: (p: number) => {
                drawn = -1;
                return s.labels(p);
              },
              routeLabels: (explain?: boolean) => s.routeLabels(explain),
              hideRouteLabels: (hidden: boolean) => {
                s.hideRouteLabels(hidden);
                drawn = -1;
              },
              fleetAt: (p: number) => {
                drawn = -1;
                return s.fleetAt(p);
              },
              cameraAt: (p: number) => {
                drawn = -1;
                return s.cameraAt(p);
              },
              layoutDebug: (p: number) => {
                drawn = -1;
                return s.layoutDebug(p);
              },
              bench: async (
                frames: number,
                p: number,
                alternate?: string,
                at?: { phase: InterludePhase; t: number },
              ) => {
                held = true;
                try {
                  const view = at
                    ? s.interlude(at.phase, at.t, { ...SEA_HOLD })
                    : undefined;
                  return await s.bench(frames, p, alternate || undefined, view);
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
    <div ref={wrapper} data-scene-wrapper="road" className="relative z-1">
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
        {Sea && mode === "chart" ? <Sea onReady={onSeaReady} /> : null}
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
      /** The glyph layout's tables are baked for the current viewport. */
      baked: boolean;
      stats: import("@/components/chart").ChartStats;
      /**
       * The pin: `base` screens for p 0..1, its whole `length` with the
       * interludes, and each interlude's place (screens from the pin's
       * start; `covered`, where its painting hides the chart).
       */
      pin: {
        base: number;
        length: number;
        interludes: {
          id: string;
          at: number;
          from: number;
          to: number;
          dive: number;
          hold: number;
          rise: number;
          covered: [number, number];
        }[];
      };
      /**
       * Tools and tests: the page's scroll position (CSS px) that shows the
       * scene at p (at an interlude's p, where the interlude begins).
       */
      scrollFor: (p: number) => number;
      /** Tools and tests: the scroll position of a point of an interlude. */
      scrollForInterlude: (
        id: string,
        phase: import("../alive/interlude").InterludePhase,
        t: number,
      ) => number;
      /** Boulogne's painting is mounted and its layers drawn. */
      readonly seaReady: boolean;
      /** Development: the painting's eye, its shore and the chart's camera behind it (interludes.ts). */
      seaEye: typeof import("./interludes").SEA_EYE & {
        shoreAhead: number;
        chartBack: number;
      };
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
      /** Development: how far the chart's coast lies along a heading, ground km (RoadStage.coastAlong). */
      coastAlong: (
        lon: number,
        lat: number,
        heading: number,
        maxKm?: number,
      ) => number;
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
      /** Development: each glyph's drawing and intended place at p (RoadStage.motion). */
      motion: (p: number) => number[][];
      /** Development: each glyph's own motion and the camera's at p (RoadStage.pathParts). */
      pathParts: (p: number, step: number) => number[][];
      /** Development: each fleet ship against the coast at p (RoadStage.ashore). */
      ashore: (p: number) => number[];
      /** Development: each ship's shift from her place at the sources' spacing, km (RoadStage.spreadShift). */
      spreadShift: () => {
        dawn: { name: string; km: number }[];
        anchorage: { name: string; km: number }[];
      };
      /** Development: the detail tile the chart holds at p, and its weight (RoadStage.detailAt). */
      detail: (p: number) => { tile: string | null; weight: number };
      /** Development: every name's state at p (RoadStage.labels). */
      labels: (
        p: number,
      ) => import("@/components/chart/lettering/Lettering").LabelState[];
      /**
       * Development and the contrast check: the fleets' labels in the frame
       * last drawn, and hiding them (RoadStage.routeLabels).
       */
      routeLabels: (
        explain?: boolean,
      ) => ReturnType<import("./stage").RoadStage["routeLabels"]>;
      hideRouteLabels: (hidden: boolean) => void;
      /** Development: both fleets at first light (RoadStage.dawnFleet). */
      dawnFleet: () => ReturnType<import("./stage").RoadStage["dawnFleet"]>;
      /** Development: each fleet ship's intended place at p (RoadStage.fleetAt). */
      fleetAt: (p: number) => number[];
      /** Development: the camera at p (RoadStage.cameraAt). */
      cameraAt: (
        p: number,
      ) => ReturnType<import("./stage").RoadStage["cameraAt"]>;
      /** Development: each squadron's layout at p (RoadStage.layoutDebug). */
      layoutDebug: (p: number) => Record<string, unknown>[];
      /** Development: a glyph's baked sizes by step (RoadStage.bakedSizes). */
      bakedSizes: (
        layer: number,
        i: number,
        k0: number,
        k1: number,
      ) => number[][];
      /** Development: the bake's sizes pass replayed at step k (RoadStage.bakeTrace). */
      bakeTrace: (k: number) => Record<string, unknown>[];
      /** Development and checks: the fleet gates at p (RoadStage.gates). */
      gates: (p: number) => number[];
      /** Development: every change of a label's strength (RoadStage.labelChanges). */
      labelChanges: () => ReturnType<
        import("./stage").RoadStage["labelChanges"]
      >;
      /**
       * Development: frames at p timed on the GPU and the CPU; with
       * `alternate`, the chart's objects of that name drawn on even frames
       * only (RoadStage.bench); with `at`, the chart as an interlude has
       * it at that point (its camera, its marks).
       */
      bench: (
        frames: number,
        p: number,
        alternate?: string,
        at?: {
          phase: import("../alive/interlude").InterludePhase;
          t: number;
        },
      ) => Promise<import("@/components/chart/engine/bench").BenchResult>;
    };
  }
}
