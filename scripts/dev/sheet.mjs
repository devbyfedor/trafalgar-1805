// A contact sheet of screenshots, left to right and top to bottom, for
// looking at many frames at once (development only).
//   node scripts/dev/sheet.mjs <out.png> <columns> <cell-width> <image>...
// Crop and enlarge one region instead:
//   node scripts/dev/sheet.mjs --crop <in.png> <out.png> <left> <top> <width> <height> [scale]
import sharp from "sharp";

const args = process.argv.slice(2);
if (args[0] === "--crop") {
  const [, input, output, left, top, width, height, scale] = args;
  let image = sharp(input).extract({
    left: Number(left),
    top: Number(top),
    width: Number(width),
    height: Number(height),
  });
  if (scale) {
    image = image.resize(
      Math.round(Number(width) * Number(scale)),
      Math.round(Number(height) * Number(scale)),
      { kernel: "nearest" },
    );
  }
  await image.toFile(output);
  console.log("ok", output);
} else {
  const [output, colsArg, widthArg, ...files] = args;
  const cols = Number(colsArg);
  const w = Number(widthArg);
  const first = await sharp(files[0]).metadata();
  const h = Math.round((w * (first.height ?? 1)) / (first.width ?? 1));
  const rows = Math.ceil(files.length / cols);
  const gap = 6;
  const tiles = await Promise.all(
    files.map((f) =>
      sharp(f).resize(w, h, { kernel: "lanczos3" }).png().toBuffer(),
    ),
  );
  await sharp({
    create: {
      width: cols * w + (cols - 1) * gap,
      height: rows * h + (rows - 1) * gap,
      channels: 3,
      background: "#111",
    },
  })
    .composite(
      tiles.map((input, i) => ({
        input,
        left: (i % cols) * (w + gap),
        top: Math.floor(i / cols) * (h + gap),
      })),
    )
    .png()
    .toFile(output);
  console.log("ok", output);
}
