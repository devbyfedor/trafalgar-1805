import { Fragment, type ReactNode, useMemo } from "react";
import { HORIZON, type SeaStrip, SUN_X } from "../composition";
import { buildStrip } from "./seaGeometry";

/**
 * Sea strips (layers 5 and 7). Each strip is a band of water at one depth:
 * its top edge is the swell seen from the side, the body fills down to the
 * next strip in front. A strip is three nested wrappers:
 *   positioner (top, height in vh)
 *   → swell (slow vertical breathing, yPercent)
 *   → loop (crests drifting left to right, xPercent by exactly one period)
 *   → two SVGs: the pre-dawn colours and the dawn colours, crossfaded.
 * Paths never change after first paint; only the wrappers move.
 */

function StripArt({
  strip,
  variant,
}: {
  strip: SeaStrip;
  variant: "night" | "dawn";
}) {
  const g = useMemo(() => buildStrip(strip), [strip]);
  const c = strip.colors[variant];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${g.width} ${g.height}`}
      preserveAspectRatio="none"
      data-el={variant === "dawn" ? "strip-dawn" : undefined}
      className={`absolute inset-0 block h-full w-full${variant === "dawn" ? " opacity-0" : ""}`}
    >
      <path d={g.body} fill={c.body} />
      <path d={g.inner} fill={c.inner} opacity={0.55} />
      <path d={g.crest} fill={c.crest} opacity={0.75} />
    </svg>
  );
}

function Strip({ strip }: { strip: SeaStrip }) {
  const g = useMemo(() => buildStrip(strip), [strip]);
  return (
    <div
      data-el="strip"
      data-strip={strip.id}
      className="absolute inset-x-0"
      style={{ top: `${strip.top / 10}vh`, height: `${strip.height / 10}vh` }}
    >
      <div
        data-el="strip-swell"
        data-swell={strip.swell / strip.height}
        data-period={strip.swellPeriod}
        data-delay={strip.swellDelay}
        className="absolute inset-0"
      >
        <div
          data-el="strip-loop"
          data-tiles={g.tiles}
          data-speed={strip.speed / strip.period}
          className="absolute inset-y-0 left-0"
          style={{ width: `${g.width / 10}vh` }}
        >
          <StripArt strip={strip} variant="night" />
          <StripArt strip={strip} variant="dawn" />
        </div>
      </div>
    </div>
  );
}

/**
 * The sun's reflection on the water: a soft column under the sun, static,
 * faded in as the sun clears the horizon. The glitter canvas sparkles on top.
 */
function Reflection({
  from,
  to,
  id,
}: {
  from: number;
  to: number;
  id: string;
}) {
  const top = Math.max(from, HORIZON * 1000);
  return (
    <div
      data-el="sun-reflection"
      data-reflection={id}
      className="absolute opacity-0"
      style={{
        left: `calc(${SUN_X * 100}% - 18vh)`,
        width: "36vh",
        top: `${top / 10}vh`,
        height: `${(to - top) / 10}vh`,
        background:
          from <= HORIZON * 1000
            ? "radial-gradient(ellipse 22% 100% at 50% 0%, rgba(255,214,150,0.55), rgba(255,206,140,0.18) 45%, rgba(255,206,140,0) 80%)"
            : "radial-gradient(ellipse 34% 120% at 50% -20%, rgba(255,214,150,0.32), rgba(255,206,140,0.1) 50%, rgba(255,206,140,0) 85%)",
      }}
    />
  );
}

/**
 * The back sea. `after` places things (ships at their depth) behind the
 * strips that are nearer than they are and in front of the farther ones.
 */
export function SeaBack({
  strips,
  after = {},
}: {
  strips: readonly SeaStrip[];
  after?: Record<string, ReactNode>;
}) {
  return (
    <div data-el="sea-back" className="absolute inset-0">
      {strips.map((s) => (
        <Fragment key={s.id}>
          <Strip strip={s} />
          {after[s.id] ?? null}
        </Fragment>
      ))}
      <Reflection id="back" from={HORIZON * 1000} to={720} />
    </div>
  );
}

export function SeaFront({ strips }: { strips: readonly SeaStrip[] }) {
  return (
    <div data-el="sea-front" className="absolute inset-0">
      {strips.map((s) => (
        <Strip key={s.id} strip={s} />
      ))}
      <Reflection id="front" from={690} to={1000} />
    </div>
  );
}
