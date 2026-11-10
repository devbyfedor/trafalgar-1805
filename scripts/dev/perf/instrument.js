// Injected before any page script (page.addInitScript). Records, on the page's
// own clock (performance.now(), ms since navigation start):
// - every requestAnimationFrame timestamp (frame intervals),
// - long animation frames (LoAF, with script attribution) and long tasks,
// - the chart's loading steps as seen from outside: fetches, createImageBitmap,
//   requestIdleCallback firing, workers, canvas contexts, window.__road ready,
// - WebGL calls: main-thread cost per function per context, every call >= 1 ms,
//   and GPU time (EXT_disjoint_timer_query_webgl2) of uploads, mipmaps, passes
//   and draws on the chart's WebGL2 context while it loads and warms,
// - 2D canvas getImageData / Path2D work (the glyph atlas), as totals.
// Every logged event is also a performance.mark, so it lines up with a trace.
(() => {
  if (window.__perf) return;
  const now = () => performance.now();
  const P = {
    frames: new Float64Array(40000),
    scroll: new Float32Array(40000),
    wheels: [],
    nFrames: 0,
    loafs: [],
    longtasks: [],
    events: [],
    slow: [],
    gpu: [],
    glStats: {},
    canvas2d: {
      getImageData: { n: 0, ms: 0, max: 0 },
      path2d: { n: 0, ms: 0 },
      fill: { n: 0, ms: 0 },
      stroke: { n: 0, ms: 0 },
      drawImage: { n: 0, ms: 0, max: 0 },
    },
    contexts: [],
    gpuWindowEnd: Number.POSITIVE_INFINITY,
  };
  window.__perf = P;
  const ev = (kind, name, extra) => {
    const t = now();
    P.events.push({ t, kind, name, ...(extra || {}) });
    try {
      performance.mark(`perf:${kind}:${String(name).slice(0, 80)}`);
    } catch {}
    return t;
  };
  P.ev = ev;

  // --- frames ---------------------------------------------------------------
  const raf = window.requestAnimationFrame.bind(window);
  const tick = (ts) => {
    if (P.nFrames < P.frames.length) {
      P.scroll[P.nFrames] = window.scrollY;
      P.frames[P.nFrames++] = ts;
    }
    pollQueries();
    raf(tick);
  };
  raf(tick);

  window.addEventListener(
    "wheel",
    (e) => {
      if (P.wheels.length < 5000) P.wheels.push([e.timeStamp, e.deltaY, now()]);
    },
    { passive: true, capture: true },
  );

  // --- LoAF and long tasks --------------------------------------------------
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        P.loafs.push({
          start: e.startTime,
          dur: e.duration,
          blocking: e.blockingDuration,
          renderStart: e.renderStart,
          styleAndLayoutStart: e.styleAndLayoutStart,
          scripts: (e.scripts || []).map((s) => ({
            src: s.sourceURL,
            fn: s.sourceFunctionName,
            invoker: s.invoker,
            type: s.invokerType,
            start: s.startTime,
            dur: s.duration,
            forced: s.forcedStyleAndLayoutDuration,
            pause: s.pauseDuration,
            charPos: s.sourceCharPosition,
          })),
        });
      }
    }).observe({ type: "long-animation-frame", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        P.longtasks.push({ start: e.startTime, dur: e.duration });
    }).observe({ type: "longtask", buffered: true });
  } catch {}

  // --- loading steps seen from outside ----------------------------------------
  const ofetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input?.url || String(input);
    if (url.includes("/chart/") || url.includes("/fonts/")) ev("fetch", url);
    const p = ofetch.apply(this, arguments);
    if (url.includes("/chart/") || url.includes("/fonts/"))
      p.then(() => ev("fetch-headers", url)).catch(() => {});
    return p;
  };
  const ocib = window.createImageBitmap;
  window.createImageBitmap = function () {
    const t = ev("createImageBitmap", "start");
    const p = ocib.apply(this, arguments);
    p.then((b) =>
      ev("createImageBitmap", "done", {
        w: b.width,
        h: b.height,
        ms: now() - t,
      }),
    ).catch(() => {});
    return p;
  };
  const oric = window.requestIdleCallback;
  if (oric) {
    window.requestIdleCallback = function (cb, opts) {
      const t = now();
      if (window.__perfNoChart && opts && opts.timeout === 2500) {
        ev("idle-blocked", "scene 2 chart load suppressed");
        return 0;
      }
      const stack =
        new Error().stack?.split("\n").slice(2, 4).join(" | ") || "";
      return oric.call(
        this,
        (deadline) => {
          ev("idle-fired", stack.slice(0, 140), {
            waited: now() - t,
            didTimeout: deadline.didTimeout,
            remaining: deadline.timeRemaining(),
          });
          return cb(deadline);
        },
        opts,
      );
    };
  }
  const OWorker = window.Worker;
  // A plain function, so `new Worker(...)` works: as an arrow function it
  // threw, and troika fell back to typesetting and drawing its glyphs on
  // the main thread under the instrument (seconds-long tasks).
  window.Worker = function Worker(url, opts) {
    ev("worker", String(url).slice(0, 60));
    return new OWorker(url, opts);
  };
  window.Worker.prototype = OWorker.prototype;
  try {
    let road;
    Object.defineProperty(window, "__road", {
      configurable: true,
      get: () => road,
      set: (v) => {
        road = v;
        ev("road", v ? "ready" : "cleared");
        if (v) P.gpuWindowEnd = now() + 4000;
      },
    });
  } catch {}

  // --- canvas contexts ----------------------------------------------------------
  const ctxInfo = new WeakMap();
  const oGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const t = now();
    const ctx = oGetContext.call(this, type, attrs);
    const d = now() - t;
    if (ctx && !ctxInfo.has(ctx)) {
      const id = P.contexts.length;
      const info = {
        id,
        type,
        w: this.width,
        h: this.height,
        attrs: attrs ? JSON.stringify(attrs) : "",
        t,
        ms: d,
      };
      P.contexts.push(info);
      ctxInfo.set(ctx, info);
      if (type !== "2d" || d > 1)
        ev("getContext", `${type} #${id} ${this.width}x${this.height}`, {
          ms: d,
        });
    }
    return ctx;
  };

  // --- 2D canvas -----------------------------------------------------------------
  const C2 = CanvasRenderingContext2D.prototype;
  const wrap2d = (name, statName, logSlow) => {
    const o = C2[name];
    C2[name] = function () {
      const t = now();
      const r = o.apply(this, arguments);
      const d = now() - t;
      const s = P.canvas2d[statName];
      s.n++;
      s.ms += d;
      if (s.max !== undefined && d > s.max) s.max = d;
      if (logSlow && d >= 2)
        P.slow.push({
          t,
          ctx: "2d",
          fn: name,
          ms: d,
          info: `${this.canvas.width}x${this.canvas.height}`,
        });
      return r;
    };
  };
  wrap2d("getImageData", "getImageData", true);
  wrap2d("fill", "fill", false);
  wrap2d("stroke", "stroke", false);
  wrap2d("drawImage", "drawImage", true);
  const OPath2D = window.Path2D;
  // A plain function, so `new Path2D(...)` works (an arrow function can't
  // be a constructor: the glyph atlas failed under the instrument).
  window.Path2D = function Path2D(arg) {
    const t = now();
    const p = arg === undefined ? new OPath2D() : new OPath2D(arg);
    P.canvas2d.path2d.n++;
    P.canvas2d.path2d.ms += now() - t;
    return p;
  };
  window.Path2D.prototype = OPath2D.prototype;

  // --- WebGL ---------------------------------------------------------------------
  const shaderSrc = new WeakMap();
  const progShaders = new WeakMap();
  const progLabel = new WeakMap();
  const current = new WeakMap(); // ctx -> program
  const fbBound = new WeakMap(); // ctx -> framebuffer bound to FRAMEBUFFER / DRAW
  let progCount = 0;
  const SHARED =
    /^(uField|uRect|uFade|uSat|uHas|uHorizon|uLand|uOrigin|uTexelKm|uExag|uLodK|uEye|uDpr|uPxPerRad|modelMatrix|modelViewMatrix|projectionMatrix|viewMatrix|normalMatrix|cameraPosition|isOrthographic)/;
  const labelOf = (prog) => {
    if (!prog) return "none";
    let l = progLabel.get(prog);
    if (l) return l;
    const srcs = (progShaders.get(prog) || []).map(
      (s) => shaderSrc.get(s) || "",
    );
    const all = srcs.join("\n");
    if (all.includes("uHeightCode")) l = "field.decode";
    else if (all.includes("uAzimuth") && all.includes("uSteps"))
      l = "field.horizon";
    else if (all.includes("split16")) l = "field.encode";
    else if (all.includes("land += clamp")) l = "field.land";
    else if (all.includes("uTroikaSDFTexture")) l = "troika.text";
    else if (all.includes("uGridN")) l = "terrain";
    else if (all.includes("uSkyStops")) l = "sky";
    else if (
      all.includes("u_sdfTexture") ||
      all.includes("uniform sampler2D u_texture")
    )
      l = "troika.sdfgen";
    else {
      const names = [...all.matchAll(/uniform\s+\w+\s+(\w+)/g)]
        .map((m) => m[1])
        .filter((n) => !SHARED.test(n));
      l = `prog${progCount}[${[...new Set(names)].slice(0, 3).join(",")}]`;
    }
    progCount++;
    progLabel.set(prog, l);
    return l;
  };
  P.labelOf = labelOf;

  const timers = new WeakMap(); // ctx -> {ext, active}
  const pending = [];
  function timerFor(gl) {
    let t = timers.get(gl);
    if (t === undefined) {
      const ext =
        gl instanceof WebGL2RenderingContext
          ? gl.getExtension("EXT_disjoint_timer_query_webgl2")
          : null;
      t = ext ? { ext, active: false } : null;
      timers.set(gl, t);
    }
    return t;
  }
  function pollQueries() {
    for (let i = pending.length - 1; i >= 0; i--) {
      const q = pending[i];
      const gl = q.gl;
      try {
        if (!gl.getQueryParameter(q.query, gl.QUERY_RESULT_AVAILABLE)) continue;
        const disjoint = gl.getParameter(q.ext.GPU_DISJOINT_EXT);
        const ns = gl.getQueryParameter(q.query, gl.QUERY_RESULT);
        P.gpu.push({
          t: q.t,
          fn: q.fn,
          label: q.label,
          gpuMs: ns / 1e6,
          disjoint,
          ctx: q.ctx,
          info: q.info,
        });
        gl.deleteQuery(q.query);
      } catch {
        P.gpu.push({ t: q.t, fn: q.fn, label: q.label, gpuMs: -1, ctx: q.ctx });
      }
      pending.splice(i, 1);
    }
  }

  const GPU_TIMED = new Set([
    "texImage2D",
    "texSubImage2D",
    "texStorage2D",
    "generateMipmap",
    "drawArrays",
    "drawElements",
    "drawArraysInstanced",
    "drawElementsInstanced",
    "readPixels",
    "clear",
    "blitFramebuffer",
    "copyTexSubImage2D",
  ]);
  const describe = (fn, args) => {
    if (fn === "texImage2D" || fn === "texSubImage2D") {
      const src = args[args.length - 1];
      if (
        src &&
        typeof src === "object" &&
        "width" in src &&
        !ArrayBuffer.isView(src)
      )
        return `${src.constructor?.name} ${src.width}x${src.height}`;
      if (args.length >= 9)
        return `data ${args[3]}x${args[4]} fmt 0x${Number(args[6]).toString(16)} type 0x${Number(args[7]).toString(16)} ${ArrayBuffer.isView(src) ? src.byteLength : src}`;
      return `${args.length} args`;
    }
    if (fn === "texStorage2D")
      return `${args[3]}x${args[4]} levels ${args[1]} ifmt 0x${Number(args[2]).toString(16)}`;
    if (fn === "readPixels") return `${args[2]}x${args[3]}`;
    if (fn === "bufferData")
      return typeof args[1] === "number"
        ? `${args[1]} bytes`
        : `${args[1]?.byteLength} bytes`;
    if (fn === "getBufferSubData") return `${args[2]?.byteLength} bytes`;
    if (fn === "getProgramParameter")
      return `pname 0x${Number(args[1]).toString(16)}`;
    if (fn === "drawArrays" || fn === "drawElements")
      return `count ${args[fn === "drawArrays" ? 2 : 1]}`;
    if (fn === "drawArraysInstanced") return `count ${args[2]} inst ${args[3]}`;
    if (fn === "drawElementsInstanced")
      return `count ${args[1]} inst ${args[4]}`;
    return "";
  };

  const origFlush1 = WebGLRenderingContext.prototype.flush;
  const convertedBuffers = new WeakSet();
  const boundArray = new WeakMap();
  const usedPrograms = new WeakSet();
  const wrapGL = (proto, isGL2) => {
    for (const fn of Object.getOwnPropertyNames(proto)) {
      const d = Object.getOwnPropertyDescriptor(proto, fn);
      if (!d || typeof d.value !== "function" || fn === "constructor") continue;
      const o = d.value;
      const timed = isGL2 && GPU_TIMED.has(fn);
      proto[fn] = function () {
        const info = ctxInfo.get(this);
        const cid = info ? info.id : -1;
        if (fn === "shaderSource") shaderSrc.set(arguments[0], arguments[1]);
        else if (fn === "attachShader") {
          const list = progShaders.get(arguments[0]) || [];
          list.push(arguments[1]);
          progShaders.set(arguments[0], list);
        } else if (fn === "useProgram") {
          current.set(this, arguments[0]);
          const pr = arguments[0];
          if (pr && !usedPrograms.has(pr)) {
            usedPrograms.add(pr);
            ev("first-use", `ctx${cid} ${labelOf(pr)}`);
          }
        } else if (fn === "linkProgram")
          ev("link", `ctx${cid} ${labelOf(arguments[0])}`);
        else if (
          fn === "bindFramebuffer" &&
          (arguments[0] === 0x8d40 || arguments[0] === 0x8ca9)
        )
          fbBound.set(this, arguments[1]);
        if (isGL2 && window.__perfConvertU16) {
          if (fn === "bindBuffer" && arguments[0] === 0x8892)
            boundArray.set(this, arguments[1]);
          else if (
            (fn === "bufferData" || fn === "bufferSubData") &&
            arguments[0] === 0x8892
          ) {
            const src = fn === "bufferData" ? arguments[1] : arguments[2];
            if (src instanceof Uint16Array) {
              const f = Float32Array.from(src);
              const buf = boundArray.get(this);
              if (buf) convertedBuffers.add(buf);
              if (fn === "bufferData")
                return o.call(this, arguments[0], f, arguments[2]);
              return o.call(this, arguments[0], arguments[1] * 2, f);
            }
          } else if (
            fn === "vertexAttribPointer" &&
            arguments[2] === 0x1403 &&
            !arguments[3]
          ) {
            const buf = boundArray.get(this);
            if (buf && convertedBuffers.has(buf)) {
              ev(
                "u16-converted",
                "vertexAttribPointer UNSIGNED_SHORT -> FLOAT",
              );
              return o.call(
                this,
                arguments[0],
                arguments[1],
                0x1406,
                false,
                arguments[4] * 2,
                arguments[5] * 2,
              );
            }
          }
        }
        let tq = null;
        const t = now();
        if (timed && t < P.gpuWindowEnd) {
          const tm = timerFor(this);
          if (tm && !tm.active) {
            const query = this.createQuery();
            this.beginQuery(tm.ext.TIME_ELAPSED_EXT, query);
            tm.active = true;
            tq = { tm, query };
          }
        }
        const r = o.apply(this, arguments);
        if (
          !isGL2 &&
          window.__perfFlushTroika &&
          (fn === "drawArrays" || fn === "drawElements")
        )
          origFlush1.call(this);
        if (tq) {
          this.endQuery(tq.tm.ext.TIME_ELAPSED_EXT);
          tq.tm.active = false;
          const isDraw =
            fn.startsWith("draw") || fn === "clear" || fn === "blitFramebuffer";
          pending.push({
            gl: this,
            ext: tq.tm.ext,
            query: tq.query,
            t,
            fn,
            ctx: cid,
            label:
              isDraw || fn === "readPixels"
                ? `${labelOf(current.get(this))}${fbBound.get(this) ? " ->RT" : " ->canvas"}`
                : "",
            info: describe(fn, arguments),
          });
        }
        const dt = now() - t;
        const key = `${cid}:${fn}`;
        let s = P.glStats[key];
        if (!s) s = P.glStats[key] = { n: 0, ms: 0, max: 0 };
        s.n++;
        s.ms += dt;
        if (dt > s.max) s.max = dt;
        if (dt >= 1 && P.slow.length < 20000) {
          P.slow.push({
            t,
            ctx: cid,
            fn,
            ms: dt,
            info: describe(fn, arguments),
            label:
              fn.startsWith("draw") ||
              fn === "linkProgram" ||
              fn === "getProgramParameter" ||
              fn === "getUniformLocation"
                ? labelOf(
                    fn === "linkProgram" ||
                      fn === "getProgramParameter" ||
                      fn === "getUniformLocation"
                      ? arguments[0]
                      : current.get(this),
                  )
                : "",
          });
        }
        return r;
      };
    }
  };
  // LIGHT: frames only, no GL wrappers or GPU timer queries (their sync
  // calls can wait on the GPU process and add late frames of their own).
  if (!window.__perfLight) {
    wrapGL(WebGLRenderingContext.prototype, false);
    wrapGL(WebGL2RenderingContext.prototype, true);
  }

  // Resource timing for scripts and chart assets, read at the end.
  P.resources = () =>
    performance
      .getEntriesByType("resource")
      .filter((e) => /\.js|\/chart\/|\/fonts\/|\.woff/.test(e.name))
      .map((e) => ({
        name: e.name.replace(location.origin, ""),
        start: e.startTime,
        end: e.responseEnd,
        size: e.transferSize || e.encodedBodySize,
      }));
  P.dump = () => ({
    frames: Array.from(P.frames.subarray(0, P.nFrames)),
    scroll: Array.from(P.scroll.subarray(0, P.nFrames)),
    wheels: P.wheels,
    loafs: P.loafs,
    longtasks: P.longtasks,
    events: P.events,
    slow: P.slow,
    gpu: P.gpu,
    glStats: P.glStats,
    canvas2d: P.canvas2d,
    contexts: P.contexts,
    resources: P.resources(),
    nav: performance
      .getEntriesByType("navigation")
      .map((n) => ({
        dcl: n.domContentLoadedEventEnd,
        load: n.loadEventEnd,
        domInteractive: n.domInteractive,
        responseEnd: n.responseEnd,
      }))[0],
    paints: performance
      .getEntriesByType("paint")
      .map((p) => ({ name: p.name, t: p.startTime })),
  });
})();
