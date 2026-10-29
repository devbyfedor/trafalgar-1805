# Scene 2 research notes

Research for scene 2 ("The road to Trafalgar"), written by research agents in sessions 5 and 6 (25–26 October 2026) and moved here from the sessions' temporary folders so nothing lives only outside the repository. They follow the rules in `../README.md`: our own words with links; quotations from public-domain period sources only. When the notes were copied here (session 6), every quotation of 26 words or more was cut to its opening phrase with an ellipsis, keeping its citation.

**Status: not yet the project's word.** `docs/history-notes.md` gets a "Scene 2" section written from these notes, the fact-check reports and the adjudications (`a-*.md`, session 7). It has not been written yet. Until then, read a note with its checks and their adjudication (see "How to use them").

## History (session 5), with independent fact-checks (session 6)

| Notes | Fact-check reports | Scope |
| --- | --- | --- |
| `h1-campaign.md` | `v-h1a.md`, `v-h1b.md`, `v-h1c.md` | Toulon to the West Indies and back, Nelson's pursuit, Cape Finisterre, Vigo and Ferrol, Cádiz; fleet sizes; route waypoints |
| `h2-boulogne-cadiz.md` | `v-h2a.md`, `v-h2b.md`, `v-h2c.md` | Boulogne, the turn east, Ulm, Nelson's watch on Cádiz, the sortie; positions for glyphs |
| `h3-signals.md` | `v-h3a.md`, `v-h3b.md` | British day and night signals in 1805, the signal chain of 19–21 October, how it should look |

Verdicts per report (statements checked, by the checker's own count): h1a 18 confirmed, 3 corrected, 1 disputed, 2 unverifiable; h1b 45, 6, 4, 0; h1c 43, 2, 2, 0; h2a 54, 7, 1, 1; h2b 46, 4, 3, 1; h2c 66, 8, 5, 0; h3a 41, 1, 2, 3; h3b 18, 7, 1, 2.

The corrections that change what the scene shows:
- **The Cádiz anchorage.** The suggested glyph centre (36.550 N, 6.300 W) lies 0.17 nm from the Las Puercas reef; the combined fleet lay out of range of the fortress guns, moored with springs. Put the anchorage and the harbour mouth in open water north or north-west of Las Puercas (`v-h2c.md`, H2-36d, H2-38b, H2-40a). If glyph counts show fleet size, the cluster must show 33 of the line.
- **The signal relay of 19 October.** No. 370 went Sirius → Euryalus (7.00) → Phoebe (7.20), then down the chain of ships of the line to the Victory at 9.30 by the logged clocks: about 2½ hours over 16–19 leagues (48–57 nm). Nelson's original diary reads "Cadiz bearing ESE by compass distance 16 leagues"; "E.N.E." is a later misprint (`v-h3b.md`, H3-17, H3-18b–e). "Firing three minute guns" is the Euryalus's log describing the Phoebe (`v-h3b.md`, SUM-1b).
- **Nelson in March and May.** At anchor in the Gulf of Palmas from 26 March; weighed at 6.15 p.m. on 30 March, the evening Villeneuve sailed; Pula 31 March to 3 April. Sailed from Lagos Bay at 9.10 a.m. on 11 May. Homeward through the Azores north of São Miguel on 8–9 July (`v-h1b.md`).
- **Cape Finisterre.** The action lay at about 43°20′–43°55′ N, 11°15′–12°00′ W, some 95–130 nm WNW of the cape; Calder's official return is 41 killed and 158 wounded (`v-h1c.md`, H1-26, H1-27a).
- **James's dates.** Only the dates James converted from Republican documents run a day early (Toulon 29 March, Strait and Cádiz 8 April, Martinique 13 May and so on); his British dates are not shifted. The Strait was passed on 9 April by the British primary documents too (`v-h1a.md`, H1-02b, H1-05).
- **Ulm.** The source the notes cite as "A&C" reads 13,600 muskets (fusils) on the page image, not 43,600 (`v-h2a.md`, H2-13d).

## Adjudications (session 7)

Each "corrected", "disputed" and scene-relevant "unverifiable" verdict of the session 6 checks was ruled on afresh against the primary or period source: notes right, checker right, both partly, or genuinely disputed (then each version with who holds it), with the statement `docs/history-notes.md` should use. These are the final word on the contested points.

| Rulings | On the reports |
| --- | --- |
| `a-h1ac.md` | `v-h1a.md` and `v-h1c.md` (Toulon to the West Indies; Finisterre, Ferrol, Cádiz; waypoints) |
| `a-h1b.md` | `v-h1b.md` (Nelson's pursuit; fleet sizes) |
| `a-h2a.md` | `v-h2a.md` (Boulogne, the turn east, Ulm) |
| `a-h2b.md` | `v-h2b.md` (Nelson off Cádiz, British strength, the station and the chain) |
| `a-h2c.md` | `v-h2c.md` (orders, Rosily, the sortie, fleet sizes at Cádiz, positions for glyphs) |
| `a-h3.md` | `v-h3a.md` and `v-h3b.md` (signals by day and by night, the relay of 19 October) |

`draft-h3.md` is a drafter's version of the signals part of the "Scene 2" section of `docs/history-notes.md`, written from `h3`, its checks and `a-h3.md`; it has not been reviewed or merged. The drafts for `h1` and `h2` were being written when session 7 stopped and do not exist.

## The 1805 names (session 7)

- `h4-names.md`: the English forms a chart of about 1805 would letter (oceans and seas, capes, ports, islands, lands, rivers, ranges), from English charts, atlases and pilot books of 1795–1810, with a final table and the lettering conventions.
- `v-h4.md`: its independent check. **The adjudication of the names it contests did not run**, so the gazetteer (`src/scenes/02-road/gazetteer.ts`) still letters the provisional forms.

## Chart style (sessions 6 and 7)

- `t4-chart-style.md` (session 6): what sea charts of about 1785–1810 looked like (waterlining, coasts, depths, relief, rivers, town marks, lettering, tracks, paper and colour), as directives for the renderer, with links to chart pages.
- `v-t4.md` (session 7): an independent expert check against other plates and engravers (the Ordnance Survey's Kent and Devon maps of 1801–1809, Arrowsmith and Hall 1817, Thomson and Wyld, Faden 1807, López, the SDUK), with measured profiles.
- `a-t4.md` (session 7): rulings on what the check contested, and the settled directives for the renderer, most important first. The engine follows them as `docs/decisions.md` ("Scene 2, Stage A") records, and says there which it does not yet follow.

## Technical (sessions 4 and 5)

- `t1-three-r186.md`: three.js r186 for the WebGL 2 chart, checked against the installed source (renderer, colour, textures, render targets, warm-up, `renderer.info`, context loss, instancing, lines, depth, packaging, headless testing).
- `t2-troika.md`: troika-three-text 0.52.5 with three r186 (fonts and same-origin safety, BatchedText, materials, layout, orientation, readiness, compatibility).
- `t3-gsap-skills.md`: the GreenSock agent skills (ScrollTrigger, React, performance) as they apply here.

## How to use them

Read a note together with its fact-check reports and their adjudication. A "confirmed" verdict can be used as it stands; for a "corrected" or "disputed" one the adjudication's final statement is what goes into `docs/history-notes.md`, where every remaining disagreement is written down with who holds each version. When the session 7 files were copied here, every quotation of 26 words or more was cut to its opening phrase (six of them); downloaded page crops and texts stayed outside the repository.
