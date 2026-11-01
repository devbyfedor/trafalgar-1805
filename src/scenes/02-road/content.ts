/**
 * Scene 2 copy. Edit the strings here; the scene reads nothing else.
 * Captions follow the brief, with two changes from the research
 * (docs/decisions.md, "Scene 2, Stage B"): the flotilla was rigged gun
 * craft, not barges, and the chain off Cádiz was frigates inshore and ships
 * of the line beyond (the owner's wording, 1 November 2026).
 */
export const roadContent = {
  chapter: "II. The road to Trafalgar",
  captions: {
    boulogne:
      "Summer 1805. At Boulogne, across the Channel from England, Napoleon's army waits beside a flotilla of invasion craft. It needs one thing: command of the Channel.",
    chase:
      "Napoleon's plan: Villeneuve breaks out of Toulon, gathers Spanish ships at Cádiz and sails for the West Indies to draw the Royal Navy away, then races back for the Channel. Nelson follows him across the Atlantic and back.",
    finisterre:
      "Off Cape Finisterre, Calder's squadron catches Villeneuve and takes two Spanish ships. Villeneuve turns south and shelters in Cádiz. At the end of August, Napoleon gives up on England and marches his army east.",
    cadiz:
      "Nelson takes command off Cádiz and keeps his fleet out of sight, linked to the coast by a chain of frigates and ships of the line. On 19 October the combined fleet begins to put to sea, and the signal runs down the chain.",
    night:
      "On 20 October, far to the east, an Austrian army surrenders to Napoleon at Ulm. Through that night the fleets close on each other off Cape Trafalgar.",
  },
  /** The date line's label while the scene is at Boulogne. */
  boulogneDate: "August 1805",
  /** The placeholder that follows the scene. */
  next: "Chapter III follows",
} as const;

export type RoadCaption = keyof typeof roadContent.captions;
