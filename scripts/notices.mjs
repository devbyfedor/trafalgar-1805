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
 */
function software() {
  const react = nextReact();
  return [
    {
      name: "Next.js",
      version: version(nm("next")),
      url: "https://github.com/vercel/next.js",
      licence: "MIT",
      notice: file("next", "license.md"),
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
      version: "3.38.1",
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
      name: "Lenis",
      version: version(nm("lenis")),
      url: "https://github.com/darkroomengineering/lenis",
      licence: "MIT",
      notice: file("lenis", "LICENSE"),
    },
  ];
}

/** GSAP is not open source: its notices, word for word from its files. */
function gsapNotices() {
  const v = version(nm("gsap"));
  const r = version(nm("@gsap", "react"));
  return `GSAP ${v}, with ScrollTrigger and SplitText, and @gsap/react ${r}
https://gsap.com

GSAP ${v}: Copyright 2008-2026, GreenSock. All rights reserved.
Subject to the terms at https://gsap.com/standard-license
ScrollTrigger ${v}: Copyright 2008-2026, GreenSock. All rights reserved.
Subject to the terms at https://gsap.com/standard-license
SplitText ${v}: Copyright 2026, GreenSock. All rights reserved. Subject to
the terms at https://gsap.com/standard-license.
@gsap/react ${r}: Copyright 2025, GreenSock. All rights reserved.
Subject to the terms at https://gsap.com/standard-license or for Club GSAP
members, the agreement issued with that membership.

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
  Land heights in the chart's region come from FABDEM v1.0 (Hawker et al.
  2022, Environmental Research Letters,
  https://doi.org/10.1088/1748-9326/ac4d4f), built on the Copernicus DEM:
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

The chart's tiles (/chart/) are derived from these datasets and keep their
sources' terms. No agency or publisher named here endorses this site.`;

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
JavaScript is minified, and minifying removed the comments that held them.

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

The site's JavaScript includes the following software.

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
