/**
 * Media queries shared by CSS and gsap.matchMedia. The fallback query must
 * match the `fallback` custom variant in src/app/globals.css.
 */
export const FALLBACK_QUERY = "(max-width: 1023.98px), (pointer: coarse)";

/** The complement of FALLBACK_QUERY, written without `not` for older engines. */
export const DESKTOP_QUERY =
  "(min-width: 1024px) and (pointer: fine), (min-width: 1024px) and (pointer: none)";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const FULL_MOTION_QUERY = "(prefers-reduced-motion: no-preference)";

/** True when the page is opened with `?debug`. Client only. */
export function isDebug(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("debug");
}
