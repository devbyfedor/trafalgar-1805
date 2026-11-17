/**
 * What the page says about itself to browsers, search engines and link
 * previews (src/app/layout.tsx, src/app/page.tsx). Server only: read while
 * the static export is built.
 *
 * The link preview and the canonical address need absolute URLs, so the
 * site's public address is read at build time from SITE_URL: the
 * environment, or a git-ignored `.env.production.local` holding the line
 * `SITE_URL=https://…` (Next.js reads it during `next build`). Without it,
 * the local preview's address, so a local build points at itself;
 * `npm run deploy` refuses a build whose preview points anywhere but an
 * https address (scripts/deploy-check.mjs).
 */
export const SITE = {
  name: "Trafalgar 1805",
  url: process.env.SITE_URL ?? "http://127.0.0.1:4173",
  description:
    "Dawn off Cape Trafalgar on 21 October 1805, and the campaign that brought the fleets there: part one of the battle's story, told in scenes you scroll through.",
  /** public/link-preview.jpg, rendered by scripts/dev/og-image.mjs. */
  preview: {
    url: "/link-preview.jpg",
    width: 1200,
    height: 630,
    alt: "HMS Victory under full sail at dawn off Cape Trafalgar, the British fleet astern, under the title Trafalgar.",
  },
} as const;
