// Where scene 2 shows a given p, for the dev tools (development only).
// Since Boulogne's interlude (docs/scene-02-boulogne-brief.md) the pin is
// longer than its 30 screens of p: the page maps p to a scroll position
// itself (window.__road.scrollFor; scenes/alive/interlude.ts), so every
// tool reaches the same frame of the story on any build. A build from
// before the interlude has no such hook; there p sat at (3 + 30p) screens.

/** Scene 1's pin before scene 2's starts, and scene 2's old pin, screens. */
export const SCENE1 = 3;
export const SCENE2 = 30;

/**
 * The page's scroll position (CSS px) that shows scene 2 at p. Call once
 * the scene is ready (window.__road.ready); a page without the hook gets
 * the old linear pin.
 */
export function roadScrollFor(tab, p) {
  return tab.evaluate(
    ([at, scene1, scene2]) =>
      window.__road?.scrollFor
        ? window.__road.scrollFor(at)
        : (scene1 + scene2 * at) * window.innerHeight,
    [p, SCENE1, SCENE2],
  );
}

/** Scrolls the page to `y` at once, through Lenis where it runs. */
export function scrollPageTo(tab, y) {
  return tab.evaluate((top) => {
    if (window.__lenis)
      window.__lenis.scrollTo(top, { immediate: true, force: true });
    else window.scrollTo(0, top);
  }, y);
}

/** Scrolls the page to scene 2 at p (roadScrollFor), returning the position. */
export async function scrollRoadTo(tab, p) {
  const y = await roadScrollFor(tab, p);
  await scrollPageTo(tab, y);
  return y;
}
