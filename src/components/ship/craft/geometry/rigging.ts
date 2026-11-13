import { forkRng, jitter } from "@/lib/random";
import { path } from "../../geometry/path";
import { deg, lerp, type Vec } from "../../geometry/vec";
import type { CraftSpec } from "../types";
import { type MastLayout, pointOf, type RigLayout } from "./rig";
import { circle, quadPoints, railAt, ribbon, stemX, taper } from "./shapes";

/**
 * Standing and running rigging, merged by pen into a few paths, with what
 * the shrouds set up to: channels on the side, deadeyes and their lanyards,
 * chain plates; and the ground tackle: the cable from the hawse down into
 * the water ahead, a second anchor catted at the bow.
 *
 * The standing rigging is the shrouds (ratlined where the type had them),
 * futtock, topmast and topgallant shrouds, backstays and the stays
 * smallcraft.ts draws; the running rigging the lifts, footropes and their
 * stirrups, ties, braces, the gaff's halyards and vangs, the boom's topping
 * lift, a lugger's halyards down to her lowered yards, the bowsprit's gear,
 * the ensign's halyard.
 */

export interface RiggingArt {
  /** The stays between the masts and to the bowsprit, behind the yards. */
  stays: string;
  staysLight: string;
  heavy: string;
  shrouds: string;
  light: string;
  ratlines: string;
  running: string;
  lanyards: string;
  chainPlates: string;
  chainShadows: string;
  channels: string;
  channelTops: string;
  channelShadows: string;
  deadeyes: string;
  deadeyeGlints: string;
  gammoning: string;
  cable: string;
  cableShade: string;
  cableGlint: string;
  anchor: string;
  anchorShade: string;
  anchorShadow: string;
  cathead: string;
  catheadTop: string;
  /** Where the cable meets the water. */
  cableEntry: Vec;
}

/** x of segment ab at height y. */
function xAt(a: Vec, b: Vec, y: number): number {
  const t = (y - a[1]) / (b[1] - a[1]);
  return a[0] + (b[0] - a[0]) * t;
}

export function buildRiggingArt(spec: CraftSpec, rig: RigLayout): RiggingArt {
  const h = spec.hull;
  const stays = path();
  const staysLight = path();
  const heavy = path();
  const shrouds = path();
  const light = path();
  const ratlines = path();
  const running = path();
  const lanyards = path();
  const chainPlates = path();
  const chainShadows = path();
  const channels = path();
  const channelTops = path();
  const channelShadows = path();
  const deadeyes = path();
  const deadeyeGlints = path();
  const gammoning = path();
  const r = forkRng(spec.seed, "rigging");

  // The craft's scale for small fittings: deadeyes, gaps.
  const k = Math.min(1, Math.max(0.5, h.length / 34.8));
  const spacing = 0.37;

  for (const L of rig.masts.values()) {
    const m = L.spec;
    if (m.shrouds.length === 0) continue;
    const dL = m.d[0];
    const head = L.lowerAt(m.shroudHead);
    const headAft: Vec = [head[0] - dL * 0.42, head[1]];
    const rd = (m.channel ? 0.13 : 0.075) * (m.channel ? k : 1);
    const gap = m.channel ? 0.55 * k + 0.12 : 0.3;
    const uppers: Vec[] = [];
    const feetX = m.shrouds.map((dx) => m.x + dx);
    if (m.channel) {
      // The channel: a ledge along the side under the rail cap.
      const a = Math.min(...feetX) - 0.42;
      const b = Math.max(...feetX) + 0.42;
      const top = (x: number) => railAt(h, x) - h.railCap - 0.03;
      const th = 0.13 * k + 0.03;
      const pts = (dy: number, dx = 0): Vec[] => [
        [a + dx, top(a) - dy],
        [b + dx, top(b) - dy],
      ];
      const [ta, tb] = pts(0);
      const [ba, bb] = pts(th);
      channels.polygon([ta, tb, bb, ba]);
      channelTops.polygon([
        ta,
        tb,
        [tb[0], tb[1] - th * 0.3],
        [ta[0], ta[1] - th * 0.3],
      ]);
      // Its shadow on the side: low sun from the left, so right and a little down.
      const [sa, sb] = pts(th - 0.01, 0.16);
      const [sa2, sb2] = pts(th + 0.07, 0.18);
      channelShadows.polygon([sa, sb, sb2, sa2]);
    }
    for (const x of feetX) {
      const footY = m.channel
        ? railAt(h, x) - h.railCap - 0.03 + rd * 0.9
        : railAt(h, x) - h.railCap * 0.5 + rd * 0.6;
      const lower: Vec = [x, footY];
      const dir = [headAft[0] - lower[0], headAft[1] - lower[1]];
      const len = Math.hypot(dir[0], dir[1]);
      const u: Vec = [dir[0] / len, dir[1] / len];
      const upper: Vec = [lower[0] + u[0] * gap, lower[1] + u[1] * gap];
      uppers.push(upper);
      circle(deadeyes, lower, rd);
      circle(deadeyes, upper, rd);
      circle(
        deadeyeGlints,
        [lower[0] - rd * 0.3, lower[1] + rd * 0.3],
        rd * 0.38,
      );
      circle(
        deadeyeGlints,
        [upper[0] - rd * 0.3, upper[1] + rd * 0.3],
        rd * 0.38,
      );
      // Lanyards between them, three parts.
      const nrm: Vec = [-u[1], u[0]];
      for (const s of [-0.55, 0, 0.55]) {
        lanyards.segment(
          [lower[0] + nrm[0] * rd * s, lower[1] + nrm[1] * rd * s + rd * 0.6],
          [upper[0] + nrm[0] * rd * s, upper[1] + nrm[1] * rd * s - rd * 0.6],
        );
      }
      // The shroud from the upper deadeye to the masthead.
      shrouds.segment(
        [upper[0] + u[0] * rd * 0.8, upper[1] + u[1] * rd * 0.8],
        headAft,
      );
      // The chain plate down the side, and its shadow.
      const drop = m.channel ? 1.0 * k + 0.25 : 0.42;
      const end: Vec = [lower[0] - u[0] * drop, lower[1] - u[1] * drop];
      chainPlates.segment([lower[0] - u[0] * rd, lower[1] - u[1] * rd], end);
      if (m.channel) {
        chainShadows.segment(
          [lower[0] - u[0] * rd + 0.15, lower[1] - u[1] * rd - 0.05],
          [end[0] + 0.03, end[1] - 0.01],
        );
      }
    }
    if (m.ratlines && uppers.length > 1) {
      const first = uppers[0];
      const last = uppers[uppers.length - 1];
      for (
        let y = Math.max(first[1], last[1]) + 0.55;
        y < m.shroudHead - 0.9;
        y += spacing
      ) {
        const xa = xAt(first, headAft, y);
        const xb = xAt(last, headAft, y);
        if (Math.abs(xb - xa) < 0.22) break;
        ratlines
          .moveTo([Math.min(xa, xb), y + jitter(r, 0.012)])
          .lineTo([Math.max(xa, xb), y + jitter(r, 0.012)]);
      }
    }

    // Above the lower mast: futtocks, topmast and topgallant shrouds, backstays.
    if (L.top && m.topmastHead !== undefined && m.top !== undefined) {
      const rimAft: Vec = [L.top.aft[0] + 0.15, L.top.aft[1]];
      const rimFore: Vec = [L.top.fore[0] - 0.3, L.top.fore[1]];
      const futtockFoot = L.lowerAt(m.top - 1.5);
      for (let i = 0; i < 3; i++)
        light.segment(
          lerp(rimAft, lerp(rimAft, rimFore, 0.55), i / 2),
          futtockFoot,
        );
      const tmHead = L.topmastAt(m.topmastHead - 0.65);
      const tmFeet: Vec[] = [];
      for (let i = 0; i < 3; i++) {
        const p = lerp(rimAft, lerp(rimAft, rimFore, 0.62), i / 2);
        tmFeet.push([p[0], p[1] + 0.05]);
      }
      for (const f of tmFeet) light.segment(f, tmHead);
      if (m.ratlines) {
        for (
          let y = tmFeet[0][1] + 0.5;
          y < m.topmastHead - 1.3;
          y += spacing * 0.95
        ) {
          const xa = xAt(tmFeet[0], tmHead, y);
          const xb = xAt(tmFeet[tmFeet.length - 1], tmHead, y);
          if (Math.abs(xb - xa) < 0.16) break;
          ratlines.moveTo([Math.min(xa, xb), y]).lineTo([Math.max(xa, xb), y]);
        }
      }
      if (L.crosstrees) {
        const tgHead = L.poleAt(m.truck - 0.9);
        light.segment(L.crosstrees.aft, tgHead);
        light.segment(lerp(L.crosstrees.aft, L.crosstrees.fore, 0.45), tgHead);
      }
      if (m.backstay !== undefined) {
        const bx = m.x - m.backstay;
        const foot: Vec = [bx, railAt(h, bx) - h.railCap - 0.05];
        shrouds.segment(L.topmastAt(m.topmastHead - 0.15), foot);
        light.segment(L.poleAt(m.truck - 0.8), [
          bx - 0.55,
          railAt(h, bx - 0.55) - h.railCap - 0.05,
        ]);
      }
    }
  }

  // Stays, as smallcraft.ts lists them.
  for (const s of spec.stays) {
    const a = pointOf(spec, rig, s.from);
    const b = pointOf(spec, rig, s.to);
    (s.heavy ? stays : staysLight).segment(a, b);
  }

  // Running rigging on the yards: lifts, footropes and stirrups, ties, braces.
  const mastsAftToFore = [...rig.masts.values()].sort(
    (p, q) => p.spec.x - q.spec.x,
  );
  for (let mi = 0; mi < mastsAftToFore.length; mi++) {
    const L = mastsAftToFore[mi];
    const m = L.spec;
    for (const y of L.yards) {
      const [cx, cy] = y.centre;
      const lenM = (y.half * 2) / 0.64;
      const liftTo =
        y.level === 0
          ? L.lowerAt((m.head ?? m.truck) - 0.1)
          : y.level === 1
            ? L.topmastAt((m.topmastHead ?? m.truck) - 0.25)
            : L.poleAt(m.truck - 0.35);
      const armL: Vec = [cx - y.half * 0.97, cy];
      const armR: Vec = [cx + y.half * 0.97, cy];
      running.segment(armL, liftTo);
      running.segment(armR, liftTo);
      // Footropes, sagging under the yard, with two stirrups a side.
      const sag = lenM * 0.042;
      for (const side of [-1, 1]) {
        const a: Vec = [cx + side * 0.2, cy - y.d * 0.45];
        const b: Vec = [cx + side * y.half * 0.94, cy - y.d * 0.3];
        const c: Vec = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - sag * 1.6];
        const pts = quadPoints(a, c, b, 10);
        running.polyline(pts);
        for (const t of [0.35, 0.7]) {
          const p = pts[Math.round(t * 10)];
          running.segment([p[0], cy - y.d * 0.4], p);
        }
      }
      // The tie (or slings) up from the yard's middle.
      const tieTo =
        y.level === 0
          ? L.lowerAt((m.top ?? m.truck) - 0.15)
          : y.level === 1
            ? L.topmastAt((m.topmastHead ?? m.truck) - 0.7)
            : L.poleAt(m.truck - 0.6);
      running.segment([cx, cy + y.d * 0.5], tieTo);
      // Braces: to the next mast aft; from the aftmost mast, to the quarter.
      if (y.level < 2) {
        const aftMast = mi > 0 ? mastsAftToFore[mi - 1] : undefined;
        const lead: Vec = aftMast
          ? aftMast.lowerAt(
              Math.max(
                (aftMast.spec.deck ?? 1) + 2.5,
                cy - 3.2 - y.level * 2.2,
              ),
            )
          : [
              -h.sternRake + 1.2 + y.level * 0.8,
              railAt(h, -h.sternRake + 1.2 + y.level * 0.8) + 0.1,
            ];
        if (aftMast || m.id === mastsAftToFore[0].spec.id) {
          running.segment(armL, lead);
          running.segment(armR, lead);
        }
      }
    }
  }

  // The gaff's halyards and vangs, the boom's topping lift and sheet.
  if (rig.gaff && spec.gaff) {
    const g = rig.gaff;
    const L = rig.masts.get(g.mast) as MastLayout;
    const m = L.spec;
    const head = L.lowerAt((m.head ?? m.truck) - 0.3);
    running.segment(lerp(g.throat, g.peak, 0.45), head);
    running.segment(
      lerp(g.throat, g.peak, 0.88),
      L.lowerAt((m.head ?? m.truck) - 0.1),
    );
    const vx = g.peak[0] + 0.4;
    running.segment(g.peak, [vx, railAt(h, Math.max(-h.sternRake, vx)) + 0.05]);
    running.segment(L.lowerAt((m.head ?? m.truck) - 0.6), [
      g.boomEnd[0] + 0.25,
      g.boomEnd[1] + 0.05,
    ]);
    const sx = Math.max(-h.sternRake + 0.3, g.boomEnd[0] + 0.6);
    running.segment(
      [g.boomEnd[0] + 0.35, g.boomEnd[1] - 0.06],
      [sx, railAt(h, sx) + 0.02],
    );
  }

  // A lugger's halyards: from the masthead down to each lowered yard.
  for (const lug of rig.lugs) {
    const L = rig.masts.get(lug.mast);
    if (!L) continue;
    running.segment(L.lowerAt(L.spec.truck - 0.42), lug.sling);
  }

  // The bowsprit's gear: bobstay, gammoning, martingale stays.
  if (rig.bowsprit && spec.bowsprit) {
    const b = rig.bowsprit;
    const bs = spec.bowsprit;
    const stemFoot: Vec = [stemX(h, 0.45) - 0.05, 0.45];
    heavy.segment(stemFoot, [
      b.heel[0] + b.dir[0] * bs.length * 0.86,
      b.heel[1] + b.dir[1] * bs.length * 0.86 - bs.d[1] * 0.4,
    ]);
    running.segment(b.jbEnd, b.martingaleEnd);
    running.segment(b.martingaleEnd, [
      stemX(h, h.rail[2] - 0.5) - 0.1,
      h.rail[2] - 0.5,
    ]);
    // Gammoning: turns lashing the bowsprit down to the stem.
    const g0 = 0.35;
    for (let i = 0; i < 5; i++) {
      const t = g0 + i * 0.13;
      const top: Vec = [
        b.heel[0] + b.dir[0] * t,
        b.heel[1] + b.dir[1] * t + bs.d[0] * 0.5,
      ];
      const yb = h.rail[2] - 0.7;
      gammoning.segment(top, [stemX(h, yb) - 0.25 + i * 0.04, yb]);
    }
  }
  if (rig.runningBowsprit) {
    const rb = rig.runningBowsprit;
    // Its heel lashed at the stem head, a bobstay from the stem.
    heavy.segment([stemX(h, 0.4) - 0.04, 0.4], lerp(rb.from, rb.to, 0.85));
  }

  // The ensign's halyard down the staff.
  const e = rig.ensign;
  if (e.staffFoot && e.staffTop) {
    running.segment(
      [e.staffTop[0] - 0.06, e.staffTop[1] - 0.05],
      [e.staffFoot[0] - 0.02, e.staffFoot[1] + 0.25],
    );
  }

  // The cable: out of the hawse, down and forward into the water, sagging a little.
  const a = spec.anchor;
  const H = a.hawse;
  const run = H[1] / Math.tan(deg(a.angle));
  const W: Vec = [H[0] + run * 1.08, 0];
  const C: Vec = [(H[0] + W[0]) / 2 + run * 0.02, H[1] * 0.42];
  const under: Vec = [W[0] + (W[0] - C[0]) * 0.45, -h.depthShown - 0.2];
  const cablePts = [...quadPoints(H, C, W, 14), under];
  const cable = path().polygon(ribbon(cablePts, a.cable)).toString();
  const shadePts = cablePts.map(
    (p): Vec => [p[0] + a.cable * 0.14, p[1] - a.cable * 0.2],
  );
  const cableShade = path()
    .polygon(ribbon(shadePts, a.cable * 0.55))
    .toString();
  const glintPts = cablePts
    .slice(0, -1)
    .map((p): Vec => [p[0] - a.cable * 0.14, p[1] + a.cable * 0.22]);
  const cableGlint = path()
    .polygon(ribbon(glintPts, a.cable * 0.22))
    .toString();

  // A second anchor catted at the bow, fished up against the side.
  const anchor = path();
  const anchorShade = path();
  const anchorShadow = path();
  const cathead = path();
  const catheadTop = path();
  if (a.catted) {
    const c = a.catted;
    const L = c.length;
    // The cathead's end, standing out from the bow.
    cathead.rect(
      c.at[0] - 0.18 * k - 0.04,
      c.at[1] - 0.16,
      0.36 * k + 0.08,
      0.28,
    );
    catheadTop.rect(
      c.at[0] - 0.18 * k - 0.04,
      c.at[1] + 0.06,
      0.36 * k + 0.08,
      0.06,
    );
    const ring: Vec = [c.at[0] + 0.02, c.at[1] - 0.26];
    const ang = deg(-122);
    const dir: Vec = [Math.cos(ang), Math.sin(ang)];
    const crown: Vec = [ring[0] + dir[0] * L, ring[1] + dir[1] * L];
    const shapes = (b: ReturnType<typeof path>, off: Vec) => {
      const o = (p: Vec): Vec => [p[0] + off[0], p[1] + off[1]];
      const w = L * 0.055;
      b.polygon(taper(o(ring), o(crown), w * 0.8, w * 1.1));
      // The arms: a crescent from the crown, the flukes at their ends.
      const nrm: Vec = [-dir[1], dir[0]];
      const armLen = L * 0.42;
      const arm = (side: number): Vec[] => {
        const pts: Vec[] = [];
        for (let i = 0; i <= 8; i++) {
          const t = i / 8;
          const sweep = side * armLen * Math.sin(t * Math.PI * 0.5);
          const back = armLen * 0.55 * (1 - Math.cos(t * Math.PI * 0.5));
          pts.push(
            o([
              crown[0] + nrm[0] * sweep - dir[0] * back,
              crown[1] + nrm[1] * sweep - dir[1] * back,
            ]),
          );
        }
        return pts;
      };
      for (const side of [-1, 1]) {
        const spine = arm(side);
        b.polygon(ribbon(spine, w * 1.1, w * 0.7));
        const tip = spine[spine.length - 1];
        const prev = spine[spine.length - 3];
        const along: Vec = [tip[0] - prev[0], tip[1] - prev[1]];
        const al = Math.hypot(along[0], along[1]) || 1;
        const ux: Vec = [along[0] / al, along[1] / al];
        const px: Vec = [-ux[1], ux[0]];
        const fw = L * 0.09;
        b.polygon([
          [
            tip[0] - ux[0] * fw * 1.6 + px[0] * fw,
            tip[1] - ux[1] * fw * 1.6 + px[1] * fw,
          ],
          [tip[0] + ux[0] * fw * 0.5, tip[1] + ux[1] * fw * 0.5],
          [
            tip[0] - ux[0] * fw * 1.6 - px[0] * fw,
            tip[1] - ux[1] * fw * 1.6 - px[1] * fw,
          ],
        ]);
      }
      // The stock across the shank near the ring, and the ring.
      const sc = lerp(o(ring), o(crown), 0.1);
      const half = L * 0.42;
      b.polygon(
        taper(
          [sc[0] - nrm[0] * half, sc[1] - nrm[1] * half],
          [sc[0] + nrm[0] * half, sc[1] + nrm[1] * half],
          w * 1.2,
          w * 1.2,
        ),
      );
      circle(b, o(ring), w * 1.15);
    };
    shapes(anchorShadow, [0.15, -0.05]);
    shapes(anchor, [0, 0]);
    // Shade: the underside of the shank and arms.
    anchorShade.polygon(
      taper(
        [ring[0] + 0.02, ring[1] - 0.02],
        [crown[0] + 0.02, crown[1] - 0.02],
        L * 0.03,
        L * 0.05,
      ),
    );
  }

  return {
    stays: stays.toString(),
    staysLight: staysLight.toString(),
    heavy: heavy.toString(),
    shrouds: shrouds.toString(),
    light: light.toString(),
    ratlines: ratlines.toString(),
    running: running.toString(),
    lanyards: lanyards.toString(),
    chainPlates: chainPlates.toString(),
    chainShadows: chainShadows.toString(),
    channels: channels.toString(),
    channelTops: channelTops.toString(),
    channelShadows: channelShadows.toString(),
    deadeyes: deadeyes.toString(),
    deadeyeGlints: deadeyeGlints.toString(),
    gammoning: gammoning.toString(),
    cable,
    cableShade,
    cableGlint,
    anchor: anchor.toString(),
    anchorShade: anchorShade.toString(),
    anchorShadow: anchorShadow.toString(),
    cathead: cathead.toString(),
    catheadTop: catheadTop.toString(),
    cableEntry: W,
  };
}
