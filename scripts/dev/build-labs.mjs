// `npm run build:labs`: the static export with the lab pages (/lab/chart/,
// /lab/craft/, /lab/sea/, /lab/ship/), for the end-to-end tests and the
// screenshot and stills scripts, which drive them. `npm run build`, the
// production build that is deployed, leaves the labs out (next.config.ts).
// Stamped like any build (build-stamp.mjs), so served.mjs checks it the
// same way and says it has the labs.
//
// Extra arguments go to `next build`. The environment variable is set here,
// not in the npm script, so the script works the same in PowerShell, cmd
// and sh.

import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..", "..");
const env = { ...process.env, TRAFALGAR_LABS: "1" };
const run = (args) =>
  spawnSync(process.execPath, args, { cwd: root, env, stdio: "inherit" })
    .status ?? 1;

const next = join(root, "node_modules", "next", "dist", "bin", "next");
const status = run([next, "build", ...process.argv.slice(2)]);
if (status !== 0) process.exit(status);
process.exit(run([join(root, "scripts", "dev", "build-stamp.mjs")]));
