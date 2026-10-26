import sharp from "sharp";

/**
 * Compares a screenshot with an approved one, tolerant of what scene 1's
 * idle loops move by themselves (the swell, Victory's heave and pitch, the
 * drifting haze, the glitter), strict about anything else.
 *
 * Both images are halved, then:
 * - `moved`: the share of pixels with no match within 24 levels anywhere in
 *   a 7 × 7 neighbourhood of the other image (±3 half-size pixels, ±6 at
 *   full size). Small motion finds its match nearby; a layer missing,
 *   recoloured or moved further does not.
 * - `blockMedian`: the median difference of the two images' means over
 *   20-pixel blocks, which catches a faint overall shift of colour.
 * - `blockP99`: the 99th percentile of those block differences.
 *
 * Measured on the approved build (25 October 2026) against itself 2.3 s
 * later: `moved` at most 0.17 %, `blockMedian` at most 0.22 and `blockP99`
 * at most 14 levels; against the approved screenshots, at most 0.2 %, 0.16
 * and 13.7.
 */

export interface ImageDiff {
  /** Percent of pixels with no match nearby. */
  moved: number;
  blockMedian: number;
  blockP99: number;
}

interface Raw {
  data: Buffer;
  width: number;
  height: number;
}

async function halved(input: Buffer | string): Promise<Raw> {
  const meta = await sharp(input).metadata();
  const { data, info } = await sharp(input)
    .removeAlpha()
    .resize(
      Math.round((meta.width ?? 2) / 2),
      Math.round((meta.height ?? 2) / 2),
      {
        kernel: "cubic",
      },
    )
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

const MATCH_LEVELS = 24;
const REACH = 3;
const BLOCK = 20;

export async function compareImages(
  actual: Buffer,
  approved: string,
): Promise<ImageDiff> {
  const a = await halved(actual);
  const b = await halved(approved);
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(
      `sizes differ: ${a.width}×${a.height} against ${b.width}×${b.height}`,
    );
  }
  const { width: w, height: h } = a;

  let moved = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      let found = false;
      for (let dy = -REACH; dy <= REACH && !found; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -REACH; dx <= REACH; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const j = (yy * w + xx) * 3;
          if (
            Math.abs(a.data[i] - b.data[j]) <= MATCH_LEVELS &&
            Math.abs(a.data[i + 1] - b.data[j + 1]) <= MATCH_LEVELS &&
            Math.abs(a.data[i + 2] - b.data[j + 2]) <= MATCH_LEVELS
          ) {
            found = true;
            break;
          }
        }
      }
      if (!found) moved++;
    }
  }

  const blocks: number[] = [];
  for (let by = 0; by + BLOCK <= h; by += BLOCK) {
    for (let bx = 0; bx + BLOCK <= w; bx += BLOCK) {
      const s = [0, 0, 0, 0, 0, 0];
      for (let y = by; y < by + BLOCK; y++) {
        for (let x = bx; x < bx + BLOCK; x++) {
          const i = (y * w + x) * 3;
          for (let c = 0; c < 3; c++) {
            s[c] += a.data[i + c];
            s[c + 3] += b.data[i + c];
          }
        }
      }
      const n = BLOCK * BLOCK;
      blocks.push(
        Math.max(
          Math.abs(s[0] - s[3]),
          Math.abs(s[1] - s[4]),
          Math.abs(s[2] - s[5]),
        ) / n,
      );
    }
  }
  blocks.sort((x, y) => x - y);
  const at = (q: number) =>
    blocks[Math.min(blocks.length - 1, Math.floor(q * blocks.length))];
  return {
    moved: (moved / (w * h)) * 100,
    blockMedian: at(0.5),
    blockP99: at(0.99),
  };
}
