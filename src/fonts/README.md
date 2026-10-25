# Fonts

Both families are licensed under the SIL Open Font License 1.1 (see the OFL files in this folder) and were downloaded from Google Fonts. The variable TTF files were converted to WOFF2 without other changes.

| File | Family | Role | Axes |
| --- | --- | --- | --- |
| BodoniModa-Variable.woff2 | Bodoni Moda (Owen Earl, indestructible type*) | `--font-display`: the title | wght 400–900, opsz 6–96 |
| BodoniModa-Italic-Variable.woff2 | Bodoni Moda Italic | display italic, if needed | wght 400–900, opsz 6–96 |
| Baskervville-Variable.woff2 | Baskervville (ANRT) | `--font-text`: everything else | wght 400–700 |
| Baskervville-Italic-Variable.woff2 | Baskervville Italic | text italic | wght 400–700 |

Bodoni Moda has an optical-size axis: use `font-optical-sizing: auto` so the large title gets the high-contrast display cut automatically.

Wired in `index.ts` in this folder. Only the two upright files are loaded; the italics are kept for later scenes. See `docs/fonts.md`.
