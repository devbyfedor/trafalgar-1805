import type { InterludeState } from "../../alive/interlude";
import type { SeaPose } from "../interludes";

/**
 * Boulogne's painting as the scene drives it (Scene02Road.tsx): one call
 * per tick of gsap.ticker, from the scene's render. Everything else it
 * does on its own: it mounts its layers in idle slices, shows itself
 * faintly a little before the interlude so the browser has rasterised it
 * by the time the dive needs it, and hides itself away from Boulogne.
 */
export interface SeaViewHandle {
  /** Its layers are mounted and drawn: it may cover the chart. */
  readonly ready: boolean;
  /**
   * One frame: the story's p, the interlude where the scroll is inside
   * one (else null), the camera rig's u (interludes.ts; 1 through the
   * hold), the camera's pose in the painting's frame, and gsap.ticker's
   * time in seconds.
   */
  frame(
    p: number,
    at: InterludeState | null,
    u: number,
    pose: SeaPose,
    time: number,
  ): void;
}

export interface SeaViewProps {
  /** Called with the handle once mounted, and with null on unmount. */
  onReady: (handle: SeaViewHandle | null) => void;
}
