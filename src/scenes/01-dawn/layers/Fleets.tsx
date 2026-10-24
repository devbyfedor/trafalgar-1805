import { useMemo } from "react";
import { buildShip } from "@/components/ship/geometry/index";
import { ShipOfTheLine } from "@/components/ship/ShipOfTheLine";
import {
  BRITISH_74,
  BRITISH_98,
  enemyLine,
} from "@/components/ship/specs/fleet-1805";
import type { ShipSpec } from "@/components/ship/types";
import { ENEMY_SPAN, HORIZON, METRE_VH, WATERLINE } from "../composition";

/**
 * The distant fleets, drawn with ShipOfTheLine in silhouette mode.
 *
 * Enemy (layer 3, behind the back haze): 33 ships strung irregularly along
 * the right half of the horizon, hull partly down (about 5 m of each hull is
 * below the horizon from a viewer about 9 m up, 10–12 miles off). Each rig
 * is about a third of the sun disc tall, as the angular sizes demand. They
 * head south under easy sail, bows to the right. Four groups emerge in turn.
 * Before dawn only a few of their lights show.
 *
 * British (in the back sea, between strips by depth): Téméraire and Neptune,
 * the three-deckers that came to follow Victory in the weather column, and a
 * seventy-four, further off and fainter. The fleet was still in loose order
 * at daybreak, so they are scattered, not in line.
 */

/** Main truck height of a first rate on the enemy line, vh. */
const ENEMY_RIG_VH = 1.7;
const ENEMY_FILL = "#5c6272";

function placement(spec: ShipSpec, metreVh: number, waterlineVh: number) {
  const vb = buildShip(spec).viewBox;
  return {
    height: vb.height * metreVh,
    width: vb.width * metreVh,
    top: waterlineVh - -vb.y * metreVh,
    // x of the hull's middle within the drawing, for centring.
    centre: (spec.hull.gunDeckLength / 2 - vb.x) * metreVh,
  };
}

export function EnemyFleet() {
  const ships = useMemo(() => enemyLine(), []);
  const groups = [0, 1, 2, 3];
  const spanFrom = ENEMY_SPAN.from * 100;
  const spanWidth = (ENEMY_SPAN.to - ENEMY_SPAN.from) * 100;
  return (
    <div data-el="enemy" className="absolute inset-0">
      <div data-el="enemy-lights" className="absolute inset-0">
        {ships
          .filter((_, i) => i % 3 === 1)
          .map((s) => (
            <span
              key={`light-${s.u.toFixed(4)}`}
              className="absolute block rounded-full"
              style={{
                left: `${spanFrom + s.u * spanWidth}%`,
                top: `${HORIZON * 100 - 0.55}vh`,
                width: "0.9vh",
                height: "0.9vh",
                marginLeft: "-0.45vh",
                background:
                  "radial-gradient(circle, rgba(255,226,170,0.95) 0 14%, rgba(255,200,130,0.28) 30%, rgba(255,200,130,0) 70%)",
              }}
            />
          ))}
      </div>
      {groups.map((g) => (
        <div
          key={g}
          data-el="enemy-group"
          data-group={g}
          className="absolute inset-0 opacity-0"
        >
          {ships
            .filter((s) => s.group === g)
            .map((s) => {
              const m = ENEMY_RIG_VH / 62 / s.depth;
              // About 5 m of hull below the horizon.
              const p = placement(s.spec, m, HORIZON * 100 + 5 * m);
              return (
                <ShipOfTheLine
                  key={`${s.spec.id}-${s.u.toFixed(4)}`}
                  spec={s.spec}
                  detail="silhouette"
                  fill={ENEMY_FILL}
                  style={{
                    position: "absolute",
                    left: `calc(${spanFrom + s.u * spanWidth}% - ${p.centre}vh)`,
                    top: `${p.top}vh`,
                    height: `${p.height}vh`,
                  }}
                />
              );
            })}
        </div>
      ))}
    </div>
  );
}

export interface AsternShip {
  id: string;
  spec: ShipSpec;
  /** Distance as a multiple of Victory's. */
  distance: number;
  /** Hull centre at Victory's hero moment, fraction of width. */
  x: number;
}

export const BRITISH_ASTERN: readonly AsternShip[] = [
  { id: "temeraire", spec: BRITISH_98, distance: 2.3, x: 0.17 },
  { id: "neptune", spec: BRITISH_98, distance: 3.3, x: 0.31 },
  { id: "seventy-four", spec: BRITISH_74, distance: 4.4, x: 0.05 },
];

/** Waterline of a ship at `distance` × Victory's, in units of 1/1000 vh. */
export function asternWaterline(distance: number): number {
  return (HORIZON + (WATERLINE - HORIZON) / distance) * 1000;
}

export function BritishShip({ ship }: { ship: AsternShip }) {
  const m = METRE_VH / ship.distance;
  const p = placement(ship.spec, m, asternWaterline(ship.distance) / 10);
  // Nearer ships are less veiled by the haze.
  const fill =
    ship.distance < 3 ? "#56606c" : ship.distance < 4 ? "#66707b" : "#727c86";
  return (
    <div
      data-el="british"
      data-distance={ship.distance}
      className="absolute inset-0 opacity-0"
    >
      <ShipOfTheLine
        spec={ship.spec}
        detail="silhouette"
        fill={fill}
        cutAtWaterline
        style={{
          position: "absolute",
          left: `calc(${ship.x * 100}% - ${p.centre}vh)`,
          top: `${p.top}vh`,
          height: `${p.height}vh`,
        }}
      />
    </div>
  );
}
