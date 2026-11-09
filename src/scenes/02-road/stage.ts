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
import type { ClashResult } from "@/components/chart/glyphs/clash";
import { GlyphLayout } from "@/components/chart/glyphs/layout";
import { GlyphProbe } from "@/components/chart/glyphs/probe";
import type { WaterLift } from "@/components/chart/terrain/liftProbe";
import { ROAD_FLIGHT } from "./camera";
import {
  fleetMarks,
  fleetNames,
  RoadDirector,
  squadronMarks,
  squadronNames,
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
   * Development and tests: draws the scene at p and finds every glyph whose
   * ink touches land or another glyph's (Chart.probeClash): the fleets are
   * layer 0, the squadrons layer 1. `ink`: the least drawn alpha counted.
   */
  clash(p: number, ink?: number): ClashResult;
  /** Development: each layer's glyphs by name, in mark order. */
  glyphNames(): string[][];
  /** Development: draws the scene at p and returns each squadron's layout (GlyphLayout.debug). */
  layoutDebug(p: number): Record<string, unknown>[];
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
  /**
   * Bakes the glyph layout's tables for the current viewport, in idle
   * slices (GlyphLayout.bakeBegin); call after each resize. Resolves when
   * done (or when a newer bake or the scene's end cancels it).
   */
  bake(): Promise<void>;
  dispose(): void;
}

/** The glyph layout's tables: a step of p, and the most time a slice of baking takes, ms. */
const BAKE_STEP = 0.001;
const BAKE_SLICE_MS = 4;

/** Waits for the browser to be idle (or a frame, where idle callbacks don't exist). */
function idleSlice(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === "function")
      requestIdleCallback(() => resolve(), { timeout: 200 });
    else setTimeout(resolve, 16);
  });
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
    const fleets = new Glyphs(atlas, fleetMarks());
    const squadrons = new Glyphs(atlas, squadronMarks());
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
    // The chart's land on the CPU, so the glyph layout keeps every ship off
    // it; laid out before the glyph layers draw, each frame.
    const coast = await chart.field.readBack();
    options.signal.throwIfAborted();
    const layout = new GlyphLayout(coast, director.layoutGroups());
    director.setLayout(layout);
    chart.add(layout);
    chart.add(fleets, fleets.wakes, fleets.ships);
    chart.add(squadrons, squadrons.wakes, squadrons.ships);
    // The glyph layout's tables, baked ahead over the scroll for the
    // viewport in idle slices of a few milliseconds; a new viewport bakes
    // anew, the layout deciding from each frame alone meanwhile.
    let baking: { cancelled: boolean } | null = null;
    const bake = async () => {
      if (baking) baking.cancelled = true;
      const job = { cancelled: false };
      baking = job;
      const ps = layout.bakeBegin(0, 1, BAKE_STEP);
      let k = 0;
      while (k < ps.length) {
        await idleSlice();
        if (job.cancelled || options.signal.aborted) return;
        const start = performance.now();
        while (k < ps.length && performance.now() - start < BAKE_SLICE_MS) {
          director.applyState(ps[k]);
          layout.bakeStep(chart.peekFrame(), k);
          k++;
        }
      }
      layout.bakeEnd();
      sampled = Number.NaN;
    };
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
      clash(p, ink) {
        sampled = Number.NaN;
        director.apply(p);
        chart.frame(performance.now() / 1000);
        return chart.probeClash(
          [{ glyphs: fleets }, { glyphs: squadrons }],
          ink,
        );
      },
      layoutDebug(p) {
        sampled = Number.NaN;
        layout.debug = [];
        director.apply(p);
        chart.frame(performance.now() / 1000);
        const out = layout.debug;
        layout.debug = null;
        return out;
      },
      glyphNames() {
        return [fleetNames(), squadronNames()];
      },
      resize(width, height) {
        chart.resize(width, height);
      },
      bake,
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
