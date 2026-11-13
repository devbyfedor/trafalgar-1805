"use client";

import { useEffect, useRef } from "react";
import {
  BOULOGNE_AT,
  type PaintingShare,
  paintingAt,
  smooth,
} from "../interludes";
import type { SeaViewHandle, SeaViewProps } from "./handle";
import type { Plate, PlateGroup } from "./paint/plate";
import { type PlateTarget, paintPlates } from "./paint/raster";
import { buildPlates } from "./plates";
import { legacyStrips } from "./plates/water";
import { mixHex, PALETTE } from "./scene";
import { campPlumes, SmokeRenderer } from "./smoke";
import { boxStyle, HORIZON, type Shift, shiftFor, UNIT_VH } from "./view";
import type { WaterStrip } from "./water";

/**
 * Boulogne from the sea (docs/scene-02-boulogne-brief.md): the painting the
 * chart turns into at Boulogne. Plates, each a flat layer at its depth
 * (paint/plate.ts), painted once before the dive into two rasters, colour
 * and engraving (paint/raster.ts), in idle slices; per frame the wrappers
 * move with the camera's pose (view.ts) and the rasters fade by the
 * transition (interludes.ts, TRANSITION): the engraving over the chart,
 * then each group's colour over the engraving. The swell's strips, the
 * camps' smoke and the haze are the moving parts, as scene 1's are.
 */

/** How far from the interlude's p (either side) the painting is drawn faintly, so its layers are on the GPU before the dive needs them. */
const ARM_P = 0.012;
/** The least opacity a shown raster keeps while the painting is in play: at 0 the browser stops drawing it, and starting again costs a frame. */
const FLOOR = 1 / 255;
/** How near (in p) the reader may come to Boulogne before the painting's preparation takes bigger slices. */
const URGENT_P = 0.04;

const PLATES = buildPlates();
/** Session 24's SVG strips of swell, until the water's plates replace them (plates/water.ts). */
const WATER = legacyStrips();
const PLUMES = campPlumes();
/** The smoke's canvas, layer units: x0, x1, y0 (bottom), y1 (top). */
const SMOKE_BOX = [-1000, 1000, 40, 260] as const;

// ------------------------------------------------------------------ art

function PlateArt({ plate }: { plate: Plate }) {
  const [x0, x1, y0, y1] = plate.box;
  const canvases = (
    <>
      <canvas
        data-mode="ink"
        className="absolute inset-0 block h-full w-full will-change-[opacity]"
        style={{ opacity: 0 }}
      />
      <canvas
        data-mode="colour"
        className="absolute inset-0 block h-full w-full will-change-[opacity]"
        style={{ opacity: 0 }}
      />
    </>
  );
  const rock = plate.rock;
  return (
    <div
      data-depth={plate.depth}
      data-plate={plate.id}
      className="absolute will-change-transform"
      style={boxStyle(x0, x1, y0, y1)}
    >
      {rock ? (
        <div
          data-rock={plate.id}
          className="absolute inset-0 will-change-transform"
          style={{
            transformOrigin: `${(((rock.pivot[0] - x0) / (x1 - x0)) * 100).toFixed(3)}% ${(((y1 - rock.pivot[1]) / (y1 - y0)) * 100).toFixed(3)}%`,
          }}
        >
          {canvases}
        </div>
      ) : (
        canvases
      )}
    </div>
  );
}

/** One water strip: its parallax wrapper and its looping, swelling art. */
function Strip({ strip }: { strip: WaterStrip }) {
  const g = strip.geometry;
  // The strip's mean surface lies `amp` below its top edge (seaGeometry),
  // and `strip.top` units below the horizon.
  const edge = strip.top - strip.amp;
  return (
    <div
      data-depth={strip.depth}
      data-strip={strip.id}
      className="absolute will-change-transform"
      style={{
        left: `calc(50% - ${(1200 * UNIT_VH).toFixed(4)}vh)`,
        top: `calc(${(100 * HORIZON).toFixed(4)}vh + ${(edge * UNIT_VH).toFixed(4)}vh)`,
        width: `${(g.width * UNIT_VH).toFixed(4)}vh`,
        height: `${(g.height * UNIT_VH).toFixed(4)}vh`,
      }}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={`0 0 ${g.width} ${g.height}`}
        preserveAspectRatio="none"
        className="block h-full w-full"
      >
        <path d={g.body} fill={strip.body} />
        <path d={g.inner} fill={strip.inner} opacity={0.42} />
        <path d={g.crest} fill={strip.crest} opacity={0.62} />
      </svg>
    </div>
  );
}

/** Everything in paint order, far to near: plates, strips, the smoke and the haze. */
function Layers() {
  const items: { depth: number; node: React.ReactNode }[] = [];
  for (const p of PLATES)
    items.push({ depth: p.depth, node: <PlateArt key={p.id} plate={p} /> });
  for (const s of WATER)
    items.push({
      depth: s.depth - 0.5,
      node: <Strip key={s.id} strip={s} />,
    });
  items.push({
    depth: 1650,
    node: (
      <canvas
        key="smoke"
        data-el="sea-smoke"
        data-depth="1650"
        className="absolute will-change-[transform,opacity]"
        style={{
          ...boxStyle(SMOKE_BOX[0], SMOKE_BOX[1], SMOKE_BOX[2], SMOKE_BOX[3]),
          opacity: 0,
        }}
      />
    ),
  });
  items.push({
    depth: 1299,
    node: (
      <div
        key="haze"
        data-el="sea-haze"
        data-depth="1300"
        className="absolute will-change-[transform,opacity]"
        style={{
          ...boxStyle(-1100, 1100, -12, 70),
          opacity: 0,
          background:
            "linear-gradient(to bottom, rgba(205,191,174,0) 0%, rgba(205,191,174,0.18) 55%, rgba(214,200,178,0.42) 88%, rgba(214,200,178,0.2) 100%)",
        }}
      />
    ),
  });
  items.sort((a, b) => b.depth - a.depth);
  return <>{items.map((i) => i.node)}</>;
}

// ------------------------------------------------------------ controller

interface Mover {
  el: HTMLElement;
  depth: number;
  x: number;
  y: number;
  strip: WaterStrip | null;
  swell: Plate["swell"] | null;
}

interface PlateView {
  plate: Plate;
  ink: HTMLCanvasElement | null;
  colour: HTMLCanvasElement | null;
  rock: HTMLElement | null;
  inkOpacity: number;
  colourOpacity: number;
}

function controller(root: HTMLElement): SeaViewHandle & { dispose(): void } {
  const strips = new Map(WATER.map((s) => [s.id, s]));
  const movers: Mover[] = Array.from(
    root.querySelectorAll<HTMLElement>("[data-depth]"),
  ).map((el) => ({
    el,
    depth: Number(el.dataset.depth),
    x: Number.NaN,
    y: Number.NaN,
    strip: el.dataset.strip ? (strips.get(el.dataset.strip) ?? null) : null,
    swell: el.dataset.plate
      ? (PLATES.find((p) => p.id === el.dataset.plate)?.swell ?? null)
      : null,
  }));
  const views: PlateView[] = PLATES.map((plate) => {
    const box = root.querySelector<HTMLElement>(`[data-plate="${plate.id}"]`);
    return {
      plate,
      ink:
        box?.querySelector<HTMLCanvasElement>("canvas[data-mode=ink]") ?? null,
      colour:
        box?.querySelector<HTMLCanvasElement>("canvas[data-mode=colour]") ??
        null,
      rock: box?.querySelector<HTMLElement>("[data-rock]") ?? null,
      inkOpacity: -1,
      colourOpacity: -1,
    };
  });
  const stripEls = Array.from(
    root.querySelectorAll<HTMLElement>("[data-strip]"),
  );
  const haze = root.querySelector<HTMLElement>("[data-el=sea-haze]");
  const smokeCanvas = root.querySelector<HTMLCanvasElement>(
    "canvas[data-el=sea-smoke]",
  );
  const smoke = smokeCanvas
    ? new SmokeRenderer(
        smokeCanvas,
        PLUMES,
        SMOKE_BOX,
        mixHex(PALETTE.cloud.shade, PALETTE.haze.near, 0.5),
      )
    : null;

  let shown: "hidden" | "armed" | "on" = "hidden";
  let ready = false;
  let lastP = 0;
  let height = root.clientHeight || window.innerHeight;
  let dpr = window.devicePixelRatio || 1;
  let painting: AbortController | null = null;
  let stripOpacity = -1;
  let smokeOpacity = -1;

  const targets: PlateTarget[] = views.map((v) => ({
    plate: v.plate,
    canvases: {
      ...(v.ink ? { ink: v.ink } : {}),
      ...(v.colour ? { colour: v.colour } : {}),
    },
  }));

  // The rasters, in idle slices: bigger slices once the reader is close.
  const paint = () => {
    painting?.abort();
    const job = new AbortController();
    painting = job;
    ready = false;
    void paintPlates(targets, height, dpr, job.signal, () =>
      Math.abs(lastP - BOULOGNE_AT) < URGENT_P ? 12 : 4,
    )
      .then((done) => {
        if (done && painting === job) ready = true;
      })
      .catch((e) => {
        console.error("Boulogne's painting failed to paint", e);
      });
  };

  const sizeSmoke = () => {
    if (!smokeCanvas || !smoke) return;
    const px = (UNIT_VH / 100) * height;
    smoke.resize(
      (SMOKE_BOX[1] - SMOKE_BOX[0]) * px,
      (SMOKE_BOX[3] - SMOKE_BOX[2]) * px,
      px,
    );
  };
  sizeSmoke();
  paint();

  let resizeTimer = 0;
  const resize = new ResizeObserver(() => {
    const h = root.clientHeight || window.innerHeight;
    const d = window.devicePixelRatio || 1;
    for (const m of movers) m.x = Number.NaN;
    if (h === height && d === dpr) return;
    height = h;
    dpr = d;
    sizeSmoke();
    ready = false;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(paint, 250);
  });
  resize.observe(root);

  const shift: Shift = { x: 0, y: 0 };
  const share: PaintingShare = {
    engraving: 0,
    sky: 0,
    land: 0,
    water: 0,
    craft: 0,
  };
  const setOpacity = (el: HTMLElement | null, value: number, last: number) => {
    if (!el || value === last) return last;
    el.style.opacity = value.toFixed(4);
    return value;
  };

  return {
    get ready() {
      return ready;
    },
    frame(p, at, u, pose, time) {
      lastP = p;
      const state = !ready
        ? "hidden"
        : at
          ? "on"
          : Math.abs(p - BOULOGNE_AT) <= ARM_P
            ? "armed"
            : "hidden";
      if (state !== shown) {
        root.style.visibility = state === "hidden" ? "hidden" : "visible";
        shown = state;
      }
      if (state === "hidden") return;
      if (at) paintingAt(u, share);
      else {
        share.engraving = 0;
        share.sky = share.land = share.water = share.craft = 0;
      }
      // The rasters: the engraving whole until its plate's colour is
      // nearly whole, then gone under it; the colour by its group.
      for (const v of views) {
        const c = share[v.plate.group as PlateGroup];
        const ink = share.engraving * (1 - smooth(0.85, 1, c));
        v.inkOpacity = setOpacity(v.ink, Math.max(FLOOR, ink), v.inkOpacity);
        v.colourOpacity = setOpacity(
          v.colour,
          Math.max(FLOOR, c),
          v.colourOpacity,
        );
      }
      const water = Math.max(FLOOR, share.water);
      if (water !== stripOpacity) {
        for (const el of stripEls) el.style.opacity = water.toFixed(4);
        stripOpacity = water;
      }
      const land = Math.max(FLOOR, share.land);
      smokeOpacity = setOpacity(smokeCanvas, land, smokeOpacity);

      const px = (UNIT_VH / 100) * height;
      for (const m of movers) {
        shiftFor(m.depth, pose, height, shift);
        let x = shift.x;
        let y = shift.y;
        const s = m.strip;
        if (s) {
          // Crests drift and the swell lifts each strip, the nearer later.
          const period = s.geometry.width / s.geometry.tiles;
          const along = (x / px + s.drift * time) % period;
          x = (along > 0 ? along - period : along) * px;
          y +=
            s.swell *
            px *
            Math.sin(((time - s.swellDelay) * 2 * Math.PI) / s.swellPeriod);
        }
        const w = m.swell;
        if (w) {
          // A plate of swell: its art repeats every period across; it
          // loops as the crests drift, and rises and falls.
          const along = (x / px + w.drift * time) % w.period;
          x = (along > 0 ? along - w.period : along) * px;
          y +=
            w.amp * px * Math.sin(((time - w.delay) * 2 * Math.PI) / w.seconds);
        }
        if (x === m.x && y === m.y) continue;
        m.x = x;
        m.y = y;
        m.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      }
      // The near craft ride the swell at anchor, each its own period and
      // phase: rolling about the waterline, heaving a little, the roll a
      // quarter period ahead of the heave; reflections roll the other way.
      for (const v of views) {
        const r = v.plate.rock;
        if (!r || !v.rock) continue;
        const w = ((time + r.phase) * 2 * Math.PI) / r.period;
        const roll = r.roll * Math.sin(w + Math.PI / 2) * (r.mirror ? -1 : 1);
        const heave =
          r.heave *
          Math.sin(w) *
          (1000 / v.plate.depth) *
          px *
          (r.mirror ? -1 : 1);
        v.rock.style.transform = `translate3d(0, ${(-heave).toFixed(2)}px, 0) rotate(${roll.toFixed(3)}deg)`;
      }
      if (haze)
        haze.style.opacity = (
          Math.max(FLOOR, share.land) *
          (0.82 + 0.18 * Math.sin(time * 0.21))
        ).toFixed(4);
      smoke?.draw(time);
    },
    dispose() {
      painting?.abort();
      window.clearTimeout(resizeTimer);
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

  return (
    <div
      ref={root}
      data-layer="sea"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ visibility: "hidden" }}
    >
      <Layers />
    </div>
  );
}
