"use client";

import { useEffect, useRef } from "react";
import { BOULOGNE_AT, paintingAt } from "../interludes";
import { buildFleet, type MooredCraft, placeCraft } from "./fleet";
import type { SeaViewHandle, SeaViewProps } from "./handle";
import { buildLand, type LandLayer, type Shape } from "./land";
import { EYE_H, mixHex, PALETTE } from "./scene";
import { buildClouds, SKY_STOPS, SKY_TOP } from "./sky";
import { campPlumes, SmokeRenderer } from "./smoke";
import { boxStyle, HORIZON, type Shift, shiftFor, UNIT_VH } from "./view";
import { buildWater, type WaterStrip } from "./water";

/**
 * Boulogne from the sea (docs/scene-02-boulogne-brief.md): the painting the
 * chart turns into at Boulogne. Flat layers each at its depth, moved by the
 * camera's pose (view.ts): the sky, the land (land.ts), the camps' smoke
 * (smoke.ts), the water's strips (water.ts) with the moored craft among
 * them (fleet.ts) and the nearest craft rocking at anchor. Two groups
 * dissolve over the chart: the land and sky first, the water and the craft
 * on it last (interludes.ts, DISSOLVE).
 *
 * Static art throughout: paths are built once when the chunk loads and
 * never change; per frame only wrappers' transforms and opacities move,
 * and the smoke's small canvas is drawn (scene 1's rules, docs/decisions.md).
 */

/** How far from the interlude's p (either side) the painting is drawn faintly, so it is rasterised before the dive needs it. */
const ARM_P = 0.012;
/** The least opacity a shown group keeps: at 0 the browser stops drawing it, and starting again costs a frame. */
const FLOOR = 1 / 255;

const LAND = buildLand();
const WATER = buildWater();
const FLEET = buildFleet();
const CLOUDS = buildClouds();
const PLUMES = campPlumes();
/** The smoke's canvas, layer units: x0, x1, y0 (bottom), y1 (top). */
const SMOKE_BOX = [-1000, 1000, 40, 260] as const;

/**
 * The nearest craft, large in the foreground (stage A: two; the hero art
 * replaces their silhouettes): metres ahead and across, and their rocking
 * at anchor, each its own period and phase.
 */
const HEROES = [
  {
    id: "hero-prame",
    kind: "prame" as const,
    ahead: 150,
    right: -36,
    roll: 0.55,
    heave: 0.18,
    period: 7.9,
    phase: 1.3,
  },
  {
    id: "hero-chaloupe",
    kind: "chaloupe" as const,
    ahead: 76,
    right: 26,
    roll: 0.8,
    heave: 0.22,
    period: 6.3,
    phase: 0,
  },
];

// ------------------------------------------------------------------ art

function ShapePaths({ id, shapes }: { id: string; shapes: readonly Shape[] }) {
  return (
    <>
      <defs>
        {shapes.map((s, i) =>
          s.ramp ? (
            <linearGradient
              // biome-ignore lint/suspicious/noArrayIndexKey: static art, built once
              key={i}
              id={`${id}-${i}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              {s.ramp.map((c, k) => (
                <stop
                  key={c + String(k)}
                  offset={
                    s.ramp && s.ramp.length > 1 ? k / (s.ramp.length - 1) : 0
                  }
                  stopColor={c}
                />
              ))}
            </linearGradient>
          ) : null,
        )}
      </defs>
      {shapes.map((s, i) =>
        s.d ? (
          <path
            // biome-ignore lint/suspicious/noArrayIndexKey: static art, built once
            key={i}
            d={s.d}
            fill={s.ramp ? `url(#${id}-${i})` : s.fill}
            opacity={s.opacity}
          />
        ) : null,
      )}
    </>
  );
}

function LandArt({ layer }: { layer: LandLayer }) {
  const [x0, x1, y0, y1] = layer.box;
  return (
    <div
      data-depth={layer.depth}
      className="absolute will-change-transform"
      style={boxStyle(x0, x1, y0, y1)}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={`${x0} ${-y1} ${x1 - x0} ${y1 - y0}`}
        preserveAspectRatio="none"
        className="block h-full w-full overflow-visible"
      >
        <ShapePaths id={`sea-${layer.id}`} shapes={layer.shapes} />
      </svg>
    </div>
  );
}

function Sky() {
  const y0 = -80;
  const y1 = SKY_TOP;
  const span = y1 - y0;
  const stops = [...SKY_STOPS]
    .reverse()
    .map(([y, c]) => `${c} ${(((y1 - y) / span) * 100).toFixed(2)}%`)
    .join(", ");
  return (
    <div
      data-depth="Infinity"
      className="absolute will-change-transform"
      style={{
        ...boxStyle(-1300, 1300, y0, y1),
        background: `linear-gradient(to bottom, ${stops})`,
      }}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={`-1300 0 2600 ${span}`}
        preserveAspectRatio="none"
        className="absolute inset-0 block h-full w-full"
      >
        <defs>
          <linearGradient id="sea-cloud-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={PALETTE.cloud.lit} />
            <stop offset="0.55" stopColor={PALETTE.cloud.litWarm} />
            <stop offset="1" stopColor={PALETTE.cloud.shade} />
          </linearGradient>
        </defs>
        {CLOUDS.map((c) => (
          <g key={c.art.top + c.art.bottom} opacity={c.opacity}>
            <path d={c.art.body} fill="url(#sea-cloud-body)" />
            <path d={c.art.rim} fill={PALETTE.cloud.shadeDeep} opacity={0.5} />
          </g>
        ))}
      </svg>
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
        left: `calc(50vw - ${(1200 * UNIT_VH).toFixed(4)}vh)`,
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
        <path d={g.inner} fill={strip.inner} opacity={0.55} />
        <path d={g.crest} fill={strip.crest} opacity={0.75} />
      </svg>
    </div>
  );
}

/** A craft's silhouette in metres (smallcraft's four layers), placed in a layer's units. */
function CraftArt({ c, near }: { c: MooredCraft; near: boolean }) {
  const { x, y, scale } = placeCraft(c);
  const mid = c.art.length / 2;
  return (
    <g
      transform={`translate(${x.toFixed(2)} ${(-y).toFixed(2)}) scale(${(scale * (c.bowRight ? 1 : -1)).toFixed(4)} ${scale.toFixed(4)}) translate(${(-mid).toFixed(2)} 0)`}
    >
      <path d={c.art.hull} fill={c.hull} />
      <path d={c.art.spars} fill={c.spar} />
      <path
        d={c.art.rigging}
        fill="none"
        stroke={c.spar}
        strokeWidth={near ? 0.09 : 0.14}
        opacity={0.8}
      />
    </g>
  );
}

function FleetArt({
  id,
  depth,
  craft,
}: {
  id: string;
  depth: number;
  craft: readonly MooredCraft[];
}) {
  const box = [-1000, 1000, -40, 80] as const;
  return (
    <div
      data-depth={depth}
      data-fleet={id}
      className="absolute will-change-transform"
      style={boxStyle(box[0], box[1], box[2], box[3])}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={`${box[0]} ${-box[3]} ${box[1] - box[0]} ${box[3] - box[2]}`}
        preserveAspectRatio="none"
        className="block h-full w-full overflow-visible"
      >
        {craft.map((c, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static art, built once
          <CraftArt key={i} c={c} near={depth < 600} />
        ))}
      </svg>
    </div>
  );
}

/** A hero craft (stage A: the chart's silhouette, large), on its rocking wrapper. */
function Hero({ hero }: { hero: (typeof HEROES)[number] }) {
  const c: MooredCraft = {
    kind: hero.kind,
    art: FLEET_ART[hero.kind],
    ahead: hero.ahead,
    right: hero.right,
    bowRight: true,
    hull: PALETTE.craft.hullNear,
    spar: PALETTE.craft.sparNear,
  };
  const { x, y, scale } = placeCraft(c);
  const half = 30;
  const top = 34;
  const bottom = 4;
  const box = [
    x - half * scale,
    x + half * scale,
    y - bottom * scale,
    y + top * scale,
  ] as const;
  return (
    <div
      data-depth={hero.ahead}
      data-hero={hero.id}
      className="absolute will-change-transform"
      style={boxStyle(box[0], box[1], box[2], box[3])}
    >
      <div
        data-roll={hero.id}
        className="absolute inset-0 will-change-transform"
        style={{
          transformOrigin: `50% ${((top / (top + bottom)) * 100).toFixed(2)}%`,
        }}
      >
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox={`${box[0]} ${-box[3]} ${box[1] - box[0]} ${box[3] - box[2]}`}
          preserveAspectRatio="none"
          className="block h-full w-full overflow-visible"
        >
          <CraftArt c={c} near />
        </svg>
      </div>
    </div>
  );
}

const FLEET_ART = Object.fromEntries(
  FLEET.flatMap((l) => l.craft).map((c) => [c.kind, c.art]),
) as Record<MooredCraft["kind"], MooredCraft["art"]>;

/** Water strips and the craft among them, far to near. */
function Water() {
  const items: { depth: number; node: React.ReactNode }[] = [];
  for (const s of WATER)
    items.push({ depth: s.depth, node: <Strip key={s.id} strip={s} /> });
  for (const l of FLEET)
    items.push({
      depth: l.depth - 1,
      node: <FleetArt key={l.id} id={l.id} depth={l.depth} craft={l.craft} />,
    });
  for (const h of HEROES)
    items.push({ depth: h.ahead - 1, node: <Hero key={h.id} hero={h} /> });
  items.sort((a, b) => b.depth - a.depth);
  return <>{items.map((i) => i.node)}</>;
}

// ------------------------------------------------------------ controller

interface Layer {
  el: HTMLElement;
  depth: number;
  x: number;
  y: number;
  strip: WaterStrip | null;
}

function controller(root: HTMLElement): SeaViewHandle & { dispose(): void } {
  const strips = new Map(WATER.map((s) => [s.id, s]));
  const layers: Layer[] = Array.from(
    root.querySelectorAll<HTMLElement>("[data-depth]"),
  ).map((el) => ({
    el,
    depth: Number(el.dataset.depth),
    x: Number.NaN,
    y: Number.NaN,
    strip: el.dataset.strip ? (strips.get(el.dataset.strip) ?? null) : null,
  }));
  const rolls = HEROES.map((h) => ({
    hero: h,
    el: root.querySelector<HTMLElement>(`[data-roll=${h.id}]`),
  }));
  const land = root.querySelector<HTMLElement>("[data-group=land]");
  const water = root.querySelector<HTMLElement>("[data-group=water]");
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
  let landOpacity = -1;
  let waterOpacity = -1;
  let height = root.clientHeight || window.innerHeight;
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
  const resize = new ResizeObserver(() => {
    height = root.clientHeight || window.innerHeight;
    for (const layer of layers) layer.x = Number.NaN;
    sizeSmoke();
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
    frame(p, at, u, pose, time) {
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
      const px = (UNIT_VH / 100) * height;
      for (const layer of layers) {
        shiftFor(layer.depth, pose, height, shift);
        let x = shift.x;
        let y = shift.y;
        const s = layer.strip;
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
        if (x === layer.x && y === layer.y) continue;
        layer.x = x;
        layer.y = y;
        layer.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      }
      // The heroes ride the swell at anchor, each its own period and phase:
      // rolling about the waterline, heaving a little, pitch leading heave.
      for (const r of rolls) {
        if (!r.el) continue;
        const h = r.hero;
        const w = ((time + h.phase) * 2 * Math.PI) / h.period;
        const roll = h.roll * Math.sin(w + Math.PI / 2);
        const heave = h.heave * Math.sin(w) * (1000 / h.ahead) * px;
        r.el.style.transform = `translate3d(0, ${heave.toFixed(2)}px, 0) rotate(${roll.toFixed(3)}deg)`;
      }
      // The haze over the shore breathes.
      if (haze)
        haze.style.opacity = (0.82 + 0.18 * Math.sin(time * 0.21)).toFixed(3);
      smoke?.draw(time);
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

  const waterTop = -EYE_H; // layer units: the horizon
  return (
    <div
      ref={root}
      data-layer="sea"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ visibility: "hidden" }}
    >
      <div data-group="land" className="absolute inset-0 will-change-[opacity]">
        <Sky />
        {LAND.slice(0, 4).map((l) => (
          <LandArt key={l.id} layer={l} />
        ))}
        <canvas
          data-el="sea-smoke"
          data-depth="1650"
          className="absolute will-change-transform"
          style={boxStyle(
            SMOKE_BOX[0],
            SMOKE_BOX[1],
            SMOKE_BOX[2],
            SMOKE_BOX[3],
          )}
        />
        {LAND.slice(4).map((l) => (
          <LandArt key={l.id} layer={l} />
        ))}
        <div
          data-el="sea-haze"
          data-depth="1300"
          className="absolute will-change-[transform,opacity]"
          style={{
            ...boxStyle(-1100, 1100, -12, 70),
            background: `linear-gradient(to bottom, rgba(205,191,174,0) 0%, rgba(205,191,174,0.18) 55%, rgba(214,200,178,0.42) 88%, rgba(214,200,178,0.2) 100%)`,
          }}
        />
      </div>
      <div
        data-group="water"
        className="absolute inset-0 will-change-[opacity]"
      >
        <div
          data-depth="900"
          className="absolute will-change-transform"
          style={{
            ...boxStyle(-1300, 1300, -900, waterTop + 6),
            background: `linear-gradient(to bottom, ${PALETTE.sea.farBody} 0%, ${PALETTE.sea.midBody} 6%, ${PALETTE.sea.nearBody} 40%, ${PALETTE.sea.nearInner} 100%)`,
          }}
        />
        <Water />
      </div>
    </div>
  );
}
