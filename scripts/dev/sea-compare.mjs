// Before and after, side by side (development only): the same regions of
// two frames of Boulogne's painting, each pair written as one image, the
// before on the left and the after on the right, for the owner's points
// (docs/scene-02-boulogne-brief.md, "Owner review").
//   node scripts/dev/sea-compare.mjs <before.png> <after.png> <out-dir> [name=x,y,w,h ...]
// Regions are CSS px of a 1280x720 frame and are taken as shares of each
// frame, so a frame of another size (an owner's screenshot, a 3x shot)
// gives the same part of the view. With no regions, the default set below;
// a bare name picks one of the defaults.
// Environment: HEIGHT the pair's height in px (480), LABEL a prefix for the
// file names ("").
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const [before, after, outDir, ...args] = process.argv.slice(2);
if (!before || !after || !outDir) {
  console.log(
    "usage: node scripts/dev/sea-compare.mjs <before.png> <after.png> <out-dir> [name=x,y,w,h ...]",
  );
  process.exit(1);
}

/** The owner's points' regions at the hold, CSS px of a 1280x720 frame. */
const DEFAULTS = {
  whole: [0, 0, 1280, 720],
  "near-craft": [640, 220, 640, 420],
  "left-camp-cliffs": [0, 250, 640, 210],
  "right-heights": [760, 260, 520, 200],
  "sky-left": [0, 60, 720, 300],
  title: [0, 0, 480, 150],
  town: [380, 300, 520, 160],
  "middle-band": [0, 330, 1280, 160],
};

const regions = args.length
  ? Object.fromEntries(
      args.map((a) => {
        // "name=x,y,w,h", or a default region's bare name.
        const [name, box] = a.split("=");
        return [name, box ? box.split(",").map(Number) : DEFAULTS[name]];
      }),
    )
  : DEFAULTS;

const HEIGHT = Number(process.env.HEIGHT ?? 480);
const GAP = 12;
const prefix = process.env.LABEL ?? "";

async function crop(file, [x, y, w, h]) {
  const img = sharp(file);
  const { width, height } = await img.metadata();
  const sx = width / 1280;
  const sy = height / 720;
  const left = Math.max(0, Math.round(x * sx));
  const top = Math.max(0, Math.round(y * sy));
  const cw = Math.min(width - left, Math.round(w * sx));
  const ch = Math.min(height - top, Math.round(h * sy));
  return sharp(file)
    .extract({ left, top, width: cw, height: ch })
    .resize({
      height: HEIGHT,
      width: Math.round((HEIGHT * w) / h),
      fit: "fill",
    })
    .png()
    .toBuffer();
}

await mkdir(outDir, { recursive: true });
for (const [name, box] of Object.entries(regions)) {
  const w = Math.round((HEIGHT * box[2]) / box[3]);
  const [a, b] = await Promise.all([crop(before, box), crop(after, box)]);
  const out = path.join(outDir, `${prefix}${name}.png`);
  await sharp({
    create: {
      width: w * 2 + GAP,
      height: HEIGHT,
      channels: 3,
      background: { r: 40, g: 40, b: 40 },
    },
  })
    .composite([
      { input: a, left: 0, top: 0 },
      { input: b, left: w + GAP, top: 0 },
    ])
    .png()
    .toFile(out);
  console.log(`-> ${out}`);
}
