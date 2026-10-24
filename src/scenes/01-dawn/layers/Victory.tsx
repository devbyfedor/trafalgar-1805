import { buildShip } from "@/components/ship/geometry/index";
import { ShipOfTheLine } from "@/components/ship/ShipOfTheLine";
import { VICTORY_1805 } from "@/components/ship/specs/victory-1805";
import { METRE_VH, VICTORY_X, WATERLINE } from "../composition";

/**
 * Layer 6, Victory. Three wrappers:
 *   [data-el=victory]  full-bleed; the scroll timeline moves it with xPercent,
 *                      so her travel is a fraction of the viewport width
 *   [data-el=hull-box] the ship's box, sized from the viewport height
 *   [data-el=heave]    the idle heave and pitch (y and rotation), pivoting
 *                      on the waterline at mid-length
 * Inside: the hero ship with its warm-light layer, flags and bow wave, and
 * a veil (the same ship in silhouette, in the haze colour) that fades as she
 * comes out of the haze.
 */

const geometry = buildShip(VICTORY_1805);
const vb = geometry.viewBox;
const centreM = VICTORY_1805.hull.gunDeckLength / 2;

export const VICTORY_BOX = {
  width: vb.width * METRE_VH,
  height: vb.height * METRE_VH,
  /** Left edge relative to the hull centre, vh. */
  centreOffset: (centreM - vb.x) * METRE_VH,
  top: WATERLINE * 100 - -vb.y * METRE_VH,
  /** Pivot for pitch: the waterline at mid-length, as % of the box. */
  pivot: {
    x: ((centreM - vb.x) / vb.width) * 100,
    y: (-vb.y / vb.height) * 100,
  },
};

export function Victory() {
  const box = VICTORY_BOX;
  return (
    <div data-el="victory" className="absolute inset-0">
      <div
        data-el="hull-box"
        className="absolute"
        style={{
          left: `calc(${VICTORY_X.hero * 100}% - ${box.centreOffset}vh)`,
          top: `${box.top}vh`,
          width: `${box.width}vh`,
          height: `${box.height}vh`,
        }}
      >
        <div
          data-el="heave"
          className="absolute inset-0"
          style={{ transformOrigin: `${box.pivot.x}% ${box.pivot.y}%` }}
        >
          <ShipOfTheLine
            spec={VICTORY_1805}
            detail="hero"
            lighting="dawn"
            warmth={0}
            style={{ position: "absolute", inset: 0 }}
          />
          <div data-el="veil" className="absolute inset-0">
            <ShipOfTheLine
              spec={VICTORY_1805}
              detail="silhouette"
              fill="#56616e"
              style={{ position: "absolute", inset: 0 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
