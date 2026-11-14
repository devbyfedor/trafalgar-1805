// Which build is a local server answering with? Run it before every
// measurement (CLAUDE.md, "Before every measurement"); session 22 measured
// an old build that still answered on 4173 while its new server had moved
// to another port.
//
//   node scripts/dev/served.mjs --free 4173
//     exit 0 if nothing listens on 127.0.0.1:4173; else names the process.
//   node scripts/dev/served.mjs 4173 [folder]
//   node scripts/dev/served.mjs http://127.0.0.1:4173 [folder]
//     exit 0 only if the server answers with the production build last made
//     in `folder` (default: the current directory), and that folder's source
//     (what a build reads: src, public and the configs, committed or not) is
//     still what the build was made from; docs and dev scripts don't count
//     (.next/build-stamp.json, written by build-stamp.mjs after the build).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { connect } from "node:net";
import { join, resolve } from "node:path";
import { sourceState } from "./build-stamp.mjs";

function listening(port) {
  return new Promise((done) => {
    const s = connect({ host: "127.0.0.1", port }, () => {
      s.destroy();
      done(true);
    });
    s.on("error", () => done(false));
    s.setTimeout(1500, () => {
      s.destroy();
      done(false);
    });
  });
}

function owner(port) {
  if (process.platform !== "win32") return "";
  try {
    const ps = `$c = Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)"; "pid $($c.OwningProcess): $($p.CommandLine)" }`;
    return execFileSync("powershell", ["-NoProfile", "-Command", ps], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

const args = process.argv.slice(2);
if (args[0] === "--free") {
  const port = Number(args[1] ?? 4173);
  if (await listening(port)) {
    console.error(`port ${port} is taken: ${owner(port) || "(owner unknown)"}`);
    process.exit(1);
  }
  console.log(`port ${port} is free`);
  process.exit(0);
}

const base = /^\d+$/.test(args[0] ?? "")
  ? `http://127.0.0.1:${args[0]}`
  : (args[0] ?? "http://127.0.0.1:4173");
const dir = resolve(args[1] ?? process.cwd());
const port = Number(new URL(base).port || 80);
const who = owner(port);

let html;
try {
  html = await (await fetch(`${base}/`)).text();
} catch (e) {
  console.error(
    `MISMATCH: nothing answers at ${base} (${e.cause?.code ?? e.message})`,
  );
  process.exit(1);
}
const served = html.match(/\\?"b\\?":\\?"([A-Za-z0-9_-]{6,64})\\?"/)?.[1];
if (!served) {
  console.error(
    `MISMATCH: ${base} gives no build id (a dev server?)${who ? `; ${who}` : ""}`,
  );
  process.exit(1);
}

const problems = [];
let built = "";
let stamp = null;
try {
  built = readFileSync(join(dir, ".next", "BUILD_ID"), "utf8").trim();
} catch {
  problems.push(`no build in ${dir} (.next/BUILD_ID missing)`);
}
try {
  stamp = JSON.parse(
    readFileSync(join(dir, ".next", "build-stamp.json"), "utf8"),
  );
} catch {
  problems.push("no build stamp (build with `npm run build`, which stamps it)");
}
if (built && served !== built)
  problems.push(
    `it serves build ${served}, but ${dir}'s last build is ${built}`,
  );
if (stamp && built && stamp.buildId !== built)
  problems.push(
    `the stamp is of build ${stamp.buildId}, not ${built} (built without the stamp?)`,
  );
let moved = "";
if (stamp) {
  const now = sourceState(dir);
  if (now.source !== stamp.source)
    problems.push(
      `the source a build reads has changed since (built from ${stamp.commit.slice(0, 7)}${stamp.dirty ? " with changes" : ""}, source ${stamp.source}; now ${now.commit.slice(0, 7)}${now.dirty ? " with changes" : ""}, source ${now.source})`,
    );
  else if (now.commit !== stamp.commit)
    moved = `; the folder has moved on to ${now.commit.slice(0, 7)} since, with the same source`;
}

const what = stamp
  ? `${stamp.commit.slice(0, 7)}${stamp.dirty ? " with uncommitted changes" : ""} (source ${stamp.source})`
  : "?";
if (problems.length) {
  console.error(`MISMATCH at ${base}${who ? ` (${who})` : ""}:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(
  `OK: ${base} serves build ${served}, made from ${what} in ${dir}, source unchanged since${moved}${who ? `; ${who}` : ""}`,
);
