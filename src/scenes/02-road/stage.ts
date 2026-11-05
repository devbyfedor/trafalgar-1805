import {
  buildGlyphAtlas,
  CameraRig,
  Chart,
  type GlyphAtlas,
  Glyphs,
  Lettering,
  loadRivers,
  Rivers,
  Route,
} from "@/components/chart";
import { GlyphProbe } from "@/components/chart/glyphs/probe";
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
  /**
   * Draws the scene at p and reads back every glyph as drawn (GlyphProbe),
   * both fleets ship by ship, then the squadrons: for tests and tuning.
   */
  sample(p: number): { fleets: Float32Array; squadrons: Float32Array };
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
  let atlas: GlyphAtlas | null = null;
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
    // One atlas for both layers, drawn level by level between frames.
    atlas = await buildGlyphAtlas(GLYPH_TYPES);
    options.signal.throwIfAborted();
    chart.addGpuBytes(atlas.gpuBytes);
    const fleets = new Glyphs(chart.field, atlas, fleetMarks());
    chart.add(fleets, fleets.wakes, fleets.ships);
    const squadrons = new Glyphs(chart.field, atlas, squadronMarks());
    chart.add(squadrons, squadrons.wakes, squadrons.ships);
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
    let probes: [GlyphProbe, GlyphProbe] | null = null;
    const stage: RoadStage = {
      chart,
      director,
      sample(p) {
        probes ??= [new GlyphProbe(fleets), new GlyphProbe(squadrons)];
        director.apply(p);
        chart.frame(performance.now() / 1000);
        const read = (probe: GlyphProbe) =>
          probe.read(chart.renderer, chart.camera).values.slice();
        return { fleets: read(probes[0]), squadrons: read(probes[1]) };
      },
      draw(p, time) {
        director.apply(p);
        chart.frame(time);
      },
      resize(width, height) {
        chart.resize(width, height);
      },
      dispose() {
        director.dispose();
        for (const probe of probes ?? []) probe.dispose();
        chart.dispose();
        atlas?.texture.dispose();
      },
    };
    return stage;
  } catch (error) {
    chart.dispose();
    atlas?.texture.dispose();
    throw error;
  }
}
