# Check of the edited "Scene 2" section (v-merged-final)

- **Original:** `D:/dev/trafalgar-1805/docs/research/scene-02/history-scene-02-merged.md` (434 lines).
- **Edited copy:** `C:/Users/User/AppData/Local/Temp/claude/1fecec330312171d/ba5d50ac-493e-4616-9a47-113ae911c256/scratchpad/history/history-scene-02.md` (453 lines).
- **Diff read in full:** `C:/Users/User/AppData/Local/Temp/claude/1fecec330312171d/ba5d50ac-493e-4616-9a47-113ae911c256/scratchpad/history/edit.diff`.
- **Measured against:** `a-v-merged-h1.md`, `a-v-merged-h2.md`, `a-v-merged-h3.md`, `a-v-merged-lead.md` (every ruling and every "text to apply"); `v-h6-september.md` sections 5, 7 and 8 with `h6-september.md`; the owner's seven decisions; `docs/progress.md` and `docs/decisions.md` (dates of the decisions, "Kept off the land", "Smooth from near to far"); the code in `src/scenes/02-road/` (`routes.ts`, `movements.ts`, `fleets.ts`, `squadrons.ts`, `camera.ts`, `content.ts`, `gazetteer.ts`, `beats.ts`, `dates.ts`, `director.ts`, `stage.ts`); `docs/research/scene-02/a-h2c.md` (H2-30c, H2-30g, H2-31a–b) for the weighing hours.
- **Scripts** (in `C:/Users/User/AppData/Local/Temp/claude/1fecec330312171d/ba5d50ac-493e-4616-9a47-113ae911c256/scratchpad/scripts/`):
  - `vmf-texts.mjs`: looks for every quoted ruling text and every v-h6 section 7 bullet in the copy, verbatim, and shows where any departs.
  - `vmf-lost.mjs`: tokens (numbers, citations, quoted strings, names, links) in one file and not the other, both ways.
  - `vmf-lint.mjs`: table column counts, stray diff marks, list markers, unbalanced quotes, backticks and italics, long quotations, process words.
  - `vmf-dawn.mjs`: replicates `fleets.ts` `dawnBerths()` (same RNG and seeds) and measures the dawn layout, with distances to Natural Earth 10m land and minor islands.
  - `vmf-heading.mjs`: replicates `movements.ts` `track()`/`shipAt()` for the combined fleet's headings on the night of 20–21 October.
- Nothing in the repository was changed.

## Verdict

The edit is faithful.
- **Rulings.** Every "holds" and "partly" ruling of the four files is applied. Where a text is not verbatim, a later ruling or the September check supersedes it: lead 6 and 7 on the quotations, lead 9 on the fleet-table intro, lead 2 on licences 3 and 7, the owner's decision 6 on brief row 4, h2 ruling 1 over h3 ruling 17, and v-h6 over the lead's September texts.
- **The September passage** is in from v-h6 section 7 (A–G) and section 8, with the leg matching `nelson-september.json` and `routes.ts` point for point.
- **The two scene statements** (licences 8 and 9) match `movements.ts` exactly.
- **The owner's decisions** reach every place they touch. The withdrawn spread-out licence has left no trace.
- **Nothing lost.** The original lost nothing that a ruling does not remove.
- **Markdown and style.** The Markdown renders. The style holds.

What needs fixing is about the code, not the history:
- **Two medium issues.**
  - Four "Glyphs" cells of "Fleet sizes at each stage" say what the scene places, and the code places something else. This is an unrecorded licence.
  - Licence 7, with the night table's midnight row, says the combined fleet's glyphs face 193° and not the drawn segment. The code turns them onto the segment, about 145–150°, for most of the night.
- **Six low issues.**
  - Two distances in "What the chart draws".
  - Two exceptions missing from licence 8.
  - Two versions missing from the September doubt.
  - One unmarked Corbett phrase.
  - An ambiguous column definition.
  - Two squadron stages missing from the fleet table.

## Issues

### 1. Fleet sizes: four "Glyphs" cells contradict the scene (medium; code)

**Where.** The section defines the column as "how many ship glyphs the full scene places at that moment", but four rows say otherwise than the code:
- "The British off Cádiz" (from 30 August): 26;
- "Nelson joins" (28 September): 29;
- "Louis leaves for Gibraltar" (2 October): 23;
- "The October peak" (13 October): 28.

**What the code does.**
- **No British fleet off Cádiz from 22 August.** `squadrons.ts` shows Collingwood's three only from 19 to 22 August, and no British squadron off Cádiz after that.
- **Fleets from the end of September.** `director.ts` (`applyFleets`) brings both fleets' glyphs in from p = 0.655, about 30 September.
- **The same 27 throughout.** `movements.ts` gives every ship of `BRITISH` keys from 28 September, and `shipAt` is false only before the first key. So from the end of September to dawn the scene draws the 27 of the line that fought at Trafalgar, and only those:
  - the Defiance, Royal Sovereign, Belleisle, Agamemnon and Africa, which joined on 7–14 October, stand there from the start;
  - so does the Leviathan, away at Gibraltar until the 8th;
  - Louis's five, the Donegal and the Prince of Wales are never drawn.
- **The combined fleet at its October anchorage.** It is drawn at its anchorage of 10–19 October (`ANCHORAGE`) from the same moment. "Into the roadstead" has it further in until 9–10 October.
- **The licence list is silent.** "Assumptions and licences" records none of this.

**Fix.** These are the texts if the scene stays as built. The alternative is to make the scene follow the table.
- Fleet sizes, row "The British off Cádiz", Glyphs cell: `none (see "Assumptions and licences", 15)`
- Row "Nelson joins", Glyphs cell: `27 (see "Assumptions and licences", 15)`
- Row "Louis leaves for Gibraltar", Glyphs cell: `27`
- Row "The October peak", Glyphs cell: `27`
- "Assumptions and licences", a new last item:

> 15. **The fleets off Cádiz from 28 September.** Beat 4 passes from Nelson's arrival to 18 October in about a viewport height of scroll, and the scene does not follow the British fleet's changes of strength through those weeks (see "The count through October"). From the end of September it draws the 27 of the line that fought at Trafalgar, and only those, at the station and in the chain: the Defiance, Royal Sovereign, Belleisle, Agamemnon and Africa, which joined between 7 and 14 October, and the Leviathan, away at Gibraltar until 8 October, stand there from the start; Louis's five, the Donegal and the Prince of Wales are not drawn. The combined fleet lies at its anchorage of 10–19 October from the same moment, where the sources have it further in until 9–10 October (see "Into the roadstead"). Between Collingwood's three of 20 August and Nelson's arrival the scene draws no British ships off Cádiz (`src/scenes/02-road/movements.ts`, `squadrons.ts`).

### 2. Licence 7 and the night table: the combined fleet's glyphs do face the drawn segment (medium; code)

**Where.**
- Licence 7 ends "the combined fleet's glyphs face its course, about 193° true, not the drawn segment".
- The midnight row of "Positions, night of 20–21 October" says to "orient the glyphs to the course, not to the segment".

**What the code does.**
- **How `shipAt` turns a glyph.** `shipAt` (`movements.ts`) eases a glyph from the key's heading onto the leg's own course over the first quarter of each leg. It holds that course through the middle half and turns to the next key's heading only in the last quarter.
- **The keys and legs.** The combined fleet's night keys (11 a.m., 6.30 p.m. and midnight on the 20th) carry 193°. The legs between them run 189° (forming to nightfall), 145.5° (nightfall to midnight) and 150° (midnight to dawn).
- **What the replica shows.** Replicated (`vmf-heading.mjs`), the glyphs face 145.5° from about 7.50 to 10.40 p.m. and about 150° from about 1.40 to 5 a.m. That is the drawn segment, which no source supports: Villeneuve's night course was SW by S by compass, about S by W true, and the French reports keep him on it.
- **The director keeps it.** `director.ts` only smooths these headings (`easeHeadings`); it does not change them.

**Fix.**
- **Preferred: change the code, not the text.** In `movements.ts`, the combined fleet's glyphs should hold 193° along the legs between the keys that carry it, from 11 a.m. on the 20th to midnight, and turn to the dawn heading only near dawn. One way: a key flag that `shipAt` keeps between two keys that both have a heading.
- **If the code stays,** licence 7's last clause becomes:

> ; the combined fleet's glyphs face 193° true, its signalled course, at 11 a.m., at nightfall and at midnight, and between those moments turn onto the drawn segment, about 145° true in the evening and 150° after midnight (`src/scenes/02-road/movements.ts`).

- **And the night table's midnight row** then ends: "…against the signalled 193°: the track is drawn loosely, and the glyphs face the signalled course only at its keys (see "Assumptions and licences", 7)".

### 3. "What the chart draws": two distances the chart does not draw (low; code)

**Where.** "Positions on the chart", "What the chart draws": "its northern end 7–9 nm off the coast by the British reckoning", and "the Euryalus 5–6 nm west of the enemy".

**What the code does.** Replicated with the code's own RNG and seeds (`vmf-dawn.mjs`):
- **The northern end.** The northernmost ship of the combined fleet (the Formidable, 36°12.3′ N 6°13.4′ W) lies 6.7 nm from Natural Earth's coast.
- **The Euryalus** (36°10.2′ N 6°19.8′ W) lies 4.8 nm from the nearest ship of the main body and 3.1 nm from the nearest of Gravina's squadron, which is the enemy's western, windward part.

Everything else in the bullet checks:
- Nelson's group is within 1.3 nm of the Victory.
- Collingwood's group is centred 3.6 nm at 168° from her.
- The Africa is 13.1 nm at 353°.
- British headings run 44–51° and combined headings 182–193°.
- The combined centroid is at 36°09.1′ N 6°14.6′ W, 9.5–12.6 nm from the Victory.
- The main body's line is 5.2 nm long.

**Fix.** If the glyphs are not moved in `fleets.ts`:
- Replace "its northern end 7–9 nm off the coast by the British reckoning, heading 180–195° true" with: `its northern end about 7 nm off the chart's coast (7–9 nm by the British reckoning), heading 180–195° true`.
- Replace "the Euryalus 5–6 nm west of the enemy" with: `the Euryalus about 5 nm west of the main body and 3 nm from Gravina's squadron (5–6 nm west of the enemy in the sources)`.

### 4. Licence 8 leaves out the chain and the frigates (low; code precision)

**Where.** Licence 8, "The British keep their full dawn order about the Victory at the station until the chase on the morning of the 19th".

**What the code does.**
- **The chain.** In `movements.ts` the Defence, Agamemnon, Colossus and Mars stand at their chain positions (`CHAIN`) from 28 September until 9.30 a.m. on the 19th, not in the dawn order.
- **The frigates.** The four British frigates never take a share of a dawn offset. They follow their own places (`frigateKeys`, the tables under "How the chart shows the signals").

**Fix.** Replace that clause with:

> The British keep their full dawn order about the Victory at the station until the chase on the morning of the 19th, but for the Defence, Agamemnon, Colossus and Mars, which stand in the chain until then, and the frigates, which have places of their own throughout (the tables under "How the chart shows the signals");

### 5. The September doubt lacks two versions the section gives (low; missing version)

**Where.** Open doubts, "Nelson's September passage".

**What is missing.**
- **27 September.** "Joining" gives "some modern accounts give 27 September, or the 29th"; the doubt has only the 29th.
- **The variation.** v-h6 section 8, doubt 3 (gufm1 runs 1–3½° above the Victory's own observations; the leg keeps the model) appears in "Bearings" only as a fact, not as a doubt about the drawn line. Its effect, from v-h6 F18 (3° would move the Scilly point about 4 nm and the Lizard point about half a mile), is stated nowhere.

**Fix.**
- Replace "or the 29th (Fraser p. 22; some modern accounts), the day he took command." with:

> or the 29th, the day he took command (Fraser p. 22; some modern accounts); some modern accounts give 27 September (`research/scene-02/h2-boulogne-cadiz.md`, H2-15).

- Insert before "The Victory's own logs, read only in Nicolas's extracts":

> The line reads every bearing with gufm1's variation, which runs 1–3½° above the Victory's own observations of mid-August (Corbett 1910, p. 261 n.); 3° less would move the Scilly point about 4 nm and the Lizard point about half a mile.

- **Optional.** `h6-september.md` section 4 also has Desbrière implying the Euryalus was sent off Lisbon. v-h6 did not carry it, and it can stay out.

### 6. "The sortie" doubt keeps Corbett's words unmarked (low; style)

**Where.** Open doubts, "The sortie": "about 11 (Desbrière p. 163) or nearly noon (Corbett p. 337)".

**Why it matters.** "Nearly noon" is Corbett's phrase, unquoted. Lead ruling 6 paraphrased it in the body ("shortly before noon") so that his words would not stand unmarked, and licence 9 follows the body. Here the doubt and the body word it differently.

**Fix.** Replace "or nearly noon (Corbett p. 337)" with: `or shortly before noon (Corbett p. 337)`.

### 7. The fleet table's "Glyphs" counts only ships of the line, but does not say so (low; clarity)

**Where.** The intro of "Fleet sizes at each stage": "'Glyphs' is how many ship glyphs the full scene places at that moment".

**Why it matters.** The cells count only ships of the line. "Nelson's passage" has "1, then 3", while `squadrons.ts` draws the frigate Euryalus beside the Victory from 15 to 26 September, which makes 2, then 4, then 3. "Dawn off Cape Trafalgar" has 27 and 33 while the scene also draws 4 and 5 frigates.

**Fix.** Replace that sentence with:

> "Glyphs" is how many glyphs of ships of the line the full scene places at that moment; frigates drawn with them, such as the Euryalus with the Victory in September, are not counted.

### 8. Two squadron stages the scene draws have no row (low; completeness)

**Where.** "Fleet sizes at each stage".

**What the code does.** `squadrons.ts` draws two stages the table does not list:
- Calder's block with the two prizes, 17 glyphs, from about 8.30 p.m. on 22 July to 26 July;
- Nelson's block as the Victory alone, from 19 August, when he struck his flag, until she sails on 15 September.

**Fix.**
- After the row "After Finisterre" add:

> | Calder with his prizes | 22–26 July | 15, with the San Rafael and Firme as prizes from the evening of the 22nd | 17 | High |

- After the row "Nelson joins Cornwallis off Ushant" add:

> | The Victory at Spithead | 19 August – 14 September | 1 (Nelson struck his flag on the 19th) | 1 | High |

## Changes no ruling asked for: reviewed and kept

1. **Licence 9 covers 19 October as well as 20 October.** The task named the 20th. Every hour and figure was checked against `movements.ts` (`WEIGH`), against `a-h2c.md` (H2-30c, H2-30g, H2-31a–b) and against `decisions.md`, "Smooth from near to far". Keep.
   - **19 October.** The ships of the line weigh at 7.00, 7.58, 8.55, 9.53, 10.50, 11.48 and 12.46. The Hermione weighs at 1.43 p.m. and the Rhin at 2.41, and the Thémis at 5 p.m. Each reaches the harbour mouth 1 h 41 min after weighing.
   - **20 October.** The rest of the line weighs from 6.00 to 6.48 and is out by about 8.30. The Rayo weighs at 8.18 and is at the mouth at 9.59. The Cornélie and Hortense weigh at 7.00 and 7.04 and pass at 8.41 and 8.45. The fleet forms at 36°33.9′ N 6°25.2′ W at 11.
   - **The sources.** The Hermione was towed out (p. 161). The Thémis came out about 6 p.m. (p. 162). The Montañés has the seven under way at noon, and the Observateur, Montañés and Fougueux give the hours of the 20th.
2. **The stale "drawn now" wording is gone.** "Toulon to Cádiz (drawn now)" became "Toulon to Cádiz.", and "Only the Toulon–Cádiz line is drawn now; the others are data for the full scene" became "The scene draws every route in its beat …".
   - `stage.ts` draws all twelve legs of `routes.ts`: the eleven of `routes-draft.json` and the September leg.
   - `routes.ts` carries the corrections of rulings 1, 2, 11 and 16: the Vigo legs at 42.16–42.232 N, the São Miguel control point, the buoy channel, no Tetuan spur.
   - The old text was contradicted by the code. Keep.
3. **"What the chart draws" goes beyond the text of a-v-merged-h2 ruling 14.** It drops "The exact glyph positions are set when the scene is built" and describes the dawn layout as `fleets.ts` builds it. `progress.md` asks for this bullet to match the code. Verified (issue 3 apart). Keep.
4. **"To A Coruña" names the two Spaniards** (the Argonauta and Terrible). This is the optional "also noticed" of `a-v-merged-h1.md` (Desbrière p. 86). Keep.
5. **Licence 14's last sentence** says the September line starts at Spithead at the hour of Nelson's arrival. It comes from v-h6 section 8, doubt 4, and section 7 D. Keep.
6. **"Not consulted first-hand" adds Goodwin** to the modern biographies. He is in `h6-september.md` (sections 1 and 6); v-h6 section 8 names three. Keep.
7. **The September doubt** is titled "Nelson's September passage" and gathers the versions the body gives:
   - the sailing day, the hour on board, the 74s' hour, the Decade, the Euryalus and Cape St Vincent;
   - the noon of the 28th and the arrival;
   - the Sintra hills (v-h6 section 8, doubt 7).

   It drops v-h6's closing "Low.", as no other open doubt carries a confidence. Keep, with issue 5.
8. **"Decade" for v-h6's "Décade".** This is the section's own spelling ("The squadron", "the Decade's journal"). Keep.
9. **The dates attached to the owner's decisions** match `progress.md`. Keep.
   - 1 November: decisions 1–3 (session 10).
   - 5 November: decisions 4–6 (session 11).
   - 6 November: decision 7 (session 13's opening answers).
10. **The opening paragraph names `v-merged-*.md` and `a-v-merged-*.md`.** This is the lead ruling's optional note: a pointer to research files, not process language. Keep.

## Checked and found right

- **Rulings, text by text** (`vmf-texts.mjs`). Every quoted text of the four ruling files is in the copy, verbatim or superseded as listed under "Verdict".
  - a-v-merged-h1: rulings 1, 3–13, and 2 (data only, no section text).
  - a-v-merged-h2: rulings 1–20 and the decisions' texts.
  - a-v-merged-h3: rulings 1–16 and 18; 17 is superseded by h2 ruling 1, as the lead's note says.
  - a-v-merged-lead: rulings 1–15 and the decisions' texts.
- **Nothing lost** (`vmf-lost.mjs`). The original's 78 tokens missing from the copy are each removed by a ruling or a decision, or replaced by the September passage:
  - the French and Corbett quotations;
  - the old dawn coordinates and spread figures;
  - "15.5 nm", "8.7, S…", "Alborán 5.4 and", the 1825 Beatty leaves, the RSC download link;
  - "a chain of warships";
  - the Session comment.
- **v-h6 section 7.**
  - A (five bullets) and B are verbatim but for "Decade"; B is merged with h2 ruling 16's sentence.
  - C (the row), D1 and D2, E (Bearings) and G (the links) are applied.
  - F is applied and widened (above).
  - The leg in `routes.ts` matches section 5's corrected table on all 22 points.
- **The owner's decisions.**
  - **1.** The dawn layout is in "Dawn, 21 October", "Where this differs from scene 1", "What the chart draws", licences 1–2 and the dawn doubt. No "16 nm", "11 nm", "4.8 nm", "36°00′–36°16′" or "lab" remains. "The chart's dawn licences" doubt is deleted, and its source facts are kept in the dawn doubt.
  - **2.** 047° is a licence (licence 1; `movements.ts`, `fleets.ts`).
  - **3.** The caption appears in the brief row and "The chain" (`content.ts`).
  - **4.** The last frame looks ENE from the west of the British (licence 1, "What the chart draws"; `camera.ts` `LAST_EYE`, heading 77.5°).
  - **5.** "Invasion craft" appears in the brief row, "The craft" and `content.ts`.
  - **6.** September is in the brief row, the six bullets of "Nelson off Cádiz", Fleet sizes, Routes, Bearings, the doubts, licences 10 and 14, and Key sources.
  - **7.** Squadrons over small islands are licence 4.
- **Code.**
  - The "Positions, 19 October" and "Positions, night of 20–21 October" tables match the keys in `movements.ts` to 0.1′ (the frigates, the chain, the Victory, the combined fleet at nightfall and midnight, the British light).
  - The Toulon–Cádiz table matches `routes.ts` on all 20 points.
  - The squadron counts in `squadrons.ts` match the fleet-table rows, issues 1, 7 and 8 apart.
  - `gazetteer.ts` letters the 34 names, Tangier among them.
  - `day()` defaults to noon, so the 74s join at noon on the 18th, as the diary has it.
  - The anchorage rows lie inside the stated box of 36°33.4′–34.1′ N, 6°15.5′–17.2′ W. The only exception is jitter at the third row's WNW end, which reaches 36°34.15′ N, 0.05′ over. The two narrows ships stand at about 36°31.0′ N 6°15.2′ W.
- **Markdown** (`vmf-lint.mjs`).
  - Every table row has its header's column count.
  - There are no diff marks, broken bullets, or unbalanced quotes, backticks or italics.
  - Licences are numbered 1–14, and every cross-reference (3, 10, 1; items 1, 3, 10) points to the right item.
- **Style.**
  - No quotation reaches 12 words.
  - The only quotations from a modern author are Corbett's "Duff's easternmost ship", kept by ruling since the word is the evidence, and "or getting under sail", the signal's wording.
  - There is no process language.
  - Every new body bullet ends with its confidence.

## Outside the section (for whoever merges it)

- **`docs/decisions.md`** has four stale or missing entries.
  - "The dawn fleets are spread out: a licence (session 9)" (line 286) still stands. Decision 1 withdraws it, and it points to an open doubt the section no longer has.
  - The Stage B "Camera" paragraph has the last frame looking NNE from SSW. Decision 4 and `camera.ts` have it looking ENE from the west of the British.
  - "A group gives way to its lead" names three leads; `fleets.ts` has four, the Príncipe de Asturias among them.
  - Decision 7 (squadrons over small islands, 6 November) has no entry.
- **Route data and comments.** `routes-draft.json` still lacks the data changes of a-v-merged-h1 ruling 2: the Vigo legs, the notes, and Tetuan in the Ushant note. `routes.ts` has them, so the section's pointer stays true. The Toulon note in `routes.ts` still says "middle of the Grande Rade", where the section says "the eastern half".
- **Layers not yet on main.** The section describes, as the scene, things whose layers are on the agents' branches and not yet in `src/` on main:
  - the Finisterre smoke;
  - the huts and the flotilla at Boulogne;
  - the army's dashed line;
  - the signals by day and the night lights.

  The schooner Pickle, named in the night "Geometry", has no glyph in `fleets.ts`. Re-read those bullets against the code when the layers merge.
