// Block-mean differences (as the regression check computes them) between a shot and an approved frame,
// summarised by region, plus an amplified map.
import { createRequire } from "node:module";
const require = createRequire("D:/dev/trafalgar-1805/package.json");
const sharp = require("sharp");
const [a, b, out] = process.argv.slice(2);
const half = async (p) => { const m = await sharp(p).metadata(); const { data, info } = await sharp(p).removeAlpha().resize(Math.round(m.width / 2), Math.round(m.height / 2), { kernel: "cubic" }).raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };
const A = await half(a), B = await half(b);
const BLOCK = 20; const rows = [];
const map = Buffer.alloc(Math.floor(A.w / BLOCK) * Math.floor(A.h / BLOCK));
let k = 0; const signed = [];
for (let by = 0; by + BLOCK <= A.h; by += BLOCK) {
  const row = [];
  for (let bx = 0; bx + BLOCK <= A.w; bx += BLOCK) {
    const s = [0, 0, 0, 0, 0, 0];
    for (let y = by; y < by + BLOCK; y++) for (let x = bx; x < bx + BLOCK; x++) { const i = (y * A.w + x) * 3; for (let c = 0; c < 3; c++) { s[c] += A.data[i + c]; s[c + 3] += B.data[i + c]; } }
    const n = BLOCK * BLOCK; const d = [0, 1, 2].map((c) => (s[c] - s[c + 3]) / n);
    const m = Math.max(...d.map(Math.abs)); row.push(m); signed.push(d);
    map[k++] = Math.min(255, Math.round(m * 40));
  }
  rows.push(row);
}
const all = rows.flat().sort((x, y) => x - y);
console.log(`blocks ${all.length}, median ${all[Math.floor(all.length / 2)].toFixed(2)}, p99 ${all[Math.floor(all.length * 0.99)].toFixed(2)}`);
// by band of block rows
rows.forEach((r, i) => { if (i % 3 === 0) { const sorted = [...r].sort((x, y) => x - y); console.log(`  rows ${i * BLOCK * 2}-${(i + 3) * BLOCK * 2}px: median ${sorted[Math.floor(sorted.length / 2)].toFixed(2)} max ${sorted[sorted.length - 1].toFixed(2)}`); } });
const mean = [0, 1, 2].map((c) => signed.reduce((s, d) => s + d[c], 0) / signed.length);
console.log(`mean signed shift (shot - approved): R ${mean[0].toFixed(2)} G ${mean[1].toFixed(2)} B ${mean[2].toFixed(2)}`);
if (out) await sharp(map, { raw: { width: Math.floor(A.w / BLOCK), height: Math.floor(A.h / BLOCK), channels: 1 } }).resize(Math.floor(A.w / BLOCK) * 8, Math.floor(A.h / BLOCK) * 8, { kernel: "nearest" }).png().toFile(out);
