# Fonts for text inside the 3D chart

troika-three-text loads fonts by URL at runtime and reads .ttf, .otf and .woff, but not .woff2. These are static instances of the site's two families, converted from the Google Fonts downloads to WOFF without other changes. They live in public/ so the static export serves them from the site's own origin.

| File | Use |
| --- | --- |
| Baskervville-Regular.woff | place names on the chart |
| Baskervville-Italic.woff | names of seas, bays and capes, as period charts set water names in italic |
| Baskervville-SemiBold.woff | the few names that need extra weight at a distance |
| BodoniModa-28pt-Regular.woff | large chart titles such as ocean names |
| BodoniModa-28pt-Italic.woff | large italic titles, if needed |

Licences: SIL Open Font License 1.1 (OFL-Baskervville.txt, OFL-BodoniModa.txt).
Always pass one of these URLs as the font: troika's default font would otherwise be fetched from Google's CDN.
