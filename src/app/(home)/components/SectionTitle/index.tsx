export function SectionTitle({ title, description }: { title: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div className="mx-auto mb-12 max-w-5xl text-center lg:mb-16">
      <h2 data-section-title className="mx-auto max-w-5xl text-balance text-4xl font-black leading-[1.1] tracking-[-0.06em] text-[#f5efe6] md:text-6xl lg:text-7xl">
        {title}
      </h2>
      {description ? (
        <p data-reveal className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/56 md:text-base md:leading-8">
          {description}
        </p>
      ) : null}
    </div>
  );
}
