// Generates src/scenes/02-road/routes.ts from docs/research/scene-02/routes-draft.json,
// with the data corrections of a-v-draft-h1.md (ruling 1: the Vigo legs).
// Usage: node scripts/dev/gen-routes.mjs <repo> > routes-body.ts (the legs only;
// src/scenes/02-road/routes.ts wraps them in its header and the leg lists).
import fs from "node:fs";
import path from "node:path";

const repo = process.argv[2];
const routes = JSON.parse(
  fs.readFileSync(
    path.join(repo, "docs/research/scene-02/routes-draft.json"),
    "utf8",
  ),
);

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// a-v-draft-h1.md, ruling 1: the Vigo legs keep clear of the rocks off San Martiño.
function applyRulings(route) {
  const w = route.waypoints.map((p) => ({ ...p }));
  if (route.id === "villeneuve-return") {
    const n = w.length;
    // points 20-22 (1-based) are the three estimated points before the anchorage
    w[n - 4] = {
      ...w[n - 4],
      lon: -8.98,
      lat: 42.16,
      note: "est., SW of the Cíes, clear of the rocks off San Martiño",
    };
    w[n - 3] = {
      ...w[n - 3],
      lon: -8.88,
      lat: 42.17,
      note: "est., the south mouth of the Ría de Vigo",
    };
    w[n - 2] = {
      ...w[n - 2],
      lon: -8.8,
      lat: 42.232,
      note: "est., in the ría, about 0.5 nm or more from the shore",
    };
  }
  if (route.id === "villeneuve-vigo-coruna") {
    w[1] = { ...w[1], lon: -8.8, lat: 42.232, note: "est., in the ría" };
    w[2] = { ...w[2], lon: -8.88, lat: 42.17, note: "est., the south mouth" };
    w[3] = {
      ...w[3],
      lon: -8.98,
      lat: 42.16,
      note: "est., SW of the Cíes, clear of the rocks off San Martiño",
    };
  }
  return w;
}

/** Hour of a time phrase, or null. */
function hourOf(t) {
  if (!t) return null;
  t = t.trim().replace(/^about /, "");
  const named = {
    noon: 12,
    evening: 19,
    nightfall: 19,
    daybreak: 6,
    daylight: 6,
    afternoon: 15,
    "early afternoon": 13,
    morning: 9,
  };
  if (t in named) return named[t];
  // ranges: take the middle ("1.30-2 a.m.", "3.30-4 a.m.", "7.45-8 p.m.", "3-9 p.m." handled by caller)
  const range = t.match(
    /^(\d+)(?:\.(\d+))?-(\d+)(?:\.(\d+))? (a\.m\.|p\.m\.)$/,
  );
  if (range) {
    const a = Number(range[1]) + Number(range[2] ?? 0) / 60;
    const b = Number(range[3]) + Number(range[4] ?? 0) / 60;
    let h = (a + b) / 2;
    if (range[5] === "p.m." && h < 12) h += 12;
    return h;
  }
  const m = t.match(/^(\d+)(?:\.(\d+))? (a\.m\.|p\.m\.)/);
  if (m) {
    let h = Number(m[1]) + Number(m[2] ?? 0) / 60;
    if (m[3] === "p.m." && h < 12) h += 12;
    if (m[3] === "a.m." && h === 12) h = 0;
    return h;
  }
  return null;
}

/**
 * A date phrase as [{month, date, hour}] (two entries for a stay), with
 * whether it is firm enough for a day circle.
 */
function parse(phrase) {
  if (phrase === undefined || phrase === null)
    return { points: [], firm: false };
  const s = String(phrase);
  const special = {
    "31 March to 3 April, 5.30 a.m.": [[4, 3, 5.5]],
    "30 March, weighed about 4 p.m.": [[3, 30, 16]],
    "9 April, about 7.45-8 p.m., to 1.30-2 a.m. on 10 April": [[4, 9, 19.9]],
    "9 May, 9 p.m., to 11 May, 9.10 a.m.": [
      [5, 9, 21],
      [5, 11, 9 + 10 / 60],
    ],
    "7 June, 5.30 p.m., to 8 June, 7 a.m.": [
      [6, 7, 17.5],
      [6, 8, 7],
    ],
    "6 May, 2-6 p.m.": [
      [5, 6, 14],
      [5, 6, 18],
    ],
    "6 June, 3-9 p.m.": [
      [6, 6, 15],
      [6, 6, 21],
    ],
    "8 June, 10 a.m. to evening": [[6, 8, 10]],
    "night of 7-8 April": [[4, 8, 0]],
    "night of 7-8 June": [[6, 8, 0]],
    "6-7 April": [[4, 7, 0]],
    "4-6 April": [[4, 5, 12]],
    "16-18 April": [[4, 17, 12]],
    "4-5 May": [
      [5, 4, 10.5],
      [5, 5, 12],
    ],
    "9-10 April": [[4, 10, 0]],
    "22-23 June": [[6, 23, 0]],
    "10-13 August": [[8, 13, 12]],
    "17 or 18 August": [[8, 18, 0]],
    "about 23 April": [[4, 23, 12]],
    "about 27 April": [[4, 27, 12]],
  };
  const firm =
    !/printed|about \d+ [A-Z]|or|night of|-\d+ [A-Z]|to \d/.test(s) &&
    !/^\d+-\d+/.test(s);
  if (special[s]) {
    return {
      points: special[s].map(([month, date, hour]) => ({ month, date, hour })),
      firm: firm && !/^about|-/.test(s.split(",")[0]),
    };
  }
  const m = s.match(/^(\d+) ([A-Z][a-z]+)(?: \(printed\))?(?:, (.*))?$/);
  if (!m) throw new Error(`unparsed date: ${s}`);
  const month = MONTHS.indexOf(m[2]) + 1;
  if (month < 1) throw new Error(`bad month: ${s}`);
  const hour = hourOf(m[3]) ?? 12;
  return { points: [{ month, date: Number(m[1]), hour }], firm };
}

const SIDE = (id) => (id.startsWith("nelson") ? "british" : "combined");

function fmtNum(x) {
  return Number(x.toFixed(4)).toString();
}

function fmtHour(h) {
  return Number(h.toFixed(4)).toString();
}

function comment(w) {
  const parts = [];
  if (w.date !== undefined && w.date !== null) parts.push(String(w.date));
  if (w.note) parts.push(w.note);
  const text = parts.join(": ").replace(/\s+/g, " ");
  return text.length > 150
    ? `${text.slice(0, 147).replace(/\s+\S*$/, "")}…`
    : text;
}

let out = "";
for (const route of routes) {
  const wps = applyRulings(route);
  const lines = [];
  for (const w of wps) {
    const { points, firm } = parse(w.date);
    const est =
      typeof w.note === "string" && /^est\b|\best\.$/.test(w.note.trim());
    const mark = firm && !est && points.length > 0;
    if (points.length === 0) {
      lines.push(
        `    { lon: ${fmtNum(w.lon)}, lat: ${fmtNum(w.lat)} }, // ${comment(w)}`,
      );
      continue;
    }
    points.forEach((p, k) => {
      const day = `day(${p.month}, ${p.date}${p.hour === 12 ? "" : `, ${fmtHour(p.hour)}`})`;
      const markText = mark && k === 0 && p.hour === 12 ? ", mark: true" : "";
      const c = k === 0 ? comment(w) : "the same berth, leaving";
      lines.push(
        `    { lon: ${fmtNum(w.lon)}, lat: ${fmtNum(w.lat)}, day: ${day}${markText} }, // ${c}`,
      );
    });
  }
  const name = route.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  out += `\n/** ${route.title}. ${route.note.split(". ")[0]}. */\nexport const ${name}: Leg = {\n  id: "${route.id}",\n  side: "${SIDE(route.id)}",\n  waypoints: [\n${lines.join("\n")}\n  ],\n};\n`;
}
process.stdout.write(out);
