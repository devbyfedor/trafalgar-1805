/**
 * Stand-in for scene 2: a quiet block that proves the scene 1 pin releases.
 * Replace this entry in the registry when scene 2 is built.
 */
export function ChapterPlaceholder() {
  return (
    <section
      id="chapter-2"
      data-scene="chapter-2"
      className="relative flex min-h-[70vh] items-end bg-deep-sea px-[6vw] pt-[30vh] pb-[16vh]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[30vh] bg-linear-to-b from-[#24363d] to-deep-sea"
      />
      <p className="relative font-text text-[clamp(16px,2.35vh,27px)] text-ink">
        Chapter II follows
      </p>
    </section>
  );
}
