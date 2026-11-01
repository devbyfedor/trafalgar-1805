/**
 * The handoff from scene 1 to scene 2 (docs/decisions.md, "Scene 2, Stage
 * B", "The transition from scene 1"). Scene 1's pin runs on for
 * HANDOFF_LENGTH viewport heights after its own choreography ends, and
 * scene 2's pin starts where scene 1's does, so both stages are pinned
 * together, scene 1 on top. Over that stretch scene 2 fades scene 1's
 * painted layers to reveal the chart underneath, and moves scene 1's own
 * Victory onto her glyph. Scene 1's timeline never touches the wrappers
 * listed here, so each has one owner.
 */

/** Viewport heights both pins share. */
export const HANDOFF_LENGTH = 2.5;

/** Scene 1's elements that scene 2 takes over during the handoff. */
export const DAWN_HANDOFF = {
  /** The pinned stage; its background fades with the art. */
  section: "[data-scene=dawn]",
  /** Painted layers that fade to reveal the chart (Victory stays). */
  layers: [
    "[data-el=sky]",
    "[data-el=sun]",
    "[data-el=enemy]",
    "[data-el=haze-back]",
    "[data-el=sea-back]",
    "[data-el=sea-front]",
    "[data-el=haze-front]",
    "[data-el=glitter]",
  ],
  /** Scene 1's text, which gives way to scene 2's. */
  text: ["[data-el=chapter]", "[data-el=card]", "[data-el=scrim]"],
  /** Victory's box: moved and scaled onto her glyph, clipped at her waterline. */
  victory: "[data-el=hull-box]",
} as const;
