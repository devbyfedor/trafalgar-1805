"use client";

import { useEffect, useRef } from "react";
import { GlitterRenderer } from "@/components/fx/glitter";
import {
  BOULOGNE_AT,
  type PaintingShare,
  paintingAt,
  smooth,
} from "../interludes";
import type { SeaViewHandle, SeaViewProps } from "./handle";
import { DUSK_AT, duskOf, duskShare } from "./paint/dusk";
import {
  type Plate,
  type PlateDusk,
  type PlateGroup,
  paintOrder,
} from "./paint/plate";
import { type PlateTarget, paintPlates } from "./paint/raster";
import { buildPlates } from "./plates";
import { KITCHENS } from "./plates/north";
import { MOON } from "./plates/sky";
import { TOWN_SMOKE } from "./plates/town";
import { mixHex, PALETTE } from "./scene";
import { SmokeRenderer, smokeGroups } from "./smoke";
import { boxStyle, type Shift, shiftFor, UNIT_VH } from "./view";

/**
 * Boulogne from the sea (docs/scene-02-boulogne-brief.md): the painting the
 * chart turns into at Boulogne. Plates, each a flat layer at its depth
 * (paint/plate.ts), painted once before the dive into two rasters, colour
 * and engraving (paint/raster.ts), in idle slices; per frame the wrappers
 * move with the camera's pose (view.ts) and the rasters fade by the
 * transition (interludes.ts, TRANSITION): the engraving over the chart,
 * then each group's colour over the engraving. The swell's plates, the
 * rocking craft, the smoke of the camps and the town and the haze are the
 * moving parts, as scene 1's are.
 */

/** How far from the interlude's p (either side) the painting is drawn faintly, so its layers are on the GPU before the dive needs them. */
const ARM_P = 0.012;
/** The least opacity a shown raster keeps while the painting is in play: at 0 the browser stops drawing it, and starting again costs a frame. */
const FLOOR = 1 / 255;
/** How near (in p) the reader may come to Boulogne before the painting's preparation takes bigger slices. */
const URGENT_P = 0.04;

const PLATES = buildPlates();
/** The smoke's canvases, each at its own depth (smoke.ts). */
const SMOKE = smokeGroups(KITCHENS, TOWN_SMOKE);

/**
 * The moon's path on the water at dusk (paint/dusk.ts): glints under the
 * moon in a column from the sea's far edge toward the eye, scene 1's
 * glitter in the moon's light. A reflection of a thing at an infinite
 * depth: it moves with the camera's turn, not with the drift. Painted
 * over the swell and under the craft's reflections (their hulls hide it).
 * Layer units: x about the moon's; from the sea's edge at low water (y
 * -15, about 400 m ahead) down past the frame's foot.
 */
const GLADE = {
  box: [MOON.x - 64, MOON.x + 64, -300, -15] as const,
  order: 21,
};
/** The smoke's cool grey at dusk, and how far the puffs go toward it. */
const SMOKE_DUSK = { colour: "#6d6a80", amount: 0.55 };
/** The haze over the land at dusk: cool, violet-grey, a little denser. */
const HAZE_DUSK =
  "linear-gradient(to bottom, rgba(120,114,146,0) 0%, rgba(120,114,146,0.16) 55%, rgba(128,120,150,0.36) 88%, rgba(128,120,150,0.18) 100%)";

// ------------------------------------------------------------------ art

function PlateArt({ plate }: { plate: Plate }) {
  const [x0, x1, y0, y1] = plate.box;
  const dusk = duskOf(plate);
  const has = (m: "ink" | "colour") =>
    !plate.rasters || plate.rasters.includes(m);
  const canvases = (
    <>
      {has("ink") ? (
        <canvas
          data-mode="ink"
          className="absolute inset-0 block h-full w-full will-change-[opacity]"
          style={{ opacity: 0 }}
        />
      ) : null}
      {has("colour") ? (
        <canvas
          data-mode="colour"
          className="absolute inset-0 block h-full w-full will-change-[opacity]"
          style={{ opacity: 0 }}
        />
      ) : null}
      {dusk && (!plate.rasters || plate.rasters.includes("dusk")) ? (
        <canvas
          data-mode="dusk"
          className={`absolute inset-0 block h-full w-full ${dusk.rise ? "will-change-[transform,opacity]" : "will-change-[opacity]"}`}
          style={{ opacity: 0 }}
        />
      ) : null}
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

/** Everything in paint order, far to near: plates, the smoke and the haze. */
function Layers() {
  const items: { depth: number; node: React.ReactNode }[] = [];
  for (const p of PLATES)
    items.push({
      depth: paintOrder(p),
      node: <PlateArt key={p.id} plate={p} />,
    });
  for (const g of SMOKE)
    items.push({
      depth: g.depth,
      node: (
        <canvas
          key={`smoke-${g.id}`}
          data-el="sea-smoke"
          data-smoke={g.id}
          data-depth={g.depth}
          className="absolute will-change-[transform,opacity]"
          style={{
            ...boxStyle(g.box[0], g.box[1], g.box[2], g.box[3]),
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
  items.push({
    depth: 1298.9,
    node: (
      <div
        key="haze-dusk"
        data-el="sea-haze-dusk"
        data-depth="1300"
        className="absolute will-change-[transform,opacity]"
        style={{
          ...boxStyle(-1100, 1100, -12, 70),
          opacity: 0,
          background: HAZE_DUSK,
        }}
      />
    ),
  });
  items.push({
    depth: GLADE.order,
    node: (
      <canvas
        key="glade"
        data-el="sea-glade"
        data-depth="Infinity"
        className="absolute will-change-[transform,opacity]"
        style={{
          ...boxStyle(GLADE.box[0], GLADE.box[1], GLADE.box[2], GLADE.box[3]),
          opacity: 0,
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
  swell: Plate["swell"] | null;
  bob: Plate["bob"] | null;
}

interface PlateView {
  plate: Plate;
  ink: HTMLCanvasElement | null;
  colour: HTMLCanvasElement | null;
  dusk: HTMLCanvasElement | null;
  duskSpec: PlateDusk | null;
  rock: HTMLElement | null;
  inkOpacity: number;
  colourOpacity: number;
  duskOpacity: number;
  duskRise: number;
}

function controller(root: HTMLElement): SeaViewHandle & { dispose(): void } {
  const movers: Mover[] = Array.from(
    root.querySelectorAll<HTMLElement>("[data-depth]"),
  ).map((el) => ({
    el,
    depth: Number(el.dataset.depth),
    x: Number.NaN,
    y: Number.NaN,
    swell: el.dataset.plate
      ? (PLATES.find((p) => p.id === el.dataset.plate)?.swell ?? null)
      : null,
    bob: el.dataset.plate
      ? (PLATES.find((p) => p.id === el.dataset.plate)?.bob ?? null)
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
      dusk:
        box?.querySelector<HTMLCanvasElement>("canvas[data-mode=dusk]") ?? null,
      duskSpec: duskOf(plate),
      rock: box?.querySelector<HTMLElement>("[data-rock]") ?? null,
      inkOpacity: -1,
      colourOpacity: -1,
      duskOpacity: -1,
      duskRise: Number.NaN,
    };
  });
  const haze = root.querySelector<HTMLElement>("[data-el=sea-haze]");
  const hazeDusk = root.querySelector<HTMLElement>("[data-el=sea-haze-dusk]");
  const gladeCanvas = root.querySelector<HTMLCanvasElement>(
    "canvas[data-el=sea-glade]",
  );
  const glade = gladeCanvas
    ? new GlitterRenderer(gladeCanvas, {
        seed: 1805_08_10,
        count: 260,
        color: "#f4ead2",
        halfWidthTop: 0.06,
        halfWidthBottom: 0.5,
      })
    : null;
  let gladeOpacity = -1;
  let gladeOn = false;
  // Wood smoke, front-lit by the low sun behind the eye: a warm light grey,
  // lighter than the blue sky above and a little darker than the pale sky
  // low down, so it reads against both without a dirty, sooty column.
  const smokeColour = mixHex(PALETTE.cloud.shade, "#7d6f66", 0.5);
  const smokes = SMOKE.flatMap((g) => {
    const canvas = root.querySelector<HTMLCanvasElement>(
      `canvas[data-smoke="${g.id}"]`,
    );
    return canvas
      ? [
          {
            group: g,
            canvas,
            renderer: new SmokeRenderer(canvas, g.plumes, g.box, smokeColour),
            opacity: -1,
          },
        ]
      : [];
  });

  let shown: "hidden" | "armed" | "on" = "hidden";
  let ready = false;
  let lastP = 0;
  let height = root.clientHeight || window.innerHeight;
  let dpr = window.devicePixelRatio || 1;
  let painting: AbortController | null = null;

  const targets: PlateTarget[] = views.map((v) => ({
    plate: v.plate,
    canvases: {
      ...(v.ink ? { ink: v.ink } : {}),
      ...(v.colour ? { colour: v.colour } : {}),
      ...(v.dusk ? { dusk: v.dusk } : {}),
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
    const px = (UNIT_VH / 100) * height;
    for (const s of smokes) {
      const [x0, x1, y0, y1] = s.group.box;
      s.renderer.resize((x1 - x0) * px, (y1 - y0) * px, px);
    }
    const [g0, g1, g2, g3] = GLADE.box;
    glade?.resize((g1 - g0) * px, (g3 - g2) * px);
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
      // The hold's progress for the dusk: none on the dive, the hold's own
      // through it, all of it on the rise (the rise leaves from the dusk).
      const evening = !at
        ? 0
        : at.phase === "dive"
          ? 0
          : at.phase === "hold"
            ? at.t
            : 1;
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
        const d = v.duskSpec;
        if (d && v.dusk) {
          const k = duskShare(d.at, evening);
          let o = c * k;
          if (d.flicker && o > 0)
            o *=
              1 -
              d.flicker *
                (0.5 +
                  0.3 * Math.sin(time * 7.3 + d.at[0] * 40) +
                  0.2 * Math.sin(time * 12.9 + d.at[1] * 70));
          v.duskOpacity = setOpacity(v.dusk, Math.max(FLOOR, o), v.duskOpacity);
          if (d.rise) {
            const rise = d.rise * k;
            if (rise !== v.duskRise) {
              v.duskRise = rise;
              v.dusk.style.transform = `translate3d(0, ${(-rise * (UNIT_VH / 100) * height).toFixed(2)}px, 0)`;
            }
          }
        }
      }
      const land = Math.max(FLOOR, share.land);
      for (const s of smokes) {
        s.opacity = setOpacity(s.canvas, land, s.opacity);
        s.renderer.setTint(
          SMOKE_DUSK.colour,
          SMOKE_DUSK.amount * duskShare(DUSK_AT.nearLand, evening),
        );
      }

      const px = (UNIT_VH / 100) * height;
      for (const m of movers) {
        shiftFor(m.depth, pose, height, shift);
        let x = shift.x;
        let y = shift.y;
        const w = m.swell;
        if (w) {
          // A plate of swell: its art repeats every period across; it
          // loops as the crests drift, and rises and falls.
          const along = (x / px + w.drift * time) % w.period;
          x = (along > 0 ? along - w.period : along) * px;
          y +=
            w.amp * px * Math.sin(((time - w.delay) * 2 * Math.PI) / w.seconds);
        }
        const b = m.bob;
        if (b) {
          // A moored row rising and falling with the swell, all together.
          y -=
            b.heave *
            (1000 / m.depth) *
            px *
            Math.sin(((time + b.phase) * 2 * Math.PI) / b.period);
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
      const breathe = 0.82 + 0.18 * Math.sin(time * 0.21);
      const hazeDuskShare = duskShare(DUSK_AT.nearLand, evening);
      if (haze)
        haze.style.opacity = (
          Math.max(FLOOR, share.land) *
          breathe *
          (1 - hazeDuskShare)
        ).toFixed(4);
      if (hazeDusk)
        hazeDusk.style.opacity = Math.max(
          FLOOR,
          share.land * breathe * hazeDuskShare,
        ).toFixed(4);
      for (const s of smokes) s.renderer.draw(time);
      // The moon's path: drawn only while it shows.
      if (glade && gladeCanvas) {
        // Gone early in the rise: it lies at the moon's depression,
        // whatever the eye's height, while the sea's far edge climbs the
        // frame as the eye rises, so it would soon lie on the strand.
        const leaving = at?.phase === "rise" ? 1 - smooth(0, 0.12, at.t) : 1;
        const g = share.water * leaving * duskShare(DUSK_AT.glade, evening);
        gladeOpacity = setOpacity(
          gladeCanvas,
          Math.max(FLOOR, g),
          gladeOpacity,
        );
        if (g > 0.002) {
          glade.setIntensity(1);
          glade.draw(time);
          gladeOn = true;
        } else if (gladeOn) {
          glade.clear();
          gladeOn = false;
        }
      }
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
