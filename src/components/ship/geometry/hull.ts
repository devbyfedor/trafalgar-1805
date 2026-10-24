import { forkRng } from "@/lib/random";
import type { GunDeckSpec, ShipSpec } from "../types";
import { path } from "./path";
import { offsetLine, sampleSheer, sheerY } from "./sheer";
import { deg, type Vec } from "./vec";

/**
 * The hull in starboard elevation, as in 1805 (docs/history-notes.md):
 * a low waist with the quarterdeck, poop and forecastle stepping up in
 * drifts; the forecastle closed at the bow by the beakhead bulkhead, with the
 * open head forward of it (knee, cheeks, three headrails, the figurehead);
 * three ochre bands with black lids (the Nelson chequer), the central upper
 * ports lidless; channels above the upper band; side steps instead of an
 * entry port; a three-tier quarter gallery on the closed stern.
 *
 * x = 0 is the aft end of the gun deck (the sternpost at the waterline),
 * y = 0 the load waterline.
 */

/** How far below the waterline the hull is drawn (the sea covers it). */
export const DEPTH_SHOWN = 3.2;

export interface HullGeometry {
  outline: string;
  /** Top of the side, aft to fore, for nettings, sheets and stays. */
  railTop: Vec[];
  bands: string;
  bandShadows: string;
  copper: string;
  verdigris: string;
  lids: string;
  lidHighlights: string;
  openPorts: string;
  portLinings: string;
  muzzles: string;
  planking: string;
  railMouldings: string;
  channels: string;
  channelHighlights: string;
  deadeyes: string;
  chainPlates: string;
  sideSteps: string;
  gallery: { ground: string; windows: string; trim: string };
  stern: { body: string; trim: string; lanterns: string; lanternGlass: string };
  head: {
    knee: string;
    rails: string;
    timbers: string;
    cheeks: string;
    hawse: string;
    figure: string;
    figureShield: string;
    figureCrown: string;
    figureSash: string;
    figureScroll: string;
  };
  catheads: string;
  anchors: string;
  hammocks: string;
  hammockCranes: string;
  boats: string;
  boatStrakes: string;
  rudder: string;
  rudderCopper: string;
  /** Deadeye positions per mast (shroud feet), aft to fore. */
  shroudFeet: Record<string, Vec[]>;
  /** The aft deadeyes of each channel, where backstays come down. */
  backstayFeet: Record<string, Vec[]>;
  /** The top of the beakhead bulkhead (fore end of the forecastle rail). */
  bowTop: Vec;
  /** The stem at the waterline: where the bow wave sits. */
  stemAtWaterline: Vec;
  /** The taffrail, aft end of the poop rail. */
  taffrail: Vec;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

/** x of the stern's aft profile at height y. */
function sternX(spec: ShipSpec, y: number): number {
  const { hull } = spec;
  const rake = Math.tan(deg(hull.sternpostRakeDeg));
  const counterY = 2.6;
  if (y <= counterY) return -y * rake;
  const xCounter = -counterY * rake;
  const sweep = 2.4;
  const tuck = -hull.sternOverhang + 0.7;
  if (y <= counterY + sweep) {
    // The counter: a quick sweep aft above the wing transom.
    const t = (y - counterY) / sweep;
    const ease = 1 - (1 - t) ** 2.2;
    return xCounter + (tuck - xCounter) * ease;
  }
  // The stern rakes gently aft to the taffrail.
  const top = 13;
  const t = Math.min(1, (y - counterY - sweep) / (top - counterY - sweep));
  return tuck - 0.7 * t;
}

/** x of the stem at height y; below the waterline the forefoot curves back. */
export function stemX(spec: ShipSpec, y: number): number {
  const { hull } = spec;
  if (y <= 0) {
    const t = -y / DEPTH_SHOWN;
    return hull.waterlineLength - 1.1 * t * t;
  }
  const t = Math.min(1, y / 7.2);
  return hull.waterlineLength + hull.stemOverhang * t ** 1.25;
}

/** Height of the top of the side at x, including the raised decks. */
export function railY(spec: ShipSpec, x: number): number {
  const { hull } = spec;
  const base = sheerY(hull.rail, hull.sheer, x);
  if (hull.poop && x <= hull.poop.startX) return base + hull.poop.rail;
  if (x <= hull.quarterdeck.startX) return base + hull.quarterdeck.rail;
  if (x >= hull.forecastle.endX) return base + hull.forecastle.rail;
  return base;
}

function portCentres(deck: GunDeckSpec): number[] {
  if (deck.xs) return [...deck.xs];
  const n = deck.portsPerSide;
  if (n === 1) return [(deck.firstX + deck.lastX) / 2];
  return Array.from(
    { length: n },
    (_, i) => deck.firstX + ((deck.lastX - deck.firstX) * i) / (n - 1),
  );
}

/** A small circle as a closed subpath. */
function circle(b: ReturnType<typeof path>, c: Vec, r: number): void {
  b.moveTo([c[0] - r, c[1]])
    .quadTo([c[0] - r, c[1] + r], [c[0], c[1] + r])
    .quadTo([c[0] + r, c[1] + r], [c[0] + r, c[1]])
    .quadTo([c[0] + r, c[1] - r], [c[0], c[1] - r])
    .quadTo([c[0] - r, c[1] - r], [c[0] - r, c[1]])
    .close();
}

export function buildHull(spec: ShipSpec): HullGeometry {
  const { hull, details } = spec;
  const sheer = hull.sheer;
  const rng = forkRng(spec.seed, "hull");
  const beak = details.beakhead ?? { x: hull.waterlineLength - 1.5, bottom: 7 };
  const wale = hull.rail;

  // ---- Outline -----------------------------------------------------------
  const outlinePts: Vec[] = [];
  const taffrailX = sternX(spec, 13);
  const taffrailY = railY(spec, taffrailX) + 0.15;
  for (let i = 0; i <= 32; i++) {
    const y = -DEPTH_SHOWN + ((taffrailY + DEPTH_SHOWN) * i) / 32;
    outlinePts.push([sternX(spec, y), y]);
  }
  // Along the top of the side, aft to fore, with vertical drifts.
  const railTop: Vec[] = [];
  const steps = 120;
  for (let i = 0; i <= steps; i++) {
    const x = taffrailX + ((beak.x - taffrailX) * i) / steps;
    railTop.push([x, railY(spec, x)]);
  }
  for (let i = 0; i < railTop.length; i++) {
    const p = railTop[i];
    const prev = railTop[i - 1];
    if (prev && Math.abs(p[1] - prev[1]) > 0.3) {
      const mid = (p[0] + prev[0]) / 2;
      outlinePts.push([mid, prev[1]]);
      outlinePts.push([mid, p[1]]);
    }
    outlinePts.push(p);
  }
  const bowTop = railTop[railTop.length - 1];
  // Down the beakhead bulkhead, forward along the head platform to the stem.
  outlinePts.push([beak.x, beak.bottom]);
  const stemTop = beak.bottom;
  for (let i = 0; i <= 28; i++) {
    const y = stemTop - ((stemTop + DEPTH_SHOWN) * i) / 28;
    outlinePts.push([stemX(spec, y), y]);
  }
  const outline = path().polygon(outlinePts).toString();

  // ---- Bands, shadows and ports ------------------------------------------
  const x0 = -hull.sternOverhang - 2;
  const x1 = hull.waterlineLength + hull.stemOverhang + 2;
  const bands = path();
  const bandShadows = path();
  const lids = path();
  const lidHi = path();
  const openPorts = path();
  const linings = path();
  const muzzles = path();
  for (const deck of spec.gunDecks) {
    if (deck.band) {
      const taper = deck.band.taper ?? 0;
      const lower = {
        y: deck.sill.y - deck.band.below,
        riseAft: deck.sill.riseAft + taper,
        riseFwd: deck.sill.riseFwd + taper,
      };
      const upper = offsetLine(deck.sill, deck.port.height + deck.band.above);
      const top = sampleSheer(upper, sheer, x0, x1, 48);
      const bottom = sampleSheer(lower, sheer, x0, x1, 48).reverse();
      bands.polygon([...top, ...bottom]);
      // The strake above stands proud: a thin shadow under it.
      const sh = sampleSheer(offsetLine(upper, -0.08), sheer, x0, x1, 48);
      bandShadows.polygon([...top, ...sh.reverse()]);
    }
    const open = new Set(deck.openPorts ?? []);
    portCentres(deck).forEach((cx, i) => {
      const sill = sheerY(deck.sill, sheer, cx);
      const w = deck.port.width;
      const h = deck.port.height;
      const slope =
        sheerY(deck.sill, sheer, cx + 0.5) - sheerY(deck.sill, sheer, cx - 0.5);
      const a: Vec = [cx - w / 2, sill - (slope * w) / 2];
      const b: Vec = [cx + w / 2, sill + (slope * w) / 2];
      const c: Vec = [cx + w / 2, sill + h + (slope * w) / 2];
      const d: Vec = [cx - w / 2, sill + h - (slope * w) / 2];
      if (open.has(i)) {
        openPorts.polygon([a, b, c, d]);
        // The red lining: a frame inside the opening.
        const k = 0.16;
        const inset = (p: Vec, q: Vec): Vec => [
          p[0] + (q[0] - p[0]) * k,
          p[1] + (q[1] - p[1]) * k,
        ];
        linings
          .polygon([a, b, c, d])
          .polygon([inset(a, c), inset(d, b), inset(c, a), inset(b, d)]);
        // The gun's muzzle, run out a little, its face painted red.
        circle(muzzles, [cx, sill + h * 0.42], Math.min(w, h) * 0.19);
      } else {
        lids.polygon([a, b, c, d]);
        lidHi
          .moveTo([d[0] + 0.05, d[1] - 0.05])
          .lineTo([c[0] - 0.05, c[1] - 0.05]);
        // Hinge straps down from the top of the lid.
        lidHi
          .moveTo([d[0] + w * 0.2, d[1] - 0.14])
          .lineTo([d[0] + w * 0.2, d[1] - h * 0.55]);
        lidHi
          .moveTo([c[0] - w * 0.2, c[1] - 0.14])
          .lineTo([c[0] - w * 0.2, c[1] - h * 0.55]);
      }
    });
    if (deck.bowPort) {
      // Two side-hinged half lids, closed.
      const cx = deck.bowPort.x;
      const sill = sheerY(deck.sill, sheer, cx) + 0.05;
      const w = deck.port.width * 0.8;
      const h = deck.port.height * 0.8;
      lids.rect(cx - w / 2, sill, w, h);
      lidHi.moveTo([cx, sill + 0.05]).lineTo([cx, sill + h - 0.05]);
    }
  }

  // ---- Planking seams and rail mouldings ---------------------------------
  const planking = path();
  for (let i = 0; i < 7; i++) {
    const y = 0.55 + i * 1.18 + rng() * 0.15;
    const line = {
      y,
      riseAft: wale.riseAft * 1.8,
      riseFwd: wale.riseFwd * 1.8,
    };
    planking.polyline(
      sampleSheer(line, sheer, x0 + rng() * 5, x1 - rng() * 5, 36),
    );
  }
  const railMouldings = path();
  railMouldings.polyline(railTop.map(([x, y]): Vec => [x, y - 0.32]));
  railMouldings.polyline(railTop.map(([x, y]): Vec => [x, y - 0.95]));

  // ---- Copper ------------------------------------------------------------
  const copper = path()
    .rect(x0, -DEPTH_SHOWN - 1, x1 - x0, DEPTH_SHOWN + 1 + hull.copperAbove)
    .toString();
  // Verdigris where the copper meets the sea.
  const verdigris = path()
    .rect(x0, -0.12, x1 - x0, 0.2)
    .toString();

  // ---- Channels, deadeyes, chains ----------------------------------------
  const channels = path();
  const channelHi = path();
  const deadeyes = path();
  const chainPlates = path();
  const shroudFeet: Record<string, Vec[]> = {};
  const backstayFeet: Record<string, Vec[]> = {};
  const waleSheer = spec.wales[0]?.line ?? wale;
  for (const ch of details.channels) {
    const mast = spec.rig.masts.find((m) => m.id === ch.mast);
    const n = mast?.shroudsPerSide ?? 8;
    const backs = mast?.backstaysPerSide ?? 2;
    const line = {
      y: ch.y,
      riseAft: waleSheer.riseAft,
      riseFwd: waleSheer.riseFwd,
    };
    const thick = 0.26;
    const top = sampleSheer(line, sheer, ch.startX, ch.endX, 10);
    channels.polygon([
      ...top,
      ...top.map(([x, y]): Vec => [x, y - thick]).reverse(),
    ]);
    channelHi.polyline(top.map(([x, y]): Vec => [x, y + 0.02]));
    const feet: Vec[] = [];
    const total = n + backs;
    for (let i = 0; i < total; i++) {
      const x =
        ch.startX +
        0.4 +
        ((ch.endX - ch.startX - 0.8) * i) / Math.max(1, total - 1);
      const yc = sheerY(line, sheer, x);
      const foot: Vec = [x, yc + 0.36];
      feet.push(foot);
      circle(deadeyes, foot, 0.19);
      // Chains: down across the upper band to the strake above the middle band.
      chainPlates.moveTo([x, yc - thick]).lineTo([x - 0.22, yc - thick - 1.75]);
    }
    shroudFeet[ch.mast] = feet.slice(backs);
    backstayFeet[ch.mast] = feet.slice(0, backs);
  }

  // ---- Side steps --------------------------------------------------------
  const sideSteps = path();
  if (details.sideSteps) {
    const x = details.sideSteps.x;
    const top = railY(spec, x) - 0.25;
    for (let y = 0.45; y < top; y += 0.42) {
      sideSteps.rect(x - 0.42, y, 0.84, 0.11);
    }
    sideSteps.moveTo([x - 0.62, 1.2]).lineTo([x - 0.62, top + 0.9]);
    sideSteps.moveTo([x + 0.62, 1.2]).lineTo([x + 0.62, top + 0.9]);
  }

  // ---- Quarter gallery ---------------------------------------------------
  const gallery = { ground: "", windows: "", trim: "" };
  if (details.quarterGallery) {
    const g = details.quarterGallery;
    const ground = path();
    const windows = path();
    const trim = path();
    // The gallery rakes aft with the stern.
    const lean = 0.07;
    const xa = (y: number) => sternX(spec, y) + 0.15;
    // The fore edge bulges out through the middle tier, like the real gallery.
    const xf = (y: number) =>
      g.endX -
      (y - g.bottom) * lean +
      0.4 *
        Math.sin(
          Math.PI *
            Math.min(1, Math.max(0, (y - g.bottom) / (g.top - g.bottom))),
        );
    const tierH = (g.top - g.bottom) / g.tiers;
    // Body, with the upper finishing (a low dome) and the lower finishing
    // (a drop tapering to a pendant).
    const foreEdge: Vec[] = [];
    for (let i = 0; i <= 10; i++) {
      const y = g.bottom + ((g.top - g.bottom) * i) / 10;
      foreEdge.push([xf(y), y]);
    }
    ground.polygon([
      [xa(g.bottom), g.bottom],
      ...foreEdge,
      [xf(g.top) - 0.35, g.top + 0.55],
      [(xa(g.top) + xf(g.top)) / 2 + 0.3, g.top + 1.05],
      [xa(g.top) + 0.2, g.top + 0.75],
      [xa(g.top), g.top],
    ]);
    const dropTop = g.bottom;
    const dropBottom = g.bottom - 2.1;
    const dx0 = xa(dropTop);
    const dx1 = xf(dropTop);
    ground
      .moveTo([dx0 + 0.1, dropTop])
      .lineTo([dx1, dropTop])
      .quadTo(
        [dx1 - 0.3, dropTop - 1.0],
        [(dx0 + dx1) / 2 + 0.6, dropBottom + 0.35],
      )
      .lineTo([(dx0 + dx1) / 2 + 0.35, dropBottom])
      .quadTo([dx0 + 0.6, dropTop - 0.9], [dx0 + 0.1, dropTop])
      .close();
    for (let t = 0; t < g.tiers; t++) {
      const yb = g.bottom + t * tierH + 0.42;
      const yt = yb + tierH - 0.95;
      const span = xf(yb) - xa(yb) - 0.7;
      const w = span / g.windowsPerTier;
      for (let k = 0; k < g.windowsPerTier; k++) {
        const wx = xa(yb) + 0.35 + k * w + 0.13;
        windows.rect(wx, yb, w - 0.26, yt - yb);
      }
      // Carved pilasters between the lights.
      for (let k = 0; k <= g.windowsPerTier; k++) {
        const px = xa(yb) + 0.35 + k * w - 0.06;
        trim.rect(px, yb - 0.1, 0.14, yt - yb + 0.2);
      }
      // A carved balustrade band under each tier.
      const by = g.bottom + t * tierH;
      trim.rect(xa(by) - 0.05, by, xf(by) - xa(by) + 0.15, 0.32);
    }
    trim.rect(xa(g.top) - 0.05, g.top - 0.1, xf(g.top) - xa(g.top) + 0.2, 0.22);
    // Pendant finial on the drop, and one on the dome.
    const px = (dx0 + dx1) / 2 + 0.47;
    trim.rect(px - 0.1, dropBottom - 0.35, 0.2, 0.4);
    const fx = (xa(g.top) + xf(g.top)) / 2 + 0.3;
    trim.rect(fx - 0.08, g.top + 1.0, 0.16, 0.45);
    gallery.ground = ground.toString();
    gallery.windows = windows.toString();
    gallery.trim = trim.toString();
  }

  // ---- The stern seen edge-on, taffrail and lanterns ----------------------
  const sternBody = path();
  const sternTrim = path();
  const lanterns = path();
  const lanternGlass = path();
  {
    const y0 = 4.4;
    sternBody.polygon([
      [sternX(spec, y0) + 0.35, y0],
      [sternX(spec, taffrailY) + 0.5, taffrailY],
      [sternX(spec, taffrailY) - 0.25, taffrailY + 0.35],
      [sternX(spec, y0) - 0.2, y0 - 0.2],
    ]);
    // Window tiers and the false galleries between them, edge-on.
    for (let t = 0; t < details.sternTiers; t++) {
      const y = 4.9 + t * 2.4;
      sternTrim.rect(sternX(spec, y) - 0.22, y, 0.38, 0.25);
    }
    const lanternCount = Math.min(2, details.lanterns ?? 0);
    for (let i = 0; i < lanternCount; i++) {
      const lx = sternX(spec, taffrailY) + 0.15 - i * 0.55;
      const ly = taffrailY + 0.35 + i * 0.25;
      lanterns.rect(lx - 0.06, ly, 0.12, 0.45);
      lanterns.polygon([
        [lx - 0.42, ly + 0.45],
        [lx + 0.42, ly + 0.45],
        [lx + 0.5, ly + 1.35],
        [lx + 0.2, ly + 1.75],
        [lx - 0.2, ly + 1.75],
        [lx - 0.5, ly + 1.35],
      ]);
      lanterns.rect(lx - 0.05, ly + 1.75, 0.1, 0.35);
      lanternGlass.polygon([
        [lx - 0.3, ly + 0.6],
        [lx + 0.3, ly + 0.6],
        [lx + 0.36, ly + 1.3],
        [lx - 0.36, ly + 1.3],
      ]);
    }
  }

  // ---- The head ----------------------------------------------------------
  const head = {
    knee: "",
    rails: "",
    timbers: "",
    cheeks: "",
    hawse: "",
    figure: "",
    figureShield: "",
    figureCrown: "",
    figureSash: "",
    figureScroll: "",
  };
  {
    const h = details.head;
    const sBase: Vec = [stemX(spec, 0.8), 0.8];
    const sTop: Vec = [stemX(spec, beak.bottom - 0.2), beak.bottom - 0.2];
    const figBase: Vec = [sTop[0] + h.length - 1.6, h.figureheadBase];
    // The knee of the head: a curved cutwater from the stem up to the figure.
    head.knee = path()
      .moveTo(sBase)
      .cubicTo(
        [sBase[0] + h.length * 0.45, 1.2],
        [figBase[0] + 0.4, figBase[1] - 2.6],
        [figBase[0] + 0.55, figBase[1] - 0.2],
      )
      .lineTo([figBase[0] - 0.45, figBase[1] + 0.15])
      .cubicTo(
        [figBase[0] - 0.9, figBase[1] - 1.9],
        [sTop[0] + 0.6, 2.4],
        [stemX(spec, 3.2), 3.2],
      )
      .close()
      .toString();
    // Trailboard line along the knee.
    const trail = path()
      .moveTo([stemX(spec, 2.6) + 0.4, 2.7])
      .cubicTo(
        [sBase[0] + h.length * 0.42, 2.9],
        [figBase[0] - 0.3, figBase[1] - 2.0],
        [figBase[0], figBase[1] - 0.4],
      );
    // Headrails: three a side, from the bow under the cathead, sweeping down
    // in a deep curve and up again to the back of the figure.
    const rails = path();
    for (let r = 0; r < h.rails; r++) {
      const start: Vec = [beak.x - 0.15 + r * 0.1, 10.05 - r * 1.05];
      const end: Vec = [figBase[0] - 0.55, figBase[1] + 1.55 - r * 0.52];
      const sag = 2.3 - r * 0.5;
      rails
        .moveTo(start)
        .cubicTo(
          [start[0] + 1.1, start[1] - sag],
          [end[0] - 2.8, end[1] - sag * 0.75],
          end,
        );
    }
    head.rails = rails.append(trail).toString();
    // Head timbers: uprights from the head grating to the upper rail.
    const timbers = path();
    for (let i = 1; i <= 4; i++) {
      const x = beak.x + ((figBase[0] - beak.x) * i) / 5;
      const top = 8.9 - Math.sin((Math.PI * i) / 5) * 1.3;
      timbers.moveTo([x, beak.bottom + 0.05]).lineTo([x + 0.12, top]);
    }
    head.timbers = timbers.toString();
    // Cheeks: two curved knees along the bow above and below the hawse.
    const cheeks = path();
    for (const cy of [3.0, 4.6]) {
      const sx = stemX(spec, cy);
      cheeks
        .moveTo([sx + 1.4, cy + 0.35])
        .quadTo([sx - 0.6, cy + 0.1], [sx - 3.6, cy + 0.55]);
    }
    head.cheeks = cheeks.toString();
    const hawse = path();
    for (const hh of details.hawse ?? []) circle(hawse, [hh.x, hh.y], 0.26);
    head.hawse = hawse.toString();

    // The figurehead (1801–03): the royal arms, crowned, held by two cupids.
    // From the starboard side the near cupid (blue sash) leans forward in
    // front of the shield; the far cupid shows behind it; a carved scroll
    // bracket below.
    const fx = figBase[0];
    const fy = figBase[1];
    const fh = h.figureheadTop - h.figureheadBase;
    const at = (dx: number, k: number): Vec => [fx + dx, fy + fh * k];
    const figure = path();
    // The far (port) cupid, glimpsed behind the shield.
    figure
      .moveTo(at(-0.95, 0.38))
      .quadTo(at(-1.15, 0.6), at(-0.85, 0.74))
      .quadTo(at(-0.6, 0.66), at(-0.55, 0.45))
      .close();
    circle(figure, at(-0.88, 0.8), 0.2);
    // The near (starboard) cupid: head, body leaning forward, raised arm.
    circle(figure, at(0.58, 0.69), 0.26);
    figure
      .moveTo(at(0.05, 0.16))
      .cubicTo(at(0.55, 0.12), at(0.95, 0.38), at(0.78, 0.6))
      .quadTo(at(0.55, 0.66), at(0.32, 0.6))
      .lineTo(at(0.1, 0.82))
      .lineTo(at(-0.02, 0.78))
      .lineTo(at(0.2, 0.52))
      .quadTo(at(-0.05, 0.4), at(0.05, 0.16))
      .close();
    head.figure = figure.toString();
    // The shield of the royal arms, seen a little from the side.
    head.figureShield = path()
      .moveTo(at(-0.6, 0.84))
      .lineTo(at(0.22, 0.88))
      .quadTo(at(0.3, 0.55), at(-0.12, 0.28))
      .quadTo(at(-0.62, 0.5), at(-0.6, 0.84))
      .close()
      .toString();
    head.figureCrown = path()
      .moveTo(at(-0.52, 0.86))
      .lineTo(at(0.16, 0.89))
      .lineTo(at(0.2, 0.97))
      .lineTo(at(0.02, 0.94))
      .lineTo(at(-0.14, 1.02))
      .lineTo(at(-0.3, 0.93))
      .lineTo(at(-0.5, 0.96))
      .close()
      .toString();
    head.figureSash = path()
      .moveTo(at(0.18, 0.22))
      .lineTo(at(0.8, 0.52))
      .lineTo(at(0.74, 0.6))
      .lineTo(at(0.1, 0.31))
      .close()
      .toString();
    // The bracket: a carved scroll curling under the group.
    head.figureScroll = path()
      .moveTo(at(-0.75, 0.06))
      .cubicTo(at(-0.2, -0.08), at(0.55, -0.04), at(0.95, 0.12))
      .quadTo(at(1.05, 0.22), at(0.9, 0.26))
      .cubicTo(at(0.5, 0.12), at(-0.2, 0.1), at(-0.68, 0.22))
      .close()
      .toString();
  }

  // ---- Catheads and the catted, fished bower anchor ----------------------
  const catheads = path();
  const anchors = path();
  {
    const c = details.cathead;
    catheads.polygon([
      [c.x - 0.7, c.y - 0.28],
      [c.x + 1.75, c.y + 0.12],
      [c.x + 1.82, c.y + 0.6],
      [c.x - 0.7, c.y + 0.3],
    ]);
    const ring: Vec = [c.x + 1.35, c.y - 0.15];
    const crown: Vec = [c.x - 3.7, c.y - 2.9];
    const dx = crown[0] - ring[0];
    const dy = crown[1] - ring[1];
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const sw = 0.16;
    anchors.polygon([
      [ring[0] + nx * sw, ring[1] + ny * sw],
      [crown[0] + nx * sw, crown[1] + ny * sw],
      [crown[0] - nx * sw, crown[1] - ny * sw],
      [ring[0] - nx * sw, ring[1] - ny * sw],
    ]);
    // The stock stands roughly vertical just below the ring.
    const s: Vec = [ring[0] + ux * 0.5, ring[1] + uy * 0.5];
    anchors.rect(s[0] - 0.13, s[1] - 1.5, 0.26, 2.7);
    // Arms and palms against the bill-board.
    for (const sign of [1, -1]) {
      const tip: Vec = [
        crown[0] + nx * sign * 1.45 - ux * 0.35,
        crown[1] + ny * sign * 1.45 - uy * 0.35,
      ];
      anchors
        .moveTo([crown[0] + nx * sign * 0.12, crown[1] + ny * sign * 0.12])
        .quadTo([crown[0] + nx * sign * 0.9, crown[1] + ny * sign * 0.9], tip)
        .lineTo([
          tip[0] - ux * 0.55 - nx * sign * 0.1,
          tip[1] - uy * 0.55 - ny * sign * 0.1,
        ])
        .quadTo(
          [
            crown[0] + nx * sign * 0.7 - ux * 0.3,
            crown[1] + ny * sign * 0.7 - uy * 0.3,
          ],
          [
            crown[0] - nx * sign * 0.12 - ux * 0.2,
            crown[1] - ny * sign * 0.12 - uy * 0.2,
          ],
        )
        .close();
    }
  }

  // ---- Hammocks, cranes, boats -------------------------------------------
  const hammocks = path();
  const cranes = path();
  if (details.hammockNettings) {
    const startX = railTop[0][0] + 0.8;
    const endX = bowTop[0] - 0.6;
    const along = railTop.filter(([x]) => x >= startX && x <= endX);
    // An irregular band of stowed hammocks above the rail.
    const top = along.map(
      ([x, y], i): Vec => [
        x,
        y + 0.82 + (i % 3 === 0 ? 0.08 : 0) + rng() * 0.06,
      ],
    );
    const bottom = along.map(([x, y]): Vec => [x, y - 0.04]).reverse();
    hammocks.polygon([...top, ...bottom]);
    for (let x = startX + 0.6; x < endX; x += 1.9) {
      const y = railY(spec, x);
      cranes.moveTo([x, y - 0.05]).lineTo([x, y + 0.92]);
    }
    cranes.polyline(along.map(([x, y]): Vec => [x, y + 0.9]));
  }
  const boats = path();
  const boatStrakes = path();
  if (details.boats) {
    const b = details.boats;
    const y = railY(spec, (b.startX + b.endX) / 2) + 0.8;
    boats
      .moveTo([b.startX, y])
      .quadTo([b.startX + 0.6, y + b.rise], [b.startX + 1.6, y + b.rise])
      .lineTo([b.endX - 1.6, y + b.rise])
      .quadTo([b.endX - 0.4, y + b.rise], [b.endX, y])
      .close();
    boatStrakes
      .moveTo([b.startX + 0.7, y + b.rise - 0.02])
      .lineTo([b.endX - 0.7, y + b.rise - 0.02]);
  }

  // ---- Rudder ------------------------------------------------------------
  const rudderPts: Vec[] = [
    [sternX(spec, -DEPTH_SHOWN) + 0.05, -DEPTH_SHOWN],
    [sternX(spec, 2.7) + 0.05, 2.7],
    [sternX(spec, 2.7) - 0.5, 2.7],
    [sternX(spec, -DEPTH_SHOWN) - 1.2, -DEPTH_SHOWN],
  ];
  const rudder = path().polygon(rudderPts).toString();
  const rudderCopper = path()
    .polygon([
      rudderPts[0],
      [sternX(spec, hull.copperAbove) + 0.05, hull.copperAbove],
      [sternX(spec, hull.copperAbove) - 0.62, hull.copperAbove],
      rudderPts[3],
    ])
    .toString();

  const bounds = {
    minX: Math.min(...outlinePts.map((p) => p[0])),
    maxX: stemX(spec, beak.bottom) + details.head.length + 0.5,
    minY: -DEPTH_SHOWN,
    maxY: Math.max(...outlinePts.map((p) => p[1])) + 2.2,
  };

  return {
    outline,
    railTop,
    bands: bands.toString(),
    bandShadows: bandShadows.toString(),
    copper,
    verdigris,
    lids: lids.toString(),
    lidHighlights: lidHi.toString(),
    openPorts: openPorts.toString(),
    portLinings: linings.toString(),
    muzzles: muzzles.toString(),
    planking: planking.toString(),
    railMouldings: railMouldings.toString(),
    channels: channels.toString(),
    channelHighlights: channelHi.toString(),
    deadeyes: deadeyes.toString(),
    chainPlates: chainPlates.toString(),
    sideSteps: sideSteps.toString(),
    gallery,
    stern: {
      body: sternBody.toString(),
      trim: sternTrim.toString(),
      lanterns: lanterns.toString(),
      lanternGlass: lanternGlass.toString(),
    },
    head,
    catheads: catheads.toString(),
    anchors: anchors.toString(),
    hammocks: hammocks.toString(),
    hammockCranes: cranes.toString(),
    boats: boats.toString(),
    boatStrakes: boatStrakes.toString(),
    rudder,
    rudderCopper,
    shroudFeet,
    backstayFeet,
    bowTop,
    stemAtWaterline: [hull.waterlineLength, 0],
    taffrail: [taffrailX, taffrailY],
    bounds,
  };
}
