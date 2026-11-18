// Writes public/third-party-notices.txt, served at /third-party-notices.txt
// and linked from the page's credits line (src/components/experience/
// Credits.tsx): the data, type and software the site is made with, and the
// software's notices and licence texts. The minifier strips every licence
// comment from the bundle, so the deployed chunks carry none; this file
// carries them instead (docs/decisions.md, "Publication, part one: the
// audit" and "part two").
//
//   node scripts/notices.mjs           write the file (npm run notices)
//   node scripts/notices.mjs --check   exit 1 if the file is not what the
//                                      installed packages give (npm run check)
//
// The texts come from the installed packages, so an upgrade changes the file
// and --check says so. What ships in the bundle (SOFTWARE below) was read
// from a production build with source maps (scripts/dev/bundle-packages.mjs);
// read it again whenever a dependency is added, removed or upgraded.

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, "public", "third-party-notices.txt");
const nm = (...p) => join(ROOT, "node_modules", ...p);
const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const version = (dir) => JSON.parse(read(join(dir, "package.json"))).version;

/** The MIT permission notice, word for word as React's licence has it. */
function mitPermission() {
  const text = read(nm("next", "dist", "compiled", "react", "LICENSE"));
  const at = text.indexOf("Permission is hereby granted");
  if (at < 0) throw new Error("no MIT permission notice in React's LICENSE");
  return text.slice(at).trim();
}

/** The Apache License 2.0's terms, from @swc/helpers' copy. */
function apacheTerms() {
  const text = read(nm("@swc", "helpers", "LICENSE"));
  const end = text.indexOf("END OF TERMS AND CONDITIONS");
  if (end < 0) throw new Error("no Apache terms in @swc/helpers' LICENSE");
  return text.slice(0, end + "END OF TERMS AND CONDITIONS".length).trim();
}

/** The React version Next.js bundles (it ships its own build of React). */
function nextReact() {
  const src = read(
    nm("next", "dist", "compiled", "react", "cjs", "react.production.js"),
  );
  const v = src.match(/19\.\d+\.\d+-canary-[0-9a-f]+-\d+/)?.[0];
  if (!v) throw new Error("no React version in Next.js' compiled React");
  return v;
}

const file = (...p) => ({ file: nm(...p) });

/**
 * What the site's JavaScript includes. `notice` is a licence file read
 * whole, or `copyright` lines with the licence named by `licence`. The
 * libraries Next.js and troika-three-text carry inside their own builds
 * have no files of their own here; their lines are from their upstream
 * licences at the versions bundled (session 42's audit, checked twice).
 * Checked against the production build's source maps in session 43
 * (scripts/dev/bundle-packages.mjs): every package in the bundle is here,
 * and nothing here is missing from it (the libraries inside Next.js'
 * polyfill and troika-three-text's own builds are inside those files).
 */
/** core-js's version in Next.js' polyfill, which its copyright line belongs to. */
function nextCoreJs() {
  const src = read(
    nm("next", "dist", "build", "polyfills", "polyfill-nomodule.js"),
  );
  const v = src.match(/version:"(3\.\d+\.\d+)"/)?.[1];
  if (v !== "3.38.1")
    throw new Error(
      `Next.js' polyfill now bundles core-js ${v}: check its copyright line upstream and update notices.mjs`,
    );
  return v;
}

function software() {
  const react = nextReact();
  return [
    {
      name: "Next.js, with its Turbopack runtime",
      version: version(nm("next")),
      url: "https://github.com/vercel/next.js",
      licence: "MIT",
      notice: file("next", "license.md"),
    },
    {
      name: "process, the browser shim (inside Next.js)",
      version: "as Next.js bundles it",
      url: "https://github.com/defunctzombie/node-process",
      licence: "MIT",
      notice: file("next", "dist", "compiled", "process", "LICENSE"),
    },
    {
      name: "React, React DOM, Scheduler and the React Server Components client",
      version: `${react} (the build Next.js bundles)`,
      url: "https://github.com/facebook/react",
      licence: "MIT",
      notice: file("next", "dist", "compiled", "react", "LICENSE"),
    },
    {
      name: "@swc/helpers (inside Next.js)",
      version: version(nm("@swc", "helpers")),
      url: "https://github.com/swc-project/swc",
      licence: "Apache-2.0",
      copyright: ["Copyright 2024 SWC contributors."],
    },
    {
      name: "core-js (inside Next.js' polyfill for old browsers)",
      version: nextCoreJs(),
      url: "https://github.com/zloirock/core-js",
      licence: "MIT",
      copyright: ["Copyright (c) 2014-2024 Denis Pushkarev"],
    },
    {
      name: "whatwg-fetch (inside Next.js' polyfill for old browsers)",
      version: "3.0.0",
      url: "https://github.com/github/fetch",
      licence: "MIT",
      copyright: ["Copyright (c) 2014-2016 GitHub, Inc."],
    },
    {
      name: "object-assign (inside Next.js' polyfill for old browsers)",
      version: "4.1.1",
      url: "https://github.com/sindresorhus/object-assign",
      licence: "MIT",
      copyright: [
        "Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)",
      ],
    },
    {
      name: "three.js",
      version: version(nm("three")),
      url: "https://github.com/mrdoob/three.js",
      licence: "MIT",
      notice: file("three", "LICENSE"),
    },
    {
      name: "troika-three-text",
      version: version(nm("troika-three-text")),
      url: "https://github.com/protectwise/troika",
      licence: "MIT",
      notice: file("troika-three-text", "LICENSE"),
    },
    {
      name: "troika-three-utils",
      version: version(nm("troika-three-utils")),
      url: "https://github.com/protectwise/troika",
      licence: "MIT",
      notice: file("troika-three-utils", "LICENSE"),
    },
    {
      name: "troika-worker-utils",
      version: version(nm("troika-worker-utils")),
      url: "https://github.com/protectwise/troika",
      licence: "MIT",
      notice: file("troika-worker-utils", "LICENSE"),
    },
    {
      name: "Typr.ts (a custom build, inside troika-three-text)",
      version: "0.3.8-lojjic1",
      url: "https://github.com/fredli74/Typr.ts",
      licence: "MIT",
      copyright: ["Copyright (c) 2016 Photopea"],
    },
    {
      name: "woff2otf.js (inside troika-three-text)",
      version: "as modified for troika",
      url: "https://github.com/arty-name/woff2otf",
      licence: "Apache-2.0",
      copyright: [
        "Copyright 2012, Steffen Hanikel (https://github.com/hanikesn)",
        "Modified by Artemy Tregubenko, 2014 (https://github.com/arty-name/woff2otf)",
        "Modified by Jason Johnston, 2019 (pako --> fflate)",
      ],
    },
    {
      name: "fflate (inside troika-three-text)",
      version: "0.7",
      url: "https://github.com/101arrowz/fflate",
      licence: "MIT",
      copyright: ["Copyright (c) 2020 Arjun Barrett"],
    },
    {
      name: "@unicode-font-resolver/client (inside troika-three-text)",
      version: "1.0.2",
      url: "https://github.com/lojjic/unicode-font-resolver",
      licence: "MIT",
      copyright: ["Copyright (c) 2023 Jason Johnston"],
    },
    {
      name: "bidi-js",
      version: version(nm("bidi-js")),
      url: "https://github.com/lojjic/bidi-js",
      licence: "MIT",
      notice: file("bidi-js", "LICENSE.txt"),
    },
    {
      name: "webgl-sdf-generator",
      version: version(nm("webgl-sdf-generator")),
      url: "https://github.com/lojjic/webgl-sdf-generator",
      licence: "MIT",
      notice: file("webgl-sdf-generator", "LICENSE.txt"),
    },
    {
      name: "Tailwind CSS (its base styles, in the site's CSS)",
      version: version(nm("tailwindcss")),
      url: "https://github.com/tailwindlabs/tailwindcss",
      licence: "MIT",
      notice: file("tailwindcss", "LICENSE"),
    },
    {
      name: "Lenis",
      version: version(nm("lenis")),
      url: "https://github.com/darkroomengineering/lenis",
      licence: "MIT",
      notice: file("lenis", "LICENSE"),
    },
  ];
}

/**
 * The GSAP files the bundle carries (gsap's index brings in CSSPlugin,
 * ScrollTrigger brings in Observer; @gsap/react's `module` entry is
 * src/index.js): read in session 43's source maps.
 */
const GSAP_FILES = [
  ["gsap", "gsap-core.js"],
  ["gsap", "CSSPlugin.js"],
  ["gsap", "Observer.js"],
  ["gsap", "ScrollTrigger.js"],
  ["gsap", "SplitText.js"],
  ["@gsap/react", "src/index.js"],
];

/**
 * GSAP is not open source: its notices word for word, each file's own
 * banner (the lines after the opening, without the author's line), so an
 * upgrade that changes them changes this file.
 */
function gsapNotices() {
  const banners = GSAP_FILES.map(([pkg, path]) => {
    const text = read(nm(...pkg.split("/"), ...path.split("/")));
    const banner = text.match(/\/\*!([\s\S]*?)\*\//)?.[1];
    if (!banner) throw new Error(`no licence banner in ${pkg}/${path}`);
    return banner
      .split("\n")
      .map((line) => line.replace(/^\s*\*\s?/, "").trimEnd())
      .filter((line) => line && !line.startsWith("@author"))
      .join("\n");
  });
  return `GSAP ${version(nm("gsap"))}, with CSSPlugin, Observer, ScrollTrigger and SplitText, and @gsap/react ${version(nm("@gsap", "react"))}
https://gsap.com

${banners.join("\n\n")}

Used under the GSAP Standard "No Charge" License,
https://gsap.com/standard-license. GSAP is not open-source software.`;
}

const DATA = `Relief and depths
  NOAA National Centers for Environmental Information (2022), ETOPO 2022
  15 Arc-Second Global Relief Model, https://doi.org/10.25921/fd45-gt74,
  described in MacFerrin et al. (2025), Earth System Science Data 17,
  1835-1849, https://doi.org/10.5194/essd-17-1835-2025. A US government
  work, dedicated to the public domain worldwide under CC0 1.0. Not for
  navigation.

ETOPO 2022's own sources
  Land heights in the chart's region come from FABDEM v1.0: Hawker, Uhe,
  Paulo, Sosa, Savage, Sampson and Neal (2022), "A 30 m global map of
  elevation with forests and buildings removed", Environmental Research
  Letters, https://doi.org/10.1088/1748-9326/ac4d4f. FABDEM is licensed
  under CC BY-NC-SA 4.0, https://creativecommons.org/licenses/by-nc-sa/4.0/
  (free for non-commercial use). It is built on the Copernicus DEM:
  produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus
  Defence and Space GmbH 2014-2018 provided under COPERNICUS by the
  European Union and ESA; all rights reserved. The organisations in charge
  of the Copernicus programme by law or by delegation do not incur any
  liability for any use of the Copernicus WorldDEM-30.
  Depths come from sources among them the GEBCO_2022 Grid (GEBCO
  Compilation Group 2022,
  https://doi.org/10.5285/e0f0bb80-ab44-2739-e053-6c86abc0289c) and GMRT
  (Ryan et al. 2009, https://doi.org/10.1029/2008GC002332, CC BY 4.0).

Land, coastlines and rivers
  Made with Natural Earth. Free vector and raster map data @
  naturalearthdata.com. Version 5.1.2, public domain; its European rivers
  derive from the European Commission JRC's CCM 2.1 database.

The chart's relief tiles (/chart/: surround.webp, overview.webp,
cadiz.webp, channel.webp and lowres.bin, with the soundings read from them,
soundings-*.bin and soundings.json) are adapted from ETOPO 2022, and so from
FABDEM's land heights: ETOPO's heights resampled to each tile's grid,
re-encoded and packed with a coastline distance field drawn from Natural
Earth. As a precaution they are shared on FABDEM's terms, under
CC BY-NC-SA 4.0, https://creativecommons.org/licenses/by-nc-sa/4.0/: credit
the sources above, non-commercial use only, adaptations under the same
licence. The rivers (rivers.bin) are Natural Earth's, in the public domain.
The site's own code is not under these terms. No agency or publisher named
here endorses this site.`;

const TYPE = `Bodoni Moda, by Owen Earl (indestructible type*)
  Copyright 2020 The Bodoni Moda Project Authors
  (https://github.com/indestructible-type/Bodoni)
  SIL Open Font License 1.1: /fonts/3d/OFL-BodoniModa.txt

Baskervville, by ANRT (Atelier National de Recherche typographique), Nancy
  Thomas Huot-Marchand (director) with Alexis Faudot, Rémi Forte, Morgane
  Pierson, Rafael Ribas, Tanguy Vanlæys and Rosalie Wagner.
  Copyright 2018 The Baskervville Project Authors
  (https://github.com/anrt-type/ANRT-Baskervville)
  SIL Open Font License 1.1: /fonts/3d/OFL-Baskervville.txt

Each font file keeps its copyright and licence in its own metadata.`;

const RULE = "-".repeat(76);

export function notices() {
  const mit = mitPermission();
  const entries = software().map((e) => {
    const head = `${e.name} ${e.version}\n${e.url}\n${e.licence}`;
    if (e.notice) return `${head}\n\n${read(e.notice.file).trim()}`;
    const body =
      e.licence === "MIT"
        ? mit
        : "Licensed under the Apache License, Version 2.0: the full text is\nin part 4 of this file.";
    return `${head}\n\n${e.copyright.join("\n")}\n\n${body}`;
  });
  return `Trafalgar 1805: credits and third-party notices
${"=".repeat(47)}

This site is made with data, type and software by others. This file credits
them and carries the software's copyright notices and licences: the site's
JavaScript and CSS are minified, and minifying removed the comments that
held them.

1. Data
2. Type
3. Software
4. The Apache License 2.0

This file is generated from the installed packages by scripts/notices.mjs.

${RULE}
1. DATA
${RULE}

${DATA}

${RULE}
2. TYPE
${RULE}

${TYPE}

${RULE}
3. SOFTWARE
${RULE}

The site's JavaScript and CSS include the following software.

${[...entries, gsapNotices()].join(`\n\n${RULE}\n\n`)}

${RULE}
4. THE APACHE LICENSE 2.0
${RULE}

For @swc/helpers and woff2otf.js above.

${apacheTerms()}
`;
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename);
if (isMain) {
  const text = notices();
  if (process.argv.includes("--check")) {
    let now = "";
    try {
      now = read(OUT);
    } catch {}
    if (now !== text) {
      console.error(
        "third-party notices: public/third-party-notices.txt is not what the installed packages give; run `npm run notices` and commit it",
      );
      process.exit(1);
    }
    console.log("third-party notices: up to date");
  } else {
    writeFileSync(OUT, text);
    console.log(
      `third-party notices: wrote ${OUT} (${text.length} characters)`,
    );
  }
}
