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
  if (!el) return;
  el.textContent = progress.toFixed(3);
  // A scene's line shows once it has reported.
  const line = el.parentElement;
  if (line?.hidden) line.hidden = false;
}

/** What a WebGL chart reports (src/components/chart, ChartStats). */
export interface ChartReadout {
  calls: number;
  triangles: number;
  textures: number;
  programs: number;
  quality: number;
  width: number;
  height: number;
  dpr: number;
  gpuMB: number;
  exaggeration: number;
  altitude: number;
  nodes: number;
}

let chartSource: (() => ChartReadout | null) | null = null;

/**
 * A chart offers its readouts; the overlay reads them twice a second. The
 * reader returns null while its chart is not drawing (scene 2 off screen).
 */
export function registerChartReadout(
  read: () => ChartReadout | null,
): () => void {
  chartSource = read;
  return () => {
    if (chartSource === read) chartSource = null;
  };
}

export function readChart(): ChartReadout | null {
  return chartSource ? chartSource() : null;
}
