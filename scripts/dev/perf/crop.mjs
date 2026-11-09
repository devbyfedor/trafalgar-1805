import { createRequire } from "node:module";

const require = createRequire("D:/dev/trafalgar-1805/package.json");
const sharp = require("sharp");
const [a, b, out, x, y, w, h] = process.argv.slice(2);
const region = { left: +x, top: +y, width: +w, height: +h };
const ca = await sharp(a)
  .extract(region)
  .resize(+w * 3, +h * 3, { kernel: "nearest" })
  .png()
  .toBuffer();
const cb = await sharp(b)
  .extract(region)
  .resize(+w * 3, +h * 3, { kernel: "nearest" })
  .png()
  .toBuffer();
await sharp({
  create: {
    width: +w * 6 + 10,
    height: +h * 3,
    channels: 3,
    background: "#f0f",
  },
})
  .composite([
    { input: ca, left: 0, top: 0 },
    { input: cb, left: +w * 3 + 10, top: 0 },
  ])
  .png()
  .toFile(out);
