// Free water beyond each mark along a fan of bearings, in Mercator map km
// (the chart's world units), against Natural Earth 10m land + minor islands.
//   node scripts/dev/coast-room.mjs data/raw/natural-earth <marks.json [{name, lon, lat}]>
import { readFileSync } from "node:fs";

const [dir, marksFile] = process.argv.slice(2);
const R = 6378.137,
  DEG = Math.PI / 180;
const mx = (lon) => R * lon * DEG;
const my = (lat) => R * Math.log(Math.tan(Math.PI / 4 + (lat * DEG) / 2));
const lonOf = (x) => x / R / DEG;
const latOf = (y) => (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) / DEG;
// Only the coast inside this box (lon, lat) is read: the Gulf of Cádiz.
// Widen it for other waters.
const box = [-8, 34.5, -4.5, 37.5];
const rings = [];
for (const f of ["ne_10m_land.geojson", "ne_10m_minor_islands.geojson"]) {
  const gj = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  for (const feat of gj.features) {
    const g = feat.geometry;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    for (const poly of polys)
      for (const ring of poly) {
        let inBox = false;
        for (const [lon, lat] of ring)
          if (lon > box[0] && lon < box[2] && lat > box[1] && lat < box[3]) {
            inBox = true;
            break;
          }
        if (inBox) rings.push(ring);
      }
  }
}
function inside(lon, lat) {
  let c = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i],
        [xj, yj] = ring[j];
      if (
        yi > lat !== yj > lat &&
        lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
      )
        c = !c;
    }
  }
  return c;
}
const marks = JSON.parse(readFileSync(marksFile, "utf8"));
const bearings = [20, 30, 40, 50, 60];
for (const m of marks) {
  const x0 = mx(m.lon),
    y0 = my(m.lat);
  const out = [];
  const onLand = inside(m.lon, m.lat);
  for (const b of bearings) {
    let d = 0;
    for (; d < 80; d += 0.05) {
      const x = x0 + d * Math.sin(b * DEG),
        y = y0 + d * Math.cos(b * DEG);
      if (inside(lonOf(x), latOf(y))) break;
    }
    out.push(`${b}°:${d >= 80 ? ">80" : d.toFixed(1)}`);
  }
  console.log(
    `${m.name.padEnd(22)} ${onLand ? "ON LAND " : ""}${out.join("  ")}`,
  );
}
