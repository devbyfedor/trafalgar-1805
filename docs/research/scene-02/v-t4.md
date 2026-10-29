# V-T4: independent check of `t4-chart-style.md` (sections 1 to 10)

Checked 29 October 2026 against period maps and charts I looked at myself (IIIF crops from the David Rumsey Map Collection and the Huntington Library), with line profiles measured by a grey-value scan across the engraving (each local minimum is one engraved line). Pixel-to-millimetre values are approximate (±10%); the ratios (spacing growth, line count, darkness) do not depend on them.

**The short answer.** Most of t4 holds. Four things change:

1. **Concentric waterlining existed in English engraving from 1801.** The Ordnance Survey's Kent map (published by Faden, 1 January 1801) and the Devon map (11 October 1809, state 1) show it, with full halos round islets and even a single rock ("The Wolves"). t4's 1817 start date is too late. On a sea chart the waterlining is still licence; in English engraving of 1805 it is not.
2. **Hall's ×2 spacing growth is one engraver's taste, not the period rule.** The OS bands (1801–1809) have 40–50 lines with spacing growing ×3–4, strong fading and a dotted line bounding the band. The authentic range is ×2–4, always smooth and never stepped.
3. **Targets round specks are authentic.** OS 1809 and Hall 1817 give rocks and specks (The Wolves, El Alboran, the Columbretes) halos as wide as a mainland coast's band. Hall's El Alboran is literally a bull's-eye of about 30 rings. On paper it reads as tone only because the lines are many, dense near the rock and grade from heavy to hairline. Thomson/Wyld 1824 and Faden 1807 give specks no halo at all, so the traditions differ (verdict: disputed). Fix the profile first.
4. **Several of t4's directives are one tradition's habit:**
   - capitals: Faden's pictogram against Hall's ⊙ and Thomson's double ring;
   - coastal names: inland on Faden, seaward on López, SDUK and Thomson;
   - island-group names: italic on Faden, roman on Hall, Thomson and SDUK;
   - river names: italic lower-case is the norm, spaced capitals the exception;
   - rivers on the overview: atlas maps carry the main rivers to their sources; only sea charts truncate them.

## Verdict table

| Id | t4 directive (short) | Verdict | Better directive / competing versions | Evidence |
|---|---|---|---|---|
| 1.0a | Navigational sea charts of 1780–1814 use no waterlining | confirmed | — | Faden 1807 (a); López 1804/1810 (h, a land map with blank sea and a wash band); Thomson 1817 N. Atlantic (i); SDUK 1836 (g) |
| 1.0b | Concentric waterlining appears in 1817 (Hall); in an 1805 chart it is licence | corrected | It is in English engraving by 1801–1809: the OS Kent map (pub. 1 Jan 1801; the Rumsey copy is a later state, c. 1809) and the OS Devon map (pub. 11 Oct 1809, Margary state 1) carry full concentric waterlining. Licence only in the sense of borrowing a survey and atlas convention into a sea chart | b, c |
| 1.0c | Hall's measured profile: ≈40 lines, spacing ×2, fading, reach 10–12 mm | corrected (range) | Hall is confirmed: El Alboran ≈30 lines at 4 → 8–9 px; Columbretes 29–30 lines at 4.5 → 8 px. But the OS 1801–1809 bands have 40–50 lines, spacing ≈0.25 → 1.0 mm (**×3–4**), darkness 25–45 → 140–200 (paper ≈230), reach ≈21–27 mm on a 1:63,360 sheet, closed by a dotted line. The period range is ×2–4, smooth | b, c, d |
| 1.1 | Bound the spacing growth to ×2 at R; replace the octave doubling | corrected | Bound it to **×2–3** across the band, and make it **smooth** (OS ×3–4, Hall ×2). Keep the nested, world-fixed line sets; get the smooth growth by fading out alternate lines with distance instead of an abrupt octave step (see renderer change 1) | b, c, d |
| 1.2 | Fade by strength; inner lines heavier; nothing beyond R | confirmed | Two endings occur: OS closes the band with a **dotted line** one spacing beyond the last line; Hall lets the last line fade. Both stop dead at R | b, c, d |
| 1.3 | On screen: 16–24 lines, 2 → 4–6 CSS px spacing, reach 4–6% of viewport width, kept constant on screen | confirmed | The reach as a share of the plate matches the period: OS ≈3% of the sheet width, Hall ≈4–5% | c, d |
| 1.4 | Small islands keep halos; optionally scale the reach down for specks (≥ 40% of R) | disputed | **Concentric tradition: full reach for every speck.** OS 1809 gives the rock "The Wolves" a halo as large as Flat Holm's, and Hall 1817 gives El Alboran and the Columbretes the mainland band's width. **Horizontal ruling and sea charts: little or none.** Thomson/Wyld 1824 gives the Columbretes no halo, only a dotted ring round the islets; Hall's West Indies gives Vela a small patch [t4 O]; Faden 1807 gives no halo to Alboran or the Columbretes. Fix the profile first; scale the reach only if the owner still sees targets | c, d, e, a |
| 1.5 | Break the perfect circles (weight and spacing jitter, low-frequency wobble; inner lines follow the shore, outer ones smooth) | confirmed | Add one OS detail: the outermost hairlines **break into dashes** where the burin lifted. This is cheap as a coverage dropout on the faintest lines | b, c, d |
| 1.6 | Close islands merge into one envelope with sharp V cusps | confirmed | — | c (The Wolves and Flat Holm seam), d (El Alboran and the Almería band; Balearics) |
| 1.7 | Straits and bays fill completely; midline seam; cusps before bays | confirmed | Bay cusps are also seen on Hall's Almería coast; I did not cross-check a strait seam on a second engraver | d, [t4 M] |
| 1.8 | Sea lines close across river mouths; estuaries get their own lines; no waterlines in rivers | confirmed | OS Kent: a creek crosses the waterlined Maplin flats with no lines inside it. Thomson 1824's ruling stops at the coast | b, e, [t4 M] |
| 1.9 | Labels lie over the waterlines with no knock-out | confirmed | Hall's "Columbretes" and capes, OS "Castle Rock" and "Flat Holmes", Thomson's "C. Nono" all sit over lines or ruling | c, d, e |
| 2.1 | Hairline coast, near-black brown | confirmed | — | a, b, d, g |
| 2.2 | Land-side shore band: cliff hachures, stippled beaches, rock beads | confirmed | OS Kent: the Dover cliffs and Dungeness shingle stipple. OS Devon: the Holms ringed by cliff hachures. SDUK: hachure fringe on island coasts | b, c, g |
| 2.3 | Hand-colour bands; a blue-green sea-side wash | confirmed | Spanish usage is wider: López's sea-side blue-green wash is ≈8–11 mm wide and fades outward (Faden's is 1–1.5 mm). This is good support for the brief's "shallow water slightly lighter" as a broad, soft band | h, a, g |
| 2.4 | A single dotted line close inshore | confirmed | López: a dotted line just offshore round the Ebro delta and the Alfaques | h, [t4 F] |
| 2.5 | Shoals as dotted outlines with soundings; "+" rocks; italic "doubtful" notes | confirmed | Outlines vary: Faden stipples the edge of the Great Bank; Thomson 1817 draws dotted shoal ovals with one sounding inside; OS Kent draws Thames banks with solid hairlines | a, i, b |
| 3.1 | Soundings, not contours, on every chart | confirmed | — | a, b, i |
| 3.2 | Units: braza 1.672 m, fathom 1.829 m, brasse 1.624 m | confirmed | From standard metrology; I did not re-read the charts | — |
| 3.3 | 100 fathoms the last isobath; 200 only as the faintest dotted line | corrected | The one period depth line is the **edge of a bank or of soundings**: Faden's Great Bank of Newfoundland, a stippled edge fading inward, with soundings to ≈90 fathoms inside. Draw 100 fm as that stippled edge, the most period-like line. Drop 200 fm, or leave it as faint as paper grain | a, i |
| 3.4 | Isobaths are an anachronism; if kept, Buache-like (fine, dotted, equal weight, labelled sparingly) | confirmed | None on any map checked from 1801 to 1836. Precedents: Bruinsz 1584 (Robinson 1971); general use only after about 1850. The engine's heavier 100-fm line is an index contour and should lose its extra weight | a, b, c, i, Robinson |
| 4.1 | Sea charts show relief only in a narrow coastal strip, by hachures | confirmed | — | a, [t4 C, D, F] |
| 4.2 | Mountains seen from sea as coastal profiles in the margins | unverifiable | Not re-checked | [t4] |
| 4.3 | Atlas maps hachure whole mountain chains | confirmed | Hall 1817, Thomson 1824, and the OS Kent and Devon sheets (entirely hachured). López uses molehill pictograms, an older style | b, c, d, e, h |
| 4.4 | Render slope as downslope hachure strokes instead of, or over, Lambert shading; contours fainter | disputed | Authentic, since OS 1801–1809 is pure hachure, but it would **replace** the approved shading. Within the approved look: keep the shading and at most add a faint downslope stroke texture on steep shaded slopes at close range. Land contours appear on no map checked; keep them the faintest land line | b, c, d, e |
| 5.1 | Sea charts truncate rivers a short way inland | confirmed | Faden 1807: the Tagus a short wiggly stub, the Guadalquivir a stub with its name along it | a |
| 5.2 | Taper (hairline → ≈0.15 mm), double-lined below the tidal limit, twig ends | confirmed | López: Ebro double-lined at the delta; OS Kent: the Thames; Hall and Thomson: tapering trees | h, b, d, e |
| 5.3 | Hand wiggle of constant paper amplitude, not smooth splines | confirmed | — | d, e, a |
| 5.4 | River names in small spaced capitals or "R. Tinto" | corrected | **Italic upper and lower case along the river** is the norm: Hall "R. Tagus", Thomson "Tajo" and "R. Tietar", Faden "Guadalquiver". López's "Rio Ebro" is roman. Spaced capitals are La Rochette's [t4 G] | d, e, a, h |
| 5.5 | On the overview, fade rivers beyond their lower course; main rivers only | disputed | **Sea charts truncate; atlas maps** (Hall, Thomson, López, SDUK) **carry the main rivers to their sources** as tapering hairlines. The scene's land is atlas-styled (relief across the interior, the march to Ulm along the Danube), so carry the main rivers to their sources at hairline weight and drop the minor ones. Never end a river bluntly | a, d, e, h |
| 6.1 | Town mark: small open ring at the site; name to the right; perpendicular on crowded coasts, running inland | disputed (placement) | The ring is confirmed everywhere (Hall, Thomson, SDUK, López, Faden), with port rings sitting **on** the coastline (SDUK, Thomson). Perpendicular coastal names run **inland** on Faden 1807 (and Hall, for towns) but **seaward** on SDUK 1836, López and Thomson 1824. Both are period. Pick one per coast | a, d, e, g, h |
| 6.2 | Capitals: a tiny building in elevation (Faden's Madrid) | disputed | Faden 1807: pictogram. Hall 1817: **ring with a central dot ⊙** and "MADRID" in roman capitals. Thomson 1824: **double ring with a dot**. The ⊙ is the atlas convention of the 1810s–20s and reads at every zoom; keep the pictogram, if at all, for close-ups | a, d, e |
| 6.3 | Close-ups: bastioned plans, towers, anchors at anchorages | confirmed (in part) | OS Kent draws Dover as a block plan and the Western Heights as a bastioned outline. I did not re-see anchors or tower glyphs | b, [t4 C, D, F, H, J] |
| 6.4 | Battle mark: crossed swords or guns, date above, commanders below | confirmed | Thomson 1824 has crossed swords at Talavera (1809). RMG describes the Trafalgar mark on Faden 1806 as a gun symbol labelled with the two commanders | e, RMG 540802 |
| 7.1 | Oceans: widely spaced roman capitals, open or hatched; pitch ≈5.2 cap heights (Faden) | confirmed | Thomson 1817 "W E S T E R N": hatched capitals ≈4.2 mm tall, pitch ≈5.5 cap heights | a, i |
| 7.2 | Countries: spaced roman capitals, pitch ≈2.1 cap heights, curved along coasts | confirmed | Faden "SPAIN" pitch ≈2 cap heights; Hall and Thomson "FRANCE" ≈2.5–3 | a, d, e |
| 7.3 | Island groups: spaced *italic* capitals on an arc | disputed | Faden 1807: italic, on an arc. Thomson 1817: roman spaced capitals ("AZORES" above, "ISLES" below). Hall 1817: "BALEARIC ISLES" in roman spaced capitals. SDUK 1836: roman | a, i, d, g |
| 7.4 | Bays and straits follow the shape | confirmed | — | d, a |
| 7.5 | Ports and major capes roman; minor places and capes italic; notes italic | confirmed | Italic is the default for minor names across traditions (López, SDUK, Hall). Thomson 1817 even sets the Azores islands in italic. The brief's "places roman" is a modern simplification, as t4 says | a, d, g, h, i |
| 7.6 | Hierarchy ≈6.5 : 2.8 : 1.4 : 1.2 : 1, steep at the top, flat among places | confirmed | Thomson 1817: ocean ≈4.2 mm, island names ≈1.4 mm, notes ≈1.0 mm | a, i |
| 7.7 | North-up except perpendicular and curved names; nothing upside down; no halos or shadows | confirmed | SDUK radiates names round São Miguel and keeps all of them readable | g, a, h |
| 8.1 | Track: dotted engraved hairline under a thin carmine wash line (0.3–0.5 mm) | confirmed | Seen on Faden 1807 | a |
| 8.2 | Day circles (≈ lowercase o) with day-of-month numerals; month only at its start | confirmed | The numerals **alternate sides** of the line, placed off the line and outside bends ("July 1", then 2, 3 …) | a |
| 8.3 | Small italic legend along the line | confirmed | Faden "… the West Indies 1805"; Thomson 1817 "Nelson Returning", "Track Going out" | a, i |
| 8.4 | Second track: plain black dotted line with circles | confirmed | — | a |
| 8.5 | Tell the fleets apart by wash colour **and** line pattern; the head stops at a day circle | confirmed | Thomson 1817 tells its tracks apart **by pattern alone**: dotted (Nelson), solid, dash-dot, all uncoloured | a, i |
| 9.1–9.3 | Paper cream to buff; brown-black ink; muted hand colour | confirmed | Colours indicative | a, d, e, h |
| 9.4 | Sea: blank paper on every sea chart | corrected | True for sea charts, but atlas colourists sometimes **washed the whole sea**: the Rumsey copy of Thomson's 1817 North Atlantic has a pale grey-green wash over the ocean. That is a period precedent for a tinted (pale) sea; the brief's dark slate stays a deliberate break | i |
| 10.1 | Rhumb lines from a few hubs, low opacity | confirmed | Faden 1807 has faint coloured rhumb rays from a hub west of Newfoundland, besides its line roses | a, [t4 F, G, H, I] |
| 10.2 | Faden's line rose: 32 rays, no circle, solid and dashed, small centre ring, spear-head north | confirmed | — | a |
| 10.3 | Graticule every 5° at ocean scale | confirmed | Faden's meridians ≈5° apart | a |
| 10.4 | Tropic of Cancer as a dash-dot line with spaced lettering | confirmed (variant) | Faden 1807: dash-dot. Thomson 1817: plain dashes with letter-spaced "Tropic of Cancer". Either is period | a, i |
| 10.5 | Feathered current arrows, optional in close-ups | corrected | Faden scatters feathered arrows across the **open ocean** too: usable on the Atlantic view at low opacity | a |
| 10.6 | Avoid ladder borders, cartouches, tide tables, big roses, monsters and ships | confirmed | — | — |

## Evidence: what I looked at, and where

Letters refer to the table. All crops were taken by me from the IIIF servers. Each item page opens the zoomable image.

**(a) W. Faden, *A Chart of the Atlantic or Western Ocean … Track of His Majesty's Fleet … Viscount Nelson … 1805*, London 1807** (Huntington 105:162 M). https://hdl.huntington.org/digital/collection/p15150coll4/id/10207
- *The track west of the Azores (July):* a dotted engraved hairline under a thin carmine line. Small open circles at noon positions; day numerals on alternating sides; "July 1" at the month's start; a plain dotted black second track with circles.
- *The Azores:*
  - narrow blue-green wash halos;
  - island names in roman, "Angra" in italic;
  - "AZORES OR WESTERN ISLES" in italic capitals on an arc;
  - "+ Vigia doubtful".
- *Newfoundland:* the Great Bank as a stippled edge band with soundings inside (to ≈90); faint coloured rhumb rays from a hub; a line rose with a spear-head north; feathered arrows in the open sea.
- *South-west Iberia:*
  - names perpendicular to the coast, set inland ("Trafalgar", "Estepona", "Malaga");
  - "Cadiz" and "Gibraltar" roman;
  - the Tagus as a short wiggly stub, the Guadalquivir as a stub with an italic name;
  - Alboran and the Columbretes with no halo.
- *The Tropic of Cancer:* a dash-dot line with letter-spaced roman.

**(b) Ordnance Survey (W. Mudge), *The County of Kent, with part of the County of Essex*, published by W. Faden 1 January 1801; the Rumsey copy is a later state, c. 1809, showing the Royal Military Canal.** https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~253703~5519088
- *Off Dover:* concentric waterlining.
  - Three scans gave 38–42 lines.
  - Spacing by thirds of the band: 7.6 / 10.5 / 16.9 px and 8.1 / 11.3 / 22.2 px, i.e. ≈0.3 → ≈1.0–1.2 mm, a growth of ×3–4.
  - Darkness 25–50 at the shore → 180–200 at the edge (paper ≈220).
  - Reach ≈500–550 px (≈21–23 mm).
  - The outer hairlines break into dashes, and a dotted line closes the band.
- *The Downs:* a narrower band with the same dotted closure.
- *Thames estuary:* the Maplin flats are waterlined, and a creek crosses them with no lines inside it. Sand banks (Warp, Red Sand, Spaniard) are drawn as solid outlines with soundings; buoys are lettered "Black", "Red" and "White". No depth contours anywhere.
- *Coast and town:* Dover's cliffs as hachures; Dover as a block plan; Dungeness shingle as stipple.
- Whether the first (1801) state already carried the waterlining I did not verify.

**(c) Ordnance Survey (W. Mudge), *The Second Part of the General Survey of England and Wales … Devon*, published 11 October 1809 (composite of sheets 20–27, Margary state 1).** https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~254826~5519507
- *Bristol Channel, top right:* Flat Holm, Steep Holm and the rock "The Wolves" each wear a full concentric halo. The rock's halo is as large as Flat Holm's, and the two merge in a sharp seam. Each halo is closed by a dotted line.
- *South of Steep Holm:* 45–50 lines. Spacing by thirds 7.8 / 9.6–10.2 / 17.4–19.6 px, i.e. ≈0.25 → ≈1.0 mm (×4). Darkness 21–45 → 140–160 (paper ≈233). Reach ≈630 px ≈27 mm.
- *Scale:* calibrated by the Flat Holm–Steep Holm distance (≈4.4 km = 69 mm at 1:63,360) to ≈0.043 mm per px.
- *Line shape:* the inner lines follow every crinkle of the cliffed shore; the outer ones are smooth ovals.

**(d) A. Arrowsmith, engr. Sidney Hall, *Spain and Portugal*, 1817 (Constable, *New General Atlas*).** https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~222248~5505877
- *El Alboran (south, centre):* a bull's-eye of ≈30 rings round a dot. Spacing ≈4 → 8–9 px (×2). The lines stay dark (50–100) through most of the band and fade only in the outer quarter. The halo meets the Almería coast's band in a seam with cusps.
- *The Columbretes (off Castellón):* the same treatment, 29–30 lines, 4.5 → 8 px, merging with the mainland band. The name lies over the lines.
- *Town marks:*
  - Madrid: a ring with a central dot, "MADRID" in roman capitals;
  - towns: open rings with italic names;
  - Toledo: small capitals;
  - rivers: tapering wiggly trees.

**(e) J. Wyld, engr. N.R. Hewitt, *Spain and Portugal*, John Thomson & Co., Edinburgh (the Rumsey record dates this plate 1824, second edition of the *New General Atlas*).** https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~225810~5506491
- *Coasts:* horizontal ruling, heavier near the coast, with line ends of uneven length. The halo's edge is ragged and soft, not an offset curve.
- *Ibiza and Formentera:* one shared patch.
- *The Columbretes:* no halo of their own, only a dotted ring round the islets.
- *Town marks:* open rings on the Valencia coast with names running seaward; Madrid as a double ring with a dot.
- *Battle mark:* crossed swords at Talavera.

**(g) SDUK, *Islands in the Atlantic*, engr. J. & C. Walker, Baldwin & Cradock 1836.** https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~20962~530054
- *Sea:* no waterlining at all; a narrow coloured band on each island's coast.
- *São Miguel:* ring town marks on the coastline; names radiating seaward like comb teeth, all readable; italic for places, roman spaced capitals for islands; "Formigas" as a few dots.
- *St Helena:* the same convention.

**(h) T. López, *Mapa General de España*, sheet B (*Atlas geográfico de España*, first ed. 1804; the Rumsey copy is the 1810 issue).** https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~292235~90067073
- *Catalan coast:* a broad blue-green sea-side wash (≈8–11 mm) fading outward; names perpendicular to the coast running seaward, mostly italic; "Islas Medas" and "Hormigas" as tiny marks without halos.
- *Ebro delta:* a dotted line just offshore round the delta and the Alfaques; "Rio Ebro" double-lined.
- *Open sea:* "Vigía muy dudosa" notes in italic.

**(i) J. Thomson (engr. J. Moffat), *Chart of North Atlantic Ocean with Tracks of the Shipping to West Indies, North America &c.*, Edinburgh 1817 (engraved c. 1815).** https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~28376~1120805
- *Tracks:* Nelson's tracks as uncoloured dotted lines ("Nelson Returning"; "… the French 1805" near Madeira); other tracks solid or dash-dot, each with an italic legend along it.
- *Ocean:* "W E S T E R N" in hatched capitals, pitch ≈5.5 cap heights. A pale grey-green wash over the whole ocean on this copy.
- *Azores:* islands washed yellow, island names in italic, "AZORES … ISLES" in roman spaced capitals.
- *Dangers:* dotted shoal ovals with a sounding inside ("Doublets Shoal"); "+" rocks.
- *Tropic of Cancer:* plain dashes with letter-spaced roman lettering.

**Other sources.**
- RMG, Faden's 1806 Strait of Gibraltar chart: the catalogue text describes the Trafalgar battle mark as a gun symbol. https://www.rmg.co.uk/collections/objects/rmgc-object-540802
- A.H. Robinson, "The Genealogy of the Isopleth", *The Cartographic Journal* 8 (1971) 49–53, https://doi.org/10.1179/caj.1971.8.1.49 (abstract only seen, via https://typeset.io/journals/cartographic-journal-ha205isp/1971). It traces the isobath to 1584 (Bruinsz). Secondary sources (see the Buache 1752 listings, e.g. https://raremaps.com/gallery/detail/113632) place general use of bathymetric charts after 1850.
- A Rumsey id I opened as "Lapie 1816" (RUMSEY~8~1~34920~1180539) is a C.V. Monin *Espagne et Portugal* with the whole sea ruled. I did not check its date, and it supports nothing above.

## What a speck's halo should look like (the target-ring question)

On the plates where the convention is concentric (OS 1801–1809, Hall 1817), a speck's halo has:

- the **same reach, spacing and line count** as the mainland band on the same plate;
- inner lines that follow the shore's crinkles and are packed and heavy enough to read as a continuous dark rim;
- spacing that opens ×2–4, smoothly, toward an edge of fine, partly broken hairlines;
- a dead stop at R, either faded (Hall) or closed by a dotted line (OS);
- seams with sharp V cusps where it meets a neighbour's halo or the mainland band.

It reads as tone because:

- there are 30–50 lines;
- the spacing near the rock (≈0.2–0.25 mm) is close to what the eye resolves at reading distance;
- the weight falls by a factor of 3–4 across the band.

The engine's current set has none of these properties:

- about 9 lines;
- 2.6 CSS px spacing;
- 6 even lines, then 3 at double spacing;
- a reach of 31 CSS px;
- a fade that starts only at 45% of the reach.

So each ring is resolved, and the few strong rings round a 3-pixel island make a target.

## Renderer changes within the approved look (most important first)

1. **Waterline profile** (`terrain/shaders.ts`, `waterSet` and `waterlines`; uniforms in `Terrain.ts`).
   - **Count and reach.** More and finer lines over a longer band: base spacing s ≈ 2.0 CSS px (now 2.6), reach R ≈ 28–32 s ≈ 56–64 CSS px (now 12 s ≈ 31 px). That gives ≈20–24 visible lines.
   - **Smooth spacing growth.** Keep the world-fixed nested sets (no swimming under zoom), but replace the abrupt octave step with a hierarchical fade:
     - lines at odd multiples of s fade out over roughly the middle third of the band;
     - lines at 2 mod 4 fade over the outer third;
     - so the perceived spacing opens smoothly ×2–3 (Hall to OS).
   - **Strength.** Strength falls continuously from the shore, e.g. opacity × width ∝ (1 − d/R)^1.5. The first 4–6 lines are 1.5–2× heavier, so they read as one rim of tone. Nothing is drawn beyond R.
   - **Hand.** Weight jitter ±20% and spacing jitter ±10% hashed per line; a low-frequency wobble of 0.2–0.3 spacing; the faintest outer lines broken into dashes.
   - **Glow check.** Pale ink on slate inverts the paper's tone, so cap the mean ink coverage near the shore (≈35–40% at most). The rim then reads as lighter shallow water, not a glow.
2. **Specks.** Judge the result of change 1 at the Atlantic key (p = 0.62) before anything else. If the Azores, Madeira, the Canaries, the Cape Verdes, Bermuda or the Antilles still read as targets, scale the reach down for islands whose inscribed radius is below about R/3 (to no less than ≈40–50% of R). That is the horizontal-ruling tradition's compromise (Thomson/Wyld, Hall's West Indies). The OS-style dotted closing line is optional at close range only.
3. **Town marks.**
   - An open ring, about the place lettering's x-height across, with a stroke about its stem weight. It sits exactly on the site, ports on the coastline.
   - The name to the right, centred on the ring; or, for coastal places, perpendicular to the coast, consistently seaward or inland along each coast.
   - Capitals as a ring with a central dot (⊙).
   - In the Gulf close-up: a small anchor at the combined fleet's anchorage, and bastioned or block plans for Cádiz.
   - Put the Cádiz ring on the town at the tip of the isthmus, with its label beside it.
4. **Rivers.**
   - Taper from a hairline at the source (≈0.5 CSS px) to ≈1.5–2 px at the mouth, by upstream length.
   - Hand wiggle of constant screen amplitude; double lines at the tidal estuaries (Tagus, Guadalquivir below Seville, Gironde, Loire, Seine).
   - On the overview, carry the main rivers (Tagus, Douro, Guadiana, Guadalquivir, Ebro, Loire, Seine, Garonne, Rhône, Rhine, Danube) to their sources as hairlines; drop the minor ones; end every river in a point.
   - River names in small italic along the river ("R. Tagus").
5. **Isobaths.**
   - Equal weight: drop the heavier 100-fm line.
   - Draw them as fine dots or stipple: a world-space dot lattice masked by the line, rather than continuous lines.
   - Make 100 fm the outermost line, as Faden's stippled edge of soundings. Drop 200 fm or leave it at paper-grain strength.
   - Unlabelled, or one small italic label between lines in close-ups.
6. **Lettering.**
   - Ocean names: letter pitch ≈5–5.5 cap heights (troika letterSpacing ≈3 em for Bodoni Moda capitals; check against the font's cap height).
   - Hierarchy ≈6.5 : 2.8 : 1.4 : 1.2 : 1: oceans, countries, capitals, ports, minor names.
   - Minor coastal names in italic, perpendicular to the coast like comb teeth.
   - Nothing upside down.
7. **Routes.**
   - A dotted ink hairline under a thin translucent carmine line (≈1.5–2.5 CSS px, slightly uneven) for Nelson.
   - Small open day circles with day numerals placed off the line, alternating sides and outside bends; the month only at its start; a short italic legend along the line.
   - The combined fleet distinguished by line pattern first (a plain dotted or dash-dot ink line), with any wash colour second.
8. **Optional quiet furniture for the Atlantic view.** Faden's 32-ray line rose, faint rhumb rays from one or two hubs, a dash-dot Tropic of Cancer with letter-spaced lettering, feathered current arrows. All at low opacity.

## Doubts

- I did not see the 1801 first state of the OS Kent map. The waterlining on the Devon map is securely dated (11 October 1809, state 1).
- The OS mm values come from my own scale calibration, the Hall values from t4's.
- I examined no French atlas or land map of 1800–1815 (Dépôt, Lapie, Mentelle & Chanlaire). The French tradition rests on t4's Dépôt 1804 chart and Buache.
- I did not re-examine Cary, Arrowsmith's own large maps, Pinkerton, Heather or Norie, so their t4 entries are not cross-checked here.
- The Thomson 1817 ocean wash may belong to this one copy's colourist.
