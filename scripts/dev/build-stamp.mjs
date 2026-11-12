// Stamps a production build with what it was built from: run by npm after
// `npm run build` (the `postbuild` script). Writes `.next/build-stamp.json`
// (never into `out/`, so nothing of it is deployed): the build's id as Next
// wrote it, the folder, the commit and a hash of the uncommitted changes, so
// `scripts/dev/served.mjs` can tell whether a server answers with this build
// and whether the source has changed since. Never fails the build.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export function sourceState(dir) {
  const git = (...args) =>
    execFileSync("git", ["-C", dir, ...args], {
      encoding: "buffer",
      maxBuffer: 1 << 30,
    });
  const commit = git("rev-parse", "HEAD").toString().trim();
  const hash = createHash("sha1");
  // Tracked changes, then untracked files that a build reads, by content.
  hash.update(git("diff", "HEAD", "--binary"));
  const untracked = git(
    "ls-files",
    "--others",
    "--exclude-standard",
    "--",
    "src",
    "public",
    "next.config.ts",
    "package.json",
    "tsconfig.json",
  )
    .toString()
    .split("\n")
    .filter(Boolean)
    .sort();
  for (const f of untracked) {
    hash.update(f);
    hash.update(readFileSync(join(dir, f)));
  }
  const dirty = git("status", "--porcelain").toString().trim().length > 0;
  return { commit, dirty, changes: hash.digest("hex").slice(0, 12) };
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename);
if (isMain) {
  const dir = process.cwd();
  try {
    const buildId = readFileSync(join(dir, ".next", "BUILD_ID"), "utf8").trim();
    const stamp = {
      buildId,
      dir,
      ...sourceState(dir),
      at: new Date().toISOString(),
    };
    writeFileSync(
      join(dir, ".next", "build-stamp.json"),
      `${JSON.stringify(stamp, null, 2)}\n`,
    );
    console.log(
      `build stamp: ${buildId} from ${stamp.commit.slice(0, 7)}${stamp.dirty ? ` + changes ${stamp.changes}` : ""} in ${dir}`,
    );
  } catch (e) {
    console.warn(`build stamp: not written (${e.message})`);
  }
}
