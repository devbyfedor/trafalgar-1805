import type { MastId, MastSpec, ShipSpec, YardId } from "../types";
import { path } from "./path";
import { deg, type Vec } from "./vec";

/**
 * Masts and spars. Each mast is an axis leaning aft by its rake; topmasts
 * stand forward of the lower mastheads (through the caps), as on the real
 * ship. Yards are drawn face-on with the spec's brace foreshortening.
 */

export interface MastLayout {
  id: MastId;
  spec: MastSpec;
  /** Point on the lower mast axis at height y. */
  lowerAt: (y: number) => Vec;
  topmastAt: (y: number) => Vec;
  topgallantAt: (y: number) => Vec;
  /** Yard ends (left = aft, right = forward), centre, keyed by yard id. */
  yards: Map<YardId, { left: Vec; right: Vec; centre: Vec; length: number }>;
  /** Top platform extent at topY. */
  top: { aft: Vec; fore: Vec };
  crosstrees: { aft: Vec; fore: Vec };
}

export interface RigLayout {
  masts: Map<MastId, MastLayout>;
  bowsprit: { heel: Vec; cap: Vec; dir: Vec };
  jibBoom: { start: Vec; end: Vec };
  flyingJibBoom?: { start: Vec; end: Vec };
  dolphinStriker: { top: Vec; bottom: Vec };
  /** The spritsail yard's centre and projected half-length, if crossed. */
  spritsail?: { centre: Vec; half: number };
  /** Furled canvas (the spritsail on its yard). */
  furled: string;
  gaff: { throat: Vec; peak: Vec };
  boom: { heel: Vec; end: Vec };
  /** Paths, by role. */
  spars: string;
  /** Lower masts (Nelson's yellow) and their hoops. */
  lowerMasts: string;
  hoops: string;
  sparsDark: string;
  sparHighlights: string;
  /** Yards, drawn in front of the sail heads. */
  yards: string;
  tops: string;
  topRails: string;
}

/** A tapered spar between two points, widths at each end. */
function taperedSpar(a: Vec, b: Vec, wa: number, wb: number): Vec[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return [
    [a[0] + (nx * wa) / 2, a[1] + (ny * wa) / 2],
    [b[0] + (nx * wb) / 2, b[1] + (ny * wb) / 2],
    [b[0] - (nx * wb) / 2, b[1] - (ny * wb) / 2],
    [a[0] - (nx * wa) / 2, a[1] - (ny * wa) / 2],
  ];
}

/**
 * A yard, tapered by Steel's rule: from the slings outward the diameter is
 * 30/31 at the first quarter, 7/8 at the second, 7/10 at the third and 3/7
 * at the arms, so the taper steepens over the outer quarter.
 */
const YARD_TAPER = [
  [0, 1],
  [0.25, 30 / 31],
  [0.5, 7 / 8],
  [0.75, 7 / 10],
  [1, 3 / 7],
] as const;

function yardShape(centre: Vec, half: number, d: number): Vec[] {
  const [cx, cy] = centre;
  const top: Vec[] = [];
  const bottom: Vec[] = [];
  for (const sign of [-1, 1]) {
    const side = sign < 0 ? [...YARD_TAPER].reverse() : YARD_TAPER.slice(1);
    for (const [t, k] of side) {
      top.push([cx + sign * half * t, cy + (d * k) / 2]);
      bottom.push([cx + sign * half * t, cy - (d * k) / 2]);
    }
  }
  return [...top, ...bottom.reverse()];
}

export function buildRig(spec: ShipSpec): RigLayout {
  const f = spec.rig.braceForeshortening;
  const masts = new Map<MastId, MastLayout>();
  const spars = path();
  const lowerMasts = path();
  const hoops = path();
  const sparsDark = path();
  const sparHi = path();
  const yardsPath = path();
  const furled = path();
  const tops = path();
  const topRails = path();

  for (const m of spec.rig.masts) {
    const lean = Math.tan(deg(m.rakeDeg));
    const lowerAt = (y: number): Vec => [m.x - (y - m.deckY) * lean, y];
    // Topmast stands forward of the lower masthead by half of each diameter.
    const topOffset =
      (m.diameters.lower * 0.78 + m.diameters.topmast) / 2 + 0.06;
    const topmastAt = (y: number): Vec => {
      const [x] = lowerAt(y);
      return [x + topOffset, y];
    };
    const tgOffset =
      topOffset +
      (m.diameters.topmast * 0.8 + m.diameters.topgallant) / 2 +
      0.04;
    const topgallantAt = (y: number): Vec => {
      const [x] = lowerAt(y);
      return [x + tgOffset, y];
    };

    // Lower mast: from below the rail to the cap; the masthead (above the
    // top) is squared and a little thinner.
    const dL = m.diameters.lower;
    lowerMasts.polygon(
      taperedSpar(lowerAt(m.deckY), lowerAt(m.topY), dL, dL * 0.86),
    );
    // Mast hoops, painted with the mast.
    for (let y = m.deckY + 4.5; y < m.topY - 1; y += 3.2) {
      const [hx] = lowerAt(y);
      hoops.rect(hx - dL * 0.47, y, dL * 0.94, 0.13);
    }
    sparsDark.polygon(
      taperedSpar(lowerAt(m.topY), lowerAt(m.lowerHeadY), dL * 0.8, dL * 0.74),
    );
    // Topmast: heel just under the top, through the cap, to the head.
    const dT = m.diameters.topmast;
    const tmHeel = topmastAt(m.topY - 0.5);
    spars.polygon(taperedSpar(tmHeel, topmastAt(m.crosstreesY), dT, dT * 0.78));
    sparsDark.polygon(
      taperedSpar(
        topmastAt(m.crosstreesY),
        topmastAt(m.topmastHeadY),
        dT * 0.72,
        dT * 0.66,
      ),
    );
    // Topgallant and royal pole up to the truck.
    const dG = m.diameters.topgallant;
    const tgHeel = topgallantAt(m.crosstreesY - 0.3);
    spars.polygon(
      taperedSpar(tgHeel, topgallantAt(m.topgallantHeadY), dG, dG * 0.72),
    );
    spars.polygon(
      taperedSpar(
        topgallantAt(m.topgallantHeadY),
        topgallantAt(m.truckY - 0.25),
        dG * 0.68,
        dG * 0.45,
      ),
    );
    // Truck: a small flattened disc.
    const [tx, ty] = topgallantAt(m.truckY - 0.2);
    sparsDark.rect(tx - dG * 0.55, ty, dG * 1.1, 0.24);
    // Caps.
    const [cx, cy] = lowerAt(m.lowerHeadY);
    sparsDark.rect(cx - dL * 0.55, cy - 0.05, topOffset + dT * 1.1 + 0.1, 0.42);
    const [c2x, c2y] = topmastAt(m.topmastHeadY);
    sparsDark.rect(
      c2x - dT * 0.5,
      c2y - 0.05,
      tgOffset - topOffset + dG + 0.1,
      0.3,
    );
    // Light down the sunward (forward) edge of the lower mast.
    const hiA = lowerAt(m.deckY + 1);
    const hiB = lowerAt(m.topY - 0.6);
    sparHi
      .moveTo([hiA[0] + dL * 0.3, hiA[1]])
      .lineTo([hiB[0] + dL * 0.27, hiB[1]]);

    // Top: D-shaped in plan (straight after side, elliptical fore part), so
    // in elevation a platform reaching about 0.7 of its length forward of the
    // mast and 0.3 aft, with a rail and stanchions at the after side.
    const tw = m.topWidth;
    const [topCx, topY] = lowerAt(m.topY);
    const aftX = topCx - tw * 0.3;
    const foreX = topCx + tw * 0.7;
    tops
      .moveTo([aftX, topY])
      .lineTo([foreX - 0.5, topY])
      .quadTo([foreX, topY + 0.02], [foreX, topY + 0.2])
      .lineTo([foreX - 0.2, topY + 0.36])
      .lineTo([aftX, topY + 0.36])
      .close();
    // Trestletrees and the cheeks under the top.
    tops.polygon([
      [topCx - tw * 0.24, topY],
      [topCx + tw * 0.62, topY],
      [topCx + tw * 0.2, topY - 0.6],
      [topCx - tw * 0.1, topY - 0.6],
    ]);
    // Top rail aft: stanchions and a rail.
    const railH = 0.95;
    topRails
      .moveTo([aftX + 0.05, topY + 0.38])
      .lineTo([aftX + 0.05, topY + 0.38 + railH]);
    topRails
      .moveTo([aftX + 0.55, topY + 0.38])
      .lineTo([aftX + 0.55, topY + 0.38 + railH]);
    topRails
      .moveTo([aftX - 0.05, topY + 0.38 + railH])
      .lineTo([aftX + 0.9, topY + 0.38 + railH]);

    // Crosstrees at the topmast head: trestletrees about 0.39 of the top's
    // length fore and aft (Steel: 3½ in per yard of topmast).
    const [ctX, ctY] = topmastAt(m.crosstreesY);
    const ctw = tw * 0.39;
    tops.polygon([
      [ctX - ctw * 0.4, ctY],
      [ctX + ctw * 0.6, ctY],
      [ctX + ctw * 0.55, ctY + 0.22],
      [ctX - ctw * 0.4, ctY + 0.22],
    ]);

    // Yards.
    const yards: MastLayout["yards"] = new Map();
    for (const yard of m.yards) {
      // Lower yards hang on the lower mast; topsail yards on the topmast;
      // topgallant and royal yards on the topgallant mast.
      const onLower = yard.id === "course" || yard.id === "crossjack";
      const onTop = yard.id === "topsail" || yard.id === "mizzenTopsail";
      const axis = onLower
        ? lowerAt(yard.y)
        : onTop
          ? topmastAt(yard.y)
          : topgallantAt(yard.y);
      const half = (yard.length * f) / 2;
      const centre: Vec = [axis[0] + 0.15, yard.y];
      yardsPath.polygon(yardShape(centre, half, yard.diameter));
      yards.set(yard.id, {
        left: [centre[0] - half, centre[1]],
        right: [centre[0] + half, centre[1]],
        centre,
        length: yard.length,
      });
    }

    masts.set(m.id, {
      id: m.id,
      spec: m,
      lowerAt,
      topmastAt,
      topgallantAt,
      yards,
      top: { aft: [aftX, topY], fore: [foreX, topY] },
      crosstrees: {
        aft: [ctX - ctw * 0.4, ctY],
        fore: [ctX + ctw * 0.6, ctY],
      },
    });
  }

  // Bowsprit, jib-boom, flying jib-boom, dolphin striker.
  const b = spec.rig.bowsprit;
  const dir: Vec = [Math.cos(deg(b.steeveDeg)), Math.sin(deg(b.steeveDeg))];
  const heel: Vec = [b.heelX, b.heelY];
  const cap: Vec = [heel[0] + dir[0] * b.length, heel[1] + dir[1] * b.length];
  spars.polygon(
    taperedSpar(
      [heel[0] - dir[0] * 2, heel[1] - dir[1] * 2],
      cap,
      b.diameter,
      b.diameter * 0.72,
    ),
  );
  sparsDark.polygon(
    taperedSpar(
      [cap[0] - dir[0] * 0.5, cap[1] - dir[1] * 0.5],
      [cap[0] + dir[0] * 0.25, cap[1] + dir[1] * 0.25],
      b.diameter * 0.95,
      b.diameter * 0.95,
    ),
  );
  // The jib-boom lies along the top of the bowsprit.
  const lift: Vec = [-dir[1] * b.diameter * 0.55, dir[0] * b.diameter * 0.55];
  const jbStart: Vec = [
    cap[0] - dir[0] * b.jibBoom.overlap + lift[0],
    cap[1] - dir[1] * b.jibBoom.overlap + lift[1],
  ];
  const jbEnd: Vec = [
    jbStart[0] + dir[0] * b.jibBoom.length,
    jbStart[1] + dir[1] * b.jibBoom.length,
  ];
  spars.polygon(
    taperedSpar(jbStart, jbEnd, b.diameter * 0.5, b.diameter * 0.32),
  );
  let flyingJibBoom: RigLayout["flyingJibBoom"];
  if (b.flyingJibBoom) {
    const fjStart: Vec = [
      jbEnd[0] - dir[0] * b.flyingJibBoom.overlap + lift[0] * 0.5,
      jbEnd[1] - dir[1] * b.flyingJibBoom.overlap + lift[1] * 0.5,
    ];
    const fjEnd: Vec = [
      fjStart[0] + dir[0] * b.flyingJibBoom.length,
      fjStart[1] + dir[1] * b.flyingJibBoom.length,
    ];
    spars.polygon(
      taperedSpar(fjStart, fjEnd, b.diameter * 0.3, b.diameter * 0.18),
    );
    flyingJibBoom = { start: fjStart, end: fjEnd };
  }
  const dsTop: Vec = [cap[0] - 0.1, cap[1] - b.diameter * 0.4];
  const dsBottom: Vec = [cap[0] - 0.3, cap[1] - b.dolphinStriker];
  sparsDark.polygon(taperedSpar(dsTop, dsBottom, 0.2, 0.14));

  // The spritsail yard, crossed under the bowsprit with its sail furled.
  let spritsail: RigLayout["spritsail"];
  if (b.spritsailYard) {
    const at: Vec = [
      heel[0] + dir[0] * b.spritsailYard.along,
      heel[1] + dir[1] * b.spritsailYard.along - b.diameter * 0.9,
    ];
    const half = (b.spritsailYard.length * f) / 2;
    yardsPath.polygon(yardShape(at, half, b.spritsailYard.diameter));
    // The furled sail: a slack roll of canvas along the top of the yard.
    const roll: Vec[] = [];
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = at[0] - half * 0.82 + half * 1.64 * t;
      const bulge = Math.sin(Math.PI * t) * 0.32 + (i % 2 ? 0.05 : 0);
      roll.push([x, at[1] + b.spritsailYard.diameter * 0.45 + bulge]);
    }
    for (let i = n; i >= 0; i--) {
      const x = at[0] - half * 0.82 + half * 1.64 * (i / n);
      roll.push([x, at[1]]);
    }
    furled.polygon(roll);
    spritsail = { centre: at, half };
  }

  // Spanker gaff and boom on the mizzen, eased off toward the viewer, so
  // in elevation they are foreshortened.
  const mizzen = masts.get("mizzen");
  const s = spec.rig.spanker;
  const ease = Math.cos(deg(s.easeDeg));
  const throat = mizzen
    ? mizzen.lowerAt(s.gaffThroatY)
    : ([0, s.gaffThroatY] as Vec);
  const ga = deg(s.gaffAngleDeg);
  const peak: Vec = [
    throat[0] - Math.cos(ga) * s.gaffLength * ease,
    throat[1] + Math.sin(ga) * s.gaffLength,
  ];
  sparsDark.polygon(taperedSpar(throat, peak, 0.34, 0.2));
  const boomHeel = mizzen ? mizzen.lowerAt(s.boomY) : ([0, s.boomY] as Vec);
  const boomEnd: Vec = [
    boomHeel[0] - s.boomLength * ease,
    boomHeel[1] + s.boomRise,
  ];
  sparsDark.polygon(taperedSpar(boomHeel, boomEnd, 0.44, 0.3));

  return {
    masts,
    bowsprit: { heel, cap, dir },
    jibBoom: { start: jbStart, end: jbEnd },
    flyingJibBoom,
    dolphinStriker: { top: dsTop, bottom: dsBottom },
    spritsail,
    gaff: { throat, peak },
    boom: { heel: boomHeel, end: boomEnd },
    furled: furled.toString(),
    spars: spars.toString(),
    lowerMasts: lowerMasts.toString(),
    hoops: hoops.toString(),
    sparsDark: sparsDark.toString(),
    sparHighlights: sparHi.toString(),
    yards: yardsPath.toString(),
    tops: tops.toString(),
    topRails: topRails.toString(),
  };
}
