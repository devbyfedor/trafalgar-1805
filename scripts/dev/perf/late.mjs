// Lists late frames (dt > 20 ms) after the first wheel, with scrollY and p.
import { readFileSync } from "node:fs";
for (const file of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(file, "utf8"));
  const fr = d.frames, sc = d.scroll;
  const wheel0 = d.wheels.length ? d.wheels[0][2] : Infinity;
  const out = [];
  for (let i = 1; i < fr.length; i++) {
    const dt = fr[i] - fr[i - 1];
    if (fr[i - 1] >= wheel0 && dt > 20) out.push(`${(fr[i-1]-wheel0).toFixed(0)}ms y${Math.round(sc[i-1])} p${(sc[i-1]/2160).toFixed(3)} dt${dt.toFixed(0)}`);
  }
  console.log(file.split(/[\/]/).pop(), out.join(" | "));
}
