"use client";

import {
  type CSSProperties,
  type Ref,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { BOW_WAVE_BOX, BowWaveArt } from "./BowWave";
import { buildFlag } from "./geometry/flags";
import { buildShip, type ShipGeometry } from "./geometry/index";
import type { SailArt } from "./geometry/sails";
import type { Detail, Lighting, ShipSpec } from "./types";

/**
 * A ship of the line in starboard elevation, rendered from a ShipSpec.
 *
 * The component only renders; geometry comes from pure functions. Layers:
 * - the base art (static after first paint);
 * - a warm-light layer ("dawn" lighting): sunward edges in warm light, in
 *   its own SVG so the scene animates only its wrapper's opacity;
 * - flags and the bow wave as separate small elements the scene can drive.
 *
 * Size it by giving the root a width; the height follows the aspect ratio.
 * One SVG user unit is one metre.
 */

export interface ShipHandle {
  root: HTMLDivElement | null;
  /** Wrapper of the warm-light layer (opacity 0..1). */
  warmLight: HTMLDivElement | null;
  /** One wrapper per flag (transform-origin at the hoist's top). */
  flags: HTMLDivElement[];
  /** Two wave frames per flag, for crossfading: flagFrames[i] = [a, b]. */
  flagFrames: [HTMLDivElement | null, HTMLDivElement | null][];
  bowWave: HTMLDivElement | null;
}

export interface ShipOfTheLineProps {
  spec: ShipSpec;
  detail?: Detail;
  lighting?: Lighting;
  /** Fill for silhouette mode. */
  fill?: string;
  /** Initial opacity of the warm-light layer (the scene animates it). */
  warmth?: number;
  /** Render flags and the bow wave (hero only). */
  showFlags?: boolean;
  showBowWave?: boolean;
  /** Silhouette only: cut the drawing at the waterline (for ships set into the sea). */
  cutAtWaterline?: boolean;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<ShipHandle>;
}

const pct = (n: number) => `${Math.round(n * 10000) / 100}%`;

export function ShipOfTheLine({
  spec,
  detail = "hero",
  lighting = "neutral",
  fill = "#2a3038",
  warmth = 1,
  showFlags = true,
  showBowWave = true,
  cutAtWaterline = false,
  className,
  style,
  ref,
}: ShipOfTheLineProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const geometry = useMemo(() => buildShip(spec, detail), [spec, detail]);
  const rootRef = useRef<HTMLDivElement>(null);
  const warmRef = useRef<HTMLDivElement>(null);
  const flagRefs = useRef<HTMLDivElement[]>([]);
  const frameRefs = useRef<[HTMLDivElement | null, HTMLDivElement | null][]>(
    [],
  );
  const bowRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    root: rootRef.current,
    warmLight: warmRef.current,
    flags: flagRefs.current.filter(Boolean),
    flagFrames: frameRefs.current,
    bowWave: bowRef.current,
  }));

  const { viewBox: vb } = geometry;
  const viewBox = `${vb.x} ${vb.y} ${vb.width} ${vb.height}`;
  const hero = detail === "hero";

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-ship={spec.id}
      data-detail={detail}
      className={className}
      style={{
        position: "relative",
        aspectRatio: `${vb.width} / ${vb.height}`,
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
          <HeroArt g={geometry} spec={spec} uid={uid} />
        ) : (
          <SilhouetteArt
            g={geometry}
            fill={fill}
            uid={uid}
            cut={cutAtWaterline}
          />
        )}
      </svg>

      {hero && lighting === "dawn" ? (
        <div
          ref={warmRef}
          data-layer="warm-light"
          style={{
            position: "absolute",
            inset: 0,
            opacity: warmth,
            pointerEvents: "none",
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
            <WarmArt g={geometry} spec={spec} uid={uid} />
          </svg>
        </div>
      ) : null}

      {hero && showFlags
        ? geometry.flags.map((flag, i) => {
            const { spec: f, anchor } = flag;
            const frames = [0, Math.PI].map((phase) =>
              buildFlag(f.design, f.fly, f.hoist, {
                amplitude: 0.07,
                waves: 1.25,
                phase,
                droop: 0.22,
              }),
            );
            const h = frames[0].height + f.hoist * 0.2;
            return (
              <div
                key={f.id}
                ref={(el) => {
                  if (el) flagRefs.current[i] = el;
                }}
                data-flag={f.id}
                style={{
                  position: "absolute",
                  left: pct((anchor[0] - vb.x) / vb.width),
                  top: pct((-anchor[1] - vb.y) / vb.height),
                  width: pct(f.fly / vb.width),
                  height: pct(h / vb.height),
                  transformOrigin: "0 0",
                  pointerEvents: "none",
                }}
              >
                {frames.map((frame, k) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: two fixed frames
                    key={k}
                    ref={(el) => {
                      frameRefs.current[i] ??= [null, null];
                      frameRefs.current[i][k] = el;
                    }}
                    data-flag-frame={k}
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: k === 0 ? 1 : 0,
                    }}
                  >
                    <svg
                      aria-hidden="true"
                      focusable="false"
                      viewBox={`0 0 ${f.fly} ${h}`}
                      width="100%"
                      height="100%"
                      style={{ display: "block", overflow: "visible" }}
                    >
                      {frame.layers.map((layer) => (
                        <path
                          key={layer.fill + layer.d.length}
                          d={layer.d}
                          fill={layer.fill}
                        />
                      ))}
                      <path d={frame.shade} fill="#1c2430" opacity="0.16" />
                    </svg>
                  </div>
                ))}
              </div>
            );
          })
        : null}

      {hero && showBowWave ? (
        <div
          ref={bowRef}
          data-layer="bow-wave"
          style={{
            position: "absolute",
            left: pct(
              (geometry.bowWave.anchor[0] + BOW_WAVE_BOX.x - vb.x) / vb.width,
            ),
            top: pct(
              (-geometry.bowWave.anchor[1] + BOW_WAVE_BOX.y - vb.y) / vb.height,
            ),
            width: pct(BOW_WAVE_BOX.width / vb.width),
            height: pct(BOW_WAVE_BOX.height / vb.height),
            transformOrigin: `${pct(-BOW_WAVE_BOX.x / BOW_WAVE_BOX.width)} ${pct(-BOW_WAVE_BOX.y / BOW_WAVE_BOX.height)}`,
            pointerEvents: "none",
          }}
        >
          <BowWaveArt />
        </div>
      ) : null}
    </div>
  );
}

function SilhouetteArt({
  g,
  fill,
  uid,
  cut,
}: {
  g: ShipGeometry;
  fill: string;
  uid: string;
  cut: boolean;
}) {
  const vb = g.viewBox;
  return (
    <>
      {cut ? (
        <defs>
          <clipPath id={`${uid}-wl`}>
            <rect x={vb.x} y={vb.y} width={vb.width} height={-vb.y + 0.05} />
          </clipPath>
        </defs>
      ) : null}
      <g fill={fill} clipPath={cut ? `url(#${uid}-wl)` : undefined}>
        <path d={g.silhouette.sails} />
        <path d={g.silhouette.spars} />
        <path d={g.silhouette.hull} />
        <path
          d={g.silhouette.rigging}
          fill="none"
          stroke={fill}
          strokeWidth={0.16}
        />
      </g>
    </>
  );
}

function SailLayers({
  sail,
  spec,
  uid,
}: {
  sail: SailArt;
  spec: ShipSpec;
  uid: string;
}) {
  const c = spec.paint.canvas;
  const clip = `url(#${uid}-sail-${sail.id})`;
  return (
    <g data-sail={sail.id}>
      <path d={sail.outline} fill={c.shade} />
      <path d={sail.lit} fill={c.lit} clipPath={clip} />
      {sail.weather ? (
        <path d={sail.weather} fill={c.seam} opacity={0.16} clipPath={clip} />
      ) : null}
      {sail.linings ? (
        <path d={sail.linings} fill={c.seam} opacity={0.22} clipPath={clip} />
      ) : null}
      {sail.shadow ? (
        <path d={sail.shadow} fill="#6f6550" opacity={0.26} />
      ) : null}
      <path
        d={sail.seams}
        fill="none"
        stroke={c.seam}
        strokeWidth={0.04}
        opacity={0.8}
      />
      {sail.reefs ? <path d={sail.reefs} fill={c.reef} opacity={0.5} /> : null}
      {sail.reefPoints ? (
        <path
          d={sail.reefPoints}
          fill="none"
          stroke={c.boltRope}
          strokeWidth={0.045}
          opacity={0.8}
        />
      ) : null}
      {sail.buntlines ? (
        <path
          d={sail.buntlines}
          fill="none"
          stroke={c.boltRope}
          strokeWidth={0.04}
          opacity={0.45}
        />
      ) : null}
      <path
        d={sail.boltRope}
        fill="none"
        stroke={c.boltRope}
        strokeWidth={0.09}
        strokeLinejoin="round"
      />
    </g>
  );
}

function HeroArt({
  g,
  spec,
  uid,
}: {
  g: ShipGeometry;
  spec: ShipSpec;
  uid: string;
}) {
  const p = spec.paint;
  const h = g.hull;
  const sails = [...g.sails.foreAndAft, ...g.sails.square];
  const thin = (d: string, stroke: string, width: number, opacity = 1) => (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      opacity={opacity}
      strokeLinecap="round"
    />
  );
  return (
    <>
      <defs>
        <clipPath id={`${uid}-hull`}>
          <path d={h.outline} />
        </clipPath>
        {sails.map((s) => (
          <clipPath key={s.id} id={`${uid}-sail-${s.id}`}>
            <path d={s.outline} />
          </clipPath>
        ))}
      </defs>

      {/* Masts, tops and stays behind the sails. */}
      <path d={g.rig.lowerMasts} fill={p.lowerMast} />
      <path d={g.rig.hoops} fill={p.lowerMast} opacity={0.75} />
      <path d={g.rig.spars} fill={p.spar} />
      <path d={g.rig.sparsDark} fill={p.sparDark} />
      <path d={g.rig.tops} fill={p.sparDark} />
      {thin(g.rig.topRails, p.sparDark, 0.1)}
      {thin(g.rigging.stays, p.rigging.standing, 0.16)}

      {/* Fore-and-aft sails, then square sails (mizzen, main, fore). */}
      {g.sails.foreAndAft.map((s) => (
        <SailLayers key={s.id} sail={s} spec={spec} uid={uid} />
      ))}
      {g.sails.square.map((s) => (
        <SailLayers key={s.id} sail={s} spec={spec} uid={uid} />
      ))}
      <path d={g.rig.yards} fill={p.sparDark} />
      <path d={g.rig.furled} fill={spec.paint.canvas.shade} />
      {thin(g.rig.sparHighlights, "#e3c47e", 0.07, 0.55)}

      {/* Hull: black ground, copper, bands, ports. */}
      <path d={h.outline} fill={p.hull} />
      <g clipPath={`url(#${uid}-hull)`}>
        <path d={h.copper} fill={p.copper} />
        <path d={h.verdigris} fill={p.copperShade} opacity={0.7} />
        <path d={h.bands} fill={p.band} />
        <path d={h.bandShadows} fill="#000" opacity={0.18} />
        {thin(h.planking, "#000", 0.035, 0.4)}
        {thin(h.railMouldings, "#4a4744", 0.06, 0.8)}
      </g>
      <path d={h.openPorts} fill="#120f0e" />
      <path
        d={h.portLinings}
        fill={p.portLining}
        fillRule="evenodd"
        opacity={0.85}
      />
      <path d={h.muzzles} fill={p.portLining} />
      <path d={h.lids} fill={p.portLid} />
      {thin(h.lidHighlights, "#5d5650", 0.045)}
      <path d={h.boats} fill="#d9d4c7" />
      {thin(h.boatStrakes, p.hull, 0.12)}
      <path d={h.hammocks} fill={p.hammocks} />
      {thin(h.hammockCranes, "#4b4741", 0.05, 0.9)}
      <path d={h.rudder} fill={p.hull} />
      <path d={h.rudderCopper} fill={p.copper} />
      <path d={h.stern.body} fill={p.galleryGround} />
      <path d={h.stern.trim} fill={p.galleryTrim} />
      <path d={h.gallery.ground} fill={p.galleryGround} />
      <path d={h.gallery.windows} fill={p.glass} />
      <path d={h.gallery.trim} fill={p.galleryTrim} />
      <path d={h.stern.lanterns} fill={p.galleryTrim} />
      <path d={h.stern.lanternGlass} fill="#e8d7a6" opacity={0.75} />
      <path d={h.sideSteps} fill="#3f3c39" />
      {thin(h.chainPlates, "#1f1d1b", 0.09)}
      <path d={h.channels} fill={p.hull} />
      {thin(h.channelHighlights, "#5e5953", 0.05)}

      {/* Rigging in front of the sails. */}
      {thin(g.rigging.ratlines, p.rigging.running, 0.045, 0.7)}
      {thin(g.rigging.shrouds, p.rigging.standing, 0.13)}
      {thin(g.rigging.light, p.rigging.standing, 0.085)}
      {thin(g.rigging.running, p.rigging.running, 0.06, 0.75)}
      <path d={h.deadeyes} fill="#1f1d1b" />

      {/* The head, catheads and the catted anchor in front. */}
      <path d={h.head.knee} fill={p.hull} />
      {thin(h.head.timbers, p.hull, 0.14)}
      {thin(h.head.rails, p.band, 0.17)}
      {thin(h.head.cheeks, p.band, 0.2)}
      <path d={h.head.hawse} fill="#0e0d0c" />
      <path d={h.head.figure} fill={p.figurehead} />
      <path
        d={h.head.figureShield}
        fill="#8e2c22"
        stroke={p.figureAccents.crown}
        strokeWidth={0.07}
      />
      <path d={h.head.figureSash} fill={p.figureAccents.sashStarboard} />
      <path
        d={h.head.figureScroll}
        fill={p.figureAccents.scroll}
        stroke={p.figureAccents.crown}
        strokeWidth={0.06}
      />
      <path d={h.head.figureCrown} fill={p.figureAccents.crown} />
      <path d={h.catheads} fill={p.band} />
      <path d={h.anchors} fill="#252321" />
    </>
  );
}

function WarmArt({
  g,
  spec,
  uid,
}: {
  g: ShipGeometry;
  spec: ShipSpec;
  uid: string;
}) {
  const warm = spec.paint.warmLight;
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-warm`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={warm} stopOpacity="0" />
          <stop offset="0.7" stopColor={warm} stopOpacity="0.45" />
          <stop offset="1" stopColor={warm} stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={`${uid}-hull-warm`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={warm} stopOpacity="0" />
          <stop offset="0.75" stopColor={warm} stopOpacity="0.06" />
          <stop offset="1" stopColor={warm} stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {[...g.sails.foreAndAft, ...g.sails.square].map((s) => (
        <path key={s.id} d={s.warm} fill={`url(#${uid}-warm)`} />
      ))}
      <path
        d={g.hull.bands}
        fill={`url(#${uid}-hull-warm)`}
        clipPath={`url(#${uid}-hull)`}
      />
      <path
        d={g.rig.sparHighlights}
        fill="none"
        stroke={warm}
        strokeWidth={0.1}
        opacity={0.7}
      />
    </>
  );
}
