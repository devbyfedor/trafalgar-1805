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
import { type BenchResult, benchFrames } from "@/components/chart/engine/bench";
import { readCoastKm } from "@/components/chart/glyphs/coast";
import { GlyphProbe } from "@/components/chart/glyphs/probe";
import type { WaterLift } from "@/components/chart/terrain/liftProbe";
import { ROAD_FLIGHT } from "./camera";
import {
  fleetMarks,
  RoadDirector,
  SQUADRON_ROOM_FLOOR,
  squadronMarks,
} from "./director";
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
  sample(
    p: number,
    mode?: number,
  ): { fleets: Float32Array; squadrons: Float32Array };
  /** Sets the chart for progress p and draws a frame (gsap.ticker time). */
  draw(p: number, time: number): void;
  /**
   * Development: draws `frames` frames at p, each timed on the GPU and the
   * CPU (engine/bench.ts; scripts/dev/road-bench.mjs). The host holds its
   * own drawing meanwhile. With `alternate`, the chart's objects of that
   * name (Chart.showNamed) are drawn on even frames and hidden on odd ones.
   */
  bench(frames: number, p: number, alternate?: string): Promise<BenchResult>;
  /** Development: draws the scene at p and probes its water (Chart.probeWaterLift). */
  waterLift(p: number): WaterLift;
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
    const squadrons = new Glyphs(chart.field, atlas, squadronMarks(), {
      roomFloor: SQUADRON_ROOM_FLOOR,
    });
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
    // Every ship's heading through beats 4 and 5, eased ahead of time.
    await director.prepare(
      () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
    );
    options.signal.throwIfAborted();
    // Each squadron's room along its way, read once from the chart. Without
    // it (a GPU that can't read floats back) a squadron reads its room where
    // it is, as before.
    try {
      await director.computeRooms((points) =>
        readCoastKm(chart.renderer, chart.field, points),
      );
    } catch (error) {
      options.signal.throwIfAborted();
      console.warn("scene 2: squadron rooms not read ahead", error);
    }
    options.signal.throwIfAborted();
    let probes: [GlyphProbe, GlyphProbe] | null = null;
    let sampled = Number.NaN;
    const stage: RoadStage = {
      chart,
      director,
      sample(p, mode = 0) {
        probes ??= [new GlyphProbe(fleets), new GlyphProbe(squadrons)];
        // Another mode at the same p reads the frame already drawn.
        if (p !== sampled) {
          director.apply(p);
          chart.frame(performance.now() / 1000);
          sampled = p;
        }
        const read = (probe: GlyphProbe) =>
          probe.read(chart.renderer, chart.camera, mode).values.slice();
        return { fleets: read(probes[0]), squadrons: read(probes[1]) };
      },
      draw(p, time) {
        sampled = Number.NaN;
        director.apply(p);
        chart.frame(time);
      },
      async bench(frames, p, alternate) {
        sampled = Number.NaN;
        const gl = chart.renderer.getContext() as WebGL2RenderingContext;
        try {
          return await benchFrames(
            gl,
            (time) => {
              director.apply(p);
              chart.frame(time);
            },
            frames,
            alternate
              ? (i) => chart.showNamed(alternate, i % 2 === 0)
              : undefined,
          );
        } finally {
          if (alternate) chart.showNamed(alternate, true);
        }
      },
      waterLift(p) {
        sampled = Number.NaN;
        director.apply(p);
        chart.frame(performance.now() / 1000);
        return chart.probeWaterLift();
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
