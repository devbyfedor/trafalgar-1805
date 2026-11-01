# V-A-H4: adversarial check of the names adjudication (`a-h4.md`)

Written 1 November 2026 (session 9). I checked `docs/research/scene-02/a-h4.md` against the material it ruled on (`h4-names.md`, `v-h4.md`), its settled table (element [2] of `drafts-data.json`: `finalNames`, `conventions`, `doubts`, `rulings`) and the chart as it is now (`src/scenes/02-road/gazetteer.ts`, `src/components/chart/lettering/fonts.ts`, the "Type roles" table in `docs/decisions.md`). I also read the names section of `draft-lead.md`, which copies the adjudication's wording. I read every repository file and edited none.

## Verdict

The adjudication holds for the 34 names the chart letters now. Every engraved reading it cites for them that I re-read from the IIIF images is right, including the stop under the raised t in Faden's "C. Sᵗ. Vincent" (h4 had missed it), Heather's CAPE Sᵀ. VINCENT with its stop, and Cary 1805's NORTH PACIFIC OCEAN slip off West Africa. The counts I re-ran agree. The gazetteer letters exactly the settled forms, and `npm run check:lettering` passes (every character of all 34 names is in its font). No on-chart form is refuted.

One English map nobody had used, Laurie & Whittle's *New Map of the Kingdoms of Spain and Portugal* (plate of 12 May 1794, issued in their atlas of 1804), engraves a second GULF OF CADIZ, spread across the whole bight, and a further STRAITS OF GIBRALTAR.

The faults are in the record around the names, not in the forms:
- The doubt says the Gulf of Cadiz is on one English chart only.
- The stated rule, "Faden 1807 first", is not the rule the table follows: about eight of its own rulings depart from Faden by usage or legibility.
- The settled role for West Indies ("island") no longer matches the gazetteer ("land").
- Two departures from the model chart on the chart now, West Indies and Barbary, are missing from the doubts.
- Smaller points, all for later scenes or the rationale:
  - Faden engraves Huelba, not Huelva.
  - Carthagena is wrongly listed among forms the charts agree on.
  - The adjudication says "Cape" was spelled out only on large-scale plates; it was not.
  - Lizard and Start Pt. are set by different rules.
  - The type evidence for "St." cites Nicolas's 1840s type as print of 1805.
  - Several attributions in the doubts are incomplete.

All of these are text fixes. The gazetteer needs no change now.

## How I checked

- **Charts re-read at full resolution**, from IIIF crops enlarged with sharp:
  - Faden 1807 (Huntington).
  - Heather 1800, sheet 3: the full 7892 × 11240 Commons file.
  - Laurie & Whittle's *Atlantic Ocean* 1794.
  - Cary 1801, 1803 and 1805.
  - Arrowsmith's *Africa* 1802 and *West Indies* 1803.
- **A new map.** I looked for an English map of 1794–1810 that none of h4, v-h4 or a-h4 used. The one I read is Laurie & Whittle's *A New Map of the Kingdoms of Spain and Portugal with their Principal Divisions*. I read its imprint myself: published by Laurie & Whittle, 53 Fleet Street, 12 May 1794. The David Rumsey copy comes from their *New Universal Atlas* of 1804 (Rumsey record). Below it is "L&W Spain".
- **Counts recounted** in the OCR texts, with line-break hyphens joined and long s normalised:
  - Nelson's *Dispatches* vols 6–7;
  - *Naval Chronicle* vol. 14;
  - Malham 1795, both volumes;
  - Brookes 1807;
  - Norie 1805 with Heather's chart catalogue (leaf n642 read on the page image).
- **Lettering check.** I ran `npm run check:lettering`, which only reads files. It reports "34 names, every character in its font", and git status was the same before and after the run.

## The 34 names on the chart

| Set | What I re-read | Result |
| --- | --- | --- |
| ATLANTIC OCEAN | Cary 1803 ATLANTIC / OCEAN on two lines; Arrowsmith 1803 ATLANTIC OCEAN on a diagonal; Heather 1800 THE / ATLANTIC / OCEAN; Cary 1805's vertical NORTH PACIFIC OCEAN off West Africa (the slip a-h4 reports) | holds. Heather's catalogue also sells a chart of "Part of the Atlantic Ocean" (no. 41); L&W Spain has ATLANTIC or WESTERN OCEAN (issue 10) |
| MEDITERRANEAN SEA | Faden 1807; Heather 1800 THE MEDITERRANEAN SEA | holds |
| Bay of Biscay | Faden BAY OF / BISCAY | holds (L&W Spain: BAY OF BISCAY or GULF OF GASCONY) |
| English Channel | Faden ENGLISH CHANNEL; L&W 1794 THE CHANNEL; Heather's catalogue "The English Channel on three Sheets" and "Directions for the British Channel" (Norie OCR) | holds |
| Gulf of Cadiz | Heather 1800 GULF OF CADIZ in open roman capitals; Brookes 1807's Alcoutim, Faro and Tavira entries | holds; a second map letters it (issue 1) |
| Straits of Gibraltar | Heather 1800; Cary 1801 STRAITS of GIBRALTAR; Faden 1807 leaves the Strait unnamed | holds; also L&W Spain and Heather's catalogue no. 44 |
| C. Trafalgar | Faden; Cary 1801's slip "C. Trafalagar" | holds |
| C. St. Vincent | Faden "C. Sᵗ. Vincent" with the stop; Heather 1800 CAPE Sᵀ. VINCENT with the stop; Cary 1801 C. Sᵗ Vincent, with a stop that is probable but obscured by waterlining | holds; one rationale needs a fix (issue 9) |
| C. Finisterre | Faden | holds |
| Cadiz | Faden; Heather; L&W Spain CADIZ | holds |
| Gibraltar, Tangier, Ceuta | Faden; L&W Spain | hold |
| Seville | Cary 1801 SEVILLE; L&W Spain SEVILLA (already recorded as an L&W alternative) | holds |
| Lisbon, Ferrol, Madrid, Brest, Boulogne, Portsmouth, Paris, London | Faden; L&W 1794 for Boulogne, Portsmouth and London | hold |
| Toulon | not re-read (uncontested) | holds |
| Spain, Portugal, France, England | Faden | hold |
| Barbary | Heather 1800 BARBARY; L&W 1794 BARBARY | holds; Faden and Cary letter the states instead, and no doubt records it (issue 3) |
| Madeira | Faden | holds |
| Canary Islands | Arrowsmith 1802 CANARY ISLANDS; Heather's catalogue no. 46, "Madeira and the Canary Islands" | holds |
| Azores or Western Islands | L&W 1794 AZORES or WESTERN ISLANDS (italic capitals, small "or"); Heather's catalogue no. 73; Faden AZORES OR WESTERN ISLES; Arrowsmith 1802 WESTERN ISLANDS beside "St. Miguel" and "St Mary" | holds |
| West Indies | Faden's track legend "Track of H.M.S. Victory to the West Indies 1805" | holds as a form; its role in the settled table is wrong (issue 4) and it has no doubt (issue 3) |
| Martinique | Faden; Cary 1803 MARTINIQUE; Norie's table of positions; NC14 12 to 2 (recounted); Arrowsmith 1803 MARTINICO and L&W 1794 Martinico | holds (medium) |
| Barbadoes | Faden; Cary 1803; Arrowsmith 1803 BARBADOES; L&W 1794 Barbados; NC14 22 to 0 | holds |

## Issues, most serious first

### 1. Gulf of Cadiz: not "only on Heather" (medium, factual error)

**Where.** a-h4: ruling rows "Gulf of Cadiz (usage)" and "Gulf of Cadiz (extent)"; the settled-table row "Gulf of Cádiz", note "Heather 1800 only on charts"; doubt 6. The same items in `drafts-data.json` [2]: `rulings`, the `finalNames` note and `doubts[5]`. The same sentence in `draft-lead.md`, bullet "Gulf of Cadiz".

**Problem.**
- The adjudication says, and the doubt for the history notes repeats, that among English charts only Heather's *Coast of Portugal* (1800) letters the name. It also says the chart follows version 1 of the extent "as its only period chart does".
- L&W Spain engraves GULF OF CADIZ in italic capitals across the open water, from off Cape St Mary to off Cadiz. That is the whole bight, so this map is the better evidence for version 1.
- Heather's name runs from off the mouth of the Guadiana (Ayamonte, "Pᵗ Sᵗ Anthony") towards Cadiz. That is the Spanish half of the bight, not "from off the Algarve".
- "Gulph of Cadiz" is given without saying who used it.

**Fix.**
- Doubt 6, and the draft-lead bullet:
  > **Gulf of Cadiz.** Two English maps letter it.
  > - Laurie & Whittle's *New Map of the Kingdoms of Spain and Portugal* (plate of 12 May 1794, in their *New Universal Atlas* of 1804) sets it in italic capitals across the open water from off Cape St Mary to off Cadiz.
  > - Heather's *Coast of Portugal* (3 April 1800) sets it in open roman capitals from off the mouth of the Guadiana towards Cadiz.
  >
  > Faden (1807), Cary (1801, 1804) and Heather's Strait plate (about 1809) leave the water unnamed. The gazetteers of 1795–1810 (Brookes, Walker, Cruttwell, the *Britannica* of 1810) use the name for the same bight, and Brookes (1807) puts Alcoutim, Faro and Tavira on it. Nelson, the logs, the *Naval Chronicle* and Malham never use it: sailors said "off Cadiz". "Gulph of Cadiz" also occurs in print of 1798–1810 (v-h4). Tuckey (1815) says the name was more usually kept for the Bay of Cadiz.
- Ruling "Gulf of Cadiz (usage)", second sentence:
  > On English maps and charts it appears on Laurie & Whittle's Spain and Portugal (plate of 12 May 1794, atlas of 1804), as GULF OF CADIZ in italic capitals from off Cape St Mary to off Cadiz. It also appears on Heather's *Coast of Portugal* of 3 April 1800, in open roman capitals from off the Guadiana towards Cadiz (both read).
- Ruling "Gulf of Cadiz (extent)", version 1:
  > The whole bight from the Algarve to Cadiz. Laurie & Whittle's Spain and Portugal (1794) spreads the name from off Cape St Mary to off Cadiz. Heather (1800) sets it from off the Guadiana towards Cadiz. The gazetteers put Faro, Tavira, Ayamonte and the Guadiana mouth on the gulf.

  Replace "as its only period chart does" with:
  > as both period maps that name the water do.
- Settled-table note:
  > On charts: Laurie & Whittle's Spain and Portugal (1794; atlas of 1804) and Heather 1800; extent disputed (Tuckey 1815).
- Optional: add L&W Spain's GULF OF CADIZ and STRAITS OF GIBRALTAR, both in italic capitals, to the italic examples under "Lettering: seas, the Channel, gulfs, straits".

### 2. The stated rule is not the rule the table follows (medium)

**Where.** a-h4, "How I chose between forms" points 1–2, and "Settled conventions" 1; `drafts-data.json` [2] `conventions[0]`; `draft-lead.md`, "The rule".

**Problem.** The rule as stated says: Faden 1807 first; naval usage breaks ties; the visitor test applies where the charts disagree. The rulings do not follow that order.
- Seven forms follow the usage of 1805 against Faden:

  | Set | Faden 1807 has |
  | --- | --- |
  | ATLANTIC OCEAN | ATLANTIC OR WESTERN OCEAN |
  | Canary Islands | CANARY ISLES |
  | Azores or Western Islands | AZORES OR WESTERN ISLES |
  | Marseilles | Marseille |
  | Carthagena | Cartagena |
  | C. St. Mary | C. S. Mary |
  | Barbary | FEZ and MOROCCO |

- Guadalquivir and Cape Verde Islands follow the visitor test against both Faden and usage.

If the rule were applied to later names as written, it would reverse forms the table has settled, and the history notes would describe a method the table does not use.

**Fix.** Replace the policy text in all three places with:
> **Policy.**
> 1. Where the English charts and maps of 1800–1807 agree, letter their form, even if it looks odd today, and record it (Barbadoes, Bourdeaux, Guadaloupe, Ivica, Algeziras).
> 2. Where they disagree, drop any form a modern visitor would take for a misprint or for another place (Martinico, Guadalquiver, Cape Verd, Western Islands alone, Batavia, Algier).
> 3. Among the forms left, the naval and printed usage of 1805 decides (Nelson, the logs, the *Naval Chronicle*, Norie, Malham). Examples: Atlantic Ocean; English Channel; Canary Islands; Islands rather than Isles for the Azores; Marseilles; Carthagena; Rochefort; C. St. Mary; Douro; Barbary.
> 4. Faden's chart of 1807, which the scene imitates, breaks any tie that remains.
> 5. A region that no chart of the period letters in its body takes the name used in the period's prose and chart titles (West Indies).

For the draft-lead "The rule" line:
> Where the English charts of 1800–1807 agree, the chart letters their form even if it looks odd today. Where they disagree, it drops forms a visitor would misread and lets the usage of 1805 decide among the rest. Faden's chart of 1807 is the last tie-break.

### 3. Two departures from the model chart are missing from the doubts (medium, omission)

**Where.** a-h4, "Doubts for history-notes.md"; `drafts-data.json` [2] `doubts`; `draft-lead.md`, "Where the period's own sources disagree".

**Problem.** Two names on the chart now are not lettered as the model chart letters them, and the doubts list neither.
- **West Indies.** By the adjudication's own reading, no chart read letters it in the map body; the ruling rates the label medium.
- **Barbary.** Faden 1807 and Cary 1804–1805 letter the Barbary states instead.

**Fix.** Add these two entries:
> **West Indies.** The chart letters West Indies. It was the universal name in 1805, in Nelson, Malham and the *Naval Chronicle*. It is also the name in chart titles (Arrowsmith 1803; Cary's *West India Isles*, 1803; Heather's catalogue) and in Faden's track legend (1807). No English chart of 1794–1807 read letters it in the map body. Faden (1807), Cary (1803) and Arrowsmith (1803) engrave the arc of islands as the Caribbee Islands, and the sea where the chart's label lies as the Caribbean Sea.

> **Barbary.** The chart letters Barbary, as Laurie & Whittle (1794) and Heather (1800, and the Strait plate of about 1809) do, and as Nelson and Malham write. Heather also titles his harbour plates of 1809 "in Barbary". Faden (1807) and Cary (1804, 1805) letter the states instead: Fez, Morocco, and Algier or Algiers.

### 4. West Indies: settled role "island", gazetteer "land" (low, chart mismatch)

**Where.** a-h4, ruling "West Indies (role)" and its settled-table row; `drafts-data.json` [2]: the `finalNames` entry "West Indies" (`role: "island"`) and the ruling's final statement.

**Problem.**
- The ruling says to set the West Indies in "the 'island' role" and adds "The gazetteer already does this".
- Commit 5f8032f, the same one that applied the adjudication, changed it to `role: "land"` (gazetteer.ts, line 243): "A region, lettered like a land: it fades out close up".
- That matches "Countries and regions" in the type roles of `decisions.md`, and the adjudication's own convention 9.
- Applying the settled table as it stands would revert the engine's change.

**Fix.**
- Settled-table row:
  > | West Indies | West Indies | land | none | CARIBBEE ISLANDS for the arc (Faden 1807, Cary 1803, Arrowsmith 1803); CARIBBEAN SEA for the sea under the label | high | Regional label in roman, lettered like a land (it fades out close up), as the gazetteer sets it |
- In the ruling, replace "(the 'island' role), never in the italic of waters. The gazetteer already does this." with:
  > (the "land" role of countries and regions), never in the italic of waters, as the gazetteer sets it since commit 5f8032f.
- In `drafts-data.json` [2] `finalNames`: `role: "land"`.

### 5. Huelva: Faden engraves Huelba (low, factual error; later scenes)

**Where.** a-h4, "Further names", row "Huelva" (with no alternatives); `drafts-data.json` [2] `finalNames` "Huelva"; and h4, H4-65, "[F07] and [H00] 'Huelva'".

**Problem.**
- Faden 1807 engraves **Huelba** (read clearly in close-up).
- L&W Spain appears to have "Huelba" as well.
- Heather 1800's name is engraved over the hachures and I could not read it with certainty.
- Malham (1795) writes "Guelva".
- Under the adjudication's own rule (charts agree → keep the odd form), the chart would letter Huelba.

**Fix.** Settled row:
> | Huelva | Huelba | place | Huelva (the Spanish spelling, and today's); Guelva (Malham 1795) | medium | Faden 1807 engraves Huelba (read), as Laurie & Whittle's Spain and Portugal (1794) appears to; h4 read "Huelva". Heather 1800's name lies on the hachures. Kept as the charts read have it. If an English chart of 1800–1807 shows Huelva, the visitor rule gives Huelva. |

Add a doubt:
> **Huelva.** Huelba: Faden 1807, and apparently Laurie & Whittle 1794. Guelva: Malham 1795. Huelva: the Spanish spelling, and today's.

### 6. Carthagena is not a form "the charts agree on" (low)

**Where.** a-h4, "How I chose" point 2; the settled-table row "Cartagena (Spain)", note "Old English spelling; keep"; doubt 18. `drafts-data.json` [2] `conventions[0]` and `doubts[17]`. `draft-lead.md`, "The rule".

**Problem.**
- Carthagena is listed with Barbadoes, Bourdeaux and Guadaloupe as a form the charts agree on.
- In fact Faden 1807, the model, engraves the Spanish port **Cartagena** (read), and keeps "Carthagena" for Cartagena de Indias on the same plate (read).
- The table itself records "Cartagena (Faden 1807)".
- Usage of 1805 is one-sided: Nelson has Carthagena 39 times in vols 6–7 and Cartagena never; Malham 42 to 0; the *Naval Chronicle* has Carthagena.

**Fix.**
- Remove Carthagena from the lists of forms the charts agree on.
- Settled note:
  > Charts disagree (Cartagena on Faden 1807); the usage of 1805 decides; an old spelling, not a misprint.
- Replace the Carthagena clause of doubt 18 with its own entry:
  > **Carthagena.** Carthagena: Cary 1804; Laurie & Whittle (1794); Heather's chart catalogue of about 1806 ("The Harbours of Gibraltar, Malaga, Carthagena…"); Nelson; the *Naval Chronicle*; Malham. Cartagena: Faden 1807 for the Spanish port, while the same plate letters Cartagena de Indias "Carthagena".

### 7. Capes and the article: the stated basis is wrong (low, factual error)

**Where.** a-h4, ruling "Lettering: capes" and conventions 5 and 12; `drafts-data.json` [2] `conventions` "Capes" and "Article".

**Problem.**
- The adjudication says "Cape" is spelled out only on large-scale coastal plates. Small-scale maps spell it too:
  - Faden 1807, in the crop a-h4 itself cites, has "Cape Geer" and "Cape Nun" beside "C. Agulon".
  - Arrowsmith 1802 has "Cape Verde", "Cape Nun", "Cape Agulon", "Cape Geer" and "Cape Roxo".
  - L&W Spain has "Cape Sᵗ Vincent" and "Cape Sᵗ Mary".
- Convention 12 says Faden letters names without the article, but Faden engraves **THE NORTH SEA**.
- Both conventions still stand as the chart's choices; only their stated basis needs correcting.

**Fix.**
- Ruling "Lettering: capes", first two sentences:
  > "C." with a stop is the usual form at small scale: Faden 1807 for every European cape, and Cary. "Cape" is spelled out on large-scale coastal plates: Heather 1800 CAPE Sᵀ. VINCENT; Heather c. 1809 Cape Trafalgar, CAPE SPARTEL, Cape Plata. It is also spelled out for some capes on small-scale maps: Faden 1807 Cape Geer and Cape Nun; Arrowsmith 1802 Cape Verde and Cape Nun; Laurie & Whittle's Spain and Portugal (1794) Cape Sᵗ Vincent and Cape Sᵗ Mary.
- Convention 5, first sentence:
  > "C." with a stop, italic, at every zoom: the usual small-scale form (Faden 1807 for every European cape). The period also spelled "Cape" on large-scale plates and for some capes elsewhere.
- Convention 12:
  > No article ("Atlantic Ocean", "English Channel"). Faden letters the ocean and the Channel without it, as Cary 1803 and Arrowsmith 1803 letter the ocean. Faden has THE NORTH SEA, and Heather 1800 and Cary 1804 have THE ATLANTIC OCEAN.

### 8. Lizard and Start Pt. follow different rules (low, style)

**Where.** a-h4, "Further names", rows "Lizard Point" and "Start Point"; convention 5; `drafts-data.json` [2] `finalNames`.

**Problem.**
- Faden letters both points bare: "Lizard" and "Start".
- The table keeps Faden's bare "Lizard" but turns his "Start" into "Start Pt.".
- Convention 5 says points take "Pt.".
- "Start" alone would read as an instruction on a scroll-driven page, so "Start Pt." is the right choice, and "Lizard" should follow it.

**Fix.** Row:
> | Lizard Point | Lizard Pt. | cape | Lizard (Faden 1807; Cary 1804); "the Lizard" (prose) | high | Lizard Pᵗ on Laurie & Whittle 1794 (read); Pt. as for Start Pt. (convention 5) |

### 9. "Printed English of 1805" cites 1840s type (low, unsupported)

**Where.** a-h4, ruling "Cape St Vincent" ("Printed English of 1805 always has the stop: … in Nelson (30 and 35 hits…)"); `draft-lead.md`, bullet "Type" ("as printed English of 1805 always had it ('Cape St. Vincent' in Nelson's letters)").

**Problem.**
- Nelson's letters are counted in Nicolas's edition of 1844–46, so their stops are 1840s type.
- The period print evidence exists and is unanimous: Malham 1795 has 20 with the stop and none without; Norie 1805, 8 to 0; the *Naval Chronicle* of 1805, 2 to 0 (my recounts).

**Fix.**
- Ruling:
  > Printed English of the period has the stop: "Cape St. Vincent" in Malham (1795, 20 times), Norie (1805, 8) and the *Naval Chronicle* of 1805 (2), never without it. Nicolas's edition of Nelson (1845–46) prints it the same way (30 and 35), but its type is of the 1840s.
- Draft-lead:
  > as printed English of the period had it ("Cape St. Vincent" in Malham, Norie and the *Naval Chronicle*).

### 10. Doubts with incomplete attributions (low, omission)

**Where.** a-h4, doubts 5, 10, 12 and 16, and the further-names rows "El Puerto de Santa María" and "Tétouan"; the same items in `drafts-data.json` [2].

**Problem.**
- Doubt 5 says Heather's chart titles have "Atlantic or Western Ocean". His catalogue also sells no. 41, "… and Part of the Atlantic Ocean".
- Doubt 10 lists Faden's "C. S. Mary" as a source of the form C. St. Mary.
- Several forms are missing:
  - L&W Spain: "Cape Sᵗ Mary", "GULF OF LYON", "P. S. Mary" (h4 had found Port St. Mary unattested) and "Tetwen".
  - Heather's chart title "Cape Verd Islands" (no. 52).
- The navigation books for "Cape Verd" are not named.

**Fix.**
- Doubt 5:
  > **The ocean.**
  > - ATLANTIC OCEAN: Cary 1803 and Arrowsmith 1803. THE ATLANTIC OCEAN: Heather 1800 and Cary 1804. It was also the usual name in print (Malham, Brookes, Norie).
  > - ATLANTIC or WESTERN OCEAN: the ocean charts of Laurie & Whittle (1794) and Faden (1807); Laurie & Whittle's Spain and Portugal (1794); and two of Heather's chart titles of about 1806, though a third has "Part of the Atlantic Ocean".
  > - WESTERN OR ATLANTIC OCEAN: Cary's Spain (1801).
  > - The *Naval Chronicle* of 1805 lists Spanish prizes taken "on the Western Ocean".
- Doubt 10:
  > **Cape St Mary.**
  > - C. St. Mary: Nelson's "Cape St. Mary", the logs, the *Naval Chronicle* and Malham. Engraved as Cape Sᵗ Mary on Laurie & Whittle's Spain and Portugal (1794).
  > - C. S. Mary: Faden 1807.
  > - C. St. Maria: Heather 1800.
  > - C. Sta. Maria: Cary 1801.
- Doubt 12:
  > **Gulf of Lyons.** Gulf of Lyons: Cary 1801 and 1804, Nelson, Malham and Brookes. Gulf of Lyon: Laurie & Whittle's Spain and Portugal (1794). Gulf of Lion: older charts (La Rochette 1780; Laurie & Whittle 1794, per h4).
- Doubt 16:
  > **Cape Verde Islands.**
  > - Cape Verde Islands: Arrowsmith 1802.
  > - Cape Verd Isles: Faden 1807 and Cary 1805.
  > - Cape Verd Islands: Laurie & Whittle 1794 and Heather's chart catalogue of about 1806.
  > - Norie (1805) and Moore (1800) write Cape Verd.
- Alternatives for El Puerto de Santa María:
  > Sta. Maria (Knight c. 1795); P. S. Mary, that is Port St. Mary (Laurie & Whittle's Spain and Portugal, 1794); Puerto de Santa Maria (Nelson)
- Alternatives for Tétouan:
  > Tetwen (Laurie & Whittle's Spain and Portugal, 1794)

## The conventions, checked across every name

- **"St." with a stop.** Every saint in the settled forms is "St." (C. St. Vincent, St. Lucar, St. Maria, St. John's, St. Lucia, St. Vincent, St. Domingo, C. St. Mary). Faden's and Cary's plain "S." becomes "St." throughout, as convention 5 says. Consistent.
- **"C." for capes.** Every cape is "C. Name", except where the period spelled the name out or used "Pt.": Rock of Lisbon, Europa Point and Start Pt. Lizard is the exception that breaks the rule (issue 8). The factual basis needs correcting (issue 7).
- **Accents.** None in any settled form; accents appear only in the "Modern" column. Consistent.
- **Spaced capitals.** Only the ocean and seas are in spaced capitals (ATLANTIC OCEAN, MEDITERRANEAN SEA, NORTH SEA, CARIBBEAN SEA). Every other role is in upper and lower case. Consistent with the brief and `decisions.md`.
- **Characters.** Plain letters, the stop and the space for all 34 names (the check passes). L'Orient and St. John's need an apostrophe; the table notes the font check only for L'Orient.
- **Double names and the article.** The small "or" and the absence of "The" are applied throughout; the stated basis for the article needs correcting (issue 7).
- **Readers today.**
  - Barbadoes may look like a misprint. It is kept under rule 1 and recorded.
  - "Western Islands" alone would have pointed to the Hebrides; that is resolved by the double name.
  - "Start" alone would read as an instruction (issue 8).
  - No other on-chart form would be taken for a slip or another place.

## The doubts, checked for "each form with who used it"

- **Complete:** doubts 1 (Martinique), 2 (the Channel), 3 (the Azores), 4 (Canary), 7 (Guadalquivir), 8 (Algeciras), 9 (Rochefort), 11 (Cabo da Roca), 13 (Douro), 14 (Tangier), 15 (Barbadoes), 17 (Sahara) and 19 (Straits).
- **Needs a fix:**
  - 6 (Gulf of Cadiz): wrong and incomplete (issue 1).
  - 5, 10, 12 and 16: incomplete (issue 10).
  - 18 (odd forms kept): miscategorises Carthagena (issue 6).
- **Missing:** West Indies and Barbary (issue 3), and Huelba if issue 5 is applied.

## Evidence (crops I read)

**Laurie & Whittle, *A New Map of the Kingdoms of Spain and Portugal*** (12 May 1794; Rumsey copy from the *New Universal Atlas*, 1804): https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~31533~1150012. Crops from `https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~31533~1150012/`:
- GULF OF CADIZ across the bight, Cape Sᵗ Mary, Ayamonte, the Algarve: `1700,4500,2600,1900/1600,/0/default.jpg`
- CADIZ, Rota, P. S. Mary, Pᵗᵒ Real, STRAITS OF GIBRALTAR, Tangier, Ceuta, Tetwen: `3200,5200,1300,1000/full/0/default.jpg`
- Huelba: `2900,5050,450,250/full/0/default.jpg`
- GULF OF LYON: `7500,1400,1400,450/1000,/0/default.jpg`
- Cape Sᵗ Vincent: `1250,4600,1300,700/1000,/0/default.jpg`
- Imprint: `7850,5000,1350,1300/1000,/0/default.jpg`
- Overview, with ATLANTIC or WESTERN OCEAN and BAY OF BISCAY or GULF OF GASCONY: `full/1800,/0/default.jpg`

**Faden 1807**, from `https://hdl.huntington.org/iiif/2/p15150coll4:10207/`:
- Huelba: `7160,3340,140,140/full/0/default.jpg`
- C. Sᵗ. Vincent with its stop: `6920,3420,200,80/full/0/default.jpg`
- Iberia, with the Gulf unnamed: `6850,2950,600,600/full/0/default.jpg`
- The Strait unnamed, Tangier, Ceuta: `7150,3400,700,400/full/0/default.jpg`
- Cartagena (Spain), Ivica: `7400,2900,800,600/full/0/default.jpg`
- Carthagena and the province CARTAGENA (New Granada): `1200,5500,1300,700/full/0/default.jpg`
- Cape Geer, Cape Nun, MADEIRA ISLES, CANARY ISLES: `6100,3700,900,700/full/0/default.jpg`
- THE (North Sea): `7100,650,1100,500/full/0/default.jpg`
- ENGLISH CHANNEL, Lizard, Start: `6950,1600,1100,600/full/0/default.jpg`
- AZORES OR WESTERN ISLES: `5000,3080,1200,420/full/0/default.jpg`
- CARIBBEE ISLANDS, Martinique, Barbadoes: `2700,4650,700,1000/full/0/default.jpg`
- Track legend: `3300,4200,2600,1200/1300,/0/default.jpg`

**Heather 1800**, sheet 3 (full file), https://commons.wikimedia.org/wiki/File:A_New_Chart_of_the_Coast_of_Portugal_-_by_W._Heather_;_Drawn_by_J._Norie..._;_Stephenson_sculpt._-_btv1b532672358_(3_of_4).jpg:
- GULF OF CADIZ: x 4300–5900, y 1500–3600.
- CAPE Sᵀ. VINCENT: x 4100–4900, y 5120–5380.
- Huelva coast: x 3700–4600, y 1700–3200; the name itself at about x 4060–4300, y 2440–2600, uncertain.

**Laurie & Whittle, *The Atlantic Ocean*, 1794**, from `https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~374636~90141135/`:
- AZORES or WESTERN ISLANDS: `6250,3850,1250,450/full/0/default.jpg`
- THE CHANNEL, Lizard Pᵗ: `7800,2350,1300,750/1000,/0/default.jpg`
- Martinico, Barbados: `3500,6150,1000,800/full/0/default.jpg`
- BARBARY, in the overview: `full/1800,/0/default.jpg`

**Cary:**
- 1801, C. Sᵗ. Vincent: https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~21513~640006/1800,5250,900,600/full/0/default.jpg
- 1801, south coast: https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~21513~640006/2600,5300,2400,1300/1600,/0/default.jpg
- 1803, overview: https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~21553~640045/full/1800,/0/default.jpg
- 1803, MARTINIQUE: https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~21553~640045/8100,5300,1400,1000/full/0/default.jpg
- 1805, NORTH PACIFIC OCEAN: https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~21543~640035/2550,2350,400,1400/full/0/default.jpg

**Arrowsmith:**
- 1802, from `https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~233051~5509636/`:
  - WESTERN ISLANDS: `3000,400,2400,700/1600,/0/default.jpg`
  - CANARY ISLANDS, Cape Nun, Cape Agulon, Cape Geer: `4400,2600,2600,1200/1600,/0/default.jpg`
  - CAPE VERDE ISLANDS, Cape Verde, Cape Roxo: `1200,6700,3200,1400/1600,/0/default.jpg`
  - Dedication, Rathbone Place, 1 November 1802, with no "additions" date beside it: `20800,5300,4600,1500/1600,/0/default.jpg`
- 1803, from `https://iiif.digitalcommonwealth.org/iiif/2/commonwealth:x633f8794/`:
  - ATLANTIC OCEAN: `full/1800,/0/default.jpg`
  - MARTINICO, BARBADOES: `18300,8450,1400,1400/1000,/0/default.jpg`

**Texts:**
- Norie 1805 with Heather's catalogue, leaf n642: nos. 39 (Carthagena), 41 ("Part of the Atlantic Ocean"), 44 ("Straits of Gibraltar"), 46 ("Canary Islands") and 52 ("Cape Verd Islands"). https://archive.org/details/norie-1805-a-new-and-complete-epitome-of-practical-navigation/page/n642
- *Naval Chronicle* vol. 14: https://archive.org/details/navalchronicleco14londiala
- Malham 1795:
  - https://archive.org/details/bim_eighteenth-century_the-naval-gazetteer-or-_malhan-john_1795_1 ("Guelva")
  - https://archive.org/details/bim_eighteenth-century_the-naval-gazetteer-or-_malhan-john_1795_2
- Brookes 1807 (Alcoutim, Faro, Tavira on the gulf):
  - https://archive.org/details/in.ernet.dli.2015.91219/page/n35
  - https://archive.org/details/in.ernet.dli.2015.91219/page/n248
  - https://archive.org/details/in.ernet.dli.2015.91219/page/n684
- Nelson's *Dispatches*:
  - https://archive.org/details/dispatchesletter06nelsiala
  - https://archive.org/details/dispatchesletter07nelsuoft

**My counts:**

| Source | Form | Count |
| --- | --- | --- |
| Nelson vols 6–7 | Carthagena / Cartagena | 39 / 0 |
| Nelson vols 6–7 | Cape St. Vincent, with the stop / without | 65 / 0 |
| Malham 1795 | Carthagena / Cartagena | 42 / 0 |
| Malham 1795 | Cape St. Vincent, with the stop / without | 20 / 0 |
| Malham 1795 | Gulf of Cadiz | 0 |
| Norie 1805 | Cape St. Vincent, with the stop / without | 8 / 0 |
| Norie 1805 | Cape Verd / Cape Verde | 4 / 0 |
| *Naval Chronicle* 14 | Martinico / Martinique | 2 / 12 |
| *Naval Chronicle* 14 | Barbadoes / Barbados | 22 / 0 |
| *Naval Chronicle* 14 | Western Ocean / Atlantic Ocean | 4 / 1 (the four are one prize list) |
| *Naval Chronicle* 14 | Gulf of Cadiz | 0 |

## Limits

- **Heather 1800's Huelva** is engraved over the hachures and stays uncertain. Cary 1801's is hidden under the river mouth. L&W Spain's reads Huelba with reasonable but not complete certainty. Faden's is clear.
- **L&W Spain** is a land map in an atlas, not a sea chart. The adjudication counts Cary's atlas maps as charts too, so it is cited on the same footing. Its plate is of 1794; the copy read is from the 1804 atlas.
- **Not re-read:** Cary 1804 *Europe* (BRITISH CHANNEL, Tangiers, Rochfort, Carthagena: v-h4's and a-h4's readings stand), Heather's Strait plate of c. 1809, and the Tuckey passages.
