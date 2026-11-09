import { createRequire } from "node:module";

const require = createRequire("D:/dev/trafalgar-1805/package.json");
const sharp = require("sharp");
const [a, b, out] = process.argv.slice(2);
const ra = await sharp(a).raw().toBuffer({ resolveWithObject: true });
const rb = await sharp(b).raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = ra.info;
const o = Buffer.alloc(width * height * 3);
const rows = new Map();
for (let i = 0; i < width * height; i++) {
  let m = 0;
  for (let c = 0; c < 3; c++)
    m = Math.max(
      m,
      Math.abs(ra.data[i * channels + c] - rb.data[i * channels + c]),
    );
  const v = Math.min(255, m * 8);
  o[i * 3] = v;
  o[i * 3 + 1] = v;
  o[i * 3 + 2] = v;
  if (m > 8) {
    const y = Math.floor(i / width / 40) * 40;
    rows.set(y, (rows.get(y) ?? 0) + 1);
  }
}
await sharp(o, { raw: { width, height, channels: 3 } })
  .png()
  .toFile(out);
console.log(
  "rows with diffs>8 (device px band:count):",
  [...rows]
    .sort((x, y) => x[0] - y[0])
    .map(([y, n]) => `${y}:${n}`)
    .join(" "),
);
