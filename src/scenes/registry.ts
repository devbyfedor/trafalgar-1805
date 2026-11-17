import type { ComponentType } from "react";
import { Scene01Dawn } from "./01-dawn/Scene01Dawn";
import { Scene02Road } from "./02-road/Scene02Road";

/**
 * Scenes in story order. The Experience renders them one after another; each
 * scene owns its pin, timeline and idle loops. Scene 1 hands over to scene 2
 * through overlapping pins (scenes/handoff.ts). The closing card
 * (ToBeContinued) follows the last scene: to add scene 3, add its entry
 * after scene 2's.
 */
export interface SceneDefinition {
  id: string;
  /** Roman numeral of the chapter. */
  chapter: string;
  title: string;
  Component: ComponentType;
}

export const scenes: readonly SceneDefinition[] = [
  { id: "dawn", chapter: "I", title: "Dawn", Component: Scene01Dawn },
  {
    id: "road",
    chapter: "II",
    title: "The road to Trafalgar",
    Component: Scene02Road,
  },
];
