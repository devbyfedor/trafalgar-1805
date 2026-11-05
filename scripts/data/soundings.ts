import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { OUT_DIR } from "./config.ts";
import {
  SOUNDINGS,
  type SoundingTile,
  writeSoundings,
} from "./lib/soundings.ts";

/**
 * Writes the soundings of every detail tile in public/chart/manifest.json
 * (lib/soundings.ts) and their index, public/chart/soundings.json. Reads
 * only the built tiles, so it runs without the raw downloads:
 * `npm run data:soundings`; `npm run data:build` runs it last.
 */

interface ManifestTile extends SoundingTile {
  role: string;
}

export async function buildSoundings(): Promise<void> {
  const manifest = JSON.parse(
    await readFile(path.join(OUT_DIR, "manifest.json"), "utf8"),
  ) as { tiles: ManifestTile[] };
  const sets = [];
  console.log("Soundings");
  for (const tile of manifest.tiles.filter((t) => t.role === "detail")) {
    const result = await writeSoundings(tile, OUT_DIR);
    console.log(
      `  ${tile.id}: ${result.count} soundings (${result.perRank.join(", ")} by rank), ${(result.bytes / 1e3).toFixed(0)} kB`,
    );
    sets.push({
      tile: tile.id,
      file: result.file,
      bytes: result.bytes,
      count: result.count,
    });
  }
  const index = {
    version: 1,
    coarsestKm: SOUNDINGS.coarsestKm,
    ranks: SOUNDINGS.ranks,
    sets,
  };
  await writeFile(
    path.join(OUT_DIR, "soundings.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );
}

if (import.meta.main) await buildSoundings();
