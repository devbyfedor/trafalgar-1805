# A-T4: adjudication of the contested chart-style directives (t4 against v-t4)

Written 29 October 2026. Inputs: `docs/research/scene-02/t4-chart-style.md` (the original directives, "t4") and the independent check `scratchpad/research/v-t4.md` ("the checker"). For each contested point I looked at the period images myself: my own IIIF crops from the David Rumsey Map Collection and the Huntington Library, plus Mapco's scan of the Kent map. All crops are under `scratchpad/dl/adj-t4-*`. I measured line profiles with my own grey-value scan (`scratchpad/scripts/adjt4-prof.js`; each local minimum counts as one engraved line) and tone with a coverage scan (`adjt4-tone.js`; coverage = 1 − grey/paper, averaged over tenths of the band).

Where I give mm values, they rest on the checker's OS calibration (≈0.043 mm per pixel). Ratios, line counts and coverage don't depend on it.

## Summary

- **Waterlining is period English engraving, not an 1817 novelty.** An early, pre-canal state of the Ordnance Survey's Kent map (published 1801) already shows concentric waterlining, and the Devon map of 1809 shows it in full. Putting it on a *sea chart* remains licence.
- **There are two profiles, and the renderer should sit between them.** Hall's (1817) is light and even: spacing about ×2 and tone falling almost linearly. The Ordnance Survey's (1801–09) is heavy and front-loaded: a dense rim, spacing up to ×4, tone collapsing by mid-band, the outer hairlines broken into dashes. The on-screen target is ×2–3 smooth growth with tone ≈ (1 − d/R)^1.5.
- **Specks get the full halo on every concentric plate I saw.** The horizontal-ruling maps and sea charts give them a small patch or nothing. Hall's Africa, at a scale close to the scene's Atlantic view, merges the Canaries, Madeira and the Cape Verdes into envelopes. So the longer reach should cure most of the "targets" by itself. Only truly isolated specks (Bermuda) may need a reduced, soft halo.
- **The other disputes are mostly two period conventions side by side.** The engine's own constraints settle them:
  - town names go inland, because place names are inked dark on paper;
  - capitals get a ring with a dot;
  - island groups are set in roman capitals, because the brief sets places in roman;
  - main rivers run to their sources, because the land is atlas-styled.

## Rulings

| Id | Point | Ruling | Confidence |
|---|---|---|---|
| 1.0b | When concentric waterlining appears | checker right | high (1809); medium-high (early Kent state) |
| 1.0c | Hall's profile as "the" period profile | both partly | high |
| 1.1 | Spacing growth ×2 and how to build it | both partly | high (range); medium (implementation) |
| 1.4 | Halos round specks | both partly | high (traditions); medium (fallback numbers) |
| 3.3 | 100 fm as the last line; 200 fm | both partly | medium-high |
| 4.2 | Coastal profiles "in the margins" | original right (wording refined) | high for Tofiño |
| 4.4 | Hachures instead of or over shading | both partly | medium-high |
| 5.4 | River names in spaced capitals | checker right | high |
| 5.5 | Rivers truncated on the overview | checker right | high (conventions); medium (border cure) |
| 6.1 | Town ring; coastal names inland | both partly | high (evidence); the choice is a rendering decision |
| 6.2 | Capitals as Faden's building pictogram | both partly | high |
| 7.3 | Island groups in italic capitals on an arc | both partly | high |
| 9.4 | Sea is blank paper on every chart | both partly | high (the wash may belong to one copy) |
| 10.5 | Current arrows only in close-ups | checker right | high |

### 1.0b: when concentric waterlining appears (checker right)

**Ordnance Survey, Devon, published 11 October 1809 (state 1).**
- Flat Holm, Steep Holm and the single rock "The Wolves" each carry a full concentric halo.
- The rock's halo is as large as Flat Holm's, and the two meet in a seam.
- Each halo is closed by a dotted line.

**Ordnance Survey, Kent (published 1 January 1801), two states compared.**
- Mapco's scan of the map has no Royal Military Canal at West Hythe or behind Dymchurch. The canal was begun in late 1804 and is drawn on later states. Yet the scan already shows concentric waterlining off Romney Marsh and Dymchurch: a dark rim against the shore, the spacing widening outward, the lines fading.
- The Rumsey copy shows the canal as a broad, kinked band past Hythe, with towers along the shore, and the same waterlining.
- So the lines were on the plate before the canal was added, which dates them between 1801 and about 1805–09, and probably to 1801 itself. I did not identify the Mapco copy's Margary or Burgess state.
- A University of Michigan record (blocked to me; seen only as a search snippet) also describes an early Margary state without the canal.

**Conclusion.** Concentric waterlining was current in English engraving at the time of the campaign. The licence lies only in carrying a survey and atlas convention onto a sea chart: none of the sea charts of 1780–1814 checked by t4 or by the checker uses it, and that part of t4 stands.

Sources:
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~254826~5519507
- https://mapco.net/kent1801/kent1801.htm (sections https://mapco.net/kent1801/kent58_02.htm and https://mapco.net/kent1801/kent58_03.htm)
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~253703~5519088
- https://quod.lib.umich.edu/c/clark1ic/x-005286202/39015060933671

### 1.0c: Hall's profile as "the" period profile (both partly)

**Hall, *Spain and Portugal* and *Africa* (both 1817): t4's numbers hold on my own scans.**

| Halo | Lines | Gap near the island → at the edge | Growth |
|---|---|---|---|
| El Alboran, westward | ≈33 | 5.5–6 px → 11–13 px | ×2 |
| Columbretes | 27–35 | 4–5 px → 8–9 px | ×2 |

- Darkness falls slowly. The lines stay dark through about three quarters of the band.
- Tone (coverage) on El Alboran by tenths of the band: 0.37, 0.33, 0.27, 0.26, 0.21, 0.18, 0.15, 0.09, 0.09, 0.06.
- Tone on St Helena by tenths: 0.34, 0.24, 0.24, 0.18, 0.18, 0.10, 0.13, 0.13, 0.06, 0.04.
- In other words, Hall's tone falls almost linearly from about 0.35 at the rim.
- St Helena is a ≈40-ring bull's-eye with strongly hand-wobbled lines. At one third of full size it reads as a grey disc with a darker core.

**Ordnance Survey, Devon (1809): the checker's profile also holds on my scans.**

| Halo | Lines | Gap near the island → at the edge | Growth | Grey near → outer quarter |
|---|---|---|---|---|
| The Wolves, westward | 43–44 | 5–6 px → 21–26 px | ≈×4 | 57–82 → ≈150 (paper 229) |
| Steep Holm, southward | 45–46 | 5–6 px → 21–27 px | ≈×4 | 22–75 → 147–162 (paper 234) |

- The first ≈15 lines (≈17% of the reach) are almost evenly spaced. After that the gaps widen roughly linearly with distance.
- Tone by tenths: 0.44–0.53, 0.32, 0.21–0.23, 0.14, 0.10, 0.09–0.12, 0.08–0.10, 0.06–0.08, 0.05–0.06, 0.03.
- So the tone collapses by mid-band and leaves a faint tail.
- The outer hairlines break into dashes, and a dotted line closes the band.
- The reach is ≈24 mm with the checker's calibration.

**Conclusion.** t4 described Hall correctly, but Hall is one end of the period range. The range is ×2 (Hall) to ×4 (Ordnance Survey), always smooth line by line, never stepped.

Sources:
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~222248~5505877
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~222290~5505899
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~254826~5519507

### 1.1: spacing growth ×2 and how to build it (both partly)

**What both sides agree.** The abrupt step must go. That includes the uncommitted work's 12 lines at spacing s followed by lines at 2s.

**Growth target.** On screen, aim for ×2–3 at the reach R.
- t4's ×2 is Hall's taste and lies inside the period range.
- The checker's ×2–3 leans toward the Ordnance Survey.
- A full ×4 on screen would leave too few, too widely spaced outer rings, which is the target look.

**Implementation.**
- t4's warp u = R·ln(1 + d/R)/s gives true line-by-line growth, but its line sets are not nested across zoom octaves. The set at 2s comes out as twice the set at s, not a subset of it, so lines would double during each octave crossfade.
- Keep world-fixed multiples of s and thin them by rank. The checker's version is a rank by bit level: odd lines fade over the middle third of the band, lines at 2 mod 4 over the outer third.
- A smoother generalisation exists. Give line k the rank vdc(k), its index bit-reversed as a binary fraction. Draw it with a soft threshold where its rank falls below the target density ρ = s / s_target(d).
  - Because vdc(2j) = vdc(j)/2, the rule is identical in every octave.
  - At the octave boundary the visible set equals the next octave's set exactly, so no crossfade is needed at all.
  - Lines switch off in an evenly spread order, never move, and the mean spacing at the coast stays equal to the base spacing s0.
- Hash the spacing jitter by each line's world distance, so it hides any residual rhythm.

### 1.4: halos round specks (both partly)

**What both sides agree.** Keep the halos, and fix the profile first.

**The two traditions.**
- On every concentric plate seen, a speck gets the full band:
  - Ordnance Survey 1809: The Wolves;
  - Hall 1817: El Alboran, the Columbretes, St Helena, St Matthew and Ascension.
- The horizontal-ruling and sea-chart traditions give a speck little or nothing:
  - Hall's *West Indies*: a small soft patch round the rock Vela, about a third of a coast band's extent; the Lesser Antilles share one band;
  - Thomson/Wyld: the Columbretes are only a dotted ring round the islets;
  - Faden 1807: no halo on Alboran or the Columbretes.
- So scaling the reach down borrows from the ruling tradition, as the checker says. t4's Vela citation crosses traditions.

**What decides it for the scene.** Hall's *Africa* is drawn at about 1:50,000,000, close to the scene's Atlantic view. On it:
- Madeira, Porto Santo, the Desertas and the Canaries merge with the African coast band;
- the Cape Verdes share one envelope, with V-shaped cusps between the islands.

**Directive.** The longer reach (≈56–64 CSS px) should itself turn the Azores, Madeira and the Canaries, the Cape Verdes, the Lesser Antilles, and the Channel Islands with the Cotentin into group envelopes. If a truly isolated speck (Bermuda, or Flores–Corvo at some zooms) still reads as a target:
- reduce its reach to 50–60% of R, never below 40%;
- keep its strength at about 0.5–0.7.

That gives a small soft cloud. Full-size faint rings, which is what the uncommitted work's strength of 0.18 at full reach produces, keep the target's geometry.

Sources:
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~254826~5519507
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~222248~5505877
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~222290~5505899
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~222304~5505906
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~225810~5506491
- https://hdl.huntington.org/digital/collection/p15150coll4/id/10207

### 3.3: 100 fathoms as the last line, and 200 fathoms (both partly)

**What both sides agree.** 100 fm is the last real line, and deep water stays blank.

**Faden 1807.**
- The Great Bank of Newfoundland, Green Bank, Whale Bank and Flemish Cap are each drawn as a stippled edge over a faint tint.
  - The dots are densest at the outline and thin inward over ≈1.5–2.5 mm.
  - Soundings inside run 24–94; just outside they run 75–160.
  - So the edge sits at about 100 fathoms.
- In the Western Approaches no line is drawn at all. The soundings (to 90–147) simply stop at blank sea, and small banks appear as stippled ovals.

**Directive.**
- Draw 100 fm as Faden's stippled edge, with the dots on the shallow side. This is the checker's addition.
- Keep 200 fm only at paper-grain strength: dotted and unlabelled. It belongs to the approved look, and both reports allow this. Drop it if it competes.

Source: https://hdl.huntington.org/digital/collection/p15150coll4/id/10207

### 4.2: coastal profiles "in the margins" (original right, wording refined)

Tofiño's 1786 chart has engraved views of high land, each with an italic title:
- Monchique, set horizontally above the Algarve coast;
- Medina, the Sierra de Ubrique and the Sierra de Ronda's "Cabeza del Moro", set on end.

They stand in the sheet's blank inland space near the land they show, rather than strictly in the margins. They suit an HTML caption ornament, not the 3D chart, whose relief already does this job. t4's other sources for this (F, J, H) were not re-checked.

Source: https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~320203~90089259

### 4.4: hachures instead of, or over, shading (both partly)

**Hachures are the period's relief.**
- The Ordnance Survey sheets of 1801–09 are entirely hachured.
- Cary 1801, Hall 1817 and Thomson/Wyld 1824 hachure whole mountain chains.
- Tofiño hachures the coastal strip.

But replacing the approved low-sun shading would be a redo.

**Directive.**
- Keep the shading and the cast shadows.
- At most, add a faint downslope stroke texture on steep shaded slopes at close range. This is t4's "on top of" option in the checker's reduced form.
- Keep the land contours as the faintest land line.
  - Contours appear on no general map that either of us examined.
  - A learned precedent did exist: du Carla's proposal and Dupain-Triel's map of France, which different sources date to 1784 or to 1791 (Konvitz, *Cartography in France 1660–1848*, pp. 76–80, as cited by the dealer).
  - So the contours share the status of Buache's isobaths: a scholarly device of the period, not common practice.

Sources:
- https://luna.lunacommons.org/luna/servlet/detail/RUMSEY~8~1~36751~1200092
- https://rarecharts.com/ShowDetail/Creator/Dupain-Triel--Jean-Louis/Title/Antique-thematic-map-of-French-rivers-and-canals/835

### 5.4: river names in spaced capitals (checker right)

The norm is italic upper and lower case along the river, usually with "R." before or after the name:
- Cary 1801: "R. Tajo", "Guadarama R.", "Alberche R.";
- Faden 1807: "Tagus", "Guadalquiver";
- Hall 1817: "R. Tagus", "Elga R.", "R. Zezere";
- Thomson/Wyld 1824: "R. Tietar", "R. Guadalaviar".

Spaced capitals are La Rochette's habit (t4's chart G), and López sets "Rio Ebro" in roman.

Sources:
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~21513~640006
- https://hdl.huntington.org/digital/collection/p15150coll4/id/10207
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~222248~5505877
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~225810~5506491

### 5.5: rivers truncated on the overview (checker right)

- Faden 1807, a sea chart, truncates its rivers: the Tagus and the Guadalquivir are short stubs.
- Every atlas map I examined carries rivers to their sources, with tributaries as finer lines and a constant small meander: Cary 1801, Hall 1817, Thomson/Wyld 1824 and López.
- The scene's land is atlas-styled, so carry the main rivers to their sources as tapering hairlines and drop the minor ones. t4's selection of main rivers stays.
- Taper, meander and tributary twigs are what keep a river from reading as a border.

Sources: Cary, Hall and Thomson/Wyld at the links above; López sheet B, https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~292235~90067073

### 6.1: town ring, and which side of the coast the names go (both partly)

**The open ring at the site** is confirmed on every map, and port rings sit on the coastline.

**Coastal names: both placements are period.**

| Source | Coastal towns | Capes and coastal features |
|---|---|---|
| Faden 1807 | inland, perpendicular to the coast where it is crowded (Ribadeo to S. Sebastian, Trafalgar to Almeria, the Algerian coast) | seaward |
| Hall 1817 | inland | seaward |
| Thomson/Wyld 1824 | seaward (the Valencia towns) | seaward |
| SDUK 1836 (per v-t4, not re-viewed) | seaward | — |
| López | inland | coastal works (towers, forts, capes, ports) seaward |

**For this engine, inland.** `Lettering.ts` inks place names dark (they read on the bone paper) and water names pale (they read on the slate). A town name set seaward would sit dark on dark slate and fight the waterlining.

Sources:
- https://hdl.huntington.org/digital/collection/p15150coll4/id/10207
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~222248~5505877
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~225810~5506491
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~292235~90067073

### 6.2: capitals as Faden's building pictogram (both partly)

Faden 1807 does put a tiny building under "MADRID". The atlases, though, build the capital mark out of the town ring:
- Cary 1801: a small plan-like cluster of rings;
- Hall 1817: a ring with a central dot;
- Thomson/Wyld 1824: a double ring with a dot.

**Directive.**
- Use a ring with a central dot. It reads at every zoom and is already in the uncommitted `marks.ts`.
- Set the name in letter-spaced roman capitals.
- No capital appears in a close-up in this scene, so the pictogram has no place.

Sources: Faden, Cary, Hall and Thomson/Wyld at the links above.

### 7.3: island groups in italic capitals on an arc (both partly)

- Faden 1807 sets "AZORES OR WESTERN ISLES" in italic capitals on an arc.
- Roman spaced capitals, set straight or along the group's axis, appear on:
  - Hall 1817: "CANARY ISLES", "MADEIRA Is", "CAPE VERDE Ids", "BALEARIC ISLES";
  - Thomson 1817: "AZORES" above the group and "ISLES" below.
- **For the engine:** roman spaced capitals. The brief sets places in roman, and most of the period maps agree. Set them along the group's long axis or on a gentle arc.

Sources:
- https://hdl.huntington.org/digital/collection/p15150coll4/id/10207
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~222290~5505899
- https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~28376~1120805

### 9.4: is the sea blank paper on every chart? (both partly)

- Sea charts leave the sea as paper, so t4's claim stands.
- An atlas colourist could wash the whole sea. On the Rumsey copy of Thomson's 1817 North Atlantic, the sea samples at about (200, 188, 150), against land at (233, 213, 160) and the page margin at (234, 225, 193). That is a greyish wash, though it may be this copy's colourist only.
- Neither point changes the renderer: the slate sea is the brief's deliberate break.

Source: https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~28376~1120805

### 10.5: current arrows only in close-ups (checker right)

Faden 1807 scatters feathered current arrows across the open ocean:
- south and east of the Great Bank;
- south of the Azores;
- west of Scilly and off Ushant.

It also writes the magnetic variation at ocean scale: "Var. 26° W" and "Var. 27°25′ W" in the Western Approaches, and "Var. 22°30′ W 1801" off Cape St Vincent. Both kinds of note suit the Atlantic view at low opacity, not only the close-ups.

Source: https://hdl.huntington.org/digital/collection/p15150coll4/id/10207

## Settled directives for the renderer (most important first)

All of these sit within the approved look.

### 1. Waterlining: count, reach and spacing

**Spacing and reach.**
- Base spacing at the coast s0 = 2.0–2.4 CSS px, at least 3 device px at DPR 1.5. Prefer 2.4 if lines are thinned by rank.
- Reach R ≈ 26–30 spacings, ≈ 56–64 CSS px, kept constant on screen. That is 4.5–5% of a 1280 px viewport, matching Hall's 4–5% of the plate width.
- Visible lines: 16–24.

**Growth.**
- The first 4–6 lines at s0, forming a dense rim (Ordnance Survey).
- After the rim, the spacing grows smoothly to 2–3 × s0 at R, i.e. target spacing s0·(1 + κ·d/R) with κ = 1–2.
- No abrupt step.

**Build.**
- Keep world-fixed multiples of the octave spacing.
- Thin them by rank: either the checker's version (odd lines fade over the middle third, lines at 2 mod 4 over the outer third) or the bit-reversed rank threshold described under 1.1, which needs no octave crossfade.
- Not the analytic warp: its sets are not nested across octaves.

Confidence: high (range), medium (build).

### 2. Waterlining: tone

**Coverage.**
- Mean pale-ink coverage (line area × opacity, averaged over one spacing) of 0.25–0.35 at the coast. Cap it at 0.35–0.40, so the rim reads as lighter shallow water rather than a glow.
- About 60% of that at 0.25 R, about 35% at 0.5 R, about 10% at 0.8 R, and 0 at R. That is ≈ (1 − d/R)^1.5.
- For comparison: the Ordnance Survey measures 0.44–0.53 → 0.10 at 0.45 R → 0.03; Hall measures ≈0.35, falling linearly to 0.05.

**Rim and ending.**
- The first 4–6 lines are 1.5–2× heavier, so they merge into a rim.
- Nothing is drawn beyond R.
- No closing ring at overview scale. An Ordnance Survey-style dotted closing line is optional at close range only.

Confidence: high.

### 3. Waterlining: hand

- Per-line weight jitter of ±20% and spacing jitter of ±10%, hashed by each line's world distance so they hold across octaves.
- A low-frequency wobble of 0.2–0.3 spacing, with a wavelength of 10–30 spacings.
- The faintest outer third broken into dashes, with 30–50% dropout.
- Inner lines follow every crinkle of the shore; outer lines are smooth curves.
- Lines meet in sharp V cusps between neighbours.
- Lines close across river mouths and never enter rivers.
- Labels lie over the lines with no knock-out; at most lower the line opacity by about 20% under text.

Confidence: medium-high.

### 4. Island halos

- Every island keeps a full-reach halo. The union distance field merges neighbours into one envelope with cusps.
- At R ≈ 60 px, these should become group envelopes, as on Hall's *Africa* and *West Indies*: the Azores, Madeira with the Canaries (joining the African band), the Cape Verdes, the Lesser Antilles, and the Channel Islands with the Cotentin.
- Judge the result at the Atlantic key frame (p = 0.62) after directives 1–3.
- Only if an isolated speck (inscribed radius below R/3 and no other land within about 2R, such as Bermuda) still reads as a target:
  - reduce its reach to 50–60% of R, never below 40%;
  - set its strength to 0.5–0.7, giving a small soft cloud;
  - do not leave full-size faint rings at 0.18 strength, which keep the target's geometry.

Confidence: high (traditions), medium (fallback numbers).

### 5. Town marks

**The ring.**
- An open ring about the place lettering's x-height across (outer radius ≈ 0.22 em for Baskervville).
- Stroke about the stem weight.
- Placed exactly on the site. Port rings sit on the coastline.

**Names.**
- To the right of the ring, centred on it.
- On crowded coasts, coastal towns run inland, perpendicular to the coast like the teeth of a comb (Faden, Hall), in dark ink.
- Capes and coastal features go seaward in pale italic.

**Capitals.** Madrid, Lisbon, Paris, London and Vienna: a ring with a central dot, the name in letter-spaced roman capitals, about 1.4 against 1.2 for ports.

**Cádiz.**
- The ring on the town at the tip of the isthmus.
- In the Gulf close-up: an anchor about 1.5 × x-height at the combined fleet's anchorage, and a small bastioned plan of the town.

Confidence: high.

### 6. Rivers

**Selection and length.** Main rivers run to their sources: Tagus, Douro, Guadiana, Guadalquivir, Ebro, Garonne, Loire, Seine, Rhône, Rhine and Danube. Drop the minor rivers.

**Line.**
- Width tapers with upstream length, from ≈0.4–0.5 CSS px at the source to 1.5–2 CSS px at the mouth.
- A hand meander of constant screen amplitude, ≈0.5–1 CSS px (the period's 0.2–0.5 mm on paper).
- The main rivers' first tributaries as finer twigs, where the scale allows.
- Double lines at true width below the tidal limit: the Tagus estuary, the Guadalquivir below Seville, the Gironde, the Loire and Seine estuaries.
- Every river ends in a point.

**Names.** Small italic upper and lower case along the river ("R. Tagus"), in dark ink.

Confidence: high (conventions), medium (that this cures the border look).

### 7. Isobaths

**10, 20 and 50 fm.** Fine dotted, or very fine continuous, pale lines of equal weight. Remove the extra weight on the 100-fm line.

**100 fm.** The last line, drawn as Faden's stippled bank edge: fine pale dots in a band ≈2–4 CSS px wide on the shallow side, densest at the line and thinning inward.

**200 fm.** Only at paper-grain strength (≤ ⅓ of the others), dotted and unlabelled. Drop it if it competes.

**Beyond that.**
- Deep water stays blank.
- No labels, except at most one small italic label between two lines in close-ups.
- Isobaths give way to the waterlining near the coast.

Confidence: medium-high.

### 8. Coast details

**On the coast.**
- Hairline coast of 1–1.5 CSS px in brown-black ink, as now.
- A land-side fringe 2–4 CSS px wide: stipple where the coast is low, short downslope strokes at cliffs, steepness taken from the height field.
- A soft, lighter shallow-water band on the sea side (the brief's lighter shallows; Faden's wash is 1–1.5 mm, López's 8–11 mm).

**In close-ups.**
- A dotted line just offshore (Trafalgar to Tarifa).
- Shoals as dotted outlines with soundings inside, "+" for sunken rocks and "✲" for rocks awash: the Aceitera, the Laja de Conil and the Placer de Arena off Cape Trafalgar.

**Battle marks.** Flat crossed swords or guns, with the date above and the commanders below in small italic: Finisterre on 22 July 1805, and Trafalgar.

Confidence: high.

### 9. Lettering

**Size hierarchy.** About 6.5 : 2.8 : 1.4 : 1.2 : 1, for oceans : countries : capitals : ports and islands : minor names, notes and day numerals (Faden 1807, consistent with Thomson 1817).

**Oceans.** Bodoni Moda spaced roman capitals.
- Letter pitch ≈ 5–5.5 cap heights. In troika that is letterSpacing ≈ 2.7–3 em; derive the exact value from the font's cap height and advances.
- "ATLANTIC / OR / WESTERN OCEAN", spanning a quarter to a third of the view.

**Countries.** Spaced roman capitals with a pitch of ≈ 2–3 cap heights (letterSpacing ≈ 0.6–1 em), curving along the coast.

**Other names.**
- Island groups: roman spaced capitals along the group's axis.
- Bays and straits: follow the shape.
- Capes: seaward, in italic.
- River names: italic.

**Orientation.**
- North-up, except names set perpendicular to the coast and names that follow a curve.
- Nothing upside down.
- No halos and no shadows.

Confidence: high.

### 10. Routes

**Nelson.**
- A dotted ink hairline under a thin, translucent carmine line 1.5–2.5 CSS px wide, slightly uneven like a hand wash.
- Small open day circles (about the size of a lowercase o) at the noon positions.
- Day-of-month numerals off the line: outside each bend, and on one consistent side along straight runs. On Faden's Azores leg, 3, 4, 6, 7, 8 and 10 sit below the line; 5 and 9 sit above, at its crests.
- The month written only at its start or at key points.
- A short italic legend along the line.

**The combined fleet.** Told apart by line pattern first (plain dotted or dash-dot ink, as on Thomson 1817), with any wash colour second.

**Drawing.** The drawing head stops at a day circle. No glow.

Confidence: high.

### 11. Optional quiet furniture

On the Atlantic view, all at low opacity:
- Faden's 32-ray line rose;
- faint rhumb rays from one or two hubs, 0.5–1 CSS px;
- a 5° graticule;
- the Tropic of Cancer, dash-dot (Faden) or dashed (Thomson), with letter-spaced lettering;
- feathered current arrows in the open sea;
- small italic variation notes beside the track ("Var. 26° W").

Elsewhere:
- Coastal views (Tofiño's Monchique, the Sierra de Ronda) belong only in HTML caption ornaments.
- Relief stays as approved; at most a faint downslope stroke texture at close range.

Confidence: medium.

## Doubts

- **The Mapco copy's exact state.** Its date rests on the absence of the Royal Military Canal; I did not identify its Margary or Burgess state.
- **Copy-specific evidence.** The Thomson 1817 sea wash may belong to one colourist.
- **Not re-viewed by me.** SDUK 1836, and t4's charts F, J and H for 4.2.
- **The first land contour map.** Sources disagree between 1784 and 1791, and one dealer says the 1791 map itself shows no contours. I did not see the map.
- **The bit-reversed thinning (1.1).** It is my own construction for nesting across octaves. Test it at DPR 1.5 for moiré: mid-octave gaps can locally fall to ≈0.75 s0.
