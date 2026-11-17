import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Page not found, ${SITE.name}`,
  robots: { index: false, follow: false },
};

/**
 * The 404 page (out/404.html; Cloudflare serves it for every unknown path,
 * the old lab addresses among them now that the deployed build has none):
 * the closing card's form, on the deep sea, with the way back. No script.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col justify-end bg-deep-sea px-[max(24px,4.6vw)] pt-[30vh] pb-[16vh]">
      <p className="mb-[1vh] text-[clamp(14px,2vh,21px)] leading-snug text-ink">
        Page not found
      </p>
      <h1 className="font-display text-[clamp(44px,8.4vh,134px)] leading-[0.95] font-normal tracking-[-0.01em] text-ink [font-optical-sizing:auto]">
        Off the chart
      </h1>
      <p className="mt-[2.8vh] text-[clamp(16px,2.35vh,27px)] leading-[1.45] text-ink">
        Nothing is charted at this address.{" "}
        <a
          href="/"
          className="underline decoration-[0.06em] underline-offset-[0.2em] hover:decoration-[0.1em] focus-visible:rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          The story begins here
        </a>
        .
      </p>
    </main>
  );
}
