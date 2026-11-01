/**
 * Stand-in for a chapter not built yet: a quiet block that proves the pin
 * before it releases. Replace its registry entry when the chapter is built.
 */
export function ChapterPlaceholder({ id, text }: { id: string; text: string }) {
  return (
    <section
      id={id}
      data-scene={id}
      className="relative flex min-h-[70vh] items-end bg-deep-sea px-[6vw] pt-[30vh] pb-[16vh]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[30vh] bg-linear-to-b from-[#24363d] to-deep-sea"
      />
      <p className="relative font-text text-[clamp(16px,2.35vh,27px)] text-ink">
        {text}
      </p>
    </section>
  );
}

/** Chapter III's place, after scene 2. */
export function ChapterThree() {
  return <ChapterPlaceholder id="chapter-3" text="Chapter III follows" />;
}
