/**
 * Scene 1 copy. Edit the strings here; the scene reads nothing else.
 * Keep the title a single word: it is the page's only h1 and is split into
 * letters for the scroll animation.
 */
export const dawnContent = {
  chapter: "I. Dawn",
  dateline: "Off Cape Trafalgar, at dawn on 21 October 1805",
  title: "Trafalgar",
  lede: "Twenty-seven British ships of the line. Thirty-three French and Spanish. One morning off the coast of Spain.",
  closing:
    "At first light the British sighted the enemy: thirty-three ships of the line, strung out along the eastern horizon.",
  scrollCue: "Scroll",
  fallbackNotice: "This story is designed for a desktop browser.",
} as const;

export type DawnContent = typeof dawnContent;
