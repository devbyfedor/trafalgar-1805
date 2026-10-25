"use client";

import { useEffect, useRef } from "react";
import type { ChartStats, LightId } from "@/components/chart";
import { gsap } from "@/lib/gsap";
import { LAB_FLIGHT } from "./flight";

/**
 * Dev page for the chart engine. The engine loads as its own chunk; the
 * camera sits where the lab flight puts it at `?p=` (0..1), under the
 * lighting state `?light=` (dawn, campaign or night), at the quality level
 * `?quality=` (0 is the top; unset lets the ladder adapt).
 */

const LIGHTS: readonly LightId[] = ["dawn", "campaign", "night"];

export function ChartLab() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const query = new URLSearchParams(window.location.search);
    const p = Math.min(1, Math.max(0, Number(query.get("p") ?? 0) || 0));
    const lightParam = query.get("light") as LightId | null;
    const light =
      lightParam && LIGHTS.includes(lightParam) ? lightParam : "dawn";
    const qualityParam = query.get("quality");
    const quality = qualityParam === null ? undefined : Number(qualityParam);

    // A canvas per mount: StrictMode mounts twice in development, and a
    // canvas keeps its WebGL context for life.
    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 block h-full w-full";
    host.append(canvas);
    const controller = new AbortController();
    let cancelled = false;
    let cleanup = () => {};

    import("@/components/chart")
      .then(async ({ Chart, CameraRig }) => {
        const chart = await Chart.create({
          canvas,
          quality,
          signal: controller.signal,
          onFatal: (reason) => console.error(`chart: ${reason}`),
        });
        if (cancelled) {
          chart.dispose();
          return;
        }
        const rig = new CameraRig(LAB_FLIGHT);
        chart.setLight(light, light, 0);
        const resize = () => chart.resize(host.clientWidth, host.clientHeight);
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        resize();
        chart.fly(rig, p);
        await chart.warm();
        if (cancelled) {
          observer.disconnect();
          chart.dispose();
          return;
        }
        const render = (time: number) => chart.frame(time);
        gsap.ticker.add(render);
        window.__chart = { stats: chart.stats, ready: true };
        cleanup = () => {
          gsap.ticker.remove(render);
          observer.disconnect();
          chart.dispose();
          window.__chart = undefined;
        };
      })
      .catch((error: unknown) => {
        if (!cancelled) console.error("chart:", error);
      });

    return () => {
      cancelled = true;
      controller.abort();
      cleanup();
      canvas.remove();
    };
  }, []);

  return (
    <main
      data-lab="chart"
      className="relative h-screen w-full overflow-hidden bg-deep-sea"
    >
      <div ref={hostRef} aria-hidden="true" className="absolute inset-0" />
    </main>
  );
}

declare global {
  interface Window {
    /** The lab's chart, for the end-to-end tests and screenshots. */
    __chart?: { stats: ChartStats; ready: boolean };
  }
}
