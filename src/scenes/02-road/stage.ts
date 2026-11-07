import { Vector3 } from "three";
import {
  buildDigitAtlas,
  buildGlyphAtlas,
  CameraRig,
  Chart,
  type DigitAtlas,
  fontUrl,
  type GlyphAtlas,
  Glyphs,
  Lettering,
  loadRivers,
  loadSoundings,
  Rivers,
  Route,
  SOUNDING_FONT_FILE,
  Soundings,
} from "@/components/chart";
import { type BenchResult, benchFrames } from "@/components/chart/engine/bench";
import { worldX, worldY } from "@/components/chart/geo/mercator";
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
import { SOUNDING_ANGLES } from "./soundings";

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
  /**
   * Development: where a site on the sea level stands in the frame at p
   * (normalised device coordinates), how far from the eye (km), how steeply
   * the view meets the chart there (the sine of its elevation) and the
   * frame's CSS px per radian, for sizing names (scripts/dev/name-sizes.mjs).
   */
  siteView(
    p: number,
    lon: number,
    lat: number,
  ): { x: number; y: number; dist: number; sinElev: number; pxPerRad: number };
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
  let digits: DigitAtlas | null = null;
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
    // The depths written over the shoal water of the detail tiles.
    const soundingData = await loadSoundings(chart.manifest, options.signal);
    if (soundingData) {
      digits = await buildDigitAtlas(fontUrl(SOUNDING_FONT_FILE));
      options.signal.throwIfAborted();
      chart.addGpuBytes(digits.gpuBytes);
      const soundings = new Soundings(
        soundingData.index,
        soundingData.sets,
        digits,
        { angles: SOUNDING_ANGLES },
      );
      chart.add(soundings, soundings.mesh);
    }
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
      siteView(p, lon, lat) {
        sampled = Number.NaN;
        director.apply(p);
        const camera = chart.camera;
        camera.updateMatrixWorld();
        const site = new Vector3(worldX(lon), worldY(lat), 0);
        const dist = site.distanceTo(camera.position);
        const sinElev = camera.position.z / Math.max(dist, 1e-6);
        site.project(camera);
        const height = chart.renderer.domElement.clientHeight || 720;
        const pxPerRad = height / (2 * Math.tan((camera.fov * Math.PI) / 360));
        return { x: site.x, y: site.y, dist, sinElev, pxPerRad };
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
        digits?.texture.dispose();
      },
    };
    return stage;
  } catch (error) {
    chart.dispose();
    atlas?.texture.dispose();
    digits?.texture.dispose();
    throw error;
  }
}
