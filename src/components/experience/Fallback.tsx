import { dawnContent } from "@/scenes/01-dawn/content";

/**
 * The single screen phones and tablets get instead of the scene. Shown by
 * CSS alone (the `fallback` variant), so the server HTML is the same for
 * everyone and nothing mismatches on hydration. It creates no ScrollTriggers,
 * no Lenis and no animation loops.
 *
 * The page's only h1 lives in scene 1, which stays in the accessibility tree
 * (visually hidden) in fallback mode, so the title and dateline here are
 * visual duplicates and hidden from assistive technology. The notice is
 * real text.
 */
export function Fallback() {
  return (
    <div
      data-fallback
      className="relative hidden min-h-svh flex-col justify-end overflow-hidden bg-night px-6 pt-16 pb-12 fallback:flex"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-b from-dawn-top via-[#8f8a8a] to-dawn-horizon"
      />
      <div className="relative">
        <p aria-hidden="true" className="text-[15px] text-ink">
          {dawnContent.dateline}
        </p>
        <p
          aria-hidden="true"
          className="mt-2 font-display text-[clamp(48px,16vw,96px)] leading-[0.95] tracking-[-0.01em] text-ink"
        >
          {dawnContent.title}
        </p>
        <p className="mt-6 max-w-[28em] text-[16px] leading-[1.45] text-ink">
          {dawnContent.fallbackNotice}
        </p>
      </div>
    </div>
  );
}
