import {
  CameraRig,
  Chart,
  Glyphs,
  Lettering,
  loadRivers,
  Rivers,
  Route,
} from "@/components/chart";
import { ROAD_FLIGHT } from "./camera";
import { fleetMarks, RoadDirector, squadronMarks } from "./director";
import { GLYPH_TYPES } from "./fleets";
import { GAZETTEER } from "./gazetteer";
import { NELSON, VILLENEUVE } from "./routes";

/**
 * Scene 2's chart and everything on it. The scene imports this module
 * dynamically, so three.js, the engine and the scene's chart code form a
 * chunk of their own that never enters the initial bundle (brief,
 * "Loading").
 */

export interface RoadStage {
  chart: Chart;
  director: RoadDirector;
  /** Sets the chart for progress p and draws a frame (gsap.ticker time). */
  draw(p: number, time: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export interface RoadStageOptions {
  canvas: HTMLCanvasElement;
  signal: AbortSignal;
  /** The WebGL context is lost for good. */
  onFatal: (reason: string) => void;
  /** Pins a quality level (tests); otherwise the ladder adapts. */
  quality?: number;
}

export async function createRoadStage(
  options: RoadStageOptions,
): Promise<RoadStage> {
  const chart = await Chart.create({
    canvas: options.canvas,
    signal: options.signal,
    quality: options.quality,
    onFatal: options.onFatal,
  });
  try {
    const riverData = await loadRivers(chart.manifest, options.signal);
    const rivers = new Rivers(chart.field, riverData);
    chart.add(rivers, rivers.mesh);
    const legs = [...VILLENEUVE, ...NELSON];
    const routes = legs.map(
      (leg) =>
        new Route(
          chart.field,
          leg.waypoints.map((w) => [w.lon, w.lat] as const),
          { width: leg.side === "british" ? 2 : 1.8 },
        ),
    );
    for (const r of routes) {
      r.setProgress(0);
      chart.add(r, r.mesh);
    }
    const fleets = new Glyphs(chart.field, GLYPH_TYPES, fleetMarks());
    chart.add(fleets, fleets.wakes, fleets.ships);
    chart.addGpuBytes(fleets.atlas.gpuBytes);
    const squadrons = new Glyphs(chart.field, GLYPH_TYPES, squadronMarks());
    chart.add(squadrons, squadrons.wakes, squadrons.ships);
    chart.addGpuBytes(squadrons.atlas.gpuBytes);
    const lettering = new Lettering(chart.field, GAZETTEER);
    chart.add(lettering, lettering.batch, lettering.marks.mesh);
    await lettering.ready;
    options.signal.throwIfAborted();
    const rig = new CameraRig(ROAD_FLIGHT);
    const director = new RoadDirector({
      chart,
      rig,
      fleets,
      squadrons,
      routes,
      legs,
    });
    const stage: RoadStage = {
      chart,
      director,
      draw(p, time) {
        director.apply(p);
        chart.frame(time);
      },
      resize(width, height) {
        chart.resize(width, height);
      },
      dispose() {
        director.dispose();
        chart.dispose();
      },
    };
    return stage;
  } catch (error) {
    chart.dispose();
    throw error;
  }
}
