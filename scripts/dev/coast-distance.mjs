// Distance from points to the Natural Earth coast (any direction), nm.
//   node scripts/dev/coast-distance.mjs data/raw/natural-earth <points.json [{name, lon, lat}]>
import { readFileSync } from "node:fs";

const [dir, file] = process.argv.slice(2);
const DEG = Math.PI / 180;
// Only the coast inside this box (lon, lat) is read: the Gulf of Cádiz.
// Widen it for other waters.
const box = [-8, 34.5, -4.5, 37.5];
const segs = [];
for (const f of ["ne_10m_land.geojson", "ne_10m_minor_islands.geojson"]) {
  const gj = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  for (const feat of gj.features) {
    const g = feat.geometry;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    for (const poly of polys)
      for (const ring of poly)
        for (let i = 1; i < ring.length; i++) {
          const [a, b] = [ring[i - 1], ring[i]];
          if (a[0] > box[0] && a[0] < box[2] && a[1] > box[1] && a[1] < box[3])
            segs.push([a, b]);
        }
  }
}
for (const p of JSON.parse(readFileSync(file, "utf8"))) {
  const k = Math.cos(p.lat * DEG);
  let best = 1e9;
  for (const [a, b] of segs) {
    const ax = (a[0] - p.lon) * 60 * k,
      ay = (a[1] - p.lat) * 60;
    const bx = (b[0] - p.lon) * 60 * k,
      by = (b[1] - p.lat) * 60;
    const dx = bx - ax,
      dy = by - ay;
    const t = Math.max(
      0,
      Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy || 1)),
    );
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  console.log(`${p.name.padEnd(16)} ${best.toFixed(1)} nm off the coast`);
}
