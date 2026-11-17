/**
 * The credits after the scenes: the chart's data with its sources' own
 * sources (ETOPO 2022's land heights come from FABDEM on the Copernicus DEM,
 * whose licence asks for its notice wherever adapted data reaches the
 * public), the type with ANRT's mention, and a link to the notices file
 * (public/third-party-notices.txt, `npm run notices`), which carries every
 * notice and licence in full: the minified bundle keeps none of them.
 *
 * Not on the fallback screen (the story is hidden there, read aloud only):
 * it shows no chart to credit, and a link in hidden text would be a stop
 * for the keyboard that nobody sees. The notices open in a new tab, so the
 * reader keeps their place at the end of a long scroll.
 */
export function Credits() {
  return (
    <footer className="bg-deep-sea px-[4.6vw] pt-[2vh] pb-[6.2vh] fallback:hidden">
      <div className="max-w-[56em] space-y-[0.5em] font-text text-[clamp(13px,1.75vh,17px)] leading-[1.5] text-ink">
        <p>
          Relief: NOAA NCEI ETOPO 2022, with land heights from FABDEM on the
          Copernicus DEM (© DLR e.V. 2010–2014, © Airbus Defence and Space GmbH
          2014–2018) and depths from GEBCO and GMRT. Coastlines and rivers:
          Natural Earth.
        </p>
        <p>
          Type: Bodoni Moda by Owen Earl; Baskervville by ANRT (Atelier National
          de Recherche typographique), Nancy.
        </p>
        <p>
          Every source, the software and their licences:{" "}
          <a
            href="/third-party-notices.txt"
            target="_blank"
            rel="noopener"
            className="underline decoration-[0.06em] underline-offset-[0.2em] hover:decoration-[0.1em] focus-visible:rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
          >
            credits and notices
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
