// Run by `npm run deploy` between the build and `wrangler deploy`: refuses
// to deploy a build that is not fit to be the public site. Checks out/:
// - the link preview and the canonical address point at an https address
//   (SITE_URL set for the build: src/lib/site.ts), not the local preview's;
// - no lab pages (`npm run build`, never `npm run build:labs`);
// - the notices file is there and is what the installed packages give
//   (scripts/notices.mjs);
// - the preview image and the icons are there, the image small enough for
//   every messenger.
// Exit 1 with the reasons, or 0 with what will be deployed.

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { notices } from "./notices.mjs";

const out = resolve(import.meta.dirname, "..", "out");
const problems = [];
const html = existsSync(join(out, "index.html"))
  ? readFileSync(join(out, "index.html"), "utf8")
  : "";
if (!html) problems.push("no out/index.html: build first (`npm run build`)");

const meta = (re) => html.match(re)?.[1] ?? "";
const image = meta(/<meta property="og:image" content="([^"]+)"/);
const url = meta(/<meta property="og:url" content="([^"]+)"/);
const canonical = meta(/<link rel="canonical" href="([^"]+)"/);
for (const [name, value] of [
  ["og:image", image],
  ["og:url", url],
  ["canonical", canonical],
]) {
  let ok = false;
  try {
    const u = new URL(value);
    ok =
      u.protocol === "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  } catch {}
  if (!ok)
    problems.push(
      `${name} is "${value || "missing"}": set SITE_URL to the site's https address for the build (a line SITE_URL=https://… in .env.production.local, or the environment)`,
    );
}
if (existsSync(join(out, "lab")))
  problems.push(
    "out/lab/ exists: a build with the lab pages; run `npm run build`",
  );
const noticesFile = join(out, "third-party-notices.txt");
if (!existsSync(noticesFile)) problems.push("no out/third-party-notices.txt");
else if (readFileSync(noticesFile, "utf8").replace(/\r\n/g, "\n") !== notices())
  problems.push(
    "out/third-party-notices.txt is not what the installed packages give: `npm run notices`, commit, build again",
  );
for (const f of ["link-preview.jpg", "favicon.ico", "apple-icon.png"])
  if (!existsSync(join(out, f))) problems.push(`no out/${f}`);
if (
  existsSync(join(out, "link-preview.jpg")) &&
  statSync(join(out, "link-preview.jpg")).size > 300 * 1024
)
  problems.push("out/link-preview.jpg is over 300 KB (WhatsApp drops it)");

if (problems.length) {
  console.error("deploy-check: not deploying");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(
  `deploy-check: OK, out/ is the public site at ${new URL(url).origin} (no lab pages, notices up to date, preview ${image})`,
);
