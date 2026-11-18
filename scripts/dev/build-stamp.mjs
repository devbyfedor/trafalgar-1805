// Stamps a production build with what it was built from: run by npm after
// `npm run build` (the `postbuild` script). Writes `.next/build-stamp.json`
// (never into `out/`, so nothing of it is deployed): the build's id as Next
// wrote it, the folder, the commit, an id of the source it read and whether
// it has the lab pages (only `npm run build:labs` makes them), so
// `scripts/dev/served.mjs` can tell whether a server answers with this build
// and whether the source has changed since. Never fails the build.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/** What a build reads: a change anywhere else (the docs, the dev scripts) leaves a build as it was. */
const BUILT_FROM = [
  "src",
  "public",
  "next.config.ts",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "postcss.config.mjs",
];

/**
 * The folder's commit, and an id of the source a build reads (its tree at
 * the commit, its uncommitted changes and its untracked files, by
 * content), so a commit of docs alone keeps the id.
 */
export function sourceState(dir) {
  const git = (...args) =>
    execFileSync("git", ["-C", dir, ...args], {
      encoding: "buffer",
      maxBuffer: 1 << 30,
    });
  const commit = git("rev-parse", "HEAD").toString().trim();
  const hash = createHash("sha1");
  hash.update(git("ls-tree", "-r", "HEAD", "--", ...BUILT_FROM));
  hash.update(git("diff", "HEAD", "--binary", "--", ...BUILT_FROM));
  const untracked = git(
    "ls-files",
    "--others",
    "--exclude-standard",
    "--",
    ...BUILT_FROM,
  )
    .toString()
    .split("\n")
    .filter(Boolean)
    .sort();
  for (const f of untracked) {
    hash.update(f);
    hash.update(readFileSync(join(dir, f)));
  }
  const dirty =
    git("status", "--porcelain", "--", ...BUILT_FROM)
      .toString()
      .trim().length > 0;
  return { commit, dirty, source: hash.digest("hex").slice(0, 12) };
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
      labs: existsSync(join(dir, "out", "lab")),
      at: new Date().toISOString(),
    };
    writeFileSync(
      join(dir, ".next", "build-stamp.json"),
      `${JSON.stringify(stamp, null, 2)}\n`,
    );
    console.log(
      `build stamp: ${buildId} from ${stamp.commit.slice(0, 7)}${stamp.dirty ? " with uncommitted changes" : ""}, source ${stamp.source}, ${stamp.labs ? "with" : "without"} the lab pages, in ${dir}`,
    );
  } catch (e) {
    console.warn(`build stamp: not written (${e.message})`);
  }
}
