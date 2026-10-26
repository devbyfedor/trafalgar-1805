# T4: how sea charts of about 1785–1810 looked (directives for the chart shader)

Research notes for scene 2, Stage A. Written 26 October 2026 from charts I looked at myself: downloaded crops from IIIF image servers, viewed them, and in a few cases measured them with sharp. Quotations are limited to a few words where the wording itself is the evidence.

**How I measured.** I sampled grey values along a line running out from a coast, and each local minimum is one engraved line. Pixels are converted to millimetres with the catalogue object size (David Rumsey "Obj Width cm"), so the mm values are good to about ±10%. Colours are mean sRGB values from the digitisations. They depend on each library's white balance, so treat them as indicative.

## 0. The one-paragraph answer

None of the navigational sea charts of 1780–1814 that I examined uses waterlining:

- English: Faden 1780, 1806 and 1807; Laurie & Whittle 1794; Heather/Norie 1814.
- Spanish: Tofiño 1786–87.
- French: Dépôt de la Marine 1804.

They leave the sea as blank paper with soundings. They mark the coast with a hand-coloured wash band (Faden 1807: blue-green on the sea side, rose, yellow or green on the land side) or with stipple and hachures along the land edge. Waterlining belongs to English atlas maps of the same years, where it takes two forms:

- horizontal ruled lines that swell near the coast (Cary 1801, Pinkerton 1810, Hall's West Indies 1817);
- true concentric waterlines (Arrowsmith and Sidney Hall, *New General Atlas*, 1817).

The 1817 Hall maps answer the target-ring question directly. Isolated islands such as St Helena and the Cape Verdes get full concentric halos, but the halos have:

- about 40 hairlines;
- spacing that only doubles from the innermost line to the outermost;
- lines that thin and fade outward;
- slight irregularity.

So the halo reads as a grey tonal ripple, not as rings. Neighbouring islands' halos merge into one envelope with sharp seams. The engine's version reads as a target because its spacing keeps doubling with distance and its few outer lines are equally strong. Fix the profile; don't remove the halos.

## Charts examined (item pages; what to look at)

| # | Chart | Where | What to look at |
|---|---|---|---|
| A | W. Faden, *Chart of the Atlantic or Western Ocean … wherein is delineated the Track of His Majesty's Fleet, commanded by the late Viscount Nelson … in pursuit of the Combined Fleets … 1805*, London, 12 Aug 1807; written and engraved by John Roper, R. Penny sculp.; 61 × 91 cm, outline colour (Huntington 105:162 M) | https://hdl.huntington.org/digital/collection/p15150coll4/id/10207 (second copy: …/id/10094; RMG G213:2/9(1) https://www.rmg.co.uk/collections/objects/rmgc-object-541714) | Track west of Cape St Vincent and through the Antilles: red line, day circles, numerals. Azores: island wash halos and curved group name. Iberia: coastal colour bands, coastal names written perpendicular to the coast, Madrid pictogram. Five line roses. "WESTERN OCEAN" lettering. |
| B | W. Faden, *Chart of the Strait of Gibraltar constructed in 1786 by … Tofiño … to which have been added Ceuta and Tetuan Bays by J.F. Dessiou*, 1806 (RMG G225:6/9) | https://www.rmg.co.uk/collections/objects/rmgc-object-540802 | Left edge, west of Cape Trafalgar among the soundings: the battle mark, a small crossed symbol with "21st of October 1805" above and "Nelson and Villeneuve" below. Profiles along the bottom. |
| C | V. Tofiño, *Carta esférica de la costa de España desde Cabo de Sn. Vicente hasta Punta de Europa*, 1786 (Atlas Marítimo de España, 1789), c. 1:463,000 | https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~320203~90089259 | Bay of Cádiz and Cape Trafalgar: soundings with bottom letters, town pictograms, towers, stippled beaches, hachured hills. Lower-left legend (bottom types). Cartouche note on brazas. Coastal profiles at the right. |
| D | V. Tofiño, *Carta esférica desde Punta Candor hasta Cabo de Trafalgar que contiene los Baxos de la Azeytera*, 1787, drawn by Bauzá, engraved by Joaquín Ballester. The scale is c. 1:88,000 according to a search summary of the IGN card; the card itself returned an error and I did not see it | https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~320205~90089263 ; IGN card https://www.ign.es/web/catalogo-cartoteca/resources/pdfcards/card009846.pdf | Cape Trafalgar (lower right): Altos de Meca hachures, tower symbols, rocks along the shore. Shoals Laja de Conil, Placer de Arena and Aceitera: dotted outlines with + and ✲ and soundings. The best single reference for the Gulf close-up. |
| E | V. Tofiño, *Carta esférica del Estrecho de Gibraltar*, 1786, c. 1:210,000 | https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~320228~90089236 | Overview only: blank sea, current-zone lines lettered A–A, B–B, C–C, tide tables, vertical coastal profiles. |
| F | Dépôt Général de la Marine, *Carte de la côte méridionale de Portugal et d'Espagne depuis le Cap St. Vincent jusqu'à la Baie de Gibraltar … d'après les plans levés par Mr. Tofiño en 1786*, Paris 1804, c. 1:437,000 | https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~371890~90127339 | Rhumb-line hubs. Cádiz and Sanlúcar drawn as bastioned plans. A dotted line just offshore from Trafalgar to Tarifa. Hachured coastal relief strip. "Baie de Cadiz" curved across the bay. Oval title. |
| G | L.S. de la Rochette, *A Chart of the Coasts of Spain and Portugal, with the Balearic Islands, and part of the coast of Barbary*, 2nd ed., W. Faden, 28 June 1780 (in Faden's atlas of 1794), c. 1:2,250,000 | https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~346004~90113492 | Rhumb-line web (solid and dashed). Yellow and rose coast bands. Battle marks (crossed swords): Lagos 1759, Minorca 1756, 1693. Guadalquivir double-lined to Seville. "T" tower glyphs on Majorca. |
| H | Laurie & Whittle, *Chart of the Açores (Hawks Islands), called also Flemish and Western Islands*, 1794 (*Complete Pilot for the West-Indies*, 1795) | https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~374637~90141136 | São Miguel filled with hachures. Rhumb lines. Anchors in the inset of the Punta Delgada and Villa Franca roads. Stippled doubtful shoal. Coastal views lower left. |
| I | Laurie & Whittle, *The Atlantic Ocean*, by Governor Pownall, 1794, c. 1:25,000,000 | https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~374636~90141135 | The Atlantic at ocean scale: blank sea, two rhumb hubs, "ATLANTIC / OR / WESTERN OCEAN" in large open capitals, coastal profiles drawn on Africa. |
| J | W. Heather, *A Survey of Cadiz Harbor, by Don Vicente Tofiño*, Stephenson sc., in *The New Mediterranean Harbour Pilot*, J.W. Norie 1814, c. 1:60,000 | https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~336163~90103942 | English harbour plan: Cádiz and Puerto Real as dark block plans, "Sand and Mud" and "Coral" notes, dotted shoal outlines, the profile of the high land behind Cádiz, a fleur-de-lis rhumb hub, "Variation 22° West". |
| K | J. Cary, *A New Map of Spain and Portugal*, 1801 (*New Universal Atlas*, 1808), 46 × 52 cm, c. 1:2,400,000 | https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~21513~640006 | Balearics and Ibiza: horizontal ruled sea, with the lines swelling into a dark halo near the coast. |
| L | J. Pinkerton, *Spain and Portugal*, drawn by L. Hebert, Neele sc., 1 March 1810 (*Modern Atlas*, 1815), c. 1:1,920,000 | https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~3795~370007 | Ibiza: horizontal shading halo. Andalusia: hachured mountain chains, tiny ring town marks, province names in spaced capitals. |
| M | A. Arrowsmith, engr. Sidney Hall, *Spain and Portugal*, 1817 (*New General Atlas*, Constable), 21 × 26 cm | https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~222248~5505877 | **The reference for concentric waterlining.** Look at the Balearics (Cabrera's rings merging into Majorca's), the Strait (lines fill it and meet in a midline seam), the Bay of Biscay (cusps in front of bays), and the Tagus and Sado (estuaries get their own lines). Names lie over the lines. |
| N | A. Arrowsmith, engr. Thomson & Hall, *Africa*, 1817, 21 × 26 cm, c. 1:50,000,000 | https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~222290~5505899 | St Helena: an isolated islet with about 40 rings. Cape Verde: the group halo merging with the African coast band. |
| O | A. Arrowsmith, engr. S. Hall, *West Indies*, 1817 | https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~222304~5505906 | The same atlas uses horizontal ruling here. The Lesser Antilles share one dark band. Barbados has its own patch. The rock "Vela" gets a small soft E–W patch with no rings. |
| P | R. Kirkwood, *Spain and Portugal*, 1817 (counter-example) | https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~241393~5512586 | The whole sea ruled dark grey: heavy and dead. Avoid. |
| Q | Ph. Buache, *Carte et coupe du Canal de la Manche…*, presented 1737, published 1752 (reissued in *Cartes et tables de la géographie physique*, 1757/1770) | https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~25814~1080055 | Early isobaths at 10-brasse intervals, drawn as dotted and fine lines, each tinted a different colour, with italic band labels ("Fond de 20 à 29 br."). The coast has a heavy hachured land edge. |

Pointers I did not examine, for Stage B: Dépôt, *Carte réduite de la Manche*, 1802 (RUMSEY~8~1~371780~90126887); Dépôt, *Côtes de France: Département du Pas de Calais depuis la Pte. d'Oye jusqu'à Ambleteuse*, 1797 (RUMSEY~8~1~371788~90126892), the Boulogne coast; Tofiño, *Carta esférica desde Cº Sn. Vicente hasta Cº Ortegal*, 1788 (RUMSEY~8~1~320196~90089254), for Finisterre and Ferrol; Tofiño, *Plano del Puerto de Cádiz*, 1789 (RUMSEY~8~1~320204~90089260). Each opens at `https://www.davidrumsey.com/luna/servlet/detail/<id>`.

Modern source: D.P. Huffman, "On Waterlines: Arguments for their Employment, Advice on their Generation", *Cartographic Perspectives* 66 (2010) 23–30, https://doi.org/10.14714/CP66.94. Huffman cites the ICA glossary (1973): waterlines decrease "in proximity and strength" away from the edge. He cites Christensen (2008), who estimated that waterlining consumed about 18% of the production budget of 19th-century European ordnance survey maps. He places waterlining "largely in eighteenth and nineteenth century" cartography. His own modern rule of thumb is a 1.3× spacing step per line, a modern taste and not period evidence. He advises leaving waterlines off rivers.

---

## 1. Waterlining

**Which traditions used it around 1805.**

- Navigational sea charts used none of it: English (Faden, Laurie & Whittle, Heather/Norie), Spanish (Tofiño) and French (Dépôt) alike [A–J]. Confidence high for the charts examined. Ten charts from three national traditions all agree.
- English atlas maps of 1800–1817 used one of two forms:
  - **Horizontal ruled lines**, darkened near the coast [K, L, O]. Cary 1801 rules the whole sea with E–W hairlines about 0.23 mm apart (5 px at 21.8 px/mm). Near land the lines swell into a dark halo 2–4 mm wide, which looks heavier on the east and south sides (medium confidence; lettering gets in the way).
  - **Concentric waterlines** [M, N] (1817).
- The French and Spanish land maps of the period were not examined; their usage there is unknown.

So the engine's waterlining is an atlas convention borrowed into a sea chart. That is fine, but it should look like the best atlas engraving, Hall 1817.

**Measured profile of Hall's concentric waterlining (1817, plates 21 × 26 cm):**

| Example | Lines | Spacing near land → at edge | Reach | Line darkness (0–255) |
|---|---|---|---|---|
| St Helena [N], an isolated islet | ≈ 40 (42 minima to the band edge) | 4–5 px ≈ 0.2 mm → 8–9 px ≈ 0.35–0.4 mm | ≈ 265 px ≈ 11.5 mm | 55–90 near land → 130–215 at the edge (paper ≈ 225) |
| Cabrera and Majorca [M] | ≈ 33 | ≈ 0.2–0.25 mm → 0.45–0.5 mm | ≈ 10 mm | similar |

- Spacing grows only **≈ ×2 across the whole band**, about 1.5–2% per line. It is close to uniform, not logarithmic.
- Line-to-line jitter is about ±1 px (±15–20%), and individual lines vary in darkness. The lines are visibly hand-wobbled.
- The reach is a **paper constant**, about 10–12 mm or ≈ 5% of the plate width, on maps whose scales differ about tenfold: Africa is 1:50M, so the band is about 550 km; Spain is about 1:5.5M (my estimate), so the band is about 55 km. Engravers set the band in paper units, not in ground units.

**Directives (for the engine):**

1. **Bound the spacing growth.** Spacing should go from s at the coast to about 2s at the outer edge of the band, never more. A convenient warp: line index `u = R·ln(1 + d/R) / s`, where R is the reach. This gives spacing `s·(1 + d/R)`, which is exactly ×2 at d = R. Replace the scheme where the spacing doubles each time the distance doubles. That scheme is what makes the far rings few, wide and equally strong, which is the target look. Confidence high (measured).
2. **Fade by strength, not by stopping.**
   - Weight and opacity fall from full at the coast to zero at R, e.g. opacity `(1 − d/R)^1.5`.
   - The innermost lines are about twice as heavy as the middle ones.
   - Nothing is drawn beyond R.
   - Confidence high (ICA definition via Huffman, and measured).
3. **Count and reach on screen.** The engraved count, 30–45 lines, is too fine for a 1280 px screen.
   - Aim for **16–24 visible lines**.
   - Innermost spacing at least 2 CSS px (3 device px at DPR 1.5), outermost about 4–6 CSS px.
   - Reach about **4–6% of the viewport width (≈ 50–80 CSS px at 1280)**, kept roughly constant in screen space across zoom, as the engravers kept it constant on paper. Crossfade between octave LODs as now.
   - Confidence medium: this is a translation of the measurements to the screen.
4. **Small islands keep their halos but stay tonal.** Hall gives St Helena, a speck, the full-reach halo. With directives 1–3 an island halo becomes a grey ripple and stops reading as a target.
   - If an isolated rock still dominates the view, scale the reach for islands narrower than about R/3 down to no less than 40% of R. Hall did the equivalent on his West Indies map with a small soft patch around the rock Vela.
   - Confidence: high that the halos are authentic; low-medium for the size scaling, which is a judgment call.
5. **Break the perfect circles.** Add per-line weight jitter (±20%, hashed by line index) and spacing jitter (±10–15%). Add a low-frequency wobble along each line, with amplitude about 0.2–0.3 of the local spacing and wavelength 10–30 spacings. Near the coast the lines follow every crinkle of the shore; farther out they smooth into simple curves, which a distance field already gives. Confidence medium-high [M, N; Huffman Fig. 4 on smoothing machine offsets].
6. **Groups of close islands merge into one envelope.** Each line is the offset of the union of the islands, and where two systems meet the lines form sharp V-shaped cusps (Balearics, Cape Verdes, Ibiza and Formentera) [M, N]. Keep the union distance field. Confidence high.
7. **Narrow straits and bays fill completely** with the dark inner lines, which meet in a midline seam (Hall's Strait of Gibraltar) [M]. Bays fill densely and form cusps in front of their mouths (Bay of Biscay) [M]. Lines do not stop short. Confidence high.
8. **River mouths.** Sea lines close across the mouth and never enter rivers. Wide estuaries and inland waters (Tagus, Sado) get their own short set of inner lines [M]. Do not waterline rivers [Huffman]. Confidence medium-high.
9. **Labels lie over the waterlines** with no knock-out halo [M: "C.º de Penas" and "STRAIT OF GIBRALTAR" over dense lines]. Keep the lines fine enough that lettering reads through them. At most lower the line opacity by about 20% under text. Confidence medium.

## 2. Coastlines

- **Line:** a hairline coast, about 0.1–0.15 mm on the plate [C, D, F]. On screen, 1–1.5 CSS px of near-black brown ink.
- **Shore band on the land side**, the real period signature [A, C, D, F, Q]:
  - cliffs as a fringe of short dark hachures perpendicular to the coast, 0.3–1 mm deep;
  - sand beaches and dunes as a stippled band of fine dots, 0.5–2 mm wide (Tofiño's coast from Sancti Petri to Trafalgar);
  - rocks at the foot of cliffs as small black beads (Cape Trafalgar [D]).

  For the shader: a land-side fringe 2–4 CSS px wide, with stipple where the coast is low and short strokes where it is steep. Steepness can come from the height field. Confidence high.
- **Hand-colour band (Faden 1807 [A]).**
  - Sea side: a translucent blue-green wash about 1–1.5 mm wide hugging the coast, fading outward. Sampled at its densest ≈ #6E8480 to #7A8B72 on paper ≈ #E4D7C4.
  - Land side: a band 3–4 mm wide fading inland, coloured by country:
    - rose ≈ #DAA8A3 for Spain, Portugal and Britain;
    - green ≈ #A9AF92 for Africa;
    - yellow for America.
  - La Rochette [G] has an ochre-yellow land band ≈ #E9D7B0 on Spain.

  The brief's "shallow water slightly lighter" can echo the sea-side wash. Avoid national colours: the brief forbids political borders. Confidence high.
- **Dotted line close inshore.** A single row of dots 1–3 mm off the coast marks the edge of foreshore or reef (Dépôt, Trafalgar to Tarifa [F]). This is a cheap and authentic detail for the Gulf close-up. Confidence medium-high.
- **Shoals, rocks and reefs** [C, D, F, G, H, J]:
  - shoals: a dotted outline of fine dots (≈ 0.2 mm dots at ≈ 0.5 mm pitch) with soundings written inside;
  - sand banks: stippled inside the outline (Placer de Arena);
  - sunken rocks: "+";
  - rocks awash: a six-armed asterisk "✲";
  - an isolated danger: a dotted ring round a point, or a small stippled oval;
  - uncertain features: an italic note ("Rock doubtful", "Vigia doubtful" [A]).

  The Aceitera and Laja de Conil shoals off Cape Trafalgar [D] are exactly where the scene ends. Confidence high.

## 3. Depths

- **Soundings, not contours, on every chart examined** [A–J].
  - Numerals are italic, about 1–1.5 mm tall, with fractions ½, ¼, ¾ set small.
  - Bottom quality follows the number:
    - English: "Sand", "Oaze", "Black Oaze", "Sand & Oaze" [G]; "Sand and Mud", "Coral", "Rocky", "Stones" [J].
    - Tofiño's legend [C]: A arena, AC arena y conchuela, C cascajo, CC cascajo y conchuela, L lama, LA lama arenosa, LD lama dura, LNC lama negra y conchuela, LS lama suelta, LSC lama suelta clara, LSN lama suelta negra, P piedra, and "00" for no bottom at 120 brazas.
  - Density: about one sounding per 5–10 mm near the coast and in the approaches, thinning to blank paper seaward.

  Confidence high.
- **Units differ by nation, and the label matters.**
  - Tofiño's cartouche [C]: soundings are in "brazas de á dos varas castellanas", 2 × 0.8359 m ≈ 1.672 m.
  - English fathom: 6 ft = 1.829 m.
  - French brasse: 5 pieds du roi ≈ 1.624 m (standard metrology; not read off chart F).

  An English-view chart says fathoms; Spanish names in the Gulf could carry brazas. Confidence high for the Spanish and English units, medium for the French.
- **The edge of soundings.** Tofiño's "00 = no bottom with 120 brazas" (≈ 200 m) marks the practical limit of the deep-sea lead. The deepest numbers on his charts are about 100.
  - Make **100 fathoms the last real isobath**.
  - Draw 200 fathoms, if kept at all, as the faintest unlabelled dotted line.
  - Beyond it, blank sea.

  Confidence medium.
- **Isobaths are a learned anachronism.** None appears on the 1780–1814 navigational charts examined.
  - Precedents: Bruinsz 1584 (manuscript, Spaarne); Cruquius' Merwede map, dated variously 1727, 1729 or 1730 (sources differ); Marsigli 1725 (Gulf of Lion, per one dealer); Buache, presented 1737 and published 1752 [Q].
  - Make them look like **Buache [Q]**: fine dotted lines, or very fine continuous ones, all the same weight (no index contours), each optionally carrying a faint watercolour ribbon.
  - Label sparingly in small italic placed *between* two lines, along the band ("20 fathoms", or Buache-style "Fond de 20 à 29 br.").
  - Buache used equal 10-brasse steps. The engine's 10/20/50/100 set is acceptable.

  Confidence medium-high.

## 4. Relief on land

- **Sea charts show relief only in a narrow coastal strip, by hachures** [C, D, F, H].
  - Wavy, tapering strokes run straight downslope. They are long and dense on steep slopes and dark on the shaded side.
  - Tops are left as white plateaus with sparse dots or scrub marks.
  - The foot dissolves into stipple, with a faint dotted edge (Altos de Meca [D]). L&W fill whole Azores islands with hachured "worm" clusters [H].
  - Inland beyond about 1–3 cm (≈ 5–14 km at 1:463k) the paper is blank [C, F].

  Confidence high.
- **Mountains seen from sea** appear as coastal profiles (views) in the margins: Monchique, Medina, Ubrique, the high land behind Cádiz [C, F, J, H]. These are a lovely engraved strip for an HTML caption, not for the 3D chart.
- **Atlas maps** (Pinkerton 1810 [L], Hall 1817 [M]) hachure whole mountain chains across the interior. So inland relief is period-correct for the atlas style the scene borrows.
- **Directive.** Render slope as hachure-like strokes oriented downslope, with density and weight by slope and darker on the side away from the sun. Use this instead of, or on top of, smooth Lambert shading, so the low sun reads as engraving.
  - Keep it richest within about 50 km of the coast and quieter inland.
  - Land contour lines appear on none of the charts examined: keep them fainter than the hachures, or drop them at close zoom.

  Confidence medium-high.

## 5. Rivers

- **Sea charts truncate rivers** a short way inland, about 1–4 cm on the plate (≈ 5–20 km at Tofiño's scales) [C, D, F]. Faden's ocean chart shows almost none: only the Tagus as one wiggly line about 3 cm long, plus its estuary [A].
- **Taper and doubling** [D, G, M]:
  - The upper course is a hairline, about 0.05 mm.
  - It thickens downstream to about 0.15 mm.
  - Below the tidal limit it becomes **double-lined at true width** with water between the banks, enclosing islands: the Guadalquivir below Seville with Isla Mayor and Isla Menor [M, G]. Estuaries carry marsh texture [C, F].
  - Tributaries end in fine branching twigs.
- **Meander.** Lines are irregular and hand-wiggled at small scale. The wiggle amplitude is roughly constant on paper, about 0.2–0.5 mm, not smooth splines [D, M].
- **Names** run along the river in small spaced capitals ("GUADALQUIVIR", "GUADIANA" [G]) or as "R. Tinto".
- **Directive.**
  - Width ∝ (distance from source)^0.5 or ∝ log of upstream length, from 0.5 to 2 CSS px.
  - Double the line at estuaries.
  - Add hand jitter of ±1 CSS px.
  - On the overview, fade rivers out beyond their lower course and keep only the main rivers (Tagus, Guadiana, Guadalquivir, Ebro, Douro, Loire, Seine, Rhône, Danube).

  Confidence medium-high.

## 6. Towns and ports

- **Ordinary towns and ports.**
  - Mark: a small **open ring**, diameter about the label's x-height (about 0.5–0.8 mm), stroke about the label's stem weight, placed exactly on the site [A, G, L, M].
  - Name: to the right of the ring, centred vertically on it. On a crowded coast, write it perpendicular to the coast, running inland from the ring [A, C, F, M].

  Confidence high.
- **Capitals.** Faden puts a tiny building in elevation (palace or church with a cupola) under "MADRID", about one cap-height tall [A]. Use it for Madrid, Paris, London and Vienna. Confidence high for Faden; medium as a rule.
- **Close-ups (the Gulf).**
  - Fortified towns as small solid **bastioned plans**: Cádiz and Sanlúcar on the Dépôt chart [F]; dark block plans on Heather [J].
  - Smaller towns as a tiny church in elevation, with a cross [C, D].
  - Watchtowers ("Torre") as a small square □ or a ring with a dot ⊙ [D, C]. On La Rochette's Majorca, towers are a "T" glyph [G].
  - Anchorages as a small **anchor** about 1.5× x-height [H inset; J]. Use one at the fleet anchorage of Cádiz.

  Confidence high.
- **Battles.** A small crossed-swords or crossed-guns mark about 2–3 mm, with the date above and the opposing commanders below in small italic, set among the soundings [B: "21st of October 1805 / Nelson and Villeneuve"; G: Lagos 1759 "Boscawen and la Clue", Minorca 1756 "Byng and la Galissoniere"].
  - Use it at Finisterre (22 July 1805, Calder and Villeneuve), and at Trafalgar if wanted.
  - These are flat ink marks, not 3D pins.

  Confidence high.

## 7. Lettering

- **Oceans.** Widely spaced **roman** capitals, large and often drawn as open letters with hairline hatching inside [A, I, Q]. Faden 1807, measured on the 91 cm chart:
  - "W E S T E R N  O C E A N" capitals are ≈ 6.7 mm tall;
  - letter pitch is ≈ 3.5 cm, about 5.2 cap-heights, so roughly 4 caps of empty paper between letters (troika letterSpacing ≈ 2.5–3 em for Bodoni Moda; check against the font's cap height);
  - the name spans a quarter to a third of the chart;
  - "ATLANTIC" sits on one line, a small "OR" between, and "WESTERN OCEAN" below [A, I].

  Confidence high.
- **Countries and regions:** spaced roman capitals ≈ 2.8 mm tall with a pitch of ≈ 2.1 cap-heights (letterSpacing ≈ 0.6–0.8 em), often curved to follow the coast (La Rochette's ANDALUSIA, GRANADA, MURCIA [G]; MER MÉDITERRANÉE set vertically [F]).
- **Island groups:** spaced italic capitals on an arc over the group ("AZORES OR WESTERN ISLES", "CARIBBEE ISLANDS" [A]).
- **Bays and straits:** follow the shape. "Baie de Cadiz" is letter-spaced roman lower-case along the arc of the bay [F]. "DÉTROIT DE GIBRALTAR" and "STRAIT OF GIBRALTAR" run along the strait's axis [F, M].
- **Ports and major capes** in roman; **minor coastal places and capes** in italic, perpendicular to the coast (Faden: "Cadiz", "Gibraltar", "Ceuta" roman; "C. Trafalgar", "Estepona" italic [A]). **Notes** in small italic: bottom types, "doubtful", track legends, magnetic variation. Tofiño sets many towns in italic, so the brief's rule (places roman, waters italic) is a modern simplification. It is acceptable; add perpendicular coastal names and italic notes for the period feel. Confidence high.
- **Size hierarchy** (Faden 1807, cap heights measured with sharp at ≈ 9.65 px/mm):
  - ocean 6.7 mm;
  - country 2.8 mm;
  - capital (MADRID, small caps) 1.45 mm;
  - ports and islands (Cadiz, Valencia, Antigua) 1.15–1.25 mm;
  - minor coastal names and day numerals ≈ 1.0 mm.

  That is **≈ 6.5 : 2.8 : 1.4 : 1.2 : 1**. The hierarchy is steep at the top (oceans and countries) and nearly flat among places. Confidence medium-high (measured on one chart).
- **Orientation:** north-up reading, except coastal names (perpendicular to the coast) and names that follow a curve. Nothing upside down. No shadows and no halos [all].

## 8. Routes and tracks (Faden 1807 [A])

- **The line:** a hair-fine engraved dotted (beaded) line, with a translucent **carmine** hand-coloured line laid over it (Nelson's track). The coloured line is only ≈ 0.3–0.5 mm wide (3–4 px at 9.65 px/mm), so it reads as a thin line, not a band.
- **Day markers:** a small **open circle** (≈ 0.65 mm, the size of a lowercase o) at each noon position, with the **day of the month** in small numerals (≈ 1 mm) beside it (20, 21, 22 …). The month is written only at its start or at key points ("12 May", "1 August").
- **Legend:** small italic running along the line, parallel to it: "Track of H.M.S. Victory from the West Indies 1805", and "… to the West Indies 1805" on the outward leg.
- **A second ship's track** on the same chart is a plain black dotted line with circles, uncoloured.
- **Directive.** Each route is an ink hairline, beaded or dotted, overlaid by a thin translucent watercolour line in the side's colour (about 1.5–2.5 CSS px, slightly uneven in density like a hand wash). Put day circles and numerals at the waypoints and a short italic legend along it.
  - Distinguish the fleets by wash colour **and** by line pattern (e.g. dotted versus dashed), not by glow.
  - The drawing head stops at a day circle.

  Confidence high for Faden. The colour for the combined fleet has no period model; that choice is ours.

## 9. Paper, ink and colour

- **Paper** (as digitised): Faden 1807 ≈ #E4D7C4; La Rochette ≈ #F3E6DB; Tofiño ≈ #FBEFE2; Dépôt 1804 ≈ #F1D4B2. Warm cream to buff.
- **Ink:** brown-black.
- **Hand colour:** muted watercolour, never saturated: blue-green sea wash, rose, sap green, yellow ochre, and carmine for the track [A, G].
- **Sea:** blank paper on every sea chart. The brief's slate sea is a deliberate break with this. Keep the period cue through the coastal wash band and the ink-on-paper land.

Confidence high (colours indicative).

## 10. Furniture: what helps a moving 3D chart, and what is cliché

**Borrow:**

- **Rhumb lines** [F, G, H, I]: 32 straight lines from each of a few hubs. The 8 principal winds are solid and slightly heavier, the rest dashed, crossing the whole open sea. A fleur-de-lis marks north at a hub [F, J]. On a tilted 3D chart they read as long ink lines lying on the sea and give perspective and scale cues during camera moves. Use one or two hubs in the Atlantic view, at about 0.5–1 CSS px and low opacity. Confidence high that it is authentic; medium that it helps.
- **Faden's line rose** [A]: 32 rays with no circle. Cardinal and intercardinal rays are long and solid; the others alternate solid and dashed. A tiny open circle sits at the centre and a spear-head with a crossbar marks north. It is light and unhackneyed, unlike the large coloured star rose.
- **Graticule:** hairlines every 5° at ocean scale, as on Faden [A].
- **Tropic of Cancer:** a dash-dot line with spaced lettering "Tropic of Cancer". The Martinique run crosses it.

**Optional, in close-ups:** feathered current arrows (the Strait inflow) and "Var. 22° W" magnetic variation notes [A, J]. Both are authentic and quiet.

**Avoid in 3D:**

- graduated ladder borders and double neat lines (they would be a hard map edge, which the brief forbids);
- cartouches and title blocks (the HTML title card does that job);
- tide tables and legends;
- big decorative roses;
- sea monsters and drawn ships.

## 11. Most beautiful details to borrow, and defaults to avoid

**Borrow (in order of payoff):**

1. Hall-style tonal waterlining: bounded spacing, fading strength, merging envelopes.
2. Coastal names set perpendicular to the coast like the teeth of a comb [A, C, F, M].
3. The blue-green coastal wash band [A].
4. Tofiño's hachured Altos de Meca, stippled beaches and rock beads at Cape Trafalgar [D].
5. Dotted shoal outlines with + and ✲ and soundings inside, especially the Aceitera off Trafalgar [D].
6. Faden's track: carmine wash, day circles, numerals and an italic legend [A].
7. Crossed-swords battle marks with date and commanders [B, G].
8. Rhumb lines and the line rose [A, F].
9. Spaced open ocean capitals [A, I].
10. Soundings with bottom letters near the coasts, blank paper beyond the edge of soundings [C].

**Avoid:**

- concentric rings that are equally strong and log-spaced (the target look);
- perfectly smooth machine offsets;
- waterlines inside rivers;
- ruling the whole sea [P];
- heavy, labelled or metric isobaths, and colour-filled depth bands;
- isobaths in the deep ocean;
- filled dots or pins for towns;
- rivers of uniform width, or rivers drawn far inland at full weight;
- label halos or shadows, and sans-serif type;
- cartouches and borders floating in 3D;
- saturated colours or glow.

## Doubts and limits

- I did not examine French or Spanish *land* maps of the period, or any Gallica, BnF, BNE or British Library images (Gallica and LOC block scripted access). The judgement about traditions rests on the English atlases, the four sea-chart makers and Buache.
- Hall's maps are dated 1817, twelve years after Trafalgar. Cary 1801 and Pinkerton 1810 show that the horizontal-ruling variant was current in 1801–1810. Concentric waterlining in an 1805 sea chart is stylistic licence, which the brief has chosen.
- The mm values assume the catalogue object width equals the image width. Margins could shift them by about 10%. The ratios (spacing ×2, line count, reach as a share of the plate) do not depend on this.
- RMG lists Faden 1807 at "circa 1:2,000,000", which looks inconsistent with an ocean-wide chart about 91 cm wide (my estimate is nearer 1:10,000,000 at 30° N). Unresolved, and it does not matter here.
- Cruquius' isobath map is dated 1727, 1729 or 1730 in different sources; not resolved.
