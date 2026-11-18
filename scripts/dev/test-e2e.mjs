// `npm run test:e2e` (and so `npm run check`): the end-to-end tests, each on
// the build it is about.
//
// The deployed build has no lab pages (`npm run build`; next.config.ts), and
// with the labs in, Turbopack splits the home page's code into other chunks
// (session 43: not one chunk the same), so a build with the labs is not the
// site that ships. Hence two stages:
//   1. `npm run build:labs`: the chart lab's tests (chart, chart-gpu), then
//      the lab's frames (chart-frames), alone on the GPU;
//   2. `npm run build`, the production build: every test of the home page
//      (laptop, desktop-1080, phone, perf, road, regression), then scene 2's
//      frames (road-frames), alone on the GPU.
// The production build comes last, so a run leaves the site that ships in
// out/ (and its stamp for served.mjs), as before the split. Every step runs
// even when one before it failed (a build that fails skips its own stage),
// each with its own results and report folder (test-results/<step>/,
// playwright-report/<step>/), and the exit code is 1 if anything failed.
// Arguments after `--` go to every `playwright test` (a `-g` narrows each
// step's projects; a step it leaves empty passes).

import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..", "..");
const extra = process.argv.slice(2);
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const playwright = join(root, "node_modules", "@playwright", "test", "cli.js");

const STAGES = [
  {
    build: ["run", "build:labs"],
    steps: [
      { name: "labs", args: ["--project=chart", "--project=chart-gpu"] },
      { name: "labs-frames", args: ["--project=chart-frames", "--no-deps"] },
    ],
  },
  {
    build: ["run", "build"],
    steps: [
      {
        name: "site",
        args: [
          "--project=laptop",
          "--project=desktop-1080",
          "--project=phone",
          "--project=perf",
          "--project=road",
          "--project=regression",
        ],
      },
      { name: "site-frames", args: ["--project=road-frames", "--no-deps"] },
    ],
  },
];

const results = [];
for (const stage of STAGES) {
  const label = `npm ${stage.build.join(" ")}`;
  console.log(`\n== ${label}`);
  const built = spawnSync(npm, stage.build, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (built.status !== 0) {
    results.push([label, "FAILED"]);
    for (const step of stage.steps) results.push([step.name, "not run"]);
    continue;
  }
  results.push([label, "ok"]);
  for (const step of stage.steps) {
    console.log(`\n== ${step.name}: playwright test ${step.args.join(" ")}`);
    const run = spawnSync(
      process.execPath,
      [
        playwright,
        "test",
        ...step.args,
        `--output=${join("test-results", step.name)}`,
        ...(extra.length ? ["--pass-with-no-tests", ...extra] : []),
      ],
      {
        cwd: root,
        stdio: "inherit",
        env: {
          ...process.env,
          PLAYWRIGHT_HTML_OUTPUT_DIR: join("playwright-report", step.name),
        },
      },
    );
    results.push([step.name, run.status === 0 ? "passed" : "FAILED"]);
  }
}

console.log("\n== test:e2e");
for (const [name, state] of results) console.log(`  ${name}: ${state}`);
process.exit(results.some(([, s]) => s !== "ok" && s !== "passed") ? 1 : 0);
