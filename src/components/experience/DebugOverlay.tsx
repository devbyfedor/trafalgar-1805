"use client";

import { useEffect, useRef, useState } from "react";
import { readChart, registerProgressSink } from "@/lib/debug";
import { gsap } from "@/lib/gsap";
import { isDebug } from "@/lib/media";

/**
 * `?debug` overlay: frames per second, measured on the shared GSAP ticker
 * and printed twice a second; the scroll progress of the scenes named in
 * `progress`; and, while a chart is running, its renderer readouts (draw
 * calls, triangles, textures, quality level, render resolution). ScrollTrigger
 * markers are switched on by the scenes themselves when `?debug` is present.
 * Renders nothing on the server, so the static HTML is the same for everyone.
 */

const PERIOD_MS = 500;

function chartText(): string {
  const c = readChart();
  if (!c) return "";
  const k = (n: number) => (n >= 1e4 ? `${Math.round(n / 1e3)}k` : String(n));
  return [
    `calls ${c.calls}`,
    `triangles ${k(c.triangles)}`,
    `textures ${c.textures}, programs ${c.programs}`,
    `quality ${c.quality} (dpr ${c.dpr})`,
    `render ${c.width} × ${c.height}`,
    `gpu ${c.gpuMB} MB`,
    `altitude ${c.altitude} km`,
    `relief ×${c.exaggeration}, patches ${c.nodes}`,
  ].join("\n");
}

export function DebugOverlay({
  progress = ["dawn"],
}: {
  /** Scenes whose scroll progress is shown, by the id they report with. */
  progress?: readonly string[];
}) {
  const [enabled, setEnabled] = useState(false);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const progressRefs = useRef(new Map<string, HTMLSpanElement>());
  const key = progress.join(" ");

  useEffect(() => {
    setEnabled(isDebug());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const fpsEl = fpsRef.current;
    const chartEl = chartRef.current;
    if (!fpsEl || !chartEl) return;
    const ids = key ? key.split(" ") : [];
    const unregister = ids.map((id) => {
      const el = progressRefs.current.get(id);
      return el ? registerProgressSink(id, el) : () => {};
    });
    let frames = 0;
    let last = performance.now();
    const tick = () => {
      frames++;
      const now = performance.now();
      if (now - last >= PERIOD_MS) {
        fpsEl.textContent = String(Math.round((frames * 1000) / (now - last)));
        chartEl.textContent = chartText();
        frames = 0;
        last = now;
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      for (const off of unregister) off();
    };
  }, [enabled, key]);

  if (!enabled) return null;
  return (
    <div
      data-debug-overlay
      className="fixed top-3 right-3 z-50 rounded-sm bg-black/70 px-3 py-2 text-[13px] leading-5 text-ink tabular-nums"
    >
      <div>
        fps <span ref={fpsRef}>–</span>
      </div>
      {progress.map((id) => (
        <div key={id}>
          {id} p{" "}
          <span
            ref={(el) => {
              if (el) progressRefs.current.set(id, el);
              else progressRefs.current.delete(id);
            }}
          >
            0.000
          </span>
        </div>
      ))}
      <div ref={chartRef} data-debug-chart className="whitespace-pre" />
    </div>
  );
}
