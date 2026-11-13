"use client";

import {
  type CSSProperties,
  type ReactNode,
  type Ref,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  buildCraftArt,
  type CraftArt,
  type CraftBox,
  type CraftFlag,
} from "./geometry/index";
import { type CraftPalette, mix, paletteOf } from "./light";
import type { CraftLighting, CraftSpec, CraftVariant } from "./types";

/**
 * A craft of the invasion flotilla at anchor, in starboard elevation, from
 * a CraftSpec: static SVG, one unit one metre. Nothing inside it changes
 * after the first paint; the scene moves, rocks and fades the root (and the
 * flags' wrappers), pivoting on the waterline at the hull's mid-length
 * (`craftBox(spec).pivot`, or the handle's `box`).
 *
 * `pxPerMetre` is the scale the craft is drawn at (CSS px per metre): it
 * sizes the root and sets the pens, so the rigging reads as thin,
 * low-contrast lines at any size (as the chart atlas hints its pens).
 *
 * Variants: "hero", the full drawing; "reflection", the drawing above the
 * water as a few dark shapes, for the painting to set in the water (upright
 * in the hero's box; `flip` draws it upside down about the waterline in a
 * mirrored box, the waterline then at `1 - pivot.y` from the top).
 */

export interface CraftHandle {
  root: HTMLDivElement | null;
  /** One wrapper per flag (its transform origin at the hoist's top). */
  flags: HTMLDivElement[];
  /** Two wave frames per flag, for crossfading: flagFrames[i] = [a, b]. */
  flagFrames: [HTMLDivElement | null, HTMLDivElement | null][];
  box: CraftBox;
}

export interface CraftProps {
  spec: CraftSpec;
  variant?: CraftVariant;
  lighting?: CraftLighting;
  /** CSS px per metre at which the craft is shown (sizes the root, sets the pens). */
  pxPerMetre: number;
  /** Size the root from pxPerMetre; false leaves the width to className or style. */
  autoSize?: boolean;
  showFlags?: boolean;
  /** The boat astern, where the spec has one. */
  showBoat?: boolean;
  /** Reflection: the tones of its shapes (defaults from the lighting). */
  reflectionTones?: Partial<
    Record<"hull" | "spars" | "canvas" | "flags", string>
  >;
  /** Reflection: drawn upside down about the waterline. */
  flip?: boolean;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<CraftHandle>;
}

const pct = (n: number) => `${Math.round(n * 100000) / 1000}%`;

/** Pens, metres: a hairline in CSS px at this scale, or the rope's own thickness if larger. */
function pens(pxPerMetre: number, k: number) {
  const pen = (css: number, metres: number) =>
    Math.max(css / pxPerMetre, metres);
  return {
    stays: pen(0.9, 0.07 * k),
    staysLight: pen(0.6, 0.04 * k),
    heavy: pen(0.9, 0.07 * k),
    shrouds: pen(0.72, 0.055 * k),
    light: pen(0.55, 0.035 * k),
    ratlines: pen(0.38, 0.016 * k),
    running: pen(0.45, 0.022 * k),
    lanyards: pen(0.36, 0.014 * k),
    chain: pen(0.55, 0.045 * k),
    gammoning: pen(0.55, 0.04 * k),
    seams: pen(0.42, 0.012),
    butts: pen(0.36, 0.01),
    gaskets: pen(0.55, 0.026 * k),
    folds: pen(0.5, 0.018),
    glint: pen(0.6, 0.018),
    edge: pen(0.45, 0.012),
  };
}

const FLAG_COLOURS: Record<string, keyof CraftPalette["flag"]> = {
  "#ece6d8": "white",
  "#b3261e": "red",
  "#1f2f5c": "blue",
};

export function Craft({
  spec,
  variant = "hero",
  lighting = "evening",
  pxPerMetre,
  autoSize = true,
  showFlags = true,
  showBoat = true,
  reflectionTones,
  flip = false,
  className,
  style,
  ref,
}: CraftProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const art = useMemo(() => buildCraftArt(spec), [spec]);
  const palette = useMemo(
    () => paletteOf(spec.paint, lighting),
    [spec, lighting],
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const flagRefs = useRef<HTMLDivElement[]>([]);
  const frameRefs = useRef<[HTMLDivElement | null, HTMLDivElement | null][]>(
    [],
  );

  const box: CraftBox = {
    viewBox: art.viewBox,
    pivot: art.pivot,
    midX: art.midX,
  };
  useImperativeHandle(ref, () => ({
    root: rootRef.current,
    flags: flagRefs.current.filter(Boolean),
    flagFrames: frameRefs.current,
    box,
  }));

  const vb = art.viewBox;
  const hero = variant === "hero";
  const mirrored = !hero && flip;
  const viewBox = mirrored
    ? `${vb.x} ${-(vb.y + vb.height)} ${vb.width} ${vb.height}`
    : `${vb.x} ${vb.y} ${vb.width} ${vb.height}`;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-craft={spec.id}
      data-variant={variant}
      className={className}
      style={{
        position: "relative",
        aspectRatio: `${vb.width} / ${vb.height}`,
        ...(autoSize ? { width: `${vb.width * pxPerMetre}px` } : null),
        ...style,
      }}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={viewBox}
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0, display: "block" }}
      >
        {hero ? (
          <HeroArt
            art={art}
            p={palette}
            pen={pens(
              pxPerMetre,
              Math.min(1, Math.max(0.45, spec.hull.length / 34.8)),
            )}
            uid={uid}
            showBoat={showBoat}
          />
        ) : (
          <ReflectionArt
            art={art}
            p={palette}
            tones={reflectionTones}
            uid={uid}
            flip={mirrored}
          />
        )}
      </svg>

      {hero && showFlags
        ? art.flags.map((flag, i) => (
            <Flag
              key={flag.kind}
              flag={flag}
              art={art}
              p={palette}
              wrapperRef={(el) => {
                if (el) flagRefs.current[i] = el;
              }}
              frameRef={(k, el) => {
                frameRefs.current[i] ??= [null, null];
                frameRefs.current[i][k] = el;
              }}
            />
          ))
        : null}
    </div>
  );
}

function Flag({
  flag,
  art,
  p,
  wrapperRef,
  frameRef,
}: {
  flag: CraftFlag;
  art: CraftArt;
  p: CraftPalette;
  wrapperRef: (el: HTMLDivElement | null) => void;
  frameRef: (k: number, el: HTMLDivElement | null) => void;
}) {
  const vb = art.viewBox;
  const { anchor, fly, height } = flag;
  return (
    <div
      ref={wrapperRef}
      data-flag={flag.kind}
      style={{
        position: "absolute",
        left: pct((anchor[0] - fly - vb.x) / vb.width),
        top: pct((-anchor[1] - vb.y) / vb.height),
        width: pct(fly / vb.width),
        height: pct(height / vb.height),
        // The hoist's top: the flag streams aft, to the left of it.
        transformOrigin: "100% 0",
        pointerEvents: "none",
      }}
    >
      {flag.frames.map((frame, k) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: two fixed frames
          key={k}
          ref={(el) => frameRef(k, el)}
          data-flag-frame={k}
          style={{ position: "absolute", inset: 0, opacity: k === 0 ? 1 : 0 }}
        >
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox={`0 0 ${fly} ${height}`}
            width="100%"
            height="100%"
            style={{ display: "block", overflow: "visible" }}
          >
            <g transform={`translate(${fly} 0) scale(-1 1)`}>
              {frame.layers.map((layer) => (
                <path
                  key={layer.fill + layer.d.length}
                  d={layer.d}
                  fill={
                    p.flag[FLAG_COLOURS[layer.fill.toLowerCase()] ?? "white"]
                  }
                />
              ))}
              {"shade" in frame ? (
                <path d={frame.shade} fill={p.flag.shade} opacity={0.2} />
              ) : null}
            </g>
          </svg>
        </div>
      ))}
    </div>
  );
}

function ReflectionArt({
  art,
  p,
  tones,
  uid,
  flip,
}: {
  art: CraftArt;
  p: CraftPalette;
  tones: CraftProps["reflectionTones"];
  uid: string;
  flip: boolean;
}) {
  const vb = art.viewBox;
  const r = art.reflection;
  const hull = tones?.hull ?? mix(p.hull.under, "#10151b", 0.35);
  const spars = tones?.spars ?? mix(p.spar.under, "#10151b", 0.25);
  const canvas = tones?.canvas ?? mix(p.canvas.under, p.hull.under, 0.35);
  const flags = tones?.flags ?? mix(p.flag.red, p.hull.under, 0.55);
  return (
    <>
      <defs>
        <clipPath id={`${uid}-above`}>
          <rect x={vb.x} y={vb.y} width={vb.width} height={-vb.y} />
        </clipPath>
      </defs>
      <g
        clipPath={`url(#${uid}-above)`}
        transform={flip ? "scale(1 -1)" : undefined}
      >
        <path d={r.canvas} fill={canvas} />
        <path d={r.spars} fill={spars} />
        <path d={r.flags} fill={flags} />
        <path d={r.hull} fill={hull} />
      </g>
    </>
  );
}

function HeroArt({
  art,
  p,
  pen,
  uid,
  showBoat,
}: {
  art: CraftArt;
  p: CraftPalette;
  pen: ReturnType<typeof pens>;
  uid: string;
  showBoat: boolean;
}) {
  const { hull: h, rig: g, rigging: rg, fittings: f, spec } = art;
  const hs = spec.hull;
  const line = (
    d: string,
    stroke: string,
    width: number,
    opacity = 1,
    cap: "round" | "butt" = "round",
  ): ReactNode =>
    d ? (
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        opacity={opacity}
        strokeLinecap={cap}
        strokeLinejoin="round"
      />
    ) : null;
  const fill = (d: string, colour: string, opacity = 1): ReactNode =>
    d ? (
      <path d={d} fill={colour} opacity={opacity === 1 ? undefined : opacity} />
    ) : null;
  const clip = `url(#${uid}-hull)`;
  const deckLow = hs.deck;
  const xs = -hs.sternRake;
  const xe = hs.length + hs.stemRake;

  return (
    <>
      <defs>
        <clipPath id={`${uid}-hull`}>
          <path d={h.outline} />
        </clipPath>
        {/* The side darkens toward the water, where it curves in and sees the sea. */}
        <linearGradient
          id={`${uid}-low`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          x2="0"
          y1={-(deckLow + 0.2)}
          y2="0.1"
        >
          <stop offset="0" stopColor={p.hull.low} stopOpacity="0" />
          <stop offset="0.55" stopColor={p.hull.low} stopOpacity="0.32" />
          <stop offset="1" stopColor={p.hull.under} stopOpacity="0.8" />
        </linearGradient>
        {/* The bow turns away from the sun; the stern's quarter less so. */}
        <linearGradient
          id={`${uid}-ends`}
          gradientUnits="userSpaceOnUse"
          x1={xs}
          x2={xe}
          y1="0"
          y2="0"
        >
          <stop
            offset="0"
            stopColor={p.hull.turned}
            stopOpacity={hs.pointed ? "0.5" : "0.22"}
          />
          <stop offset="0.1" stopColor={p.hull.turned} stopOpacity="0" />
          <stop offset="0.78" stopColor={p.hull.turned} stopOpacity="0" />
          <stop offset="1" stopColor={p.hull.turned} stopOpacity="0.62" />
        </linearGradient>
      </defs>

      {/* An open boat's far side, seen over the near gunwale. */}
      {fill(h.farInside, p.inside.side)}
      {fill(h.farGunwale, p.rail.top)}

      {/* A boat astern on her painter. */}
      {showBoat && f.boat ? (
        <g data-part="boat">
          {fill(f.boat.inside, p.inside.side)}
          {fill(f.boat.hull, p.hull.side)}
          {fill(f.boat.shade, p.hull.under, 0.55)}
          {line(f.boat.seams, p.hull.shadow, pen.seams, 0.5)}
          {fill(f.boat.strake, p.rail.side)}
          {line(f.boat.painter, p.running.side, pen.running, 0.8)}
        </g>
      ) : null}

      {/* Masts, tops and caps; the bowsprit and other spars. */}
      {fill(g.masts, p.mast.side)}
      {fill(g.mastShade, p.mast.turned)}
      {fill(g.mastGlint, p.glint, 0.35)}
      {fill(g.mastBands, p.iron.side, 0.85)}
      {fill(g.heads, p.spar.side)}
      {fill(g.headShade, p.spar.under)}
      {fill(g.spars, p.mast.side)}
      {fill(g.sparShade, p.mast.under)}
      {fill(g.sparGlint, p.glint, 0.3)}
      {fill(g.darkSpars, p.spar.side)}
      {fill(g.darkSparShade, p.spar.under)}

      {/* Stays, behind the yards. */}
      {line(rg.stays, p.rope.side, pen.stays, 0.92)}
      {line(rg.staysLight, p.rope.side, pen.staysLight, 0.85)}

      {/* Yards, and the canvas furled on them. */}
      {fill(g.yards, p.spar.side)}
      {fill(g.yardShade, p.spar.under)}
      {fill(g.yardGlint, p.glint, 0.22)}
      {fill(g.canvas, p.canvas.side)}
      {fill(g.canvasLower, p.canvas.under, 0.85)}
      {fill(g.canvasUpper, p.canvas.top, 0.75)}
      {line(g.canvasFolds, p.canvas.under, pen.folds, 0.55)}
      {line(g.canvasGlint, p.glint, pen.glint, 0.5)}
      {line(g.gaskets, p.rope.turned, pen.gaskets, 0.75, "butt")}

      {/* Inboard: the galley's chimney, the chase guns, lowered yards, oars. */}
      {fill(f.chimney, p.iron.side)}
      {fill(f.chimneyShade, p.iron.turned)}
      {fill(f.gunSlides, p.rail.turned)}
      {fill(f.guns, p.iron.side)}
      {fill(f.gunShade, p.iron.under)}
      {fill(f.gunGlint, p.glint, 0.3)}
      {fill(g.lugYards, p.spar.side)}
      {fill(g.lugYardShade, p.spar.under)}
      {fill(g.lugCanvas, p.canvas.side)}
      {fill(g.lugCanvasLower, p.canvas.under, 0.85)}
      {fill(g.lugCanvasUpper, p.canvas.top, 0.75)}
      {line(g.lugFolds, p.canvas.under, pen.folds, 0.55)}
      {line(g.lugGaskets, p.rope.turned, pen.gaskets, 0.75, "butt")}
      {fill(f.oars, p.rail.side)}
      {fill(f.oarShade, p.rail.under)}

      {/* The hull. */}
      <path d={h.outline} fill={p.hull.side} />
      <g clipPath={clip}>
        {fill(h.bottom, p.bottom.low)}
        {fill(h.strakesLight, p.hull.top, 0.1)}
        {fill(h.strakesDark, p.hull.shadow, 0.14)}
        {h.band && p.band ? fill(h.band, p.band.side) : null}
        {fill(h.faded, p.hull.top, 0.09)}
        {line(h.seams, p.hull.shadow, pen.seams, 0.5)}
        {line(h.butts, p.hull.shadow, pen.butts, 0.32, "butt")}
        {h.bandEdges && p.band
          ? line(h.bandEdges, p.band.under, pen.edge, 0.6)
          : null}
        {fill(h.wales, p.wale.side)}
        {fill(h.waleTops, p.wale.top)}
        {fill(h.waleUnders, p.wale.under, 0.85)}
        {fill(h.streaks, p.cast, 0.16)}
        <path d={h.outline} fill={`url(#${uid}-low)`} />
        <path d={h.outline} fill={`url(#${uid}-ends)`} />
        {fill(h.waterStain, "#283328", 0.42)}
        {fill(h.railUnder, p.cast, 0.32)}
        {fill(h.railCap, p.rail.side)}
        {fill(h.railTop, p.rail.top)}
      </g>
      {fill(h.stem, p.hull.turned, 0.85)}

      {/* Ports and the guns run out through them. */}
      {fill(h.ports, p.inside.shadow)}
      {fill(h.portLintels, p.cast, 0.55)}
      {fill(h.portSills, p.rail.top)}
      {fill(h.muzzleShadows, p.cast, 0.5)}
      {fill(h.muzzleRings, p.iron.turned)}
      {fill(h.muzzleFaces, p.iron.side)}
      {fill(h.muzzleBores, "#0c0b0a")}
      {fill(h.muzzleGlints, p.glint, 0.5)}

      {/* The rudder and its irons, the tiller, the hawse. */}
      {fill(h.rudder, p.hull.side)}
      {fill(h.rudderEdge, p.hull.turned)}
      <path d={h.rudder} fill={`url(#${uid}-low)`} />
      {fill(h.rudderIrons, p.iron.side)}
      {fill(h.rudderIronTops, p.iron.top)}
      {fill(h.tiller, p.rail.side)}
      {fill(h.hawseRims, p.hull.top)}
      {fill(h.hawse, "#0c0b0a")}

      {/* Channels, chain plates, deadeyes and lanyards. */}
      {fill(rg.channelShadows, p.cast, 0.4)}
      {fill(rg.channels, p.hull.side)}
      {fill(rg.channelTops, p.hull.top)}
      {line(rg.chainShadows, p.cast, pen.chain, 0.32)}
      {line(rg.chainPlates, p.iron.side, pen.chain, 0.95)}
      {fill(rg.deadeyes, p.rope.shadow)}
      {fill(rg.deadeyeGlints, p.rope.top, 0.45)}
      {line(rg.lanyards, p.running.side, pen.lanyards, 0.8)}

      {/* Rigging in front. */}
      {line(rg.shrouds, p.rope.side, pen.shrouds, 0.9)}
      {line(rg.ratlines, p.rope.side, pen.ratlines, 0.62, "butt")}
      {line(rg.light, p.rope.side, pen.light, 0.85)}
      {line(rg.heavy, p.rope.side, pen.heavy, 0.9)}
      {line(rg.running, p.running.side, pen.running, 0.62)}
      {line(rg.gammoning, p.rope.side, pen.gammoning, 0.9)}

      {/* The cable into the water ahead; the catted anchor. */}
      {fill(rg.cable, p.rope.side)}
      {fill(rg.cableShade, p.rope.under, 0.8)}
      {fill(rg.cableGlint, p.rope.top, 0.7)}
      {fill(rg.cathead, p.hull.side)}
      {fill(rg.catheadTop, p.hull.top)}
      {fill(rg.anchorShadow, p.cast, 0.35)}
      {fill(rg.anchor, p.iron.side)}
      {fill(rg.anchorShade, p.iron.under, 0.8)}

      {/* Thole pins on a péniche's gunwale. */}
      {fill(f.tholes, p.rail.side)}
    </>
  );
}
