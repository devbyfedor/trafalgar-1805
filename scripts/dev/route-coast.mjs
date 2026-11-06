// Samples a route as the chart draws it (centripetal Catmull-Rom in Mercator
// map space, after src/components/chart/lines/Route.ts) and reports how near
// the curve comes to Natural Earth's land, in nm.
//   node scripts/dev/route-coast.mjs data/raw/natural-earth <route.json [[lon, lat], ...]>
import { readFileSync } from "node:fs";

const [dir, file] = process.argv.slice(2);
const R = 6378.137,
  DEG = Math.PI / 180;
const mx = (lon) => R * lon * DEG,
  my = (lat) => R * Math.log(Math.tan(Math.PI / 4 + (lat * DEG) / 2));
const lonOf = (x) => x / R / DEG,
  latOf = (y) => (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) / DEG;
const pts = JSON.parse(readFileSync(file, "utf8"));
const xy = pts.flatMap(([lon, lat]) => [mx(lon), my(lat)]);
const knot = (ax, ay, bx, by) =>
  Math.max(1e-6, Math.hypot(bx - ax, by - ay) ** 0.5);
const n = xy.length / 2,
  out = [];
const at = (i) => {
  const j = Math.min(n - 1, Math.max(0, i));
  return [xy[j * 2], xy[j * 2 + 1]];
};
for (let i = 0; i < n - 1; i++) {
  const [x1, y1] = at(i),
    [x2, y2] = at(i + 1);
  const [x0, y0] = i > 0 ? at(i - 1) : [2 * x1 - x2, 2 * y1 - y2];
  const [x3, y3] = i < n - 2 ? at(i + 2) : [2 * x2 - x1, 2 * y2 - y1];
  const t0 = 0,
    t1 = t0 + knot(x0, y0, x1, y1),
    t2 = t1 + knot(x1, y1, x2, y2),
    t3 = t2 + knot(x2, y2, x3, y3);
  const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 1));
  for (let s = 0; s < steps; s++) {
    const u = t1 + ((t2 - t1) * s) / steps,
      p = [0, 0];
    for (let k = 0; k < 2; k++) {
      const [p0, p1, p2, p3] = k ? [y0, y1, y2, y3] : [x0, x1, x2, x3];
      const a1 = ((t1 - u) / (t1 - t0)) * p0 + ((u - t0) / (t1 - t0)) * p1;
      const a2 = ((t2 - u) / (t2 - t1)) * p1 + ((u - t1) / (t2 - t1)) * p2;
      const a3 = ((t3 - u) / (t3 - t2)) * p2 + ((u - t2) / (t3 - t2)) * p3;
      const b1 = ((t2 - u) / (t2 - t0)) * a1 + ((u - t0) / (t2 - t0)) * a2;
      const b2 = ((t3 - u) / (t3 - t1)) * a2 + ((u - t1) / (t3 - t1)) * a3;
      p[k] = ((t2 - u) / (t2 - t1)) * b1 + ((u - t1) / (t2 - t1)) * b2;
    }
    out.push([lonOf(p[0]), latOf(p[1]), i]);
  }
}
// Only the coast inside the route's own box (lon, lat), 3° wider each way,
// is read.
const lons = pts.map(([lon]) => lon);
const lats = pts.map(([, lat]) => lat);
const box = [
  Math.min(...lons) - 3,
  Math.min(...lats) - 3,
  Math.max(...lons) + 3,
  Math.max(...lats) + 3,
];
const segs = [];
for (const f of ["ne_10m_land.geojson", "ne_10m_minor_islands.geojson"]) {
  const gj = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  for (const feat of gj.features) {
    const g = feat.geometry;
    for (const poly of g.type === "Polygon" ? [g.coordinates] : g.coordinates)
      for (const ring of poly)
        for (let i = 1; i < ring.length; i++)
          if (
            ring[i][0] > box[0] &&
            ring[i][0] < box[2] &&
            ring[i][1] > box[1] &&
            ring[i][1] < box[3]
          )
            segs.push([ring[i - 1], ring[i]]);
  }
}
function nearest(lon, lat) {
  const k = Math.cos(lat * DEG);
  let best = 1e9;
  for (const [a, b] of segs) {
    const ax = (a[0] - lon) * 60 * k,
      ay = (a[1] - lat) * 60,
      bx = (b[0] - lon) * 60 * k,
      by = (b[1] - lat) * 60;
    const dx = bx - ax,
      dy = by - ay;
    const t = Math.max(
      0,
      Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)),
    );
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}
// Per leg (between waypoints i and i+1): the least distance of the curve from the coast.
const legs = new Map();
for (const [lon, lat, i] of out) {
  const d = nearest(lon, lat);
  const cur = legs.get(i);
  if (!cur || d < cur.d) legs.set(i, { d, lon, lat });
}
for (const [i, v] of legs)
  console.log(
    `leg ${String(i + 1).padStart(2)}-${String(i + 2).padEnd(2)} nearest ${v.d.toFixed(1)} nm at ${v.lat.toFixed(3)} N ${v.lon.toFixed(3)}`,
  );
