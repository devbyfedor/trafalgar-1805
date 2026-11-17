// Which packages the site's JavaScript is made of, read from a build's
// browser source maps: the list scripts/notices.mjs must cover.
//
//   TRAFALGAR_SOURCEMAPS=1 npm run build      (PowerShell: $env:TRAFALGAR_SOURCEMAPS=1; npm run build)
//   node scripts/dev/bundle-packages.mjs [out-dir]
//
// Prints each package (and each library Next.js vendors under
// next/dist/compiled/) with the number of its modules in the bundle and the
// bytes of their sources, then the project's own files. Rebuild without the
// variable afterwards: a build with source maps is never deployed.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const out = resolve(process.argv[2] ?? "out");
const maps = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".map")) maps.push(p);
  }
})(join(out, "_next"));
if (!maps.length) {
  console.error(
    `no source maps under ${out}/_next: build with TRAFALGAR_SOURCEMAPS=1`,
  );
  process.exit(1);
}

/** A source's package: "three", "@swc/helpers", "next/dist/compiled/react-dom", or "" for our own. */
function packageOf(source) {
  const s = decodeURIComponent(source).replace(/\\/g, "/");
  const at = s.lastIndexOf("node_modules/");
  if (at < 0) return "";
  const rest = s.slice(at + "node_modules/".length).split("/");
  const name = rest[0].startsWith("@") ? `${rest[0]}/${rest[1]}` : rest[0];
  if (name === "next") {
    const i = rest.indexOf("compiled");
    if (rest[1] === "dist" && i === 2) {
      const sub = rest[3].startsWith("@") ? `${rest[3]}/${rest[4]}` : rest[3];
      return `next/dist/compiled/${sub}`;
    }
    if (rest[1] === "dist" && rest[2] === "build" && rest[3] === "polyfills")
      return `next/dist/build/polyfills/${rest[4]}`;
  }
  return name;
}

const packages = new Map();
const own = new Set();
const add = (map) => {
  (map.sources ?? []).forEach((source, i) => {
    const pkg = packageOf(source);
    const size = map.sourcesContent?.[i]?.length ?? 0;
    if (!pkg) {
      own.add(source.replace(/^turbopack:\/\/\/\[project\]\//, ""));
      return;
    }
    const e = packages.get(pkg) ?? { modules: new Set(), bytes: 0 };
    if (!e.modules.has(source)) {
      e.modules.add(source);
      e.bytes += size;
    }
    packages.set(pkg, e);
  });
  for (const section of map.sections ?? []) add(section.map ?? {});
};
for (const file of maps) add(JSON.parse(readFileSync(file, "utf8")));

console.log(`${maps.length} source maps in ${out}`);
console.log("\npackages (modules, source bytes):");
for (const [name, e] of [...packages].sort(([a], [b]) => a.localeCompare(b)))
  console.log(`  ${name}  ${e.modules.size}  ${e.bytes}`);
console.log(`\nthe project's own sources: ${own.size}`);
for (const s of [...own].sort())
  if (!s.startsWith("src/")) console.log(`  not under src/: ${s}`);
