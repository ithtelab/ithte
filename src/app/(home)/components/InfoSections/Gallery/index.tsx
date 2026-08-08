import DiagonalMarqueeCarousel, { type CardItem } from '@/components/ui/great-ui-diagonal-marquee-carousel';

const travelCards: CardItem[] = [
  { id: 'mountain', url: '/travel/landscape-mountain.png', title: '群山与远方' },
  { id: 'sunlight', url: '/travel/nature-sunlight.png', title: '林间日光' },
  { id: 'autumn', url: '/travel/forest-autumn.png', title: '秋日森林' },
  { id: 'bridge', url: '/travel/forest-bridge.png', title: '森林小桥' },
  { id: 'ocean', url: '/travel/ocean-sunset.png', title: '海边日落' },
  { id: 'valley', url: '/travel/valley-aerial.png', title: '山谷俯瞰' },
];

export function Gallery() {
  return (
    <section id="travel-gallery" data-section className="relative min-h-[100svh] overflow-hidden bg-[#050608]">
      <DiagonalMarqueeCarousel
        cards={travelCards}
        angle={-16}
        baseSpeed={92}
        className="absolute inset-0 h-full min-h-[100svh]"
        cardClassName="h-[180px] w-[260px] rounded-[16px] md:h-[250px] md:w-[360px]"
      />

      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(5,6,8,0.94)_0%,rgba(5,6,8,0.72)_38%,rgba(5,6,8,0.2)_72%,rgba(5,6,8,0.42)_100%)]" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_28%,rgba(5,6,8,0.58)_100%)]" />

      <div className="relative z-20 mx-auto flex min-h-[100svh] w-full max-w-7xl items-center px-4 py-24 md:px-8 md:py-28">
        <div className="max-w-3xl">
          <p data-section-title className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#9fe8d0]">
            Travel Archive
          </p>
          <h2 data-section-title className="mt-4 text-5xl font-black leading-[1.08] tracking-[-0.06em] text-white md:text-7xl lg:text-[6rem]">
            想把沿途遇见的
            <br />
            <em className="font-normal not-italic text-[#9fe8d0]">风景一张张收藏</em>
          </h2>
          <p data-reveal className="mt-6 max-w-lg text-sm leading-7 text-white/58 md:text-base md:leading-8">
            先从想去的远方开始，等真正抵达以后，再把这里换成亲眼见过的风景。
          </p>
        </div>
      </div>
    </section>
  );
}
