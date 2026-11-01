@AGENTS.md

# Trafalgar 1805

A desktop-first, scroll-driven interactive story about the Battle of Trafalgar (21 October 1805), told as a sequence of cinematic scenes. The owner and art director is Fedor: he decides, you build, and his taste decides what counts as good.

## Where things are

- Briefs: `docs/scene-NN-brief.md`. `docs/scene-01-brief.md` holds the project-wide rules (stack, structure, avoid-list, boundaries, report format, how turns end). A later scene's brief wins where it differs.
- `docs/progress.md` says which scene and stage are active, what's done and what comes next.
- `docs/decisions.md`: design and technical decisions. `docs/history-notes.md`: facts, sources and doubts. `docs/backlog.md`: items deferred to later scenes. `docs/research/`: paraphrased research notes. `docs/fonts.md`, `docs/screenshots/`.

## Working rules

- Start every session by reading `docs/progress.md` and the active brief, then reconcile them with git: status, recent log, any uncommitted diff. Where they disagree, trust the repository and correct progress.md.
- Keep `docs/progress.md` current as you work. It records where you are; what's done, half-done and not started; what wasn't verified; and the next steps in order. A fresh session must be able to continue without guessing.
- Commit after every finished step, with clear messages. Never leave valuable work only in temp folders or in your context.
- Subagents and research workflows are welcome wherever they improve the result.
- When a brief leaves something open, decide and record it in decisions.md. When a brief looks wrong, technically or historically, say so, choose the closest faithful option and keep going.
- What the owner has approved keeps its direction: refine it, don't redo it. Scene 1 is approved; don't let it regress.
- A deliberate stop requested by the owner overrides the instruction about how turns end. Bring the current step to a safe state, commit, update progress.md, report, and end the turn.

## Fixed decisions

- Desktop only. Phones and tablets get a single fallback screen.
- English site. Code, comments, docs and UI copy are in English.
- Zero budget: nothing that costs money. Hosting will be the Cloudflare Workers free plan (static assets).
- Never deploy, log in to services or push to remotes. The owner does that.
- The repository is public:
  - No secrets.
  - No copyrighted images, fonts, maps or text.
  - Research notes paraphrase their sources and link to them. Verbatim text is allowed only as a short public-domain quote where the exact wording is the evidence.
  - Downloaded pages, PDFs and images stay outside the repository.
- No external requests at runtime: no CDNs, map tiles, APIs or remote fonts. Everything loads from the site's own origin.

## Quality bar

- Maximum beauty and effect, with no simplified solutions.
- Smooth: a steady 60 fps on the owner's laptop is a hard requirement. The laptop is an Intel Core Ultra 5 125H with Intel Arc integrated graphics, running Windows, with a browser viewport of about 1280×720 CSS pixels at device pixel ratio 1.5. Only the owner can verify it on his GPU, with `?debug` on the production preview.
- The avoid-lists in the briefs apply everywhere.
- Look at your own screenshots and fix what's off before you report.

## Stack and tooling

- Node 24 or later (26 LTS preferred), npm only. Versions are pinned exactly in package.json.
- Next.js 16 (App Router, static export to `out/`), React 19, TypeScript 7, Tailwind CSS 4, GSAP 3.15 with @gsap/react, and Lenis. The 3D chart uses three.js with WebGLRenderer, plus troika-three-text.
- TypeScript 7 has no JavaScript compiler API, and typescript-eslint doesn't support it, so there is no ESLint. Lint and format with Biome.
- Several of these versions are newer than your training data. Before writing code against them, read the current docs, the installed packages' type definitions and changelogs, and the GSAP agent skills.
- One animation clock: `gsap.ticker` drives Lenis, ScrollTrigger and every canvas or WebGL render loop.
- Windows: npm scripts must work in PowerShell, and local servers bind to 127.0.0.1.
- Key scripts: `npm run dev`, `npm run build`, `npm run preview`, `npm run check`, `npm run screenshots`, `npm run data:build`.

## Reports to the owner

Write reports in Russian. He listens to them via text-to-speech, so use plain short sentences and no tables. Cover:
- what was done;
- the last commit;
- what comes next;
- what he can look at right now, with the commands or pages;
- at most three questions, only ones that truly need his decision.
