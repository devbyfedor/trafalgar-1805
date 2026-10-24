import type { ComponentType } from "react";
import { Scene01Dawn } from "./01-dawn/Scene01Dawn";
import { ChapterPlaceholder } from "./ChapterPlaceholder";

/**
 * Scenes in story order. The Experience renders them one after another; each
 * scene owns its pin, timeline and idle loops. To add scene 2, replace the
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
    id: "chapter-2",
    chapter: "II",
    title: "Chapter II follows",
    Component: ChapterPlaceholder,
  },
];
