import type { ComponentType } from "react";
import { Scene01Dawn } from "./01-dawn/Scene01Dawn";
import { Scene02Road } from "./02-road/Scene02Road";
import { ChapterThree } from "./ChapterPlaceholder";

/**
 * Scenes in story order. The Experience renders them one after another; each
 * scene owns its pin, timeline and idle loops. Scene 1 hands over to scene 2
 * through overlapping pins (scenes/handoff.ts). To add scene 3, replace the
 * placeholder entry with the real scene.
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
  {
    id: "chapter-3",
    chapter: "III",
    title: "Chapter III follows",
    Component: ChapterThree,
  },
];
