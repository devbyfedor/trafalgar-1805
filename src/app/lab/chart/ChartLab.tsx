"use client";

import { useRef } from "react";
import type {
  ChartStats,
  Formation,
  LabelState,
  LightId,
} from "@/components/chart";
import { type BenchResult, benchFrames } from "@/components/chart/engine/bench";
import { worldX, worldY } from "@/components/chart/geo/mercator";
import type { ClashResult } from "@/components/chart/glyphs/clash";
import { Credits } from "@/components/experience/Credits";
import { DebugOverlay } from "@/components/experience/DebugOverlay";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { registerChartReadout, reportProgress } from "@/lib/debug";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { isDebug } from "@/lib/media";
import {
  DAWN,
  GLYPH_TYPES,
  LAB_MARKS,
  ROUTE_SQUADRON,
} from "@/scenes/02-road/fleets";
import { GAZETTEER } from "@/scenes/02-road/gazetteer";
import { TOULON_TO_CADIZ } from "@/scenes/02-road/routes";
import { SOUNDING_ANGLES } from "@/scenes/02-road/soundings";
import { LAB_DEMOS, type LabDemo } from "./demos";
import {
  buildFlight,
  FLIGHT_LENGTH,
  type FlightState,
  LAB_FLIGHT,
} from "./flight";

/**
 * Dev page for the chart engine: Stage A's flight, pinned and scrubbed by
 * scroll through Lenis on the shared ticker, as on the site. The engine
 * loads as its own chunk after the pin and the timeline exist, and renders
 * only while the page is on screen and the tab visible.
 *
 * Query: `?p=` jumps to a progress (0..1), `?light=` pins a lighting state
 * (dawn, campaign or night), `?route=` pins how much of the route is drawn,
 * `?quality=` pins a quality level (0 is the top), `?debug` shows the
 * readouts and the ScrollTrigger markers. To look closely at one place,
 * `?eye=lon,lat,km` with `?look=lon,lat` (and `?fov=`) hold the camera
 * there instead of the flight.
 */

const LIGHTS: readonly LightId[] = ["dawn", "campaign", "night"];

/** How far along the route each of the squadron's ships joins it, as a fraction of it. */
const SQUADRON_SPACING = 0.016;

/** LAB_MARKS: the fleets at dawn first, then the anchorage. */
const LAB_DAWN = DAWN.size;

/** A comma-separated list of numbers, or null. */
function listParam(query: URLSearchParams, name: string): number[] | null {
  const raw = query.get(name);
  if (!raw) return null;
  const values = raw.split(",").map(Number);
  return values.every(Number.isFinite) ? values : null;
}

function numberParam(query: URLSearchParams, name: string): number | null {
  const raw = query.get(name);
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function ChartLab() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const wrapper = wrapperRef.current;
      const section = sectionRef.current;
      const host = hostRef.current;
      if (!wrapper || !section || !host) return;
      const query = new URLSearchParams(window.location.search);
      const jumpTo = numberParam(query, "p");
      const lightParam = query.get("light") as LightId | null;
      const fixedLight =
        lightParam && LIGHTS.includes(lightParam) ? lightParam : null;
      const fixedRoute = numberParam(query, "route");
      const quality = numberParam(query, "quality") ?? undefined;
      const fixedEye = listParam(query, "eye");
      const fixedLook = listParam(query, "look");
      const fixedFov = numberParam(query, "fov") ?? 40;

      const state: FlightState = { p: 0, light: 0, route: 0 };
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          id: "chart-lab",
          trigger: section,
          start: "top top",
          end: () => `+=${window.innerHeight * FLIGHT_LENGTH}`,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: 0.6,
          invalidateOnRefresh: true,
          markers: isDebug(),
          onUpdate: (self) => reportProgress("scroll", self.progress),
        },
      });
      buildFlight(tl, state);

      // Render only while the page is on screen and the tab is visible.
      let inView = false;
      ScrollTrigger.create({
        trigger: wrapper,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          inView = self.isActive;
        },
        onRefresh: (self) => {
          inView = self.isActive;
        },
      });

      // A canvas per mount: StrictMode mounts twice in development, and a
      // canvas keeps its WebGL context for life.
      const canvas = document.createElement("canvas");
      canvas.className = "absolute inset-0 block h-full w-full";
      host.append(canvas);
      const controller = new AbortController();
      let cancelled = false;
      // Replaced as soon as there is something to undo; the cleanup calls
      // whichever is current, and every await below checks `cancelled`.
      let dispose = () => {};

      const start = async () => {
        const engine = await import("@/components/chart");
        if (cancelled) return;
        const chart = await engine.Chart.create({
          canvas,
          quality,
          signal: controller.signal,
          onFatal: (reason) => console.error(`chart: ${reason}`),
        });
        if (cancelled) {
          chart.dispose();
          return;
        }
        const resize = () => chart.resize(host.clientWidth, host.clientHeight);
        const observer = new ResizeObserver(resize);
        let render: ((time: number) => void) | null = null;
        let unregister = () => {};
        let demo: LabDemo | null = null;
        let disposeAtlas = () => {};
        let disposeDigits = () => {};
        const onVisibility = () => chart.pause();
        dispose = () => {
          if (render) gsap.ticker.remove(render);
          document.removeEventListener("visibilitychange", onVisibility);
          observer.disconnect();
          unregister();
          demo?.dispose?.();
          chart.dispose();
          disposeAtlas();
          disposeDigits();
          window.__chart = undefined;
        };

        const riverData = await engine.loadRivers(
          chart.manifest,
          controller.signal,
        );
        if (cancelled) return;
        const rivers = new engine.Rivers(chart.field, riverData);
        chart.add(rivers, rivers.mesh);
        const route = new engine.Route(chart.field, TOULON_TO_CADIZ);
        chart.add(route, route.mesh);
        const atlas = await engine.buildGlyphAtlas(GLYPH_TYPES);
        if (cancelled) {
          atlas.texture.dispose();
          return;
        }
        const glyphs = new engine.Glyphs(atlas, [
          ...LAB_MARKS,
          ...ROUTE_SQUADRON,
        ]);
        // The fleets at dawn and at anchor at their true places, and
        // Villeneuve's squadron as a symbol at the route's head, laid out
        // together before the glyphs draw, so none touches land or another.
        const coast = await chart.field.readBack();
        if (cancelled) {
          atlas.texture.dispose();
          return;
        }
        const index = (from: number, n: number) =>
          Array.from({ length: n }, (_, k) => from + k);
        const squadron = LAB_MARKS.length;
        const formation: Formation = {
          kind: "formation",
          layer: glyphs,
          places: index(squadron, ROUTE_SQUADRON.length),
          types: [...new Set(ROUTE_SQUADRON.map((m) => m.type))],
          x: 0,
          y: 0,
          heading: 0,
          meets: null,
          meeting: 0,
        };
        chart.add(
          new engine.GlyphLayout(coast, [
            { kind: "free", layer: glyphs, members: index(0, LAB_DAWN) },
            {
              kind: "free",
              layer: glyphs,
              members: index(LAB_DAWN, LAB_MARKS.length - LAB_DAWN),
            },
            formation,
          ]),
        );
        chart.add(glyphs, glyphs.wakes, glyphs.ships);
        chart.addGpuBytes(atlas.gpuBytes);
        disposeAtlas = () => atlas.texture.dispose();
        const head = { x: 0, y: 0, heading: 0 };
        const lettering = new engine.Lettering(chart.field, GAZETTEER);
        chart.add(lettering, lettering.batch, lettering.marks.mesh);
        await lettering.ready;
        if (cancelled) return;
        const soundingData = await engine.loadSoundings(
          chart.manifest,
          controller.signal,
        );
        if (cancelled) return;
        if (soundingData) {
          const digits = await engine.buildDigitAtlas(
            engine.fontUrl(engine.SOUNDING_FONT_FILE),
          );
          if (cancelled) {
            digits.texture.dispose();
            return;
          }
          disposeDigits = () => digits.texture.dispose();
          chart.addGpuBytes(digits.gpuBytes);
          const soundings = new engine.Soundings(
            soundingData.index,
            soundingData.sets,
            digits,
            { angles: SOUNDING_ANGLES },
          );
          chart.add(soundings, soundings.mesh);
        }
        const loadDemo = LAB_DEMOS[query.get("demo") ?? ""];
        if (loadDemo) {
          const module = await loadDemo();
          if (cancelled) return;
          demo = await module.default({ chart, query });
          if (cancelled) return;
        }
        const rig = new engine.CameraRig(LAB_FLIGHT);

        const draw = (time: number) => {
          if (fixedEye && fixedLook) {
            chart.eye.set(
              worldX(fixedEye[0]),
              worldY(fixedEye[1]),
              fixedEye[2] ?? 10,
            );
            chart.target.set(
              worldX(fixedLook[0]),
              worldY(fixedLook[1]),
              fixedLook[2] ?? 0,
            );
            chart.setView(chart.eye, chart.target, fixedFov);
          } else chart.fly(rig, state.p);
          if (fixedLight) chart.setLight(fixedLight, fixedLight, 0);
          else chart.setLight("dawn", "campaign", state.light);
          const drawn = fixedRoute ?? state.route;
          route.setProgress(drawn);
          // Villeneuve's squadron sails at the drawing head.
          route.pointAt(drawn, head);
          formation.x = head.x;
          formation.y = head.y;
          formation.heading = head.heading;
          for (let k = 0; k < ROUTE_SQUADRON.length; k++) {
            glyphs.place(squadron + k, head.x, head.y, head.heading);
            glyphs.setOpacity(
              squadron + k,
              Math.min(1, Math.max(0, (drawn - k * SQUADRON_SPACING) / 0.02)),
            );
          }
          demo?.update?.(time, state.p);
          chart.frame(time);
          reportProgress("flight", state.p);
        };
        observer.observe(host);
        resize();
        draw(0);
        await chart.warm();
        if (cancelled) return;

        // Straight to a point of the flight, the scrub settled at once.
        const jump = (p: number) => {
          const st = tl.scrollTrigger;
          if (!st) return;
          const y =
            st.start + Math.min(1, Math.max(0, p)) * (st.end - st.start);
          if (window.__lenis)
            window.__lenis.scrollTo(y, { immediate: true, force: true });
          else window.scrollTo(0, y);
          ScrollTrigger.update();
          st.getTween()?.progress(1);
        };
        if (jumpTo !== null) jump(jumpTo);
        // Held while a bench draws its own frames.
        let held = false;
        render = (time: number) => {
          if (inView && !document.hidden && !held) draw(time);
        };
        gsap.ticker.add(render);
        document.addEventListener("visibilitychange", onVisibility);
        unregister = registerChartReadout(() => chart.stats);
        window.__chart = {
          stats: chart.stats,
          ready: true,
          labels: () => lettering.snapshot(),
          clash: (p, ink) => {
            held = true;
            try {
              tl.progress(Math.min(1, Math.max(0, p)));
              draw(performance.now() / 1000);
              return chart.probeClash([{ glyphs }], ink);
            } finally {
              held = false;
            }
          },
          glyphNames: () => [
            [
              ...LAB_MARKS.map((m, i) => `lab:${i}:${m.type}`),
              ...ROUTE_SQUADRON.map((_, k) => `route:${k}`),
            ],
          ],
          bench: async (frames, p, alternate) => {
            if (p !== undefined) jump(p);
            held = true;
            try {
              const gl = chart.renderer.getContext() as WebGL2RenderingContext;
              return await benchFrames(
                gl,
                draw,
                frames,
                alternate
                  ? (i) => chart.showNamed(alternate, i % 2 === 0)
                  : undefined,
              );
            } finally {
              held = false;
              if (alternate) chart.showNamed(alternate, true);
            }
          },
        };
      };
      start().catch((error: unknown) => {
        if (!cancelled) console.error("chart:", error);
      });

      return () => {
        cancelled = true;
        controller.abort();
        dispose();
        canvas.remove();
      };
    },
    { scope: sectionRef },
  );

  return (
    <SmoothScroll>
      <main data-lab="chart" className="bg-deep-sea">
        <div ref={wrapperRef}>
          <section
            ref={sectionRef}
            data-chart-stage
            className="relative h-screen w-full overflow-hidden bg-deep-sea"
          >
            <div
              ref={hostRef}
              aria-hidden="true"
              className="absolute inset-0"
            />
          </section>
        </div>
        <div className="flex h-screen items-center justify-center text-ink">
          <p>End of the flight.</p>
        </div>
        <Credits />
      </main>
      <DebugOverlay progress={["scroll", "flight"]} />
    </SmoothScroll>
  );
}

declare global {
  interface Window {
    /** The lab's chart, for the end-to-end tests and screenshots. */
    __chart?: {
      stats: ChartStats;
      ready: boolean;
      /** Each name's on-screen size and opacity, for development. */
      labels?: () => LabelState[];
      /**
       * Draws `frames` frames, at progress `p` if given, and times each on
       * the GPU and the CPU, for development (scripts/dev/bench.mjs); with
       * `alternate`, the chart's objects of that name drawn on even frames
       * only (Chart.showNamed).
       */
      bench?: (
        frames: number,
        p?: number,
        alternate?: string,
      ) => Promise<BenchResult>;
      /**
       * Development and tests: draws the flight at progress p and finds
       * every glyph whose ink touches land or another glyph's
       * (Chart.probeClash). `ink`: the least drawn alpha counted.
       */
      clash?: (p: number, ink?: number) => ClashResult;
      /** Development: the glyphs by name, in mark order. */
      glyphNames?: () => string[][];
    };
  }
}
