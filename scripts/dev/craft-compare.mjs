// The owner's proof for Boulogne's near vessels (docs/scene-02-boulogne-
// brief.md, "Owner review": "one near vessel shot beside scene 1's Victory
// at the same scale"). Development only.
//   node scripts/dev/craft-compare.mjs [out.png]
// Victory is cut from scene 1's approved frame at the laptop's size
// (docs/screenshots/scene-01/laptop-p050.png, 1920×1080 device px), where
// scene 1 draws her at about 10.4 device px per metre. The hero chaloupe
// canonnière is painted by Boulogne's studio (sea-studio.mjs: the plates
// as the painting stacks them at the hold, no server) at a device scale
// chosen so that she too stands at 10.4 px per metre: her plate is 80 m
// ahead, 12.5 layer units a metre, one unit 0.989 CSS px at 1280×720. The
// two are set side by side on their waterlines, at their own pixels, no
// resampling.
// Environment: PXM the px per metre (10.4); KEEP=1 keeps the studio's
// frame beside the output.
import { execFileSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const out = path.resolve(
  process.argv[2] ??
    path.join(
      repo,
      "docs/screenshots/scene-02/boulogne-sea/craft-vs-victory.png",
    ),
);
const pxm = Number(process.env.PXM ?? 10.4);

// The painting's lens (view.ts): one layer unit in CSS px at 720 px tall.
const F_VH = 0.5 / Math.tan((20 * Math.PI) / 180);
const cssPerUnit = (720 * F_VH) / 1000;
// The hero chaloupe (plates/heroes.ts): 80 m ahead, so 12.5 units a metre;
// her waterline 6 m under the eye's horizon, which stands at 61 % of 720.
const unitsPerM = 1000 / 80;
const scale = pxm / (unitsPerM * cssPerUnit);
const horizon = 0.61 * 720;
const waterlineCss = horizon + (1000 * 6 * cssPerUnit) / 80;

// Her crop, CSS px of the 1280×720 page: the bowsprit's end to the boat
// astern, the pennant's truck to her reflection.
const crop = { x: 684, y: 236, w: 592, h: 384 };
const frame = path.join(path.dirname(out), "craft-vs-victory.studio.png");
await mkdir(path.dirname(out), { recursive: true });
execFileSync(
  process.execPath,
  [path.join(repo, "scripts/dev/sea-studio.mjs"), frame],
  {
    cwd: repo,
    env: {
      ...process.env,
      W: "1280",
      H: "720",
      S: String(scale),
      MODE: "colour",
      CROP: [crop.x, crop.y, crop.w, crop.h].join(","),
    },
    stdio: ["ignore", "ignore", "inherit"],
  },
);
const craft = sharp(frame);
const cm = await craft.metadata();
const craftWater = Math.round((waterlineCss - crop.y) * scale);

// Victory in scene 1's frame: her bowsprit's end to her stern lantern,
// her trucks to the swell under her, clear of the title.
const victory = { left: 360, top: 96, width: 1044, height: 664 };
const victoryWater = 738 - victory.top;
const vic = await sharp(
  path.join(repo, "docs/screenshots/scene-01/laptop-p050.png"),
)
  .extract(victory)
  .toBuffer();

const pad = 28;
const label = 34;
const top = Math.max(victoryWater, craftWater);
const height =
  pad +
  label +
  top +
  Math.max(victory.height - victoryWater, (cm.height ?? 0) - craftWater) +
  pad;
const width = pad + victory.width + pad + (cm.width ?? 0) + pad;
const vy = pad + label + top - victoryWater;
const cy = pad + label + top - craftWater;
const cx = pad + victory.width + pad;
const text = (x, s) =>
  `<text x="${x}" y="${pad + 20}" font-family="Georgia, serif" font-size="17" fill="#d8cfbf">${s}</text>`;
const svg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${text(
    pad,
    `Scene 1: Victory, as drawn at the laptop's size (${pxm} px per metre)`,
  )}${text(cx, `Boulogne: the near chaloupe canonnière at ${pxm} px per metre`)}</svg>`,
);
await sharp({
  create: { width, height, channels: 3, background: "#171b20" },
})
  .composite([
    { input: vic, left: pad, top: vy },
    { input: await craft.toBuffer(), left: cx, top: cy },
    { input: svg, left: 0, top: 0 },
  ])
  .png()
  .toFile(out);
if (!process.env.KEEP) await rm(frame);
console.log(
  `scale ${scale.toFixed(4)} (device px per CSS px) -> ${pxm} px/m; craft ${cm.width}x${cm.height}`,
);
console.log(`-> ${out}`);
