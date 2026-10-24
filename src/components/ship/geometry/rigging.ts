import type { MastId, ShipSpec } from "../types";
import type { HullGeometry } from "./hull";
import { path } from "./path";
import type { MastLayout, RigLayout } from "./rig";
import type { SailsGeometry } from "./sails";
import { lerp, type Vec } from "./vec";

/**
 * Standing and running rigging, merged into a few paths by stroke style so
 * the hero ship stays well under its element budget. Simplified but
 * credible: the starboard shrouds with ratlines, futtocks, topmast and
 * topgallant shrouds, backstays, the fore-and-aft stays, bowsprit gear, and
 * a little running rigging (lifts, braces, sheets and tacks, vangs).
 */

export interface RiggingGeometry {
  shrouds: string;
  stays: string;
  light: string;
  ratlines: string;
  running: string;
}

/** x of the segment ab at height y (assumes ab is not horizontal). */
function xAt(a: Vec, b: Vec, y: number): number {
  const t = (y - a[1]) / (b[1] - a[1]);
  return a[0] + (b[0] - a[0]) * t;
}

/** Horizontal ratlines across a fan of shrouds converging on `head`. */
function ratlinesFor(
  out: ReturnType<typeof path>,
  feet: readonly Vec[],
  head: Vec,
  spacing: number,
  fromY: number,
  toY: number,
): void {
  if (feet.length < 2) return;
  const first = feet[0];
  const last = feet[feet.length - 1];
  for (let y = fromY; y < toY; y += spacing) {
    const xa = xAt(first, head, y);
    const xb = xAt(last, head, y);
    if (Math.abs(xb - xa) < 0.25) break;
    out.moveTo([Math.min(xa, xb), y]).lineTo([Math.max(xa, xb), y]);
  }
}

export function buildRigging(
  spec: ShipSpec,
  rig: RigLayout,
  hull: HullGeometry,
  sails: SailsGeometry,
): RiggingGeometry {
  const shrouds = path();
  const stays = path();
  const light = path();
  const ratlines = path();
  const running = path();
  const spacing = spec.rig.ratlineSpacing;
  const mast = (id: MastId): MastLayout | undefined => rig.masts.get(id);

  for (const m of rig.masts.values()) {
    const s = m.spec;
    // Lower shrouds: channel deadeyes to the hounds, just under the top.
    const feet = hull.shroudFeet[m.id] ?? [];
    const hounds = m.lowerAt(s.topY - 0.5);
    const houndsAft: Vec = [hounds[0] - s.diameters.lower * 0.45, hounds[1]];
    for (const f of feet) shrouds.segment(f, houndsAft);
    if (feet.length) {
      ratlinesFor(
        ratlines,
        feet,
        houndsAft,
        spacing,
        feet[0][1] + 0.9,
        s.topY - 1.7,
      );
    }

    // Futtock shrouds: from the top's rim down to the lower mast.
    const futtockFoot = m.lowerAt(s.topY - 2.4);
    const rimAft: Vec = [m.top.aft[0] + 0.25, m.top.aft[1]];
    const rimFore: Vec = [m.top.fore[0] - 0.45, m.top.fore[1]];
    for (let i = 0; i < 4; i++) {
      light.segment(lerp(rimAft, rimFore, i / 3), futtockFoot);
    }

    // Topmast shrouds: from the top's rim up to the topmast head.
    const tmHead = m.topmastAt(s.crosstreesY - 0.35);
    const tmFeet: Vec[] = [];
    for (let i = 0; i < s.topmastShroudsPerSide; i++) {
      const p = lerp(
        rimAft,
        lerp(rimAft, rimFore, 0.7),
        i / Math.max(1, s.topmastShroudsPerSide - 1),
      );
      tmFeet.push([p[0], p[1] + 0.38]);
    }
    for (const f of tmFeet) light.segment(f, tmHead);
    ratlinesFor(
      ratlines,
      tmFeet,
      tmHead,
      spacing * 0.95,
      tmFeet[0][1] + 0.7,
      s.crosstreesY - 1.6,
    );

    // Topgallant shrouds: crosstrees to the topgallant masthead.
    const tgHead = m.topgallantAt(s.topgallantHeadY - 0.3);
    for (let i = 0; i < s.topgallantShroudsPerSide; i++) {
      const f = lerp(
        m.crosstrees.aft,
        m.crosstrees.fore,
        (i / Math.max(1, s.topgallantShroudsPerSide)) * 0.6,
      );
      light.segment(f, tgHead);
    }

    // Backstays: topmast and topgallant mastheads down to the channel.
    const backFeet = hull.backstayFeet[m.id] ?? [];
    backFeet.forEach((f, i) => {
      const from = i === 0 && backFeet.length > 1 ? tgHead : tmHead;
      light.segment(f, from);
    });

    // Lifts: the lower and topsail yardarms up to the cap above. The lighter
    // yards' lifts would only hatch the sails at this scale.
    for (const yard of m.spec.yards) {
      const y = m.yards.get(yard.id);
      if (!y) continue;
      const onLower = yard.id === "course" || yard.id === "crossjack";
      const onTop = yard.id === "topsail" || yard.id === "mizzenTopsail";
      if (!onLower && !onTop) continue;
      const cap = onLower
        ? m.lowerAt(s.lowerHeadY)
        : m.topmastAt(s.topmastHeadY);
      running.segment(y.left, cap).segment(y.right, cap);
    }
  }

  // Fore-and-aft stays between the masts and out to the bowsprit.
  const fore = mast("fore");
  const main = mast("main");
  const mizzen = mast("mizzen");
  const railAt = (x: number) => {
    let best = hull.railTop[0];
    for (const p of hull.railTop)
      if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p;
    return best[1];
  };
  if (fore && main) {
    const f = fore.spec;
    const m = main.spec;
    // Main stay and its preventer: to collars at the bowsprit by the stem,
    // passing the starboard (near) side of the foremast.
    const bowAt = (t: number): Vec => [
      rig.bowsprit.heel[0] + rig.bowsprit.dir[0] * t,
      rig.bowsprit.heel[1] + rig.bowsprit.dir[1] * t,
    ];
    stays.segment(main.lowerAt(m.topY - 0.4), bowAt(1.2));
    stays.segment(main.lowerAt(m.topY - 0.9), bowAt(2.1));
    stays.segment(
      main.topmastAt(m.crosstreesY - 0.3),
      fore.lowerAt(f.topY + 0.2),
    );
    light.segment(
      main.topgallantAt(m.topgallantHeadY - 0.3),
      fore.topmastAt(f.crosstreesY - 0.1),
    );
    light.segment(
      main.topgallantAt(m.truckY - 1.2),
      fore.topgallantAt(f.topgallantHeadY - 0.2),
    );
  }
  if (main && mizzen) {
    const m = main.spec;
    const z = mizzen.spec;
    stays.segment(mizzen.lowerAt(z.topY - 0.4), [
      main.lowerAt(0)[0] - 0.2,
      railAt(m.x) + 2.4,
    ]);
    light.segment(
      mizzen.topmastAt(z.crosstreesY - 0.3),
      main.lowerAt(m.topY + 0.3),
    );
    light.segment(
      mizzen.topgallantAt(z.topgallantHeadY - 0.3),
      main.topmastAt(m.crosstreesY - 0.2),
    );
  }
  if (fore) {
    const f = fore.spec;
    const bow = rig.bowsprit;
    const along = (t: number): Vec => [
      bow.heel[0] + bow.dir[0] * t,
      bow.heel[1] + bow.dir[1] * t,
    ];
    // Fore stay to the bowsprit; the headsail stays come from the sails.
    stays.segment(
      fore.lowerAt(f.topY - 0.4),
      along(spec.rig.bowsprit.length * 0.3),
    );
    // The fore preventer stay, alongside.
    stays.segment(
      fore.lowerAt(f.topY - 0.9),
      along(spec.rig.bowsprit.length * 0.36),
    );
    for (const st of sails.stays) {
      (st.heavy ? stays : light).segment(st.from, st.to);
    }
    // Fore topgallant and royal stays to the booms.
    light.segment(fore.topgallantAt(f.topgallantHeadY - 0.2), rig.jibBoom.end);
    if (rig.flyingJibBoom) {
      light.segment(fore.topgallantAt(f.truckY - 1.0), rig.flyingJibBoom.end);
    }
    // Bobstays and bowsprit shrouds down to the stem and bows.
    const stem = hull.stemAtWaterline;
    stays.segment(along(spec.rig.bowsprit.length * 0.62), [stem[0] + 1.6, 2.2]);
    stays.segment(along(spec.rig.bowsprit.length * 0.9), [stem[0] + 2.0, 2.9]);
    light.segment(along(spec.rig.bowsprit.length * 0.55), [stem[0] - 1.2, 4.4]);
    light.segment(along(spec.rig.bowsprit.length * 0.75), [stem[0] - 0.4, 3.9]);
    // Martingale: jib-boom ends down to the dolphin striker, and back.
    const ds = rig.dolphinStriker.bottom;
    light.segment(rig.jibBoom.end, ds);
    if (rig.flyingJibBoom) light.segment(rig.flyingJibBoom.end, ds);
    light.segment(ds, [stem[0] + 1.0, 4.0]);
  }

  // Braces: from the after yardarms down and aft to the next mast or the hull.
  const braceTo = (m: MastLayout): Vec | null => {
    if (m.id === "fore" && main) return main.lowerAt(main.spec.topY - 3);
    if (m.id === "main" && mizzen)
      return mizzen.lowerAt(mizzen.spec.topY - 2.5);
    if (m.id === "mizzen" && main) return main.lowerAt(main.spec.topY - 6);
    return null;
  };
  for (const m of rig.masts.values()) {
    const target = braceTo(m);
    if (!target) continue;
    for (const yard of m.spec.yards) {
      const y = m.yards.get(yard.id);
      if (
        !y ||
        (yard.id !== "course" &&
          yard.id !== "topsail" &&
          yard.id !== "crossjack" &&
          yard.id !== "mizzenTopsail")
      )
        continue;
      running.segment(m.id === "mizzen" ? y.right : y.left, target);
    }
  }

  // Course sheets and tacks: clews down to the hull, aft and forward.
  for (const id of ["fore", "main"] as const) {
    const m = mast(id);
    const course = m?.yards.get("course");
    if (!m || !course) continue;
    const footY = railAt(m.spec.x) + 1.8;
    running.segment(
      [course.left[0] - 0.4, footY],
      [course.left[0] - 2.5, railAt(course.left[0] - 2.5) - 0.2],
    );
    running.segment(
      [course.right[0] + 0.4, footY],
      [course.right[0] + 1.8, railAt(course.right[0] + 1.8) - 0.2],
    );
  }

  // Spanker vangs and sheet to the taffrail.
  const taffrail = hull.railTop[0];
  running.segment(rig.gaff.peak, [taffrail[0] + 0.6, taffrail[1] + 0.6]);
  running.segment(rig.boom.end, [taffrail[0] + 1.2, taffrail[1] - 0.2]);
  if (mizzen)
    running.segment(rig.gaff.peak, mizzen.lowerAt(mizzen.spec.lowerHeadY));

  return {
    shrouds: shrouds.toString(),
    stays: stays.toString(),
    light: light.toString(),
    ratlines: ratlines.toString(),
    running: running.toString(),
  };
}
