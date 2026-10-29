"use client";

import { useRef } from "react";
import type { ChartStats, LabelState, LightId } from "@/components/chart";
import { worldX, worldY } from "@/components/chart/geo/mercator";
import { DebugOverlay } from "@/components/experience/DebugOverlay";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { registerChartReadout, reportProgress } from "@/lib/debug";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { isDebug } from "@/lib/media";
import {
  GLYPH_TYPES,
  LAB_MARKS,
  ROUTE_SQUADRON,
} from "@/scenes/02-road/fleets";
import { GAZETTEER } from "@/scenes/02-road/gazetteer";
import { TOULON_TO_CADIZ } from "@/scenes/02-road/routes";
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

/** Distance between the squadron's ships along the route, as a fraction of it. */
const SQUADRON_SPACING = 0.016;

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
        const onVisibility = () => chart.pause();
        dispose = () => {
          if (render) gsap.ticker.remove(render);
          document.removeEventListener("visibilitychange", onVisibility);
          observer.disconnect();
          unregister();
          chart.dispose();
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
        const glyphs = new engine.Glyphs(GLYPH_TYPES, [
          ...LAB_MARKS,
          ...ROUTE_SQUADRON,
        ]);
        chart.add(glyphs, glyphs.wakes, glyphs.ships);
        chart.addGpuBytes(glyphs.atlas.gpuBytes);
        const squadron = LAB_MARKS.length;
        const head = { x: 0, y: 0, heading: 0 };
        const lettering = new engine.Lettering(chart.field, GAZETTEER);
        chart.add(lettering, lettering.batch, lettering.marks.mesh);
        await lettering.ready;
        if (cancelled) return;
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
          // Villeneuve's squadron sails at the drawing head, in line astern.
          for (let k = 0; k < ROUTE_SQUADRON.length; k++) {
            route.pointAt(drawn - k * SQUADRON_SPACING, head);
            glyphs.place(squadron + k, head.x, head.y, head.heading);
            glyphs.setOpacity(
              squadron + k,
              Math.min(1, Math.max(0, (drawn - k * SQUADRON_SPACING) / 0.02)),
            );
          }
          chart.frame(time);
          reportProgress("flight", state.p);
        };
        observer.observe(host);
        resize();
        draw(0);
        await chart.warm();
        if (cancelled) return;

        if (jumpTo !== null) {
          // Straight to a point of the flight, the scrub settled at once.
          const st = tl.scrollTrigger;
          if (st) {
            const y =
              st.start + Math.min(1, Math.max(0, jumpTo)) * (st.end - st.start);
            if (window.__lenis)
              window.__lenis.scrollTo(y, { immediate: true, force: true });
            else window.scrollTo(0, y);
            ScrollTrigger.update();
            st.getTween()?.progress(1);
          }
        }
        render = (time: number) => {
          if (inView && !document.hidden) draw(time);
        };
        gsap.ticker.add(render);
        document.addEventListener("visibilitychange", onVisibility);
        unregister = registerChartReadout(() => chart.stats);
        window.__chart = {
          stats: chart.stats,
          ready: true,
          labels: () => lettering.snapshot(),
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
    };
  }
}
