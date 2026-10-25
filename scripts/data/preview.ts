import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { OUT_DIR } from "./config.ts";
import { decodeDistance, decodeHeight } from "./lib/encode.ts";

/**
 * Renders a quick CPU preview of each tile (hillshade, inked coast, a few
 * waterlines and isobaths) to check the data by eye. Not part of the build.
 * Usage: node scripts/data/preview.ts <out-dir> [exaggeration...]
 */

const outDir = process.argv[2];
const manifest = JSON.parse(
  await readFile(path.join(OUT_DIR, "manifest.json"), "utf8"),
);
for (const [ti, tile] of manifest.tiles.entries()) {
  const E = Number(process.argv[3 + ti] ?? 10);
  const { data, info } = await sharp(path.join(OUT_DIR, tile.file))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const h = new Float32Array(W * H);
  const d = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    h[i] = decodeHeight(data[i * C] * 256 + data[i * C + 1]);
    d[i] = decodeDistance(data[i * C + 2], tile.sdfRange, tile.sdfTail);
  }
  const out = Buffer.alloc(W * H * 3);
  const az = (315 * Math.PI) / 180;
  const el = (35 * Math.PI) / 180;
  const L = [
    Math.sin(az) * Math.cos(el),
    Math.cos(az) * Math.cos(el),
    Math.sin(el),
  ];
  const cellM = tile.cellKm * 1000;
  for (let r = 1; r < H - 1; r++) {
    const lat = tile.north - ((r + 0.5) / H) * (tile.north - tile.south);
    const groundM = cellM * Math.cos((lat * Math.PI) / 180);
    for (let c = 1; c < W - 1; c++) {
      const i = r * W + c;
      const land = d[i] < 0;
      const hx =
        (Math.max(0, h[i + 1]) - Math.max(0, h[i - 1])) / (2 * groundM);
      const hy =
        (Math.max(0, h[i - W]) - Math.max(0, h[i + W])) / (2 * groundM);
      const nx = -E * hx,
        ny = -E * hy,
        nz = 1;
      const nl = Math.hypot(nx, ny, nz);
      const shade = Math.max(0, (nx * L[0] + ny * L[1] + nz * L[2]) / nl);
      let rgb = land
        ? [
            222 * (0.55 + 0.45 * shade),
            208 * (0.55 + 0.45 * shade),
            178 * (0.55 + 0.45 * shade),
          ]
        : [52, 74, 84];
      if (!land) {
        // waterlines every 1 cell (detail) out to 8 cells
        const t = d[i];
        if (t < 8 && Math.abs(t - Math.round(t)) < 0.12 && Math.round(t) >= 1)
          rgb = [150, 165, 170];
        // isobaths at 20, 50, 100, 200, 500, 1000, 2000 fathoms
        for (const fm of [10, 20, 50, 100, 200, 500, 1000, 2000]) {
          const z = -fm * 1.8288;
          if (
            (h[i] - z) * (h[i + 1] - z) < 0 ||
            (h[i] - z) * (h[i + W] - z) < 0
          )
            rgb = [120, 140, 150];
        }
      }
      if (Math.abs(d[i]) < 0.5) rgb = [20, 20, 20];
      out[i * 3] = rgb[0];
      out[i * 3 + 1] = rgb[1];
      out[i * 3 + 2] = rgb[2];
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .png()
    .toFile(path.join(outDir, `${tile.id}.png`));
  console.log("wrote", tile.id, W, H);
}
