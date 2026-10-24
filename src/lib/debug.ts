/**
 * Debug channel for `?debug`: scenes report scroll progress here and the
 * overlay prints it. Writes go straight to DOM text nodes, never React state,
 * so reporting every frame costs nothing when the overlay is closed.
 */

const sinks = new Map<string, HTMLElement>();

export function registerProgressSink(
  sceneId: string,
  el: HTMLElement,
): () => void {
  sinks.set(sceneId, el);
  return () => {
    if (sinks.get(sceneId) === el) sinks.delete(sceneId);
  };
}

export function reportProgress(sceneId: string, progress: number): void {
  const el = sinks.get(sceneId);
  if (el) el.textContent = progress.toFixed(3);
}
