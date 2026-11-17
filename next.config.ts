import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

/**
 * The lab pages (`src/app/lab/<name>/page.lab.tsx`) are development tools,
 * not part of the published site (the owner, session 43): they are routes
 * in `next dev`, and in a build only with TRAFALGAR_LABS=1 (`npm run
 * build:labs`, which the end-to-end tests and the screenshot and stills
 * scripts use, since they drive the labs). `npm run build`, the production
 * build that is deployed, leaves them out: no page, no chunk of theirs.
 *
 * TRAFALGAR_SOURCEMAPS=1 adds the browser source maps to a build, to read
 * what the bundle contains (scripts/dev/bundle-packages.mjs, for the
 * third-party notices); never for a build that is deployed.
 */
export default function config(phase: string): NextConfig {
  const labs =
    phase === PHASE_DEVELOPMENT_SERVER || process.env.TRAFALGAR_LABS === "1";
  return {
    output: "export",
    images: { unoptimized: true },
    trailingSlash: true,
    reactStrictMode: true,
    pageExtensions: labs ? ["tsx", "ts", "lab.tsx"] : ["tsx", "ts"],
    productionBrowserSourceMaps: process.env.TRAFALGAR_SOURCEMAPS === "1",
  };
}
