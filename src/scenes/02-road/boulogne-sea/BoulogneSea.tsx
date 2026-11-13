"use client";

import { useEffect, useRef } from "react";
import { BOULOGNE_AT, paintingAt } from "../interludes";
import type { SeaViewHandle, SeaViewProps } from "./handle";
import { boxStyle, type Shift, shiftFor } from "./view";

/**
 * Boulogne from the sea (docs/scene-02-boulogne-brief.md): the painting
 * the chart turns into at Boulogne. Flat layers each at its depth, moved
 * by the camera's pose (view.ts); two groups dissolve over the chart, the
 * land and sky first and the water last (interludes.ts, DISSOLVE).
 */

/** How far from the interlude's p (either side) the painting is drawn faintly, so it is rasterised before the dive needs it. */
const ARM_P = 0.012;
/** The least opacity a shown group keeps: at 0 the browser stops drawing it, and starting again costs a frame. */
const FLOOR = 1 / 255;

interface Layer {
  el: HTMLElement;
  depth: number;
  x: number;
  y: number;
}

function controller(root: HTMLElement): SeaViewHandle & { dispose(): void } {
  const layers: Layer[] = Array.from(
    root.querySelectorAll<HTMLElement>("[data-depth]"),
  ).map((el) => ({
    el,
    depth: Number(el.dataset.depth),
    x: Number.NaN,
    y: Number.NaN,
  }));
  const land = root.querySelector<HTMLElement>("[data-group=land]");
  const water = root.querySelector<HTMLElement>("[data-group=water]");
  let shown: "hidden" | "armed" | "on" = "hidden";
  let landOpacity = -1;
  let waterOpacity = -1;
  let height = root.clientHeight || window.innerHeight;
  const resize = new ResizeObserver(() => {
    height = root.clientHeight || window.innerHeight;
    for (const layer of layers) layer.x = Number.NaN;
  });
  resize.observe(root);
  const shift: Shift = { x: 0, y: 0 };
  const opacity = (el: HTMLElement | null, value: number, last: number) => {
    if (!el || value === last) return last;
    el.style.opacity = String(value);
    return value;
  };
  return {
    ready: true,
    frame(p, at, u, pose) {
      const state = at
        ? "on"
        : Math.abs(p - BOULOGNE_AT) <= ARM_P
          ? "armed"
          : "hidden";
      if (state !== shown) {
        root.style.visibility = state === "hidden" ? "hidden" : "visible";
        shown = state;
      }
      if (state === "hidden") return;
      const share = at ? paintingAt(u) : { land: 0, water: 0 };
      landOpacity = opacity(land, Math.max(FLOOR, share.land), landOpacity);
      waterOpacity = opacity(water, Math.max(FLOOR, share.water), waterOpacity);
      for (const layer of layers) {
        shiftFor(layer.depth, pose, height, shift);
        if (shift.x === layer.x && shift.y === layer.y) continue;
        layer.x = shift.x;
        layer.y = shift.y;
        layer.el.style.transform = `translate3d(${shift.x.toFixed(2)}px, ${shift.y.toFixed(2)}px, 0)`;
      }
    },
    dispose() {
      resize.disconnect();
    },
  };
}

export function BoulogneSea({ onReady }: SeaViewProps) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const handle = controller(el);
    onReady(handle);
    return () => {
      onReady(null);
      handle.dispose();
    };
  }, [onReady]);

  const landBox = boxStyle(-930, 930, -2, 40);
  return (
    <div
      ref={root}
      data-layer="sea"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ visibility: "hidden" }}
    >
      <div data-group="land" className="absolute inset-0 will-change-[opacity]">
        <div
          data-depth="Infinity"
          className="absolute inset-[-20%] will-change-transform"
          style={{
            background:
              "linear-gradient(to bottom, #4d6a8a 0%, #7f97ad 40%, #c9c3b4 70%, #e8cfa2 78%, #e8cfa2 100%)",
          }}
        />
        <div
          data-depth="2000"
          className="absolute will-change-transform"
          style={{ ...landBox, background: "#9a8a68" }}
        />
      </div>
      <div
        data-group="water"
        className="absolute inset-0 will-change-[opacity]"
      >
        <div
          data-depth="300"
          className="absolute will-change-transform"
          style={{
            ...boxStyle(-930, 930, -900, -2),
            background:
              "linear-gradient(to bottom, #6f7f86 0%, #3f5862 30%, #283c44 100%)",
          }}
        />
      </div>
    </div>
  );
}
