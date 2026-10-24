"use client";

/**
 * The single place that registers GSAP plugins. Import gsap, ScrollTrigger,
 * SplitText and useGSAP from here, never from the packages directly, so
 * registration always happens before use. Client only.
 */

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
  // Read-only hook for the end-to-end tests and `?debug` sessions.
  window.__trafalgar = {
    scrollTriggers: () => ScrollTrigger.getAll().length,
  };
}

export { gsap, ScrollTrigger, SplitText, useGSAP };

declare global {
  interface Window {
    __trafalgar?: { scrollTriggers: () => number };
  }
}
